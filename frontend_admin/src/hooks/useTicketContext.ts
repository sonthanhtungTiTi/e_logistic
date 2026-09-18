import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { axiosClient } from '@/api/axiosClient';
import type {
  TicketContextResponse,
  TicketContextData,
  TicketMessage,
  RevealPiiResponse,
  TicketQueueItemData,
} from '@/types/ticket.types';
import type { WorkspaceFilters } from '@/stores/csWorkspace.store';

export const ticketQueryKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketQueryKeys.all, 'list'] as const,
  list: (filters: WorkspaceFilters) => [...ticketQueryKeys.lists(), filters] as const,
  details: () => [...ticketQueryKeys.all, 'detail'] as const,
  context: (id: string | null) => [...ticketQueryKeys.details(), id, 'context'] as const,
};

/**
 * Hook to fetch 360-degree Context of a Ticket
 */
export function useTicketContext(ticketId: string | null) {
  return useQuery({
    queryKey: ticketQueryKeys.context(ticketId),
    queryFn: async () => {
      if (!ticketId) return null;
      const res = await axiosClient.get<TicketContextResponse>(`/admin/tickets/${ticketId}/context`);
      return res.data.data;
    },
    enabled: Boolean(ticketId),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/**
 * Hook for optimistic message sending in Ticket Conversation
 */
export function useSendMessage(ticketId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { body: string; visibility: 'PUBLIC' | 'INTERNAL'; clientMsgId?: string }) => {
      if (!ticketId) throw new Error('Chưa chọn ticket');
      const res = await axiosClient.post<{ success: boolean; message: string; data: TicketMessage }>(
        `/tickets/${ticketId}/messages`,
        payload
      );
      return res.data.data;
    },
    onMutate: async (newMsg) => {
      if (!ticketId) return;
      await queryClient.cancelQueries({ queryKey: ticketQueryKeys.context(ticketId) });

      const previousContext = queryClient.getQueryData<TicketContextData>(ticketQueryKeys.context(ticketId));

      const optimisticMsg: TicketMessage = {
        _id: `temp-${nanoid()}`,
        ticketId,
        senderName: 'Bạn (CSKH)',
        senderRole: 'CS',
        visibility: newMsg.visibility,
        body: newMsg.body,
        status: 'sending',
        clientMsgId: newMsg.clientMsgId || nanoid(),
        createdAt: new Date().toISOString(),
      };

      if (previousContext) {
        queryClient.setQueryData<TicketContextData>(ticketQueryKeys.context(ticketId), {
          ...previousContext,
          messages: [...previousContext.messages, optimisticMsg],
        });
      }

      return { previousContext, optimisticId: optimisticMsg._id };
    },
    onError: (err: unknown, _variables, context) => {
      if (ticketId && context?.previousContext) {
        queryClient.setQueryData(ticketQueryKeys.context(ticketId), context.previousContext);
      }
      const errorMessage =
        err instanceof Error ? err.message : 'Không thể gửi tin nhắn. Vui lòng thử lại.';
      toast.error(errorMessage);
    },
    onSuccess: (savedMsg, _variables, context) => {
      if (!ticketId) return;
      queryClient.setQueryData<TicketContextData | undefined>(ticketQueryKeys.context(ticketId), (old) => {
        if (!old) return old;
        const filtered = old.messages.filter((m) => m._id !== context?.optimisticId);
        return {
          ...old,
          messages: [...filtered, savedMsg || { ...old.messages[old.messages.length - 1], status: 'sent' }],
        };
      });
      // Invalidate list to refresh last message
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() });
    },
  });
}

/**
 * Hook for revealing unmasked PII
 */
export function useRevealPii(ticketId: string | null) {
  return useMutation({
    mutationFn: async () => {
      if (!ticketId) throw new Error('Chưa chọn ticket');
      const res = await axiosClient.post<RevealPiiResponse>(`/admin/tickets/${ticketId}/reveal-pii`);
      return res.data.data;
    },
  });
}

/**
 * Hook for Claiming a Ticket
 */
export function useClaimTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await axiosClient.post<{ success: boolean; message: string }>(`/tickets/admin/${ticketId}/claim`);
      return res.data;
    },
    onSuccess: (_, ticketId) => {
      toast.success('Đã nhận xử lý ticket thành công!');
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.context(ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Không thể nhận ticket';
      toast.error(msg);
    },
  });
}

/**
 * Hook for updating status / resolving / escalating Ticket
 */
export function useTransitionTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { ticketId: string; status: string; resolutionNote?: string; closedReason?: string }) => {
      const { ticketId, ...body } = payload;
      const res = await axiosClient.put<{ success: boolean; message: string }>(`/tickets/admin/${ticketId}`, body);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Đã cập nhật trạng thái ticket sang ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.context(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại';
      toast.error(msg);
    },
  });
}

/**
 * Hook to fetch Ticket Queue with 30s polling
 */
export function useTicketQueue(filters: WorkspaceFilters) {
  return useQuery({
    queryKey: ticketQueryKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = {
        limit: 100,
      };

      if (filters.tab === 'UNASSIGNED') {
        params.status = 'NEW,OPEN';
      } else if (filters.tab === 'SLA_RISK') {
        params.slaRisk = 'true';
      } else if (filters.tab === 'ESCALATED') {
        params.status = 'ESCALATED';
      }

      if (filters.priority && filters.priority !== 'ALL') {
        params.priority = filters.priority;
      }
      if (filters.category && filters.category !== 'ALL') {
        params.category = filters.category;
      }
      if (filters.search) {
        params.search = filters.search;
      }

      const res = await axiosClient.get<{
        success: boolean;
        count: number;
        total: number;
        data: TicketQueueItemData[];
      }>('/tickets/admin/list', { params });

      return res.data.data || [];
    },
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });
}
