import React, { useState, useEffect, useCallback } from 'react';
import { warehouseLookupApi } from '@/api/warehouseLookup.api';
import { toast } from 'sonner';
import {
  Search,
  Package,
  Boxes,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle2,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const WarehouseLookupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'BAGS'>('ORDERS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Data states
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [bagsData, setBagsData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [stats, setStats] = useState<any>(null);

  // Detail modal state
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedBag, setSelectedBag] = useState<any | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehouseLookupApi.getOrders({
        q: searchTerm.trim() || undefined,
        status: statusFilter,
        page,
        limit: 15,
      });
      setOrdersData(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      if (res.data?.stats) setStats(res.data.stats);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, page]);

  const fetchBags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehouseLookupApi.getBags({
        q: searchTerm.trim() || undefined,
        status: statusFilter,
        page,
        limit: 15,
      });
      setBagsData(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tải danh sách bao tải');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, searchTerm]);

  useEffect(() => {
    if (activeTab === 'ORDERS') {
      fetchOrders();
    } else {
      fetchBags();
    }
  }, [activeTab, fetchOrders, fetchBags]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AT_HUB':
      case 'IN_STORAGE':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Đang Trong Kho</span>;
      case 'SORTED':
      case 'READY_FOR_OUTBOUND':
      case 'BAGGED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Đã Phân Loại / Gom Bao</span>;
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Đang Vận Chuyển</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Đã Giao Thành Công</span>;
      case 'OPEN':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Bao Đang Mở</span>;
      case 'SEALED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Đã Niêm Phong Seal</span>;
      case 'CANCELLED':
      case 'RETURNED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Đã Hủy / Hoàn Trả</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <Search className="w-6 h-6 text-blue-500" />
            Tra Cứu Đơn Hàng &amp; Bao Tải Tại Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tra cứu dạng bảng trực quan: Tìm kiếm theo ID đơn, Mã vận đơn hoặc ID bao tải / Mã Seal
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'ORDERS') fetchOrders();
              else fetchBags();
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => {
            setActiveTab('ORDERS');
            setStatusFilter('ALL');
            setSearchTerm('');
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition cursor-pointer ${
            activeTab === 'ORDERS'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          📦 Tra Cứu Kiện Hàng &amp; Đơn Hàng
          {stats?.total !== undefined && activeTab === 'ORDERS' && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-950 text-blue-200 text-[10px] font-mono border border-blue-400/30">
              {pagination.total}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('BAGS');
            setStatusFilter('ALL');
            setSearchTerm('');
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition cursor-pointer ${
            activeTab === 'BAGS'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          🧰 Tra Cứu Bao Tải &amp; Mã Seal
          {activeTab === 'BAGS' && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-950 text-blue-200 text-[10px] font-mono border border-blue-400/30">
              {pagination.total}
            </span>
          )}
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={activeTab === 'ORDERS' ? 'Tìm theo Mã vận đơn, ID đơn, SĐT nhận...' : 'Tìm theo Mã Seal (SEAL-...), mã kiện bên trong...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Trạng thái:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            {activeTab === 'ORDERS' ? (
              <>
                <option value="ALL">Tất cả trạng thái</option>
                <option value="AT_HUB">Đang trong kho (AT_HUB)</option>
                <option value="IN_STORAGE">Lưu kho (IN_STORAGE)</option>
                <option value="SORTED">Đã phân loại (SORTED)</option>
                <option value="BAGGED">Đã đóng bao (BAGGED)</option>
                <option value="READY_FOR_OUTBOUND">Chờ xuất kho (READY_FOR_OUTBOUND)</option>
                <option value="OUT_FOR_DELIVERY">Đang đi giao (OUT_FOR_DELIVERY)</option>
                <option value="DELIVERED">Đã giao thành công (DELIVERED)</option>
                <option value="CANCELLED">Đã hủy đơn (CANCELLED)</option>
              </>
            ) : (
              <>
                <option value="ALL">Tất cả trạng thái</option>
                <option value="OPEN">Đang mở (OPEN)</option>
                <option value="SEALED">Đã niêm phong (SEALED)</option>
                <option value="IN_TRANSIT">Đang trung chuyển (IN_TRANSIT)</option>
                <option value="ARRIVED">Đã đến đích (ARRIVED)</option>
                <option value="OPENED_SORTED">Đã mở &amp; Phân loại (OPENED_SORTED)</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* TABLE VIEW */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {activeTab === 'ORDERS' ? (
          /* BẢNG ĐƠN HÀNG */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Mã Vận Đơn / ID</th>
                  <th className="py-3.5 px-4">Người Nhận / Địa Chỉ</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Khu Vực (Zone)</th>
                  <th className="py-3.5 px-4 text-right">Khối Lượng</th>
                  <th className="py-3.5 px-4 text-right">COD / Phí</th>
                  <th className="py-3.5 px-4">Cập Nhật</th>
                  <th className="py-3.5 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      Đang tải danh sách đơn hàng...
                    </td>
                  </tr>
                ) : ordersData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Package className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  ordersData.map((order) => (
                    <tr key={order._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white text-xs">{order.trackingCode || order.orderCode}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {order._id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{order.recipient?.name || 'Chưa cập nhật'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{order.recipient?.phoneNumber}</span>
                          {order.recipient?.district && (
                            <span className="text-slate-500">• {order.recipient?.district}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-blue-300">
                        {order.currentLocation?.zone || order.pickupAddress?.district || 'Khu tổng'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                        {order.packageDetails?.weight || order.weight || 0.5} kg
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="text-emerald-400 font-bold">
                          {(order.payment?.codAmount || order.codAmount || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap font-mono">
                        {new Date(order.updatedAt || order.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Chi Tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* BẢNG BAO TẢI & SEAL */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Mã Seal / ID Bao</th>
                  <th className="py-3.5 px-4">Hub Xuất Phát &rarr; Hub Đích</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-center">Số Kiện Hàng</th>
                  <th className="py-3.5 px-4 text-right">Tổng Khối Lượng</th>
                  <th className="py-3.5 px-4">Người Niêm Phong</th>
                  <th className="py-3.5 px-4">Thời Điểm Khóa</th>
                  <th className="py-3.5 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      Đang tải danh sách bao tải...
                    </td>
                  </tr>
                ) : bagsData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Boxes className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      Không tìm thấy bao tải nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  bagsData.map((bag) => (
                    <tr key={bag._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-amber-400 text-xs">{bag.sealCode}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {bag._id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                          <span>{bag.originHubId?.name || 'Hub gốc'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-blue-300 font-bold">{bag.destinationHubId?.name || 'Hub đích'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Đích: {bag.destinationHubId?.code || 'HUB_DEST'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(bag.status)}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md">
                          {bag.trackingCodes?.length || 0} / {bag.maxCapacity || 30}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-300">
                        {bag.totalWeightKg || 0} kg
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{bag.createdBy?.fullName || 'Nhân viên kho'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{bag.createdBy?.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap font-mono">
                        {bag.sealedAt ? new Date(bag.sealedAt).toLocaleString('vi-VN') : 'Chưa khóa seal'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedBag(bag)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          Xem Kiện ({bag.trackingCodes?.length || 0})
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Hiển thị trang <strong className="text-white font-mono">{pagination.page}</strong> / <strong className="text-white font-mono">{pagination.totalPages || 1}</strong> (Tổng số: <strong className="text-blue-400 font-mono">{pagination.total}</strong> kết quả)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT ĐƠN HÀNG */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider">CHI TIẾT ĐƠN HÀNG</span>
              <h2 className="text-lg font-mono font-black text-white mt-0.5">{selectedOrder.trackingCode || selectedOrder.orderCode}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Người Gửi</span>
                <p className="font-bold text-white">{selectedOrder.sender?.name || selectedOrder.sellerId?.fullName || 'Seller'}</p>
                <p className="text-slate-400">{selectedOrder.sender?.phoneNumber || selectedOrder.sellerId?.phoneNumber}</p>
                <p className="text-slate-500 text-[11px]">{selectedOrder.pickupAddress?.fullAddress || selectedOrder.sender?.address}</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Người Nhận</span>
                <p className="font-bold text-white">{selectedOrder.recipient?.name}</p>
                <p className="text-slate-400">{selectedOrder.recipient?.phoneNumber}</p>
                <p className="text-slate-500 text-[11px]">{selectedOrder.deliveryAddress?.fullAddress || selectedOrder.recipient?.address}</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Trạng Thái Hiện Tại:</span>
                <div>{getStatusBadge(selectedOrder.status)}</div>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Khối Lượng / Kích Thước:</span>
                <span className="font-mono text-white font-bold">{selectedOrder.packageDetails?.weight || selectedOrder.weight || 0.5} kg</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Tiền Thu Hộ (COD):</span>
                <span className="font-mono text-emerald-400 font-bold">{(selectedOrder.payment?.codAmount || selectedOrder.codAmount || 0).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vị Trí Lưu Kho (Zone):</span>
                <span className="font-mono text-blue-300 font-bold">{selectedOrder.currentLocation?.zone || 'Zone A - Hàng chuẩn'}</span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT BAO TẢI & DANH SÁCH KIỆN */}
      {selectedBag && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedBag(null)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider">CHI TIẾT BAO TẢI NIÊM PHONG</span>
              <h2 className="text-xl font-mono font-black text-amber-300 mt-0.5">{selectedBag.sealCode}</h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>Từ: <strong>{selectedBag.originHubId?.name || 'Hub gốc'}</strong></span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span>Đến: <strong className="text-blue-300">{selectedBag.destinationHubId?.name || 'Hub đích'}</strong></span>
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Danh sách các kiện hàng trong bao ({selectedBag.trackingCodes?.length || 0}):</span>
                <span className="text-[11px] text-blue-400 font-mono font-bold">Tổng: {selectedBag.totalWeightKg || 0} kg</span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {selectedBag.trackingCodes && selectedBag.trackingCodes.length > 0 ? (
                  selectedBag.trackingCodes.map((code: string, idx: number) => (
                    <div
                      key={code}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px]">#{idx + 1}</span>
                        <span className="text-white font-bold">{code}</span>
                      </div>
                      <span className="text-emerald-400 text-[10px] font-sans font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã niêm phong
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4">Bao tải chưa có kiện hàng nào</p>
                )}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedBag(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseLookupPage;
