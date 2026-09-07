import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  RefreshCw,
  Search,
  Scale,
  DollarSign,
  TrendingDown,
  Clock,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { axiosClient } from '../../api/axiosClient';

interface OrderReview {
  _id: string;
  trackingCode: string;
  status: string;
  actualWeight: number;
  chargeableWeight?: number;
  codAmount: number;
  goodsValue: number;
  shippingFee?: number;
  sellerId?: {
    _id?: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    companyName: string;
    kycStatus: string;
  };
  pickupAddress?: {
    fullName: string;
    phone: string;
    address: string;
    ward: string;
    district: string;
    province: string;
  };
  deliveryAddress?: {
    fullName: string;
    phone: string;
    address: string;
    ward: string;
    district: string;
    province: string;
  };
  riskFlags: string[];
  riskViolationReason?: string;
  rejectionReason?: string;
  cancelReason?: string;
  cancelNote?: string;
  rejectedBy?: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  rejectedAt?: string;
  cancelledBy?: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  cancelledAt?: string;
  approvedBy?: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  approvedAt?: string;
  approvalNote?: string;
  createdAt: string;
  updatedAt?: string;
}

interface SellerSla {
  sellerId: string;
  fullName: string;
  companyName: string;
  phone: string;
  kycStatus: string;
  totalOrders: number;
  cancelledOrders: number;
  suspendedOrders: number;
  cancelRate: number;
  isRiskHigh: boolean;
}

interface TabCounts {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  sellerCount: number;
}

type TabType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SLA';

export const VendorOpsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [orders, setOrders] = useState<OrderReview[]>([]);
  const [slaReport, setSlaReport] = useState<SellerSla[]>([]);
  const [counts, setCounts] = useState<TabCounts>({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    sellerCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reject Modal state
  const [rejectModalOrder, setRejectModalOrder] = useState<OrderReview | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  const quickReasons = [
    'Vượt quá kích thước / tải trọng xe máy (>20kg hoặc >80cm)',
    'Seller chưa xác thực danh tính (KYC)',
    'Số tiền thu hộ (COD) bất thường so với giá trị hàng',
    'Địa chỉ giao nhận không thuộc phạm vi phục vụ',
    'Hàng hóa nghi ngờ thuộc danh mục cấm / hạn chế',
  ];

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    if (activeTab === 'PENDING') {
      loadPendingOrders();
    } else if (activeTab === 'APPROVED') {
      loadApprovedOrders();
    } else if (activeTab === 'REJECTED') {
      loadRejectedOrders();
    } else if (activeTab === 'SLA') {
      loadSlaReport();
    }
  }, [activeTab, statusFilter]);

  const fetchCounts = async () => {
    try {
      const res = await axiosClient.get('/vendor-ops/counts');
      if (res.data?.data) {
        setCounts(res.data.data);
      }
    } catch (err) {
      console.warn('Lỗi lấy thống kê số lượng đơn:', err);
    }
  };

  const loadPendingOrders = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/vendor-ops/pending-review', {
        params: { status: statusFilter || undefined },
      });
      setOrders(res.data?.data || []);
      fetchCounts();
    } catch (err: any) {
      console.warn('Lỗi tải danh sách đơn cần duyệt:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedOrders = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/vendor-ops/approved');
      setOrders(res.data?.data || []);
      fetchCounts();
    } catch (err: any) {
      console.warn('Lỗi tải danh sách đơn đã duyệt:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRejectedOrders = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/vendor-ops/rejected');
      setOrders(res.data?.data || []);
      fetchCounts();
    } catch (err: any) {
      console.warn('Lỗi tải danh sách đơn đã từ chối:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSlaReport = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/vendor-ops/sellers/sla');
      setSlaReport(res.data?.data || []);
      fetchCounts();
    } catch (err) {
      console.warn('Lỗi tải báo cáo SLA:', err);
      setSlaReport([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, code: string) => {
    try {
      await axiosClient.post(`/vendor-ops/orders/${id}/approve`, {
        note: 'Quản trị viên thẩm duyệt chấp nhận vận chuyển',
      });
      setMsg({ type: 'success', text: `✅ Đã phê duyệt đơn [${code}] sang trạng thái Sẵn Sàng Lấy Hàng` });
      if (activeTab === 'PENDING') loadPendingOrders();
      fetchCounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi phê duyệt đơn hàng' });
    }
  };

  const openRejectModal = (order: OrderReview) => {
    setRejectModalOrder(order);
    setRejectReason(order.riskViolationReason || quickReasons[0]);
  };

  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return;
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập hoặc chọn lý do từ chối');
      return;
    }

    setIsSubmittingReject(true);
    try {
      await axiosClient.post(`/vendor-ops/orders/${rejectModalOrder._id}/reject`, {
        reason: rejectReason.trim(),
      });
      setMsg({ type: 'success', text: `❌ Đã từ chối đơn hàng [${rejectModalOrder.trackingCode}] thành công` });
      setRejectModalOrder(null);
      setRejectReason('');
      if (activeTab === 'PENDING') loadPendingOrders();
      fetchCounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi từ chối đơn hàng' });
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const filteredOrders = orders.filter((o) => {
    const search = searchTerm.toLowerCase();
    const tracking = o.trackingCode?.toLowerCase() || '';
    const company = o.sellerId?.companyName?.toLowerCase() || '';
    const sellerName = o.sellerId?.fullName?.toLowerCase() || '';
    const reason = (o.rejectionReason || o.riskViolationReason || o.cancelReason || o.cancelNote || '').toLowerCase();
    const approver = (o.approvedBy?.fullName || '').toLowerCase();
    const rejecter = (o.rejectedBy?.fullName || o.cancelledBy?.fullName || '').toLowerCase();

    return (
      tracking.includes(search) ||
      company.includes(search) ||
      sellerName.includes(search) ||
      reason.includes(search) ||
      approver.includes(search) ||
      rejecter.includes(search)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Quản Lý Đơn Hàng & Nhà Cung Cấp (Vendor Ops)</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Thẩm duyệt đơn hàng, theo dõi đơn đã duyệt, đơn từ chối kèm lý do và giám sát SLA Seller
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
          {/* Tab 1: Pending */}
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Đơn Cần Thẩm Duyệt</span>
            {counts.pendingCount > 0 && (
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                  activeTab === 'PENDING' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {counts.pendingCount}
              </span>
            )}
          </button>

          {/* Tab 2: Approved */}
          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Đơn Đã Phê Duyệt</span>
            {counts.approvedCount > 0 && (
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                  activeTab === 'APPROVED' ? 'bg-emerald-950 text-emerald-200' : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {counts.approvedCount}
              </span>
            )}
          </button>

          {/* Tab 3: Rejected */}
          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Đơn Đã Từ Chối</span>
            {counts.rejectedCount > 0 && (
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                  activeTab === 'REJECTED' ? 'bg-rose-950 text-rose-200' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {counts.rejectedCount}
              </span>
            )}
          </button>

          {/* Tab 4: SLA */}
          <button
            onClick={() => setActiveTab('SLA')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'SLA'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Báo Cáo SLA Seller</span>
          </button>
        </div>
      </div>

      {/* Notification Message */}
      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white px-2 py-1">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: PENDING REVIEW */}
      {activeTab === 'PENDING' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm theo mã vận đơn, tên shop, người bán, cảnh báo rủi ro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="">Tất cả trạng thái chờ</option>
                <option value="PENDING_VERIFICATION">Chờ Duyệt (PENDING_VERIFICATION)</option>
                <option value="SUSPENDED_RISK_REVIEW">Đình Chỉ Gian Lận (SUSPENDED)</option>
              </select>

              <button
                onClick={loadPendingOrders}
                title="Làm mới dữ liệu"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Mã Vận Đơn</th>
                  <th className="p-3.5">Nhà Cung Cấp / Seller</th>
                  <th className="p-3.5">Thông Số & COD</th>
                  <th className="p-3.5">Cảnh Báo Rủi Ro</th>
                  <th className="p-3.5 text-right">Thao Tác Duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                      Đang tải danh sách đơn cần thẩm duyệt...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      <div className="max-w-sm mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                        <p className="font-semibold text-slate-300">Không có đơn hàng nào cần thẩm duyệt</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Tất cả đơn hàng rủi ro đã được xử lý hoặc các đơn mới đã được tự động duyệt.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-mono">
                        <span className="font-bold text-white block">{order.trackingCode}</span>
                        <span
                          className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-bold ${
                            order.status === 'SUSPENDED_RISK_REVIEW'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {order.status}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-sans">
                          <Clock className="w-3 h-3" />
                          {formatDate(order.createdAt)}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">
                          {order.sellerId?.companyName || order.sellerId?.fullName || 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-400">{order.sellerId?.phoneNumber}</div>
                        <span
                          className={`text-[10px] inline-block px-1.5 py-0.2 rounded mt-1 font-mono ${
                            order.sellerId?.kycStatus === 'VERIFIED_KYC'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          KYC: {order.sellerId?.kycStatus || 'NOT_SUBMITTED'}
                        </span>
                      </td>

                      <td className="p-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Scale className="w-3.5 h-3.5 text-slate-500" />
                          <span>{order.actualWeight} kg</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          <span>COD: {order.codAmount?.toLocaleString('vi-VN')} đ</span>
                        </div>
                        {order.goodsValue > 0 && (
                          <div className="text-[10px] text-slate-400">
                            Khai giá: {order.goodsValue?.toLocaleString('vi-VN')} đ
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {order.riskFlags?.map((flag, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] font-bold bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                        {order.riskViolationReason && (
                          <p className="text-[11px] text-amber-300/80 italic mt-1 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                            {order.riskViolationReason}
                          </p>
                        )}
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleApprove(order._id, order.trackingCode)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow"
                        >
                          Duyệt Đơn
                        </button>
                        <button
                          onClick={() => openRejectModal(order)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition"
                        >
                          Từ Chối
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: APPROVED ORDERS (ĐÃ PHÊ DUYỆT) */}
      {activeTab === 'APPROVED' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm theo mã vận đơn, tên shop, người duyệt, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadApprovedOrders}
                title="Làm mới dữ liệu"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Mã Vận Đơn</th>
                  <th className="p-3.5">Nhà Cung Cấp / Seller</th>
                  <th className="p-3.5">Thông Số & COD</th>
                  <th className="p-3.5">Cảnh Báo Đã Xử Lý</th>
                  <th className="p-3.5">Thông Tin Phê Duyệt</th>
                  <th className="p-3.5 text-right">Trạng Thái Hiện Tại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                      Đang tải danh sách đơn đã duyệt...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Chưa có đơn hàng nào trong danh sách đã phê duyệt.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-mono">
                        <span className="font-bold text-white block">{order.trackingCode}</span>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-sans">
                          <Calendar className="w-3 h-3" />
                          Tạo: {formatDate(order.createdAt)}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">
                          {order.sellerId?.companyName || order.sellerId?.fullName || 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-400">{order.sellerId?.phoneNumber}</div>
                        <span className="text-[10px] text-cyan-400 font-mono">
                          KYC: {order.sellerId?.kycStatus || 'NOT_SUBMITTED'}
                        </span>
                      </td>

                      <td className="p-3.5 space-y-1">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Scale className="w-3.5 h-3.5 text-slate-500" />
                          <span>{order.actualWeight} kg</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-300">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          <span>COD: {order.codAmount?.toLocaleString('vi-VN')} đ</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {order.riskFlags && order.riskFlags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {order.riskFlags.map((flag, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Đơn chuẩn (Không có cờ)</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-[11px]">
                          <div className="flex items-center gap-1 text-emerald-300 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{order.approvalNote || 'Đạt chuẩn kiểm duyệt'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between gap-2">
                            <span>Duyệt bởi: <strong className="text-slate-300">{order.approvedBy?.fullName || 'Quản trị viên'}</strong></span>
                            <span>{formatDate(order.approvedAt || order.updatedAt)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-right font-mono">
                        <span className="inline-block px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REJECTED ORDERS (ĐÃ TỪ CHỐI & LÝ DO) */}
      {activeTab === 'REJECTED' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm theo mã vận đơn, tên shop, lý do từ chối, người từ chối..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadRejectedOrders}
                title="Làm mới dữ liệu"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Mã Vận Đơn</th>
                  <th className="p-3.5">Nhà Cung Cấp / Seller</th>
                  <th className="p-3.5">Thông Số & COD</th>
                  <th className="p-3.5">Cảnh Báo Rủi Ro</th>
                  <th className="p-3.5 min-w-[280px]">Lý Do Từ Chối (Vi Phạm)</th>
                  <th className="p-3.5 text-right">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-400" />
                      Đang tải danh sách đơn đã từ chối...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Không có đơn hàng nào bị từ chối.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const rejectionText =
                      order.rejectionReason ||
                      order.riskViolationReason ||
                      order.cancelReason ||
                      order.cancelNote ||
                      'Từ chối do không đáp ứng quy chuẩn an toàn vận chuyển';

                    const rejecterName =
                      order.rejectedBy?.fullName ||
                      order.cancelledBy?.fullName ||
                      'Quản trị viên (Admin)';

                    const rejectDate = order.rejectedAt || order.cancelledAt || order.updatedAt;

                    return (
                      <tr key={order._id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3.5 font-mono">
                          <span className="font-bold text-white block">{order.trackingCode}</span>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-sans">
                            <Clock className="w-3 h-3" />
                            {formatDate(order.createdAt)}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">
                            {order.sellerId?.companyName || order.sellerId?.fullName || 'N/A'}
                          </div>
                          <div className="text-[11px] text-slate-400">{order.sellerId?.phoneNumber}</div>
                          <span
                            className={`text-[10px] inline-block px-1.5 py-0.2 rounded mt-1 font-mono ${
                              order.sellerId?.kycStatus === 'VERIFIED_KYC'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            KYC: {order.sellerId?.kycStatus || 'NOT_SUBMITTED'}
                          </span>
                        </td>

                        <td className="p-3.5 space-y-1">
                          <div className="flex items-center gap-1 text-slate-300">
                            <Scale className="w-3.5 h-3.5 text-slate-500" />
                            <span>{order.actualWeight} kg</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-300">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                            <span>COD: {order.codAmount?.toLocaleString('vi-VN')} đ</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {order.riskFlags && order.riskFlags.length > 0 ? (
                              order.riskFlags.map((flag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] font-bold bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30"
                                >
                                  {flag}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Không có cờ</span>
                            )}
                          </div>
                        </td>

                        {/* Lý do từ chối nổi bật */}
                        <td className="p-3.5">
                          <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl text-xs space-y-1.5 shadow-sm">
                            <div className="flex items-start gap-1.5 text-rose-300 font-semibold">
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">{rejectionText}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 border-t border-rose-500/20 pt-1.5 flex flex-wrap items-center justify-between gap-1">
                              <span>
                                Người từ chối: <strong className="text-slate-300">{rejecterName}</strong>
                              </span>
                              <span>{formatDate(rejectDate)}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-mono">
                          <span className="inline-block px-2 py-1 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            CANCELLED
                          </span>
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

      {/* TAB 4: SLA REPORT */}
      {activeTab === 'SLA' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Nhà Cung Cấp / Seller</th>
                  <th className="p-3.5">Trạng Thái KYC</th>
                  <th className="p-3.5">Tổng Số Đơn</th>
                  <th className="p-3.5">Đơn Hủy / Đình Chỉ</th>
                  <th className="p-3.5">Tỷ Lệ Hủy (Cancel Rate)</th>
                  <th className="p-3.5 text-right">Đánh Giá Rủi Ro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                      Đang tải báo cáo SLA Seller...
                    </td>
                  </tr>
                ) : slaReport.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Chưa có dữ liệu thống kê SLA Seller.
                    </td>
                  </tr>
                ) : (
                  slaReport.map((s) => (
                    <tr key={s.sellerId} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{s.companyName}</div>
                        <div className="text-slate-400 text-[11px]">{s.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                            s.kycStatus === 'VERIFIED_KYC'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {s.kycStatus}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-200">{s.totalOrders} đơn</td>
                      <td className="p-3.5">
                        <span className="text-rose-400 font-semibold">{s.cancelledOrders} hủy</span> /{' '}
                        <span className="text-amber-400 font-semibold">{s.suspendedOrders} đình chỉ</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-bold ${
                            s.cancelRate > 15 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {s.cancelRate}%
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {s.isRiskHigh ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-1 rounded-lg">
                            <TrendingDown className="w-3 h-3" /> Cảnh Báo Rủi Ro Cao
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg">
                            <CheckCircle2 className="w-3 h-3" /> Đạt Chuẩn SLA
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <XCircle className="w-5 h-5" />
                <h2 className="text-sm font-black text-white">Từ Chối Phê Duyệt Đơn Hàng</h2>
              </div>
              <button
                onClick={() => setRejectModalOrder(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mã vận đơn:</span>
                  <span className="font-bold text-white">{rejectModalOrder.trackingCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Người bán:</span>
                  <span className="text-slate-200">{rejectModalOrder.sellerId?.companyName || rejectModalOrder.sellerId?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">COD / Trọng lượng:</span>
                  <span className="text-slate-200">{rejectModalOrder.codAmount?.toLocaleString('vi-VN')} đ / {rejectModalOrder.actualWeight} kg</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Chọn nhanh lý do từ chối phổ biến:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickReasons.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRejectReason(r)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition ${
                        rejectReason === r
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nội dung lý do từ chối gửi Seller & lưu Audit Log: <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết từ chối đơn hàng..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject || !rejectReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingReject ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOpsPage;
