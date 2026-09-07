import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Search,
  RefreshCw,
  Clock,
  MapPin,
  Package,
  Phone,
  Store,
  ShieldCheck,
  CheckCheck,
  Eye,
  X,
  Truck,
  Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { orderManagerApi, type PendingOrder } from '../../api/orderManager.api';

export const OrderApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED'>('PENDING');

  // Pending Orders State
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Approved History State
  const [approvedOrders, setApprovedOrders] = useState<PendingOrder[]>([]);
  const [loadingApproved, setLoadingApproved] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Detail Modal
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<PendingOrder | null>(null);

  // Fetch Pending Orders
  const fetchPendingOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderManagerApi.getPendingApproval({
        search: searchTerm.trim() || undefined,
        province: provinceFilter.trim() || undefined,
        limit: 50,
      });
      setOrders(data.orders || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách đơn chờ duyệt');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, provinceFilter]);

  // Fetch Approved History
  const fetchApprovedOrders = useCallback(async () => {
    setLoadingApproved(true);
    try {
      const res = await orderManagerApi.getApprovedOrders({
        search: searchTerm.trim() || undefined,
        province: provinceFilter.trim() || undefined,
        limit: 50,
      });
      const list = res.data || res.orders || (Array.isArray(res) ? res : []);
      setApprovedOrders(list);
    } catch (err: any) {
      console.warn('Không thể tải lịch sử đơn đã duyệt:', err);
    } finally {
      setLoadingApproved(false);
    }
  }, [searchTerm, provinceFilter]);

  const loadAllData = useCallback(() => {
    fetchPendingOrders();
    fetchApprovedOrders();
  }, [fetchPendingOrders, fetchApprovedOrders]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(orders.map((o) => o._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApproveSingle = async (order: PendingOrder) => {
    setIsApproving(true);
    try {
      await orderManagerApi.bulkApprove([order._id]);
      toast.success(`Đã duyệt thành công đơn hàng [${order.trackingCode}] sang trạng thái APPROVED!`);
      setSelectedIds((prev) => prev.filter((id) => id !== order._id));
      loadAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt đơn hàng');
    } finally {
      setIsApproving(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsApproving(true);
    try {
      const res = await orderManagerApi.bulkApprove(selectedIds);
      toast.success(res.message || `Đã duyệt thành công ${res.approvedCount || selectedIds.length} đơn hàng!`);
      setSelectedIds([]);
      loadAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt hàng loạt');
    } finally {
      setIsApproving(false);
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  // KPI Calculations
  const pendingCount = orders.length;
  const approvedWaitingDispatchCount = approvedOrders.filter((o) => o.status === 'APPROVED').length;
  const assignedDriverCount = approvedOrders.filter((o) =>
    ['ASSIGNED_TO_PICKUP', 'ASSIGNED_TO_PICKUP_AND_DELIVERY', 'PICKING', 'PICKED_UP'].includes(o.status)
  ).length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Duyệt Đơn Hàng (Order Approval)</h1>
              <p className="text-xs text-slate-400">
                Phê duyệt bưu gửi từ các Shop đã đóng gói xong trước khi chuyển sang phân công tài xế thu gom
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'PENDING'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ Phê Duyệt</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-200 text-[10px] font-mono">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'APPROVED'
                ? 'bg-blue-600 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Đã Duyệt &amp; Lịch Sử</span>
            {approvedOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-900 text-blue-200 text-[10px] font-mono">
                {approvedOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              1. Đang Chờ Admin Duyệt
            </span>
            <div className="text-2xl font-black text-amber-400 font-mono">{pendingCount} <span className="text-xs font-normal text-slate-500">đơn</span></div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              2. Đã Duyệt (Chờ Gán Xe)
            </span>
            <div className="text-2xl font-black text-indigo-400 font-mono">{approvedWaitingDispatchCount} <span className="text-xs font-normal text-slate-500">đơn</span></div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              3. Đã Gán Tài Xế Thu Gom
            </span>
            <div className="text-2xl font-black text-purple-400 font-mono">{assignedDriverCount} <span className="text-xs font-normal text-slate-500">đơn</span></div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã vận đơn, tên Shop, SĐT, người nhận..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none placeholder:text-slate-600 font-mono"
          />
        </div>

        <div className="w-48">
          <input
            type="text"
            placeholder="Lọc theo Tỉnh/Thành..."
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none placeholder:text-slate-600"
          />
        </div>

        <button
          onClick={loadAllData}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className={`w-4 h-4 ${loading || loadingApproved ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* TAB 1: PENDING APPROVAL */}
      {activeTab === 'PENDING' && (
        <div className="space-y-4">
          {/* Floating Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl flex items-center justify-between shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center border border-amber-500/40">
                  {selectedIds.length}
                </span>
                <div>
                  <p className="text-xs font-bold text-white">
                    Đã chọn <span className="text-amber-400 font-black">{selectedIds.length}</span> đơn hàng chờ duyệt
                  </p>
                  <p className="text-[10px] text-slate-400">Phê duyệt đồng loạt để chuyển sang danh sách điều phối gom hàng</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkApprove}
                  disabled={isApproving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{isApproving ? 'Đang duyệt...' : `Duyệt ${selectedIds.length} Đơn Đã Chọn`}</span>
                </button>

                <button
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
                >
                  Bỏ Chọn
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={orders.length > 0 && selectedIds.length === orders.length}
                        onChange={handleSelectAll}
                        disabled={orders.length === 0}
                        className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5">Mã Vận Đơn</th>
                    <th className="p-3.5">Shop / Nơi Lấy</th>
                    <th className="p-3.5">Người Nhận / Nơi Giao</th>
                    <th className="p-3.5">Cước &amp; COD</th>
                    <th className="p-3.5">Thời Gian Báo Xong</th>
                    <th className="p-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
                        <p className="font-semibold text-xs text-slate-300">Đang tải danh sách đơn chờ duyệt...</p>
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-16 text-center text-slate-500 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-emerald-400 mx-auto">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-200">Không có đơn hàng nào đang chờ duyệt</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Khi Shop chuẩn bị xong đơn hàng, đơn sẽ hiển thị tại đây để Admin kiểm tra và phê duyệt.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => {
                      const isSelected = selectedIds.includes(ord._id);
                      return (
                        <tr
                          key={ord._id}
                          className={`transition ${isSelected ? 'bg-amber-950/20 border-l-2 border-l-amber-500' : 'hover:bg-slate-800/40'
                            }`}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(ord._id)}
                              className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>

                          <td className="p-3.5">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono font-bold text-cyan-400 text-sm">{ord.trackingCode}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  PENDING_APPROVAL
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {ord.routeType || 'HUB_ROUTED'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-slate-200 font-bold">
                                <Store className="w-3.5 h-3.5 text-amber-400" />
                                {ord.pickupAddress?.fullName || ord.sellerId?.fullName}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span className="font-mono">{ord.pickupAddress?.phone}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                <span>
                                  {ord.pickupAddress?.address}, {ord.pickupAddress?.district}, {ord.pickupAddress?.province}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <div className="text-slate-200 font-bold">{ord.deliveryAddress?.fullName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{ord.deliveryAddress?.phone}</div>
                              <div className="text-[11px] text-slate-400">
                                {ord.deliveryAddress?.district}, {ord.deliveryAddress?.province}
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5 font-mono">
                              <div className="text-emerald-400 font-bold">Cước: {formatCurrency(ord.shippingFee)}</div>
                              <div className="text-amber-400">COD: {formatCurrency(ord.codAmount)}</div>
                              <div className="text-[11px] text-slate-400">TL: {ord.chargeableWeight || 0} kg</div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="text-slate-300 text-xs flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {ord.sellerPreparedAt
                                ? new Date(ord.sellerPreparedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
                                : new Date(ord.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedOrderDetail(ord)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                                title="Xem chi tiết đơn hàng"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleApproveSingle(ord)}
                                disabled={isApproving}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt Đơn
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPROVED & HISTORY */}
      {activeTab === 'APPROVED' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-3.5">Mã Vận Đơn</th>
                    <th className="p-3.5">Trạng Thái Điều Phối</th>
                    <th className="p-3.5">Shop / Nơi Lấy</th>
                    <th className="p-3.5">Người Nhận / Nơi Giao</th>
                    <th className="p-3.5">Cước Phí &amp; COD</th>
                    <th className="p-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingApproved ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                        <p className="font-semibold text-xs text-slate-300">Đang tải danh sách đơn đã duyệt...</p>
                      </td>
                    </tr>
                  ) : approvedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-16 text-center text-slate-500 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 mx-auto">
                          <Archive className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-200">Chưa có đơn hàng nào đã duyệt</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Các đơn sau khi bấm "Duyệt Đơn" sẽ hiển thị tại đây để bạn tiện theo dõi tiến độ gán tài xế.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    approvedOrders.map((ord) => {
                      const isAssigned = ['ASSIGNED_TO_PICKUP', 'ASSIGNED_TO_PICKUP_AND_DELIVERY', 'PICKING', 'PICKED_UP'].includes(ord.status);
                      return (
                        <tr key={ord._id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono font-bold text-cyan-400 text-sm">{ord.trackingCode}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {ord.routeType || 'HUB_ROUTED'}
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            {isAssigned ? (
                              <span className="px-2 py-1 rounded-full font-bold text-[10px] uppercase border inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 border-purple-500/30">
                                <Truck className="w-3 h-3" /> ĐÃ GÁN TÀI XẾ GOM
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full font-bold text-[10px] uppercase border inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                                <CheckCircle2 className="w-3 h-3" /> ĐÃ DUYỆT (CHỜ GÁN XE)
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-slate-200 font-bold">
                                <Store className="w-3.5 h-3.5 text-amber-400" />
                                {ord.pickupAddress?.fullName || ord.sellerId?.fullName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {ord.pickupAddress?.district}, {ord.pickupAddress?.province}
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <div className="text-slate-200 font-bold">{ord.deliveryAddress?.fullName}</div>
                              <div className="text-[11px] text-slate-400">
                                {ord.deliveryAddress?.district}, {ord.deliveryAddress?.province}
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 font-mono">
                            <div className="text-emerald-400 font-bold">{formatCurrency(ord.shippingFee)}</div>
                            <div className="text-amber-400">COD: {formatCurrency(ord.codAmount)}</div>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedOrderDetail(ord)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                                title="Xem chi tiết đơn hàng"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {!isAssigned && (
                                <button
                                  onClick={() => navigate('/admin/dispatch')}
                                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-purple-600/30 transition cursor-pointer"
                                  title="Chuyển sang màn hình điều phối để gán tài xế"
                                >
                                  <Truck className="w-3.5 h-3.5" /> Phân Tài Xế Ngay
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
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white font-mono">
                  Chi Tiết Đơn Hàng #{selectedOrderDetail.trackingCode}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase">Thông tin Shop (Người Gửi)</span>
                <p className="font-bold text-white text-xs">{selectedOrderDetail.pickupAddress?.fullName}</p>
                <p className="text-slate-400 font-mono">{selectedOrderDetail.pickupAddress?.phone}</p>
                <p className="text-slate-400">{selectedOrderDetail.pickupAddress?.address}, {selectedOrderDetail.pickupAddress?.district}, {selectedOrderDetail.pickupAddress?.province}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-cyan-400 uppercase">Thông tin Người Nhận</span>
                <p className="font-bold text-white text-xs">{selectedOrderDetail.deliveryAddress?.fullName}</p>
                <p className="text-slate-400 font-mono">{selectedOrderDetail.deliveryAddress?.phone}</p>
                <p className="text-slate-400">{selectedOrderDetail.deliveryAddress?.address}, {selectedOrderDetail.deliveryAddress?.district}, {selectedOrderDetail.deliveryAddress?.province}</p>
              </div>
            </div>

            {/* Items */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sản phẩm bưu gửi</span>
              <div className="divide-y divide-slate-800">
                {(selectedOrderDetail.items || []).map((it, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between">
                    <span className="text-slate-200">{it.name} (x{it.quantity})</span>
                    <span className="font-mono text-slate-400">{it.weight} kg</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials */}
            <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">CƯỚC PHÍ</span>
                <span className="text-emerald-400 font-bold text-sm">{formatCurrency(selectedOrderDetail.shippingFee)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TIỀN THU HỘ (COD)</span>
                <span className="text-amber-400 font-bold text-sm">{formatCurrency(selectedOrderDetail.codAmount)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TRỌNG LƯỢNG</span>
                <span className="text-cyan-400 font-bold text-sm">{selectedOrderDetail.chargeableWeight || 0} kg</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                Đóng
              </button>
              {selectedOrderDetail.status === 'PENDING_APPROVAL' ? (
                <button
                  onClick={() => {
                    const target = selectedOrderDetail;
                    setSelectedOrderDetail(null);
                    handleApproveSingle(target);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Phê Duyệt Đơn Này
                </button>
              ) : selectedOrderDetail.status === 'APPROVED' ? (
                <button
                  onClick={() => {
                    setSelectedOrderDetail(null);
                    navigate('/admin/dispatch');
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Truck className="w-4 h-4" /> Sang Điều Phối Gán Tài Xế
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderApprovalPage;
