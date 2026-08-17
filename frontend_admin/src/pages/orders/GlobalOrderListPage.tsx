import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { adminOrderApi } from '../../api/order.api';
import type { Order } from '../../types/order.types';

export const GlobalOrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

    // Polling tự động làm mới danh sách đơn hàng mỗi 5 giây để đồng bộ Realtime
    const intervalId = setInterval(() => {
      fetchOrders();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [statusFilter, riskFilter, hubFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Matching Wireframe 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Global Order List</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage and monitor all active logistical operations across hubs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FILTER BAR MATCHING WIREFRAME 3 */}
      <form onSubmit={handleSearchSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="sm:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tracking / Phone / Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none placeholder:text-slate-600 font-mono"
          />
        </div>

        {/* Status Select */}
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="CREATED">CREATED</option>
            <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
            <option value="READY_TO_PICK">READY_TO_PICK</option>
            <option value="PICKING">PICKING</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        {/* Risk Flag Select */}
        <div className="sm:col-span-2">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none"
          >
            <option value="ANY">Any Risk</option>
            <option value="COD_ANOMALY">COD Anomaly</option>
            <option value="FEE_WARNING">Fee Warning</option>
            <option value="MANUAL_ROUTING">Manual Routing</option>
          </select>
        </div>

        {/* Hub Select */}
        <div className="sm:col-span-2">
          <select
            value={hubFilter}
            onChange={(e) => setHubFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none font-mono"
          >
            <option value="GLOBAL">Global View</option>
            <option value="HUB_HAN_01">HUB_HAN_01</option>
            <option value="HUB_SGN_01">HUB_SGN_01</option>
            <option value="HUB_DAD_01">HUB_DAD_01</option>
          </select>
        </div>

        {/* More Filters Button */}
        <div className="sm:col-span-1 flex justify-end">
          <button
            type="submit"
            className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md"
          >
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>
      </form>

      {/* DATA TABLE MATCHING WIREFRAME 3 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-[10px] font-black tracking-wider text-slate-400 uppercase border-b border-slate-800">
                <th className="py-4 px-4">TRACKING / DATE</th>
                <th className="py-4 px-4">SELLER INFO</th>
                <th className="py-4 px-4">RECIPIENT</th>
                <th className="py-4 px-4">WEIGHT (ACT/VOL)</th>
                <th className="py-4 px-4">COD / FEES</th>
                <th className="py-4 px-4">STATUS & RISK</th>
                <th className="py-4 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
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
                    <tr key={ord._id || Math.random()} className="hover:bg-slate-800/40 transition-colors">
                      {/* Tracking / Date */}
                      <td className="py-4 px-4">
                        <span className="font-mono font-black text-blue-400 block">{ord.trackingCode}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleString('vi-VN') : 'N/A'}
                        </span>
                      </td>

                      {/* Seller Info */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-200 block">{sellerName}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">Hub: {ord.pickupHub || 'N/A'}</span>
                      </td>

                      {/* Recipient */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-200 block">{ord.deliveryAddress?.fullName || 'Khách Nhận'}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                          {ord.deliveryAddress?.district || ''}, {ord.deliveryAddress?.province || ''}
                        </span>
                      </td>

                      {/* Weight (Act/Vol) */}
                      <td className="py-4 px-4 font-mono text-[11px]">
                        <span className="block text-slate-300 font-bold">{ord.actualWeight || 0} kg</span>
                        <span className="block text-slate-500 text-[10px]">{ord.volumetricWeight || 0} kg</span>
                      </td>

                      {/* COD / Fees */}
                      <td className="py-4 px-4 font-mono">
                        <span className="block font-black text-amber-400">{formatCurrency(ord.codAmount || 0)}</span>
                        <span className="block text-[10px] text-slate-400">Fee: {formatCurrency(ord.shippingFee || 0)}</span>
                      </td>

                      {/* Status & Risk Badges (Matching Wireframe 3) */}
                      <td className="py-4 px-4 space-y-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            ord.status === 'PENDING_VERIFICATION'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : ord.status === 'CANCELLED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {ord.status}
                        </span>

                        {hasRisk && (
                          <div className="flex flex-wrap gap-1">
                            {ord.flagCodAnomaly && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" /> COD Anomaly
                              </span>
                            )}
                            {ord.flagFeeWarning && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Fee Ratio Warning
                              </span>
                            )}
                            {ord.needsManualRouting && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
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
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-md shadow-amber-500/20"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> APPROVE
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/admin/orders/${ord._id}/review`)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
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
        <div className="bg-slate-950/80 px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {orders.length} orders</span>
          <div className="flex items-center gap-2">
            <button disabled className="p-1.5 rounded-lg bg-slate-800 text-slate-500 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled className="p-1.5 rounded-lg bg-slate-800 text-slate-500 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
