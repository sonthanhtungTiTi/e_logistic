import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { adminOrderApi } from '../../api/order.api';
import type { Order } from '../../types/order.types';
import { socket } from '../../api/socket';

export const GlobalOrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter States matching Wireframe 3
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ANY');
  const [hubFilter, setHubFilter] = useState('GLOBAL');

  // Fetch orders from API
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await adminOrderApi.getGlobalOrders({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        riskFlag: riskFilter !== 'ANY' ? riskFilter : undefined,
        hub: hubFilter !== 'GLOBAL' ? hubFilter : undefined
      });

      if (response.data && response.data.success) {
        const rawList = response.data.data || (response.data as any).orders || [];
        setOrders(Array.isArray(rawList) ? rawList : []);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error('[GlobalOrderListPage] Lỗi tải danh sách đơn hàng:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleOrderUpdate = (payload: any) => {
      const updatedOrder = payload?.order || payload;
      if (!updatedOrder) return;
      const tracking = updatedOrder.trackingCode || payload?.trackingCode || 'Đơn hàng';
      const status = updatedOrder.status || payload?.status || '';

      setToastMessage(`⚡ Realtime: Đơn ${tracking} vừa cập nhật trạng thái [${status}]`);
      setTimeout(() => setToastMessage(null), 5000);

      // Cập nhật ngay trong state orders mà không cần chờ interval
      setOrders((prev) => {
        const targetId = updatedOrder._id || (updatedOrder as any).id;
        const exists = prev.some((o) => (o._id || (o as any).id) === targetId);
        if (exists) {
          return prev.map((o) => ((o._id || (o as any).id) === targetId ? { ...o, ...updatedOrder } : o));
        }
        return [updatedOrder, ...prev];
      });
    };

    if (socket) {
      socket.on('order:status_changed', handleOrderUpdate);
      socket.on('order:created', handleOrderUpdate);
      socket.on('order:assigned', handleOrderUpdate);
    }

    // Polling tự động làm mới danh sách đơn hàng mỗi 10 giây để đồng bộ Realtime
    const intervalId = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => {
      clearInterval(intervalId);
      if (socket) {
        socket.off('order:status_changed', handleOrderUpdate);
        socket.off('order:created', handleOrderUpdate);
        socket.off('order:assigned', handleOrderUpdate);
      }
    };
  }, [statusFilter, riskFilter, hubFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // KPI Calculations
  const totalCount = orders.length;
  const pendingCount = orders.filter(o => o.status === 'PENDING_VERIFICATION' || o.status === 'CREATED').length;
  const activeCount = orders.filter(o => o.status === 'READY_TO_PICK' || o.status === 'PICKING' || o.status === 'DELIVERED').length;
  const riskCount = orders.filter(o => o.flagCodAnomaly || o.flagFeeWarning || o.needsManualRouting || o.status === 'CANCELLED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Realtime Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-500/40 rounded-2xl text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-blue-600 dark:text-blue-400 hover:opacity-80 px-2 py-0.5 cursor-pointer">✕</button>
        </div>
      )}

      {/* TẦNG 1: Page Header & KPI Cards Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Tất Cả Đơn Hàng (Global List)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Quản lý, theo dõi và giám sát toàn bộ luồng vận đơn logistics trên toàn hệ thống bưu cục
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-sm"
              title="Làm mới dữ liệu Realtime"
            >
              <RefreshCw className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${loading ? 'animate-spin' : ''}`} /> Tải Lại Dữ Liệu
            </button>
          </div>
        </div>

        {/* 4 Thẻ KPI Thống Kê Nhanh */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Tổng Đơn Hàng</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block font-mono">{totalCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Chờ Thẩm Định</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block font-mono">{pendingCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Đang Vận Chuyển</span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-200 mt-1 block font-mono">{activeCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Cảnh Báo Rủi Ro</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block font-mono">{riskCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* TẦNG 2: Unified Filter & Search Toolbar */}
      <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="sm:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Mã vận đơn / SĐT / Tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono transition"
          />
        </div>

        {/* Status Select */}
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CREATED">Mới khởi tạo (CREATED)</option>
            <option value="PENDING_VERIFICATION">Chờ thẩm định (PENDING_VERIFICATION)</option>
            <option value="READY_TO_PICK">Sẵn sàng lấy hàng (READY_TO_PICK)</option>
            <option value="PICKING">Đang lấy hàng (PICKING)</option>
            <option value="DELIVERED">Đã giao thành công (DELIVERED)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
          </select>
        </div>

        {/* Risk Flag Select */}
        <div className="sm:col-span-2">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-none cursor-pointer"
          >
            <option value="ANY">Tất cả mức Rủi Ro</option>
            <option value="COD_ANOMALY">Bất thường COD</option>
            <option value="FEE_WARNING">Cảnh báo Cước phí</option>
            <option value="MANUAL_ROUTING">Cần Phối Thủ Công</option>
          </select>
        </div>

        {/* Hub Select */}
        <div className="sm:col-span-2">
          <select
            value={hubFilter}
            onChange={(e) => setHubFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-none font-mono cursor-pointer"
          >
            <option value="GLOBAL">Toàn Hệ Thống (Global)</option>
            <option value="HUB_HAN_01">HUB_HAN_01 (Hà Nội)</option>
            <option value="HUB_SGN_01">HUB_SGN_01 (TP.HCM)</option>
            <option value="HUB_DAD_01">HUB_DAD_01 (Đà Nẵng)</option>
          </select>
        </div>

        {/* Filter Action */}
        <div className="sm:col-span-1 flex justify-end">
          <button
            type="submit"
            className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-blue-600/20 cursor-pointer transition"
          >
            <Filter className="w-3.5 h-3.5" /> Lọc
          </button>
        </div>
      </form>

      {/* DATA TABLE MATCHING WIREFRAME 3 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-4">TRACKING / DATE</th>
                <th className="py-4 px-4">SELLER INFO</th>
                <th className="py-4 px-4">RECIPIENT</th>
                <th className="py-4 px-4">WEIGHT (ACT/VOL)</th>
                <th className="py-4 px-4">COD / FEES</th>
                <th className="py-4 px-4">STATUS & RISK</th>
                <th className="py-4 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Đang tải danh sách đơn hàng...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Không tìm thấy đơn hàng phù hợp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const sellerObj = ord.sellerId && typeof ord.sellerId === 'object' ? (ord.sellerId as any) : null;
                  const sellerName = sellerObj ? (sellerObj.fullName || sellerObj.email || 'Seller') : (ord.sellerId ? 'Seller ID: ' + ord.sellerId : 'N/A');
                  const hasRisk = Boolean(ord.flagCodAnomaly || ord.flagFeeWarning || ord.needsManualRouting || ord.status === 'PENDING_VERIFICATION');

                  return (
                    <tr key={ord._id || Math.random()} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Tracking / Date */}
                      <td className="py-4 px-4">
                        <span className="font-mono font-black text-blue-600 dark:text-blue-400 block">{ord.trackingCode}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleString('vi-VN') : 'N/A'}
                        </span>
                      </td>

                      {/* Seller Info */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{sellerName}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">Hub: {ord.pickupHub || 'N/A'}</span>
                      </td>

                      {/* Recipient */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{ord.deliveryAddress?.fullName || 'Khách Nhận'}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[180px]">
                          {ord.deliveryAddress?.district || ''}, {ord.deliveryAddress?.province || ''}
                        </span>
                      </td>

                      {/* Weight (Act/Vol) */}
                      <td className="py-4 px-4 font-mono text-[11px]">
                        <span className="block text-slate-700 dark:text-slate-300 font-bold">{ord.actualWeight || 0} kg</span>
                        <span className="block text-slate-400 dark:text-slate-500 text-[10px]">{ord.volumetricWeight || 0} kg</span>
                      </td>

                      {/* COD / Fees */}
                      <td className="py-4 px-4 font-mono">
                        <span className="block font-black text-blue-600 dark:text-blue-400">{formatCurrency(ord.codAmount || 0)}</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">Fee: {formatCurrency(ord.shippingFee || 0)}</span>
                      </td>

                      {/* Status & Risk Badges */}
                      <td className="py-4 px-4 space-y-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${ord.status === 'PENDING_VERIFICATION'
                              ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                              : ord.status === 'CANCELLED'
                                ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                                : 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                            }`}
                        >
                          {ord.status}
                        </span>

                        {hasRisk && (
                          <div className="flex flex-wrap gap-1">
                            {ord.flagCodAnomaly && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" /> COD Anomaly
                              </span>
                            )}
                            {ord.flagFeeWarning && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                                Fee Ratio Warning
                              </span>
                            )}
                            {ord.needsManualRouting && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Manual Routing
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ord.status === 'PENDING_VERIFICATION' ? (
                            <button
                              onClick={() => navigate(`/admin/orders/${ord._id}/review`)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-blue-600/20 cursor-pointer transition"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> APPROVE
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/admin/orders/${ord._id}/review`)}
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition shadow-sm"
                              title="Xem thông tin đơn"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="bg-slate-50 dark:bg-slate-950/80 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {orders.length} orders</span>
          <div className="flex items-center gap-2">
            <button disabled className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-400 disabled:opacity-30 border border-slate-200 dark:border-slate-700">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-400 disabled:opacity-30 border border-slate-200 dark:border-slate-700">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
