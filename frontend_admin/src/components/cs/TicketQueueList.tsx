import React from 'react';
import { useCsWorkspaceStore } from '@/stores/csWorkspace.store';
import type { WorkspaceTab } from '@/stores/csWorkspace.store';
import { useTicketQueue } from '@/hooks/useTicketContext';
import { TicketQueueItem } from './TicketQueueItem';
import type { TicketPriority, TicketCategory } from '@/types/ticket.types';
import { Search, Loader2, Inbox } from 'lucide-react';

const TABS: Array<{ key: WorkspaceTab; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'UNASSIGNED', label: 'Chưa gán' },
  { key: 'SLA_RISK', label: 'Nguy cơ SLA' },
  { key: 'ESCALATED', label: 'Escalated' },
];

export const TicketQueueList: React.FC = () => {
  const { selectedTicketId, setSelectedTicketId, filters, setFilter } = useCsWorkspaceStore();
  const { data: tickets = [], isLoading, isRefetching } = useTicketQueue(filters);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Header & Tabs */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span>Hàng đợi Ticket</span>
            {isRefetching && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {tickets.length}
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter('tab', t.key)}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-all ${
                filters.tab === t.key
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Tìm theo mã TK, sđt, tiêu đề..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Category & Priority Filters */}
        <div className="flex items-center gap-1 text-xs">
          <select
            value={filters.priority || 'ALL'}
            onChange={(e) => setFilter('priority', e.target.value as TicketPriority | 'ALL')}
            className="flex-1 py-1 px-1.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">Mọi ưu tiên</option>
            <option value="P1">P1 (Khẩn)</option>
            <option value="P2">P2 (Cao)</option>
            <option value="P3">P3 (Trung bình)</option>
            <option value="P4">P4 (Thường)</option>
          </select>

          <select
            value={filters.category || 'ALL'}
            onChange={(e) => setFilter('category', e.target.value as TicketCategory | 'ALL')}
            className="flex-1 py-1 px-1.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">Mọi danh mục</option>
            <option value="DELIVERY_DELAY">Giao trễ</option>
            <option value="DAMAGED_GOODS">Hư hỏng</option>
            <option value="LOST_GOODS">Thất lạc</option>
            <option value="COD_DISPUTE">Sai COD</option>
            <option value="ADDRESS_CHANGE">Đổi địa chỉ</option>
          </select>
        </div>
      </div>

      {/* Ticket List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-xs">Đang tải danh sách...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
            <Inbox className="w-8 h-8 stroke-1" />
            <span className="text-xs">Không có ticket nào</span>
          </div>
        ) : (
          tickets.map((item: any) => (
            <TicketQueueItem
              key={item._id}
              ticket={item}
              isSelected={selectedTicketId === item._id}
              onSelect={setSelectedTicketId}
            />
          ))
        )}
      </div>
    </div>
  );
};
