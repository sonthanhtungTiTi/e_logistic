import { create } from 'zustand';
import type { TicketPriority, TicketCategory } from '@/types/ticket.types';

export type WorkspaceTab = 'UNASSIGNED' | 'MY_TICKETS' | 'SLA_RISK' | 'ESCALATED' | 'ALL';

export interface WorkspaceFilters {
  tab: WorkspaceTab;
  priority?: TicketPriority | 'ALL';
  category?: TicketCategory | 'ALL';
  search?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export type ComposerMode = 'PUBLIC' | 'INTERNAL';

interface CsWorkspaceState {
  selectedTicketId: string | null;
  composerMode: ComposerMode;
  filters: WorkspaceFilters;
  mobileLeftDrawerOpen: boolean;
  mobileRightDrawerOpen: boolean;
  isShortcutsModalOpen: boolean;

  // Actions
  setSelectedTicketId: (id: string | null) => void;
  setComposerMode: (mode: ComposerMode) => void;
  setFilter: <K extends keyof WorkspaceFilters>(key: K, value: WorkspaceFilters[K]) => void;
  resetFilters: () => void;
  setMobileLeftDrawerOpen: (open: boolean) => void;
  setMobileRightDrawerOpen: (open: boolean) => void;
  setIsShortcutsModalOpen: (open: boolean) => void;
}

const defaultFilters: WorkspaceFilters = {
  tab: 'ALL',
  priority: 'ALL',
  category: 'ALL',
  search: '',
  startDate: null,
  endDate: null,
};

export const useCsWorkspaceStore = create<CsWorkspaceState>((set) => ({
  selectedTicketId: null,
  composerMode: 'PUBLIC',
  filters: defaultFilters,
  mobileLeftDrawerOpen: false,
  mobileRightDrawerOpen: false,
  isShortcutsModalOpen: false,

  setSelectedTicketId: (id) => set({ selectedTicketId: id }),
  setComposerMode: (mode) => set({ composerMode: mode }),
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
  setMobileLeftDrawerOpen: (open) => set({ mobileLeftDrawerOpen: open }),
  setMobileRightDrawerOpen: (open) => set({ mobileRightDrawerOpen: open }),
  setIsShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),
}));
