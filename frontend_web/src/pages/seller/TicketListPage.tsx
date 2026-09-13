import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  Plus,
  Package,
  Search,
  RefreshCw,
  Send,
  X,
  CheckCircle2,
  MessageSquare,
  Shield,
  User,
} from 'lucide-react';
import { Link } from 'react-router';
import { ticketApi, type TicketItem } from '../../api/ticket.api';

export const TicketListPage: React.FC = () => {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Ticket for Chat / Detail Modal
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [replying, setReplying] = useState<boolean>(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ticketApi.getTickets({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        search: searchTerm.trim() || undefined,
      });
      setTickets(res.data?.data || []);
    } catch (err) {
      console.warn('Lỗi load tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchTerm]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleOpenDetail = async (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    try {
      const res = await ticketApi.getTicketDetails(ticket._id);
      if (res.data?.success) {
        setSelectedTicket(res.data.data);
      }
    } catch (err) {
      console.warn('Lỗi lấy chi tiết ticket:', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setReplying(true);
    try {
      const res = await ticketApi.sendMessage(selectedTicket._id, replyMessage.trim());
      if (res.data?.success) {
        setSelectedTicket(res.data.data);
        setReplyMessage('');
        loadTickets();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể gửi phản hồi');
    } finally {
      setReplying(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'DELIVERY_DELAY':
        return 'Giao chậm trễ';
      case 'DAMAGED_GOODS':
        return 'Hàng hỏng vỡ';
      case 'LOST_GOODS':
        return 'Thất lạc hàng hóa';
      case 'COD_DISPUTE':
        return 'Tranh chấp tiền COD';
      case 'ADDRESS_CHANGE':
        return 'Thay đổi địa chỉ';
      default:
        return 'Hỗ trợ chung';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30 text-[10px]">
            Mới Tạo
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30 text-[10px]">
            Đang Xử Lý
          </span>
        );
      case 'WAITING_SELLER':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30 text-[10px]">
            Chờ Shop Phản Hồi
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
            Đã Xử Lý Xong
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-bold border border-slate-700 text-[10px]">
            Đã Đóng
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">{status}</span>;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return <span className="text-rose-400 font-bold font-mono">🚨 KHẨN CẤP</span>;
      case 'HIGH':
        return <span className="text-amber-400 font-bold font-mono">Cao</span>;
      case 'LOW':
        return <span className="text-slate-400 font-mono">Thấp</span>;
      default:
        return <span className="text-blue-400 font-mono">Bình thường</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-indigo-500" /> Danh Sách Ticket Khiếu Nại & Hỗ Trợ
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Trao đổi trực tiếp 2 chiều với đội ngũ Chăm sóc khách hàng GIAO HÀNG để giải quyết sự cố đơn hàng
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/seller/orders/create"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
          >
            <Package className="w-4 h-4 text-emerald-300" /> Tạo Đơn Hàng
          </Link>
          <Link
            to="/seller/tickets/create"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tạo Ticket Mới
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã ticket, vận đơn, tiêu đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="OPEN">Mới tạo</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="WAITING_SELLER">Chờ shop phản hồi</option>
            <option value="RESOLVED">Đã xử lý xong</option>
            <option value="CLOSED">Đã đóng</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
          >
            <option value="ALL">Tất cả phân loại</option>
            <option value="DELIVERY_DELAY">Giao chậm trễ</option>
            <option value="DAMAGED_GOODS">Hàng hỏng vỡ</option>
            <option value="LOST_GOODS">Thất lạc hàng hóa</option>
            <option value="COD_DISPUTE">Tranh chấp tiền COD</option>
            <option value="ADDRESS_CHANGE">Thay đổi địa chỉ</option>
            <option value="OTHER">Khác</option>
          </select>
        </div>

        <button
          onClick={loadTickets}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          title="Tải lại"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Đang tải danh sách khiếu nại...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <HelpCircle className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Chưa có ticket khiếu nại nào</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              Nếu quý shop có bất kỳ bưu gửi nào cần hối giao, đổi thông tin người nhận hoặc bồi thường, hãy tạo ticket để CSKH hỗ trợ.
            </p>
            <Link
              to="/seller/tickets/create"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Tạo Ticket Hỗ Trợ Ngay
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="p-3.5">Mã Ticket</th>
                  <th className="p-3.5">Vận Đơn Liên Quan</th>
                  <th className="p-3.5">Phân Loại</th>
                  <th className="p-3.5">Tiêu Đề / Yêu Cầu</th>
                  <th className="p-3.5">Độ Ưu Tiên</th>
                  <th className="p-3.5">Trạng Thái</th>
                  <th className="p-3.5">Thời Gian Tạo</th>
                  <th className="p-3.5 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tickets.map((t) => (
                  <tr
                    key={t._id}
                    onClick={() => handleOpenDetail(t)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="p-3.5 font-mono font-bold text-indigo-400">{t.ticketCode}</td>
                    <td className="p-3.5 font-mono text-cyan-400 font-semibold">
                      {t.trackingCode || <span className="text-slate-600 italic">Không có</span>}
                    </td>
                    <td className="p-3.5 text-slate-300 font-semibold">{getCategoryLabel(t.category)}</td>
                    <td className="p-3.5">
                      <div className="text-white font-bold">{t.subject}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {t.messages?.[t.messages.length - 1]?.message || ''}
                      </div>
                    </td>
                    <td className="p-3.5">{getPriorityBadge(t.priority)}</td>
                    <td className="p-3.5">{getStatusBadge(t.status)}</td>
                    <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                      {new Date(t.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(t);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Xem ({t.messages?.length || 1})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CHAT / TICKET DETAIL MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-400 text-sm">{selectedTicket.ticketCode}</span>
                  {getStatusBadge(selectedTicket.status)}
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {getCategoryLabel(selectedTicket.category)}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1">{selectedTicket.subject}</h4>
                {selectedTicket.trackingCode && (
                  <p className="text-[11px] text-cyan-400 font-mono mt-0.5">
                    Vận đơn liên quan: <b>{selectedTicket.trackingCode}</b>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resolution Note if resolved */}
            {selectedTicket.resolutionNote && (
              <div className="px-6 py-3 bg-emerald-950/40 border-b border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <div>
                  <span className="font-bold">Kết luận giải quyết từ CSKH:</span> {selectedTicket.resolutionNote}
                </div>
              </div>
            )}

            {/* Conversation Flow */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {selectedTicket.messages.map((m, idx) => {
                const isSeller = m.senderRole === 'SELLER';
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                      {isSeller ? (
                        <>
                          <span className="font-bold text-indigo-300">{m.senderName} (Shop)</span>
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-bold text-emerald-300">{m.senderName}</span>
                        </>
                      )}
                      <span>· {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-[80%] leading-relaxed ${
                        isSeller
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Form */}
            {selectedTicket.status !== 'CLOSED' ? (
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-800 bg-slate-950/80 flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nhập nội dung phản hồi cho bộ phận CSKH..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 glass-input rounded-xl px-4 py-2.5 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={replying}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition shrink-0"
                >
                  {replying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Gửi Phản Hồi
                </button>
              </form>
            ) : (
              <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-500">
                Ticket này đã được giải quyết và đóng. Nếu có vấn đề mới, vui lòng mở ticket khác.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
