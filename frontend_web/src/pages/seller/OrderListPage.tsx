import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Ban, Search, CheckCircle2, AlertCircle, Eye, Edit3, Filter, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Order } from '../../types/order.types';
import { CancelOrderModal } from '../../components/orders/CancelOrderModal';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal';
import { EditOrderModal } from '../../components/orders/EditOrderModal';
import { OrderSubNav } from '../../components/orders/OrderSubNav';
import { orderApi } from '../../api/order.api';

export const OrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState<Order | null>(null);
  const [selectedOrderView, setSelectedOrderView] = useState<Order | null>(null);
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<Order | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt_desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const itemsPerPage = 10;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Fetch real orders from MongoDB
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await orderApi.searchOrders({
        search: searchTerm.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        sortBy: sortBy,
        page: currentPage,
        limit: itemsPerPage,
      });

      if (response.data?.success) {
        setOrders(response.data.data || []);
        if (response.data.pagination) {
          setTotalOrders(response.data.pagination.total || 0);
          setTotalPages(response.data.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      console.error('Lỗi lấy danh sách đơn hàng từ MongoDB:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, fromDate, toDate, sortBy, currentPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDateChange = (type: 'from' | 'to', val: string) => {
    setDateError(null);
    let newFrom = fromDate;
    let newTo = toDate;

    if (type === 'from') {
      newFrom = val;
      setFromDate(val);
    } else {
      newTo = val;
      setToDate(val);
    }

    if (newFrom && newTo && new Date(newFrom) > new Date(newTo)) {
      setDateError('Khoảng thời gian không hợp lệ: Từ ngày không được lớn hơn Đến ngày!');
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setFromDate('');
    setToDate('');
    setDateError(null);
    setSortBy('createdAt_desc');
    setCurrentPage(1);
  };

  const handleOrderCancelledSuccess = (reasonStr?: string) => {
    if (!selectedOrderToCancel) return;
    const targetCode = selectedOrderToCancel.trackingCode || selectedOrderToCancel.trackingNumber;

    setToastMessage(`Đã hủy thành công đơn hàng ${targetCode}.${reasonStr ? ` Lý do: ${reasonStr}` : ''}`);
    setSelectedOrderToCancel(null);
    fetchOrders();

    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handleOrderUpdatedSuccess = (updatedOrder: Order, feeMsg?: string) => {
    const targetCode = updatedOrder.trackingCode || updatedOrder.trackingNumber;
    setToastMessage(`Đã cập nhật thành công thông tin đơn hàng ${targetCode}!${feeMsg || ''}`);
    setSelectedOrderToEdit(null);
    fetchOrders();

    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handleReadyToPick = async (order: Order) => {
    const code = order.trackingCode || order.trackingNumber;
    try {
      const response = await orderApi.updateOrderStatus(order._id || (order as any).id, 'READY_TO_PICK');
      if (response.data?.success) {
        setToastMessage(`Đã xác nhận đơn hàng ${code} đóng gói xong (READY_TO_PICK)! Hệ thống đã tích hợp vào tuyến đường thu gom.`);
        fetchOrders();
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể chuyển trạng thái đơn hàng');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Date Validation Error Alert (Alt Flow 4.1) */}
      {dateError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{dateError}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" /> Tra Cứu & Quản Lý Đơn Hàng
          </h3>
          <p className="text-xs text-slate-400">Tìm kiếm, lọc chi tiết theo mã vận đơn, người nhận, chỉnh sửa & quản lý bưu gửi từ MongoDB</p>
        </div>

        <OrderSubNav activeTab="list" />
      </div>

      {/* Advanced Filter Control Panel */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" /> Bộ Lọc Tra Cứu Đa Tiêu Chí
          </span>
          <button
            onClick={handleResetFilters}
            className="text-[11px] font-semibold text-slate-400 hover:text-blue-400 flex items-center gap-1 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Xóa bộ lọc
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          
          {/* Keyword Search */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Mã vận đơn / Người nhận / SĐT</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nhập mã, tên hoặc SĐT..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Trạng thái bưu gửi</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white bg-slate-900"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="CREATED">Mới khởi tạo (CREATED)</option>
              <option value="PENDING_VERIFICATION">Chờ xác minh (PENDING_VERIFICATION)</option>
              <option value="READY_TO_PICK">Sẵn sàng lấy (READY_TO_PICK)</option>
              <option value="IN_TRANSIT">Đang vận chuyển (IN_TRANSIT)</option>
              <option value="OUT_FOR_DELIVERY">Đang giao hàng (OUT_FOR_DELIVERY)</option>
              <option value="DELIVERED">Giao thành công (DELIVERED)</option>
              <option value="CANCELLED">Đã hủy đơn (CANCELLED)</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Từ ngày (From Date)</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white bg-slate-900"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Đến ngày (To Date)</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white bg-slate-900"
            />
          </div>

        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div>
            Tìm thấy <strong className="text-blue-400">{totalOrders}</strong> đơn hàng phù hợp
          </div>
          <div className="flex items-center gap-2">
            <span>Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-input rounded-xl px-2.5 py-1 text-xs text-white bg-slate-900"
            >
              <option value="createdAt_desc">Mới nhất trước</option>
              <option value="createdAt_asc">Cũ nhất trước</option>
              <option value="shippingFee_desc">Cước phí giảm dần</option>
              <option value="shippingFee_asc">Cước phí tăng dần</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
              <th className="p-3.5">Mã Vận Đơn</th>
              <th className="p-3.5">Người Nhận</th>
              <th className="p-3.5">Trọng Lượng</th>
              <th className="p-3.5">Cước Phí</th>
              <th className="p-3.5">COD Thu Hộ</th>
              <th className="p-3.5">Trạng Thái</th>
              <th className="p-3.5 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="font-semibold text-xs text-slate-300">Đang tải danh sách đơn hàng thực từ MongoDB...</p>
                </td>
              </tr>
            ) : orders.length > 0 ? (
              orders.map((o) => {
                const readyTime = (o as any).readyToPickAt || o.updatedAt;
                const elapsedSecs = readyTime ? Math.floor((Date.now() - new Date(readyTime).getTime()) / 1000) : 0;
                const isWithin5MinWindow = o.status === 'READY_TO_PICK' && elapsedSecs < 300;
                const canEdit = ['CREATED', 'PENDING_VERIFICATION', 'PENDING'].includes(o.status) || isWithin5MinWindow;
                const canCancel = ['CREATED', 'PENDING_VERIFICATION', 'PENDING'].includes(o.status) || isWithin5MinWindow;

                return (
                  <tr key={o._id || o.trackingCode} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono font-bold text-blue-400">
                      <button
                        onClick={() => setSelectedOrderView(o)}
                        className="hover:underline cursor-pointer"
                      >
                        {o.trackingCode}
                      </button>
                    </td>
                    <td className="p-3.5 text-white">
                      <span className="font-bold block">{o.deliveryAddress?.fullName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{o.deliveryAddress?.phone}</span>
                    </td>
                    <td className="p-3.5 text-slate-300 font-mono">{o.chargeableWeight || o.actualWeight || 0} kg</td>
                    <td className="p-3.5 font-mono text-emerald-400">{formatCurrency(o.shippingFee || 0)}</td>
                    <td className="p-3.5 font-mono text-amber-400">{formatCurrency(o.codAmount || 0)}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border inline-flex items-center gap-1 ${
                        o.status === 'CANCELLED'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : o.status === 'CREATED'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : o.status === 'DELIVERED'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {o.status === 'CANCELLED' && <Ban className="w-3 h-3" />}
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedOrderView(o)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                          title="Xem chi tiết đơn hàng"
                        >
                          <Eye className="w-3.5 h-3.5" /> Chi Tiết
                        </button>

                        {(o.status === 'CREATED' || o.status === 'PENDING_VERIFICATION' || o.status === 'PENDING') && (
                          <button
                            onClick={() => handleReadyToPick(o)}
                            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                            title="Xác nhận đã đóng gói xong, sẵn sàng chờ bưu tá thu gom"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Chuẩn Bị Xong
                          </button>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => setSelectedOrderToEdit(o)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                            title="Chỉnh sửa thông tin đơn hàng"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Sửa
                          </button>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => setSelectedOrderToCancel(o)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                            title="Hủy đơn vận này"
                          >
                            <Ban className="w-3.5 h-3.5" /> Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 space-y-3">
                  <Package className="w-12 h-12 text-slate-600 mx-auto" />
                  <div>
                    <p className="font-bold text-sm text-slate-200">Chưa có đơn hàng nào trong MongoDB</p>
                    <p className="text-xs text-slate-500 mt-1">Các đơn hàng mới khởi tạo sẽ hiển thị tại đây theo dữ liệu thật của tài khoản này.</p>
                  </div>
                  <button
                    onClick={() => navigate('/seller/create-order')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4" /> Tạo Đơn Hàng Mới
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Trang {currentPage} / {totalPages} (Tổng {totalOrders} đơn hàng)</span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1 font-bold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Trước
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1 font-bold cursor-pointer"
              >
                Sau <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {selectedOrderToCancel && (
        <CancelOrderModal
          order={selectedOrderToCancel}
          onClose={() => setSelectedOrderToCancel(null)}
          onSuccess={handleOrderCancelledSuccess}
        />
      )}

      {/* Detail Modal */}
      {selectedOrderView && (
        <OrderDetailModal
          order={selectedOrderView}
          onClose={() => setSelectedOrderView(null)}
          onEdit={(ord) => setSelectedOrderToEdit(ord)}
          onReadyToPick={handleReadyToPick}
        />
      )}

      {/* Edit Order Modal (UC-07 Update Order) */}
      {selectedOrderToEdit && (
        <EditOrderModal
          order={selectedOrderToEdit}
          onClose={() => setSelectedOrderToEdit(null)}
          onSuccess={handleOrderUpdatedSuccess}
        />
      )}
    </div>
  );
};
