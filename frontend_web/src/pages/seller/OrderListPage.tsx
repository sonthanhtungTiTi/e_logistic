import React, { useState } from 'react';
import { Package, Plus, Ban, Search, CheckCircle2, AlertCircle, Eye, Edit3, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { INITIAL_ORDERS } from '../../mockData';
import type { Order } from '../../types/order.types';
import { CancelOrderModal } from '../../components/orders/CancelOrderModal';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal';
import { EditOrderModal } from '../../components/orders/EditOrderModal';

export const OrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
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
  const itemsPerPage = 5;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

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

    setOrders((prev) =>
      prev.map((o) =>
        (o._id === selectedOrderToCancel._id || o.trackingCode === targetCode)
          ? { ...o, status: 'CANCELLED' }
          : o
      )
    );

    setToastMessage(`Đã hủy thành công đơn hàng ${targetCode}.${reasonStr ? ` Lý do: ${reasonStr}` : ''}`);
    setSelectedOrderToCancel(null);

    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handleOrderUpdatedSuccess = (updatedOrder: Order, feeMsg?: string) => {
    const targetCode = updatedOrder.trackingCode || updatedOrder.trackingNumber;

    setOrders((prev) =>
      prev.map((o) =>
        (o._id === updatedOrder._id || o.trackingCode === targetCode)
          ? { ...o, ...updatedOrder }
          : o
      )
    );

    setToastMessage(`Đã cập nhật thành công thông tin đơn hàng ${targetCode}!${feeMsg || ''}`);
    setSelectedOrderToEdit(null);

    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Filter & Search Logic
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      (o.trackingCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.deliveryAddress?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.deliveryAddress?.phone || '').includes(searchTerm);
    
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;

    let matchDate = true;
    if (fromDate) {
      matchDate = matchDate && new Date(o.createdAt || Date.now()) >= new Date(fromDate);
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      matchDate = matchDate && new Date(o.createdAt || Date.now()) <= endOfDay;
    }

    return matchSearch && matchStatus && matchDate;
  });

  // Sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'shippingFee_desc') return (b.shippingFee || 0) - (a.shippingFee || 0);
    if (sortBy === 'shippingFee_asc') return (a.shippingFee || 0) - (b.shippingFee || 0);
    if (sortBy === 'createdAt_asc') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  // Pagination Slice
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage) || 1;
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" /> Tra Cứu & Quản Lý Đơn Hàng
          </h3>
          <p className="text-xs text-slate-400">Tìm kiếm, lọc chi tiết theo mã vận đơn, người nhận, chỉnh sửa & quản lý bưu gửi</p>
        </div>
        <button
          onClick={() => navigate('/seller/orders/create')}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tạo Đơn Hàng Mới
        </button>
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
            Tìm thấy <strong className="text-blue-400">{sortedOrders.length}</strong> đơn hàng phù hợp
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
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((o) => {
                const canCancel = ['CREATED', 'PENDING_VERIFICATION', 'READY_TO_PICK'].includes(o.status);
                const canEdit = ['CREATED', 'PENDING_VERIFICATION', 'READY_TO_PICK'].includes(o.status);

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
                    <td className="p-3.5 text-slate-300 font-mono">{o.chargeableWeight} kg</td>
                    <td className="p-3.5 font-mono text-emerald-400">{formatCurrency(o.shippingFee)}</td>
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
                <td colSpan={7} className="p-12 text-center text-slate-400 space-y-2">
                  <Package className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="font-bold text-sm text-slate-300">Không tìm thấy đơn hàng phù hợp.</p>
                  <p className="text-xs text-slate-500">Vui lòng điều chỉnh điều kiện lọc hoặc từ khóa tìm kiếm</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Trang {currentPage} / {totalPages}</span>
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
