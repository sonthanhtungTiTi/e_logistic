import React, { useState, useEffect, useCallback } from 'react';
import {
  Bike,
  Truck,
  UserCheck,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  Store,
  CheckCircle2,
  User,
  Send,
  SlidersHorizontal,
  Zap,
  CheckCheck,
  X,
  AlertCircle,
  Scale
} from 'lucide-react';
import { toast } from 'sonner';
import {
  driverManagerApi,
  type DriverInfo,
  type AutoAssignPreviewResponse
} from '../../api/driverManager.api';
import type { PendingOrder } from '../../api/orderManager.api';
import { MasterOrderManager } from '../../components/admin/MasterOrderManager';
import { INITIAL_ORDERS } from '../../mockData';

export const DispatchControlPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PICKUP_DISPATCH' | 'MASTER_DISPATCH'>('PICKUP_DISPATCH');

  // Real MongoDB State
  const [approvedOrders, setApprovedOrders] = useState<PendingOrder[]>([]);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [provinceFilter, setProvinceFilter] = useState<string>('');

  // Auto-Assign Batch State
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<AutoAssignPreviewResponse | null>(null);
  const [editableAssignments, setEditableAssignments] = useState<Record<string, string>>({});

  // Mock State for Master Dispatcher tab
  const [mockOrders, setMockOrders] = useState(INITIAL_ORDERS);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, driverRes] = await Promise.all([
        driverManagerApi.getPendingPickupAssignments({
          search: searchTerm.trim() || undefined,
          province: provinceFilter.trim() || undefined,
          limit: 50,
        }),
        driverManagerApi.getDriversByArea({
          province: provinceFilter.trim() || undefined,
        }),
      ]);

      setApprovedOrders(orderRes.orders || []);
      setDrivers(driverRes.drivers || []);
      if (driverRes.drivers && driverRes.drivers.length > 0 && !selectedDriverId) {
        setSelectedDriverId(driverRes.drivers[0]._id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải dữ liệu điều phối');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, provinceFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrderIds(approvedOrders.map((o) => o._id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedDriver = drivers.find((d) => d._id === selectedDriverId);

  const handleAssignPickup = async (orderIdsToAssign: string[], targetDriverId?: string) => {
    const driverId = targetDriverId || selectedDriverId;
    if (!driverId) {
      toast.error('Vui lòng chọn một tài xế để phân công');
      return;
    }
    if (orderIdsToAssign.length === 0) {
      toast.error('Vui lòng chọn ít nhất một đơn hàng');
      return;
    }

    setAssigning(true);
    try {
      const res = await driverManagerApi.assignPickup(orderIdsToAssign, driverId);
      const driverObj = drivers.find((d) => d._id === driverId);
      toast.success(
        res.message ||
          `Đã phân công ${res.successCount || orderIdsToAssign.length} đơn cho tài xế [${
            driverObj?.fullName || driverObj?.email
          }] thành công!`
      );
      setSelectedOrderIds((prev) => prev.filter((id) => !orderIdsToAssign.includes(id)));
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi phân công tài xế');
    } finally {
      setAssigning(false);
    }
  };

  // Auto-Assign Batch Handlers
  const handleOpenAutoAssignPreview = async () => {
    setLoadingPreview(true);
    setIsPreviewOpen(true);
    try {
      const res = await driverManagerApi.autoAssignPreview({
        orderIds: selectedOrderIds.length > 0 ? selectedOrderIds : undefined,
        province: provinceFilter.trim() || undefined,
      });
      setPreviewData(res);
      const initialMap: Record<string, string> = {};
      (res.assignments || []).forEach((a) => {
        initialMap[a.orderId] = a.suggestedDriverId;
      });
      setEditableAssignments(initialMap);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tính toán phương án phân công tự động');
      setIsPreviewOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommitAutoAssign = async () => {
    const assignmentsToCommit = Object.entries(editableAssignments)
      .filter(([_, driverId]) => Boolean(driverId))
      .map(([orderId, driverId]) => ({ orderId, driverId }));

    if (assignmentsToCommit.length === 0) {
      toast.error('Không có đơn hàng nào được chọn tài xế để phân công');
      return;
    }

    setIsCommitting(true);
    try {
      const res = await driverManagerApi.autoAssignCommit(assignmentsToCommit);
      toast.success(res.message || `Đã phân công tự động thành công ${res.successCount} đơn hàng!`);
      setIsPreviewOpen(false);
      setSelectedOrderIds([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi xác nhận phân công tự động');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Bike className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Điều Phối Thu Gom Hàng Tận Nhà (First-Mile Pickup)
              </h1>
              <p className="text-xs text-slate-400">
                Phân công đội tài xế xe máy đến tận nhà/cửa hàng Shop lấy bưu phẩm sau khi đơn được duyệt (APPROVED ➔ ASSIGNED_TO_PICKUP)
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PICKUP_DISPATCH')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PICKUP_DISPATCH'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Phân Công Gom Hàng (Xe Máy)</span>
            {approvedOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-900 text-purple-200 text-[10px] font-mono">
                {approvedOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('MASTER_DISPATCH')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'MASTER_DISPATCH'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Giám Sát Toàn Tuyến (Master)</span>
          </button>
        </div>
      </div>

      {/* Logistics Tier Policy Guide Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Bike className="w-4 h-4" />
          </span>
          <span>
            <strong className="text-emerald-400">Chặng Gom Hàng Tận Nơi:</strong> Phân công <strong>Xe máy</strong> luồn lách ngõ hẻm vào tận nơi lấy hàng của Shop (giới hạn an toàn &le; 30kg/đơn).
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Truck className="w-4 h-4" />
          </span>
          <span>
            <strong className="text-blue-400">Chặng Luân Chuyển Liên Kho:</strong> Dùng <strong>Xe tải</strong> chuyên chở bao hàng giữa các kho/Hub bưu cục (quản lý tại Outbound Trips).
          </span>
        </div>
      </div>

      {activeTab === 'MASTER_DISPATCH' ? (
        <MasterOrderManager
          orders={mockOrders as any}
          onUpdateStatus={(id, st) =>
            setMockOrders((prev) =>
              prev.map((o) => ((o.id || o._id) === id ? { ...o, status: st } : o))
            )
          }
          onAssignDriver={(id, name) =>
            setMockOrders((prev) =>
              prev.map((o) =>
                (o.id || o._id) === id ? { ...o, driverName: name, status: 'IN_TRANSIT' } : o
              )
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Dispatch Assignment Control Bar */}
          <div className="bg-gradient-to-r from-purple-950/50 via-slate-900 to-slate-950 border border-purple-500/30 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">Tài xế nhận lệnh:</span>
              </div>

              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-purple-400 min-w-[320px]"
              >
                {drivers.length === 0 ? (
                  <option value="">Chưa có tài xế nào khả dụng</option>
                ) : (
                  drivers.map((drv) => {
                    const count = drv.activeOrdersCount ?? 0;
                    const loadLabel =
                      count === 0
                        ? '🟢 Rảnh (0 đơn gom)'
                        : count < 5
                        ? `🟡 Đang gom ${count} đơn`
                        : `🔴 Bận (${count} đơn)`;
                    const areaSummary =
                      drv.serviceAreas && drv.serviceAreas.length > 0
                        ? `[${drv.serviceAreas.map((a) => a.district).slice(0, 2).join(', ')}]`
                        : '';
                    const plate = drv.vehicleInfo?.licensePlate ? `[${drv.vehicleInfo.licensePlate}]` : '[Xe máy]';
                    return (
                      <option key={drv._id} value={drv._id}>
                        🏍️ {drv.fullName} {plate} {areaSummary} - {loadLabel}
                      </option>
                    );
                  })
                )}
              </select>

              {selectedDriver && (
                <div className="hidden sm:flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-xl bg-purple-900/30 border border-purple-500/30 text-purple-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    Ưu tiên tài xế xe máy ít đơn nhất: <strong className="text-white">{selectedDriver.fullName}</strong> ({selectedDriver.activeOrdersCount || 0} đơn đang gom)
                  </span>
                </div>
              )}

              <button
                onClick={() => handleAssignPickup(selectedOrderIds)}
                disabled={assigning || selectedOrderIds.length === 0 || !selectedDriverId}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {assigning
                    ? 'Đang phân công...'
                    : `Gán ${selectedOrderIds.length} Đơn Cho Tài Xế Đang Chọn`}
                </span>
              </button>

              <button
                onClick={handleOpenAutoAssignPreview}
                disabled={loadingPreview || approvedOrders.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Tự động chia đơn công bằng (Weighted Round-Robin) theo khu vực và tải trọng"
              >
                <Zap className="w-4 h-4 text-white fill-white" />
                <span>
                  {selectedOrderIds.length > 0
                    ? `⚡ Phân Công Tự Động (${selectedOrderIds.length} đơn)`
                    : `⚡ Phân Công Tự Động (${approvedOrders.length} đơn)`}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo mã vận đơn, tên Shop, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-purple-500 outline-none placeholder:text-slate-600 font-mono"
              />
            </div>

            <div className="w-48">
              <input
                type="text"
                placeholder="Lọc theo Tỉnh/Thành..."
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-purple-500 outline-none placeholder:text-slate-600"
              />
            </div>

            <div className="text-xs text-slate-400 font-bold px-2">
              Đơn đã duyệt chờ phân tài xế: <span className="text-purple-400 font-mono text-sm">{approvedOrders.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={approvedOrders.length > 0 && selectedOrderIds.length === approvedOrders.length}
                        onChange={handleSelectAll}
                        disabled={approvedOrders.length === 0}
                        className="rounded border-slate-700 bg-slate-950 text-purple-500 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5">Mã Vận Đơn</th>
                    <th className="p-3.5">Shop / Địa Chỉ Lấy Hàng</th>
                    <th className="p-3.5">Nơi Giao Đến</th>
                    <th className="p-3.5">Trọng Lượng & COD</th>
                    <th className="p-3.5 text-right">Thao Tác Nhanh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-2" />
                        <p className="font-semibold text-xs text-slate-300">Đang tải danh sách đơn đã duyệt...</p>
                      </td>
                    </tr>
                  ) : approvedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-16 text-center text-slate-500 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-emerald-400 mx-auto">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-200">Không có đơn hàng nào chờ phân tài xế gom</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Tất cả đơn hàng đã được chỉ định tài xế hoặc chưa có đơn nào được duyệt (APPROVED).
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    approvedOrders.map((ord) => {
                      const isSelected = selectedOrderIds.includes(ord._id);
                      return (
                        <tr
                          key={ord._id}
                          className={`transition ${
                            isSelected ? 'bg-purple-950/20 border-l-2 border-l-purple-500' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(ord._id)}
                              className="rounded border-slate-700 bg-slate-950 text-purple-500 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>

                          <td className="p-3.5">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono font-bold text-cyan-400 text-sm">{ord.trackingCode}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  APPROVED
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
                                <Store className="w-3.5 h-3.5 text-blue-400" />
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
                              <div className="text-slate-200">TL: {ord.chargeableWeight || 0} kg</div>
                              <div className="text-blue-400">
                                COD: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ord.codAmount || 0)}
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleAssignPickup([ord._id])}
                              disabled={assigning || !selectedDriverId}
                              title={
                                selectedDriver
                                  ? `Phân công đơn ${ord.trackingCode} cho tài xế ${selectedDriver.fullName} (${selectedDriver.phoneNumber || selectedDriver.email})`
                                  : 'Vui lòng chọn tài xế ở thanh điều khiển phía trên'
                              }
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>
                                Gán cho {selectedDriver ? (selectedDriver.fullName.split(' ').slice(-2).join(' ') || selectedDriver.fullName) : 'Tài Xế'}
                              </span>
                            </button>
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

      {/* AUTO-ASSIGN PREVIEW & COMMIT MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-blue-500/40 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  <Zap className="w-6 h-6 fill-blue-400 text-blue-400" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">
                      Phương Án Phân Công Xe Máy Gom Hàng Tự Động
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                      Weighted Round-Robin
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Cân bằng tải ảo đội xe máy, ưu tiên tài xế rảnh, đúng địa bàn và nằm trong giới hạn an toàn xe máy (&le;30kg)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {loadingPreview ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mx-auto" />
                  <p className="font-bold text-sm text-slate-200">Đang tính toán phân bổ tối ưu...</p>
                  <p className="text-xs text-slate-400">
                    Hệ thống đang quét khu vực serviceAreas, kiểm tra giới hạn an toàn xe máy và quota của từng tài xế
                  </p>
                </div>
              ) : previewData ? (
                <>
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                      <span className="text-[11px] font-semibold text-slate-400 block">Tổng đơn xét duyệt</span>
                      <span className="text-xl font-black text-white font-mono">{previewData.totalOrders}</span>
                    </div>

                    <div className="bg-slate-950/60 border border-emerald-500/30 rounded-2xl p-3">
                      <span className="text-[11px] font-semibold text-slate-400 block">Đã có phương án</span>
                      <span className="text-xl font-black text-emerald-400 font-mono">{previewData.assignedCount} đơn</span>
                    </div>

                    <div className={`bg-slate-950/60 border rounded-2xl p-3 ${
                      previewData.unassignedCount > 0 ? 'border-rose-500/40' : 'border-slate-800'
                    }`}>
                      <span className="text-[11px] font-semibold text-slate-400 block">Chưa thể gán</span>
                      <span className={`text-xl font-black font-mono ${
                        previewData.unassignedCount > 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {previewData.unassignedCount} đơn
                      </span>
                    </div>

                    <div className="bg-slate-950/60 border border-purple-500/30 rounded-2xl p-3">
                      <span className="text-[11px] font-semibold text-slate-400 block">Tài xế xe máy tham gia</span>
                      <span className="text-xl font-black text-purple-400 font-mono">
                        {(previewData.driversSummary || []).filter((d) => d.newAssignedInBatch > 0).length} tài xế
                      </span>
                    </div>
                  </div>

                  {/* Driver Workload Distribution Pills */}
                  {previewData.driversSummary && previewData.driversSummary.length > 0 && (
                    <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-2xl space-y-2">
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5" /> Phân Bổ Ca Gom Xe Máy Đợt Này (Tối đa 20 đơn/ca):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {previewData.driversSummary.map((d) => (
                          <div
                            key={d.driverId}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 ${
                              d.newAssignedInBatch > 0
                                ? 'bg-purple-900/40 border-purple-500/40 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                          >
                            <span>🏍️ {d.fullName}:</span>
                            {d.newAssignedInBatch > 0 ? (
                              <span className="font-mono text-emerald-400 font-bold">
                                +{d.newAssignedInBatch} đơn (tổng: {d.totalVirtualOrders})
                              </span>
                            ) : (
                              <span className="font-mono text-slate-500">0 đơn</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Proposed Assignments Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Danh Sách Đề Xuất Phân Công ({previewData.assignments.length})
                      </span>
                      <span className="text-[11px] text-slate-400 italic">
                        * Bạn có thể đổi tài xế khác trực tiếp trên từng đơn nếu cần
                      </span>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto max-h-[360px]">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400">
                            <tr>
                              <th className="p-3">Mã Vận Đơn</th>
                              <th className="p-3">Shop / Nơi Lấy</th>
                              <th className="p-3">Trọng Lượng</th>
                              <th className="p-3">Tài Xế Đề Xuất (Có thể đổi)</th>
                              <th className="p-3">Điểm &amp; Lý Do Đề Xuất</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {previewData.assignments.map((item) => (
                              <tr key={item.orderId} className="hover:bg-slate-800/30 transition">
                                <td className="p-3">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-mono font-bold text-cyan-400">{item.trackingCode}</span>
                                    <span className="text-[9px] font-bold text-indigo-300">
                                      {item.routeType || 'HUB_ROUTED'}
                                    </span>
                                  </div>
                                </td>

                                <td className="p-3">
                                  <div className="text-slate-300 font-medium">
                                    {item.pickupAddress?.fullName}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {item.pickupAddress?.district}, {item.pickupAddress?.province}
                                  </div>
                                </td>

                                <td className="p-3 font-mono text-slate-300">
                                  {item.chargeableWeight || 1} kg
                                </td>

                                <td className="p-3">
                                  <select
                                    value={editableAssignments[item.orderId] || item.suggestedDriverId}
                                    onChange={(e) =>
                                      setEditableAssignments((prev) => ({
                                        ...prev,
                                        [item.orderId]: e.target.value,
                                      }))
                                    }
                                    className="bg-slate-900 border border-purple-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-purple-400 min-w-[200px]"
                                  >
                                    {drivers.map((d) => (
                                      <option key={d._id} value={d._id}>
                                        🏍️ {d.fullName} ({d.phoneNumber || d.email})
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                <td className="p-3">
                                  <div className="space-y-0.5">
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold font-mono">
                                      Score: {item.score}
                                    </span>
                                    <div className="text-[11px] text-slate-400 mt-1">{item.reason}</div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Unassigned Warnings */}
                  {previewData.unassigned && previewData.unassigned.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>Các đơn chưa thể gán tự động ({previewData.unassigned.length} đơn):</span>
                      </div>
                      <div className="divide-y divide-rose-950/40 text-xs">
                        {previewData.unassigned.map((u) => (
                          <div key={u.orderId} className="py-2 flex items-center justify-between gap-4">
                            <span className="font-mono font-bold text-slate-200">{u.trackingCode}</span>
                            <span className="text-slate-400">
                              {u.pickupAddress?.district}, {u.pickupAddress?.province}
                            </span>
                            <span className="text-rose-300 font-semibold">{u.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Bấm <strong>Xác Nhận</strong> sẽ lưu phân công vào Database và cập nhật lập tức sang App Tài xế.
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  disabled={isCommitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>

                <button
                  onClick={handleCommitAutoAssign}
                  disabled={
                    isCommitting ||
                    !previewData ||
                    previewData.assignedCount === 0 ||
                    Object.keys(editableAssignments).length === 0
                  }
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>
                    {isCommitting
                      ? 'Đang lưu vào hệ thống...'
                      : `Xác Nhận & Gán ${Object.keys(editableAssignments).length} Đơn Hàng`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchControlPage;
