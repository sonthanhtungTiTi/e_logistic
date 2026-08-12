import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Package, Plus, Search, Filter, DollarSign, CheckCircle2, Truck, X } from 'lucide-react';
import type { Order } from '../types/order.types';
import { orderApi } from '../api/order.api';

interface SellerDashboardProps {
  orders: Order[];
  onCreateOrder: (newOrder: Order) => void;
  onOpenOrderDetails: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onCancelOrder?: (order: Order) => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  orders,
  onCreateOrder,
  onOpenOrderDetails,
  onEditOrder,
  onCancelOrder,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Order Form state
  const [formData, setFormData] = useState({
    senderName: 'Công ty Dược Phẩm An Bình',
    senderPhone: '0901234567',
    senderAddress: '123 Nguyễn Văn Cừ, Q.5, TP.HCM',
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    originCity: 'Hồ Chí Minh',
    destinationCity: 'Hà Nội',
    weightKg: 2.5,
    lengthCm: 30,
    widthCm: 20,
    heightCm: 15,
    serviceType: 'EXPRESS' as const,
  });

  const [formError, setFormError] = useState('');

  // Calculate stats
  const totalOrders = orders.length;
  const inTransitCount = orders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'OUT_FOR_DELIVERY').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const totalCost = orders.reduce((acc, o) => acc + (o.shippingFee || o.cost || 0), 0);

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const code = o.trackingCode || o.trackingNumber || '';
    const recipient = o.deliveryAddress?.fullName || o.recipientName || '';
    const city = o.deliveryAddress?.province || o.destinationCity || '';

    const matchesSearch =
      code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate fees dynamically for new order modal
  const volWeight = Number(((formData.lengthCm * formData.widthCm * formData.heightCm) / 5000).toFixed(2));
  const chargeableWeight = Math.max(formData.weightKg, volWeight);
  const calculatedCost = Math.round(chargeableWeight * (formData.serviceType === 'EXPRESS' ? 38000 : 22000) * (formData.originCity !== formData.destinationCity ? 1.5 : 1));

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipientName.trim()) {
      setFormError('Vui lòng nhập tên người nhận');
      return;
    }
    if (!formData.recipientPhone.trim() || formData.recipientPhone.length < 9) {
      setFormError('Số điện thoại người nhận không hợp lệ');
      return;
    }
    if (!formData.recipientAddress.trim()) {
      setFormError('Vui lòng nhập địa chỉ phát hàng');
      return;
    }

    try {
      const response = await orderApi.createOrder({
        pickupAddress: {
          fullName: formData.senderName,
          phone: formData.senderPhone,
          address: formData.senderAddress,
          ward: 'Phường 1',
          district: 'Quận 5',
          province: formData.originCity,
        },
        deliveryAddress: {
          fullName: formData.recipientName,
          phone: formData.recipientPhone,
          address: formData.recipientAddress,
          ward: 'Phường Hàng Bạc',
          district: 'Quận Hoàn Kiếm',
          province: formData.destinationCity,
        },
        items: [
          {
            name: 'Hàng hóa bưu gửi',
            quantity: 1,
            weight: formData.weightKg,
          },
        ],
        dimensions: {
          length: formData.lengthCm,
          width: formData.widthCm,
          height: formData.heightCm,
        },
        isCod: false,
        codAmount: 0,
        goodsValue: 500000,
      });

      if (response.data?.success && response.data.data) {
        onCreateOrder(response.data.data);
        setShowCreateModal(false);
        setFormError('');
        setFormData({
          ...formData,
          recipientName: '',
          recipientPhone: '',
          recipientAddress: '',
        });
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Không thể tạo đơn hàng trên hệ thống');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase mb-1">
            <Package className="w-3.5 h-3.5" /> Kênh Thương Mại & Chủ Hàng
          </div>
          <h2 className="text-3xl font-extrabold text-white">Quản Lý Vận Đơn & Kho Hàng</h2>
        </div>

        <button
          onClick={() => navigate('/seller/orders/create')}
          className="px-5 py-3 rounded-2xl shimmer-btn text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <Plus className="w-4 h-4" />
          Tạo Đơn Vận Chuyển Mới
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Tổng Đơn Đã Tạo</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalOrders} <span className="text-xs text-slate-400 font-normal">đơn</span></div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Đang Luân Chuyển</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300">{inTransitCount} <span className="text-xs text-slate-400 font-normal">kiện</span></div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Đã Giao Thành Công</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{deliveredCount} <span className="text-xs text-slate-400 font-normal">kiện</span></div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Tổng Chi Phí Cước</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono">
            {totalCost.toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-normal">đ</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã vận đơn, người nhận, địa phương..."
            className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-xs"
          >
            <option value="ALL" className="bg-slate-900">Tất Cả Trạng Thái</option>
            <option value="CREATED" className="bg-slate-900">Khởi Tạo</option>
            <option value="IN_TRANSIT" className="bg-slate-900">Đang Vận Chuyển</option>
            <option value="OUT_FOR_DELIVERY" className="bg-slate-900">Đang Phát Hàng</option>
            <option value="DELIVERED" className="bg-slate-900">Đã Giao</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-3.5 px-4">Mã Vận Đơn</th>
                <th className="py-3.5 px-4">Người Nhận & Nơi Giao</th>
                <th className="py-3.5 px-4">Trọng Lượng (Thực / DIM)</th>
                <th className="py-3.5 px-4">Cước Phí</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => {
                  const code = ord.trackingCode || ord.trackingNumber || '';
                  const recipientName = ord.deliveryAddress?.fullName || ord.recipientName || '';
                  const recipientAddress = ord.deliveryAddress?.address || ord.recipientAddress || '';
                  const actualWeight = ord.actualWeight || ord.weightKg || 0;
                  const chargeableWeightVal = ord.chargeableWeight || ord.chargeableWeightKg || 0;
                  const fee = ord.shippingFee || ord.cost || 0;

                  const isEditable = ['CREATED', 'PENDING_VERIFICATION', 'READY_TO_PICK', 'PENDING'].includes(ord.status);

                  return (
                    <tr key={ord._id || ord.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-4 font-mono font-bold text-blue-400">
                        {code}
                        <span className="block text-[10px] font-normal text-slate-500">{ord.serviceType || 'EXPRESS'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-white">{recipientName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{recipientAddress}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-slate-200 font-mono">{actualWeight} kg (Thực)</div>
                        <div className="text-cyan-400 text-[11px] font-mono">➡ {chargeableWeightVal} kg (Tính cước)</div>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                        {fee.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${ord.status === 'DELIVERED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : ord.status === 'IN_TRANSIT' || ord.status === 'OUT_FOR_DELIVERY'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenOrderDetails(ord)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition cursor-pointer"
                          >
                            Chi Tiết
                          </button>
                          {isEditable && onEditOrder && (
                            <button
                              onClick={() => onEditOrder(ord)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
                              title="Chỉnh sửa đơn hàng"
                            >
                              Sửa
                            </button>
                          )}
                          {isEditable && onCancelOrder && (
                            <button
                              onClick={() => onCancelOrder(ord)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                              title="Hủy đơn hàng"
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center text-slate-400 space-y-2">
                    <Package className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="font-bold text-sm text-slate-200">Chưa có đơn hàng nào trong MongoDB</p>
                    <p className="text-xs text-slate-500">Bấm "Tạo Đơn Hàng Mới" hoặc "Đăng Đơn Lẻ" để khởi tạo đơn hàng đầu tiên.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-slate-700 p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Khởi Tạo Đơn Vận Chuyển Mới
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  ⚠️ {formError}
                </div>
              )}

              {/* Recipient Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase">Thông Tin Người Nhận</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Tên Người Nhận *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Nhà Thuốc Pharmacity"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Số Điện Thoại *</label>
                    <input
                      type="text"
                      required
                      placeholder="0987654321"
                      value={formData.recipientPhone}
                      onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Địa Chỉ Chi Tiết *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 78 Lê Lợi, P. Bến Nghé, Q.1"
                    value={formData.recipientAddress}
                    onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Package Specs */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase">Kích Thước & Trọng Lượng (Tính cước tự động)</h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">TL Thực (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.weightKg}
                      onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0.1 })}
                      className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Dài (cm)</label>
                    <input
                      type="number"
                      value={formData.lengthCm}
                      onChange={(e) => setFormData({ ...formData, lengthCm: parseInt(e.target.value) || 1 })}
                      className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Rộng (cm)</label>
                    <input
                      type="number"
                      value={formData.widthCm}
                      onChange={(e) => setFormData({ ...formData, widthCm: parseInt(e.target.value) || 1 })}
                      className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Cao (cm)</label>
                    <input
                      type="number"
                      value={formData.heightCm}
                      onChange={(e) => setFormData({ ...formData, heightCm: parseInt(e.target.value) || 1 })}
                      className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Fee Result */}
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Trọng Lượng Tính Cước:</span>
                  <strong className="text-cyan-300 font-mono text-sm">{chargeableWeight} kg</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Cước Phí Dự Kiến:</span>
                  <strong className="text-emerald-400 font-mono text-base">{calculatedCost.toLocaleString('vi-VN')} đ</strong>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl shimmer-btn text-white text-xs font-bold shadow-lg shadow-blue-600/30"
                >
                  Xác Nhận Tạo Đơn
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
