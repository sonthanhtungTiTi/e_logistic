import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Search,
  RefreshCw,
  Send,
  X,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  User,
  Shield,
  CheckSquare,
} from 'lucide-react';
import { ticketAdminApi, type AdminTicketItem } from '../../api/ticketAdmin.api';

export const TicketManagementPage: React.FC = () => {
  const [tickets, setTickets] = useState<AdminTicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusCounts, setStatusCounts] = useState({
    OPEN: 0,
    IN_PROGRESS: 0,
    WAITING_SELLER: 0,
    RESOLVED: 0,
    CLOSED: 0,
  });

  // Selected Ticket for Detail / Chat Modal
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketItem | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [replying, setReplying] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ticketAdminApi.listTickets({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        search: searchTerm.trim() || undefined,
      });

      if (res.data?.success) {
        setTickets(res.data.data);
        if (res.data.statusCounts) {
          setStatusCounts(res.data.statusCounts);
        }
      }
    } catch (err: any) {
      console.warn('Lỗi tải danh sách tickets admin:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter, searchTerm]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleOpenDetail = async (t: AdminTicketItem) => {
    setSelectedTicket(t);
    setNewStatus(t.status);
    setResolutionNote(t.resolutionNote || '');
    try {
      const res = await ticketAdminApi.getTicketDetails(t._id);
      if (res.data?.success) {
        setSelectedTicket(res.data.data);
        setNewStatus(res.data.data.status);
        setResolutionNote(res.data.data.resolutionNote || '');
      }
    } catch (err) {
      console.warn('Lỗi xem chi tiết ticket:', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setReplying(true);
    try {
      const res = await ticketAdminApi.sendMessage(selectedTicket._id, replyMessage.trim());
      if (res.data?.success) {
        setSelectedTicket(res.data.data);
        setReplyMessage('');
        showToast('success', 'Đã gửi phản hồi đến Nhà bán hàng!');
        loadTickets();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể gửi phản hồi');
    } finally {
      setReplying(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setUpdatingStatus(true);
    try {
      const res = await ticketAdminApi.updateTicket(selectedTicket._id, {
        status: newStatus,
        resolutionNote: resolutionNote.trim(),
      });

      if (res.data?.success) {
        setSelectedTicket(res.data.data);
        showToast('success', 'Đã cập nhật tiến độ xử lý khiếu nại thành công!');
        loadTickets();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setUpdatingStatus(false);
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
        return 'Tranh chấp COD';
      case 'ADDRESS_CHANGE':
        return 'Đổi địa chỉ';
      default:
        return 'Hỗ trợ khác';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30 text-[10px]">
            MỚI TẠO
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30 text-[10px]">
            ĐANG XỬ LÝ
          </span>
        );
      case 'WAITING_SELLER':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30 text-[10px]">
            CHỜ SHOP PHẢN HỒI
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
            ĐÃ GIẢI QUYẾT
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-bold border border-slate-700 text-[10px]">
            ĐÃ ĐÓNG
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
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
              : 'bg-rose-950/90 text-rose-300 border-rose-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Ticket className="w-7 h-7 text-indigo-400" /> Quản Lý Khiếu Nại & Hỗ Trợ Khách Hàng (CSKH Helpdesk)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Trung tâm tiếp nhận, phân loại và trao đổi 2 chiều giải quyết thắc mắc, bồi thường và sự cố giao hàng của Seller
          </p>
        </div>

        <button
          onClick={loadTickets}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Tải lại danh sách"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Counters Tab Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-2xl border transition text-left ${
            statusFilter === 'ALL'
              ? 'bg-indigo-600/20 border-indigo-500/40 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider">Tất Cả Ticket</div>
          <div className="text-2xl font-black text-white mt-1">
            {statusCounts.OPEN + statusCounts.IN_PROGRESS + statusCounts.WAITING_SELLER + statusCounts.RESOLVED + statusCounts.CLOSED}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('OPEN')}
          className={`p-3.5 rounded-2xl border transition text-left ${
            statusFilter === 'OPEN'
              ? 'bg-blue-600/20 border-blue-500/40 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Mới Tạo (Chờ Tiếp Nhận)</div>
          <div className="text-2xl font-black text-blue-300 mt-1">{statusCounts.OPEN}</div>
        </button>

        <button
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`p-3.5 rounded-2xl border transition text-left ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-amber-600/20 border-amber-500/40 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Đang Xử Lý</div>
          <div className="text-2xl font-black text-amber-300 mt-1">{statusCounts.IN_PROGRESS}</div>
        </button>

        <button
          onClick={() => setStatusFilter('WAITING_SELLER')}
          className={`p-3.5 rounded-2xl border transition text-left ${
            statusFilter === 'WAITING_SELLER'
              ? 'bg-rose-600/20 border-rose-500/40 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Chờ Shop Phản Hồi</div>
          <div className="text-2xl font-black text-rose-300 mt-1">{statusCounts.WAITING_SELLER}</div>
        </button>

        <button
          onClick={() => setStatusFilter('RESOLVED')}
          className={`p-3.5 rounded-2xl border transition text-left ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-600/20 border-emerald-500/40 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Đã Giải Quyết</div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{statusCounts.RESOLVED}</div>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã ticket, vận đơn, tiêu đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-white text-xs"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
          >
            <option value="ALL">Tất cả phân loại</option>
            <option value="DELIVERY_DELAY">Giao chậm trễ</option>
            <option value="DAMAGED_GOODS">Hàng hỏng vỡ</option>
            <option value="LOST_GOODS">Thất lạc hàng hóa</option>
            <option value="COD_DISPUTE">Tranh chấp tiền COD</option>
            <option value="ADDRESS_CHANGE">Thay đổi địa chỉ</option>
            <option value="OTHER">Khác</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
          >
            <option value="ALL">Mọi độ ưu tiên</option>
            <option value="URGENT">Khẩn cấp</option>
            <option value="HIGH">Cao</option>
            <option value="NORMAL">Bình thường</option>
            <option value="LOW">Thấp</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Đang tải dữ liệu khiếu nại...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">Không có ticket nào cần xử lý trong mục này</p>
            <p className="text-xs text-slate-500 mt-1">Tất cả khiếu nại của đối tác bán hàng đã được phản hồi kịp thời.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="p-3.5">Mã Ticket</th>
                  <th className="p-3.5">Shop Bán Hàng</th>
                  <th className="p-3.5">Vận Đơn</th>
                  <th className="p-3.5">Phân Loại</th>
                  <th className="p-3.5">Tiêu Đề Khiếu Nại</th>
                  <th className="p-3.5">Ưu Tiên</th>
                  <th className="p-3.5">Trạng Thái</th>
                  <th className="p-3.5">Ngày Tạo</th>
                  <th className="p-3.5 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tickets.map((t) => {
                  const sellerName =
                    typeof t.sellerId === 'object'
                      ? t.sellerId?.companyName || t.sellerId?.fullName || 'Shop'
                      : 'Shop';
                  const sellerPhone =
                    typeof t.sellerId === 'object' ? t.sellerId?.phoneNumber : '';

                  return (
                    <tr
                      key={t._id}
                      onClick={() => handleOpenDetail(t)}
                      className="hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="p-3.5 font-mono font-bold text-indigo-400">{t.ticketCode}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{sellerName}</div>
                        {sellerPhone && <div className="text-[10px] font-mono text-slate-400">{sellerPhone}</div>}
                      </td>
                      <td className="p-3.5 font-mono text-cyan-400 font-semibold">
                        {t.trackingCode || <span className="text-slate-600 italic">Không có</span>}
                      </td>
                      <td className="p-3.5 text-slate-300 font-medium">{getCategoryLabel(t.category)}</td>
                      <td className="p-3.5 max-w-xs">
                        <div className="text-white font-bold truncate">{t.subject}</div>
                        <div className="text-[11px] text-slate-400 truncate">
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
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition inline-flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Xử Lý ({t.messages?.length || 1})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL & CHAT & RESOLUTION MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-400 text-sm">{selectedTicket.ticketCode}</span>
                  {getStatusBadge(selectedTicket.status)}
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {getCategoryLabel(selectedTicket.category)}
                  </span>
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
                <h3 className="text-base font-bold text-white mt-1">{selectedTicket.subject}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>
                    Shop:{' '}
                    <b className="text-white">
                      {typeof selectedTicket.sellerId === 'object'
                        ? selectedTicket.sellerId?.companyName || selectedTicket.sellerId?.fullName
                        : 'Shop'}
                    </b>
                  </span>
                  {selectedTicket.trackingCode && (
                    <span className="text-cyan-400 font-mono">
                      Mã vận đơn: <b>{selectedTicket.trackingCode}</b>
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs bg-slate-950/30">
              {selectedTicket.messages.map((m, idx) => {
                const isSeller = m.senderRole === 'SELLER';
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isSeller ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                      {isSeller ? (
                        <>
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-bold text-indigo-300">{m.senderName} (Shop)</span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-emerald-300">{m.senderName} (CSKH / Admin)</span>
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        </>
                      )}
                      <span>· {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-[80%] leading-relaxed ${
                        isSeller
                          ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'
                          : 'bg-indigo-600 text-white rounded-tr-none'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status Update & Resolution Note Section */}
            <form onSubmit={handleUpdateStatus} className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <label className="text-xs text-slate-400 font-bold whitespace-nowrap">Trạng Thái Ticket:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <option value="OPEN">Mới Tạo</option>
                    <option value="IN_PROGRESS">Đang Xử Lý</option>
                    <option value="WAITING_SELLER">Chờ Shop Phản Hồi</option>
                    <option value="RESOLVED">Đã Giải Quyết (Xong)</option>
                    <option value="CLOSED">Đã Đóng</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  {updatingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                  Lưu Trạng Thái & Kết Luận
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Ghi chú kết luận giải quyết (ví dụ: Đã hỗ trợ shipper giao lại thành công, hoặc Đã hoàn 100% tiền cước)..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600"
                />
              </div>
            </form>

            {/* Send Reply Chat Box */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-slate-800/80 bg-slate-900 flex gap-2">
              <input
                type="text"
                required
                placeholder="Nhập nội dung trả lời / hướng dẫn giải quyết gửi đến Nhà bán hàng..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
              />
              <button
                type="submit"
                disabled={replying}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition shrink-0"
              >
                {replying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Gửi CSKH
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
