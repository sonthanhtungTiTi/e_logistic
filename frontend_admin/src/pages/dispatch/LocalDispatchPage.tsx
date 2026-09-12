import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Zap,
  Users,
  Compass,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ShieldCheck,
  Flame,
  TrendingUp,
} from 'lucide-react';
import { axiosClient } from '../../api/axiosClient';

interface Geozone {
  _id: string;
  code: string;
  name: string;
  ward: string;
  district: string;
  province: string;
  subZones: string[];
  stats?: {
    activeShippers: number;
    pendingPickups: number;
    pendingDeliveries: number;
    escalatedCount: number;
  };
}

interface ShipperOverview {
  id: string;
  fullName: string;
  phoneNumber: string;
  role?: string;
  isWorking: boolean;
  activeGeozone?: { name: string; code: string; ward: string };
  operatingArea?: { province?: string; district?: string; ward?: string; subZone?: string };
  pickupQuota: { max: number; current: number; percent: number };
  deliveryQuota: { max: number; current: number; percent: number };
  tripCapacity?: { maxParcels: number; currentParcels: number; maxWeightKg: number; currentWeightKg: number };
  maxWeightCapacityKg: number;
  currentWeightKg: number;
  acceptanceRate: number;
  dispatchRejectionCount: number;
}

interface EscalatedOrder {
  _id: string;
  trackingCode: string;
  status: string;
  actualWeight: number;
  pickupAddress: { fullName: string; phone: string; address: string; ward: string };
  deliveryAddress: { fullName: string; phone: string; address: string; ward: string };
  riskViolationReason?: string;
  dispatchRetryCount: number;
  isRolloverOrder?: boolean;
  rolloverCount?: number;
  rolloverReason?: string;
  agingPriority?: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

interface ZoneChangeRequestItem {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  vehicleInfo?: { licensePlate?: string; vehicleType?: string };
  operatingArea?: { province?: string; district?: string; ward?: string; subZone?: string };
  zoneChangeRequest: {
    requestedArea?: { province?: string; district?: string; ward?: string; subZone?: string };
    reason?: string;
    status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt?: string;
    rejectionReason?: string;
    reviewedAt?: string;
  };
}

export const LocalDispatchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'ZONE_REQUESTS'>('DISPATCH');
  const [geozones, setGeozones] = useState<Geozone[]>([]);
  const [shippers, setShippers] = useState<ShipperOverview[]>([]);
  const [escalatedOrders, setEscalatedOrders] = useState<EscalatedOrder[]>([]);
  const [zoneRequests, setZoneRequests] = useState<ZoneChangeRequestItem[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PICKUP_SHIPPER' | 'DELIVERY_SHIPPER' | 'LOCAL_SHIPPER'>('ALL');
  const [surgeTargetRole, setSurgeTargetRole] = useState<'ALL' | 'PICKUP_SHIPPER' | 'DELIVERY_SHIPPER'>('ALL');
  const [isSpilloverActive, setIsSpilloverActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [surgeQuotaValue, setSurgeQuotaValue] = useState<number>(25);
  const [surgeScope, setSurgeScope] = useState<'ALL' | 'ZONE'>('ALL');
  const [updatingSurge, setUpdatingSurge] = useState<boolean>(false);
  const [sweeping, setSweeping] = useState<boolean>(false);

  const handleOvernightSweep = async () => {
    if (!window.confirm('Xác nhận kích hoạt quét dọn đơn tồn ca & qua ngày (Overnight Rollover Sweep)?\n- Đơn dồn ca/quá hạn sẽ được nâng Aging Boost (+25/+40 điểm)\n- Reset Quota ngày mới cho Shipper')) {
      return;
    }
    setSweeping(true);
    try {
      const res = await axiosClient.post('/dispatch/local/overnight-rollover-sweep', {
        resetShipperQuotas: true,
      });
      setMsg({ type: 'success', text: `🧹 ${res.data?.message || 'Quét dọn đơn tồn ca thành công'}` });
      loadDashboardData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi quét dọn đơn tồn ca' });
    } finally {
      setSweeping(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'DISPATCH') {
      loadDashboardData();
    } else {
      loadZoneRequests();
    }
  }, [activeTab, selectedZoneId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [zoneRes, shipperRes, escRes] = await Promise.all([
        axiosClient.get('/dispatch/local/geozones'),
        axiosClient.get('/dispatch/local/shippers-overview', {
          params: { geozoneId: selectedZoneId || undefined },
        }),
        axiosClient.get('/dispatch/local/escalated-orders'),
      ]);

      setGeozones(zoneRes.data?.data || []);
      setShippers(shipperRes.data?.data || []);
      setEscalatedOrders(escRes.data?.data || []);
    } catch (err) {
      console.warn('Lỗi tải dữ liệu Local Dispatch:', err);
      setGeozones([]);
      setShippers([]);
      setEscalatedOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadZoneRequests = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/dispatch/local/zone-change-requests');
      setZoneRequests(res.data?.data || []);
    } catch (err) {
      console.warn('Lỗi tải danh sách xin đổi khu vực:', err);
      setZoneRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveZoneRequest = async (shipperId: string, name: string) => {
    try {
      await axiosClient.post(`/dispatch/local/zone-change-requests/${shipperId}/approve`);
      setMsg({ type: 'success', text: `✅ Đã phê duyệt chuyển khu vực hoạt động cho Shipper [${name}]` });
      loadZoneRequests();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi phê duyệt yêu cầu' });
    }
  };

  const handleRejectZoneRequest = async (shipperId: string, name: string) => {
    const reason = prompt('Nhập lý do từ chối yêu cầu chuyển khu vực:', 'Khu vực yêu cầu đã đủ nhân sự');
    if (!reason) return;

    try {
      await axiosClient.post(`/dispatch/local/zone-change-requests/${shipperId}/reject`, { reason });
      setMsg({ type: 'success', text: `❌ Đã từ chối yêu cầu chuyển khu vực của Shipper [${name}]` });
      loadZoneRequests();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi từ chối yêu cầu' });
    }
  };

  const handleAutoDispatch = async (orderId: string) => {
    try {
      const res = await axiosClient.post('/dispatch/local/auto-dispatch', {
        orderId,
        taskType: 'PICKUP',
        isSpilloverActive,
      });
      setMsg({ type: 'success', text: `⚡ ${res.data?.message}` });
      loadDashboardData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi điều phối tự động' });
    }
  };

  const handleApproveCancel = async (orderId: string, trackingCode: string) => {
    if (!window.confirm(`Xác nhận duyệt HỦY đơn hàng [${trackingCode}] theo báo cáo của Shipper?`)) return;
    try {
      const res = await axiosClient.post(`/dispatch/local/escalated-orders/${orderId}/approve-cancel`, {
        cancelReason: 'Dispatcher phê duyệt hủy theo báo cáo shipper',
      });
      setMsg({ type: 'success', text: `✅ ${res.data?.message || 'Đã duyệt hủy đơn thành công'}` });
      loadDashboardData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi khi duyệt hủy đơn' });
    }
  };

  const handleRetryPickup = async (orderId: string, trackingCode: string) => {
    try {
      const res = await axiosClient.post(`/dispatch/local/escalated-orders/${orderId}/retry-pickup`);
      setMsg({ type: 'success', text: `🔄 [${trackingCode}]: ${res.data?.message || 'Đã đưa đơn về hàng đợi lấy lại'}` });
      loadDashboardData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi khi đưa đơn về lấy lại' });
    }
  };

  const handleApplySurgeQuota = async (quota: number) => {
    setUpdatingSurge(true);
    try {
      const payload: any = {
        maxPickupQuota: quota,
        reason: quota === 25 ? 'Hạ về mức ngày thường' : quota >= 80 ? `Mega Sale Đội Gom (${quota} đơn)` : `Cao Điểm (${quota} đơn)`,
      };
      if (surgeTargetRole !== 'ALL') {
        payload.targetRole = surgeTargetRole;
      }
      if (surgeScope === 'ZONE' && selectedZoneId) {
        payload.geozoneId = selectedZoneId;
      }
      const res = await axiosClient.patch('/dispatch/local/surge-quota', payload);
      setMsg({ type: 'success', text: `🔥 ${res.data?.message || 'Cập nhật Quota thành công'}` });
      setSurgeQuotaValue(quota);
      loadDashboardData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi cập nhật Quota cao điểm' });
    } finally {
      setUpdatingSurge(false);
    }
  };

  const pendingRequestsCount = zoneRequests.filter((r) => r.zoneChangeRequest?.status === 'PENDING').length;

  const totalActiveShippers = shippers.filter(s => s.isWorking).length;
  const totalEscalated = escalatedOrders.length;
  const totalGeozones = geozones.length;

  return (
    <div className="space-y-6 pb-12">
      {/* TẦNG 1: Page Header & KPI Summary Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Điều Phối Shipper (QL 2)</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Quản trị phân tuyến theo Phường/Khu phố, duyệt đổi địa bàn Shipper &amp; giải tỏa điểm nghẽn First/Last-mile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOvernightSweep}
              disabled={sweeping}
              className="px-3.5 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-purple-950/40"
              title="Quét dọn đơn tồn ca & đơn qua ngày, nâng Aging Boost (+25/+40 điểm) và reset quota ngày mới cho Shipper"
            >
              <Clock className={`w-4 h-4 text-purple-400 ${sweeping ? 'animate-spin' : ''}`} />
              <span>{sweeping ? 'Đang Quét Dọn...' : 'Quét Dọn Đơn Tồn Ca'}</span>
            </button>
            <button
              onClick={activeTab === 'DISPATCH' ? loadDashboardData : loadZoneRequests}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} /> Tải Lại Dữ Liệu
            </button>
          </div>
        </div>

        {/* 5 Thẻ KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Khu Vực Tuyến (Geozone)</span>
              <span className="text-2xl font-black text-white mt-1 block font-mono">{totalGeozones}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Compass className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Shipper Đang Trực</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">{totalActiveShippers}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Đơn Cần Can Thiệp</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block font-mono">{totalEscalated}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Đơn Tồn Ca / Aging Boost</span>
              <span className="text-2xl font-black text-purple-400 mt-1 block font-mono">
                {escalatedOrders.filter(o => o.isRolloverOrder || o.agingPriority === 'HIGH' || o.agingPriority === 'CRITICAL').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between col-span-2 lg:col-span-1">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Đổi Khu Vực Chờ Duyệt</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block font-mono">{pendingRequestsCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Send className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Controls & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('DISPATCH')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'DISPATCH'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Giám Sát &amp; Điều Phối Tuyến</span>
          </button>

          <button
            onClick={() => setActiveTab('ZONE_REQUESTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'ZONE_REQUESTS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Duyệt Đổi Khu Vực Shipper</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-rose-600 text-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white px-2">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: DISPATCH OVERVIEW */}
      {activeTab === 'DISPATCH' && (
        <div className="space-y-6">
          {/* Spillover Routing Toggle */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-blue-400" />
              <div>
                <h3 className="text-xs font-bold text-white">Cơ Chế Phân Luồng Tràn Cụm Tuyến (Spillover Routing)</h3>
                <p className="text-[11px] text-slate-400">
                  Khi bật, đơn hàng tại khu vực quá tải sẽ tự động tràn sang các Shipper trực lân cận trong cùng thành phố
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSpilloverActive(!isSpilloverActive)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isSpilloverActive
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {isSpilloverActive ? 'Đang Bật Mở Rộng' : 'Chỉ Đúng Zone'}
            </button>
          </div>

          {/* Surge Quota Mega Sale Control Card */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/30 border border-amber-500/30 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    Điều Chỉnh Quota Cao Điểm / Mega Sale
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                      Dynamic Surge
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Linh hoạt nâng hạn mức nhận đơn của đội ngũ tài xế hiện có mà không cần tăng chi phí thuê xe ngoài.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Đối tượng:</span>
                  <select
                    value={surgeTargetRole}
                    onChange={(e) => setSurgeTargetRole(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 text-amber-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="ALL">Toàn Bộ Shipper</option>
                    <option value="PICKUP_SHIPPER">Đội Gom (PICKUP_SHIPPER)</option>
                    <option value="DELIVERY_SHIPPER">Đội Giao (DELIVERY_SHIPPER)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Phạm vi:</span>
                  <select
                    value={surgeScope}
                    onChange={(e) => setSurgeScope(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 text-cyan-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="ALL">Toàn Tuyến</option>
                    <option value="ZONE">Theo Cụm Tuyến Đang Chọn</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400">Chọn hạn mức:</span>
              {surgeTargetRole === 'PICKUP_SHIPPER' ? (
                <>
                  <button
                    onClick={() => handleApplySurgeQuota(80)}
                    disabled={updatingSurge}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-slate-950 text-slate-300 hover:text-white border border-slate-800"
                  >
                    <span>80 đơn</span>
                    <span className="text-[9px] text-slate-500">(Chuẩn Gom 2 chuyến)</span>
                  </button>
                  <button
                    onClick={() => handleApplySurgeQuota(120)}
                    disabled={updatingSurge}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>120 đơn</span>
                    <span className="text-[9px] opacity-80">(Mega Sale Gom)</span>
                  </button>
                  <button
                    onClick={() => handleApplySurgeQuota(150)}
                    disabled={updatingSurge}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-black"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>150 đơn</span>
                    <span className="text-[9px] opacity-80">(Đỉnh Điểm Mega Sale)</span>
                  </button>
                </>
              ) : surgeTargetRole === 'DELIVERY_SHIPPER' ? (
                <>
                  <button
                    onClick={() => handleApplySurgeQuota(40)}
                    disabled={updatingSurge}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-slate-950 text-slate-300 hover:text-white border border-slate-800"
                  >
                    <span>40 đơn</span>
                    <span className="text-[9px] text-slate-500">(Chuẩn Giao 2 chuyến)</span>
                  </button>
                  <button
                    onClick={() => handleApplySurgeQuota(55)}
                    disabled={updatingSurge}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-black"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>55 đơn</span>
                    <span className="text-[9px] opacity-80">(Mega Sale Giao)</span>
                  </button>
                  <button
                    onClick={() => handleApplySurgeQuota(65)}
                    disabled={updatingSurge}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-black"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>65 đơn</span>
                    <span className="text-[9px] opacity-80">(Đỉnh Điểm Giao)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleApplySurgeQuota(25)}
                    disabled={updatingSurge}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      surgeQuotaValue === 25
                        ? 'bg-slate-700 text-white ring-1 ring-slate-500'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>25 đơn</span>
                    <span className="text-[9px] text-slate-500 font-normal">(Mặc định)</span>
                  </button>
                  <button
                    onClick={() => handleApplySurgeQuota(35)}
                    disabled={updatingSurge}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      surgeQuotaValue === 35
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                        : 'bg-slate-950 text-amber-400 hover:text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>35 đơn</span>
                    <span className="text-[9px] opacity-80 font-normal">(Chiến Dịch)</span>
                  </button>
                  <button
                    onClick={() => handleApplySurgeQuota(40)}
                    disabled={updatingSurge}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      surgeQuotaValue === 40
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-black'
                        : 'bg-slate-950 text-rose-400 hover:text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>40 đơn</span>
                    <span className="text-[9px] opacity-80 font-normal">(Mega Sale Giao)</span>
                  </button>
                  <button
                    onClick={() => handleApplySurgeQuota(80)}
                    disabled={updatingSurge}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-slate-950 text-amber-400 hover:text-amber-300 border border-amber-500/30"
                  >
                    <span>80 đơn</span>
                    <span className="text-[9px] opacity-80 font-normal">(Chuẩn Gom)</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Escalated Orders Alert Banner */}
          {escalatedOrders.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>CẢNH BÁO ĐIỀU PHỐI: Có {escalatedOrders.length} đơn hàng bị tắc nghẽn cần can thiệp thủ công</span>
                </div>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono font-bold">
                  DISPATCH_ESCALATED
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {escalatedOrders.map((ord) => (
                  <div
                    key={ord._id}
                    className="bg-slate-900/90 border border-rose-500/20 p-3 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>{ord.trackingCode}</span>
                        {ord.agingPriority === 'CRITICAL' && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                            Aging +40
                          </span>
                        )}
                        {(ord.isRolloverOrder || ord.agingPriority === 'HIGH') && ord.agingPriority !== 'CRITICAL' && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                            Tồn Ca +25
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Lấy: {ord.pickupAddress?.address} ({ord.pickupAddress?.ward})
                      </div>
                      <div className="text-[10px] text-rose-300 italic mt-0.5">{ord.riskViolationReason}</div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <button
                        onClick={() => handleApproveCancel(ord._id, ord.trackingCode)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-bold text-[10px] transition shadow cursor-pointer"
                        title="Duyệt HỦY đơn theo báo cáo thất bại của Shipper"
                      >
                        Duyệt Hủy
                      </button>
                      <button
                        onClick={() => handleRetryPickup(ord._id, ord.trackingCode)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 font-bold text-[10px] transition shadow cursor-pointer"
                        title="Trả đơn về hàng đợi READY_TO_PICK với ưu tiên cao"
                      >
                        Lấy Lại
                      </button>
                      <button
                        onClick={() => handleAutoDispatch(ord._id)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] transition shadow cursor-pointer"
                        title="Tự động gán ngay cho Shipper lân cận"
                      >
                        Gán Lại
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Geozone Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {geozones.map((zone) => (
              <div
                key={zone._id}
                onClick={() => setSelectedZoneId(selectedZoneId === zone._id ? '' : zone._id)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  selectedZoneId === zone._id
                    ? 'bg-slate-900 border-cyan-500/50 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                    {zone.code}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">{zone.ward}</span>
                </div>

                <h3 className="font-bold text-white text-sm">{zone.name}</h3>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">Shipper Trực</div>
                    <div className="text-sm font-black text-emerald-400">{zone.stats?.activeShippers || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Chờ Lấy</div>
                    <div className="text-sm font-black text-blue-400">{zone.stats?.pendingPickups || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Chờ Giao</div>
                    <div className="text-sm font-black text-cyan-400">{zone.stats?.pendingDeliveries || 0}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Shippers Load Monitor Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h2 className="font-bold text-white text-sm">Giám Sát Tải Trọng & Ca Trực Shipper Nội Vùng</h2>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    roleFilter === 'ALL' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Tất Cả ({shippers.length})
                </button>
                <button
                  onClick={() => setRoleFilter('PICKUP_SHIPPER')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    roleFilter === 'PICKUP_SHIPPER' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-amber-400 hover:text-amber-300'
                  }`}
                >
                  Đội Gom ({shippers.filter(s => s.role === 'PICKUP_SHIPPER').length})
                </button>
                <button
                  onClick={() => setRoleFilter('DELIVERY_SHIPPER')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    roleFilter === 'DELIVERY_SHIPPER' ? 'bg-blue-500 text-slate-950 font-black' : 'bg-slate-800 text-blue-400 hover:text-blue-300'
                  }`}
                >
                  Đội Giao ({shippers.filter(s => s.role === 'DELIVERY_SHIPPER').length})
                </button>
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Shipper &amp; Vai Trò</th>
                  <th className="p-3.5">Cụm Tuyến / Địa Bàn</th>
                  <th className="p-3.5">Tải Lệnh Lấy (Pickup Quota)</th>
                  <th className="p-3.5">Tải Lệnh Giao (Delivery Quota)</th>
                  <th className="p-3.5">Khối Lượng &amp; Chuyến</th>
                  <th className="p-3.5 text-right">Trạng Thái Ca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shippers
                  .filter((s) => (roleFilter === 'ALL' ? true : s.role === roleFilter))
                  .map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {s.fullName}
                        {s.role === 'PICKUP_SHIPPER' && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                            Đội Gom
                          </span>
                        )}
                        {s.role === 'DELIVERY_SHIPPER' && (
                          <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                            Đội Giao
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px] font-mono">{s.phoneNumber}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="text-slate-200 font-semibold">
                        {s.operatingArea?.subZone || s.activeGeozone?.name || 'Chưa gán zone'}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono">
                        {s.operatingArea?.district ? `${s.operatingArea.district}, ${s.operatingArea.province}` : s.activeGeozone?.code || ''}
                      </div>
                    </td>

                    {/* Pickup Quota Progress */}
                    <td className="p-3.5 w-44">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-300 mb-1">
                        <span>
                          {s.pickupQuota.current} / {s.pickupQuota.max} đơn
                        </span>
                        <span className={s.pickupQuota.percent > 85 ? 'text-rose-400' : 'text-amber-400'}>
                          {s.pickupQuota.percent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.pickupQuota.percent > 85 ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(s.pickupQuota.percent, 100)}%` }}
                        />
                      </div>
                    </td>

                    {/* Delivery Quota Progress */}
                    <td className="p-3.5 w-44">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-300 mb-1">
                        <span>
                          {s.deliveryQuota.current} / {s.deliveryQuota.max} đơn
                        </span>
                        <span className={s.deliveryQuota.percent > 85 ? 'text-rose-400' : 'text-cyan-400'}>
                          {s.deliveryQuota.percent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.deliveryQuota.percent > 85 ? 'bg-rose-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${Math.min(s.deliveryQuota.percent, 100)}%` }}
                        />
                      </div>
                    </td>

                    <td className="p-3.5 space-y-0.5">
                      <div className="text-slate-300">
                        Tải ca: <span className="font-bold text-white">{s.currentWeightKg}</span> / {s.maxWeightCapacityKg} kg
                      </div>
                      {s.tripCapacity && (
                        <div className="text-[10px] text-cyan-300 font-mono">
                          Chuyến: {s.tripCapacity.currentParcels}/{s.tripCapacity.maxParcels} đơn ({s.tripCapacity.currentWeightKg}/{s.tripCapacity.maxWeightKg}kg)
                        </div>
                      )}
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        Uy tín nhận đơn: {s.acceptanceRate}%
                      </div>
                    </td>

                    <td className="p-3.5 text-right">
                      {s.isWorking ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Đang Trực Ca
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-800 px-2.5 py-1 rounded-lg">
                          Tắt Ca
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ZONE CHANGE REQUESTS APPROVAL TABLE */}
      {activeTab === 'ZONE_REQUESTS' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h2 className="font-bold text-white text-sm">Danh Sách Yêu Cầu Xin Chuyển Địa Bàn Của Shipper</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {zoneRequests.filter((r) => r.zoneChangeRequest?.status === 'PENDING').length} đơn đang chờ duyệt
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Shipper</th>
                  <th className="p-3.5">Khu Vực Hiện Tại</th>
                  <th className="p-3.5">Khu Vực Yêu Cầu Chuyển Đến</th>
                  <th className="p-3.5 min-w-[200px]">Lý Do Xin Chuyển</th>
                  <th className="p-3.5">Trạng Thái</th>
                  <th className="p-3.5 text-right">Thao Tác Duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {zoneRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Không có yêu cầu xin chuyển khu vực nào.
                    </td>
                  </tr>
                ) : (
                  zoneRequests.map((req) => {
                    const status = req.zoneChangeRequest?.status;
                    const curArea = req.operatingArea;
                    const reqArea = req.zoneChangeRequest?.requestedArea;

                    return (
                      <tr key={req._id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-white">{req.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{req.phoneNumber}</div>
                          <span className="text-[10px] text-cyan-400 font-mono">
                            {req.vehicleInfo?.licensePlate || req.vehicleInfo?.vehicleType || 'Xe máy'}
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-300">
                          <div>{curArea?.subZone || 'Chưa gán'}</div>
                          <div className="text-[11px] text-slate-400">
                            {curArea?.ward ? `${curArea.ward}, ` : ''}{curArea?.district || ''}, {curArea?.province || ''}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-blue-300">{reqArea?.subZone || 'Tất cả cụm'}</div>
                          <div className="text-[11px] text-slate-300 font-medium">
                            {reqArea?.ward ? `${reqArea.ward}, ` : ''}{reqArea?.district || ''}, {reqArea?.province || ''}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 italic">
                            "{req.zoneChangeRequest?.reason || 'Xin chuyển khu vực công tác'}"
                          </div>
                          {req.zoneChangeRequest?.rejectionReason && (
                            <p className="text-[10px] text-rose-400 mt-1 font-semibold">
                              Lý do từ chối: {req.zoneChangeRequest.rejectionReason}
                            </p>
                          )}
                        </td>

                        <td className="p-3.5">
                          {status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Chờ Duyệt
                            </span>
                          ) : status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Đã Phê Duyệt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> Từ Chối
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right space-x-2">
                          {status === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => handleApproveZoneRequest(req._id, req.fullName)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow cursor-pointer"
                              >
                                Phê Duyệt
                              </button>
                              <button
                                onClick={() => handleRejectZoneRequest(req._id, req.fullName)}
                                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition cursor-pointer"
                              >
                                Từ Chối
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Đã xử lý</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalDispatchPage;
