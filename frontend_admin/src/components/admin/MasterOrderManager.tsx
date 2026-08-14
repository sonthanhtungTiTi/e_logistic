import React, { useState } from 'react';
import { Package, Search } from 'lucide-react';
import type { Order, OrderStatus } from '../../types';

interface MasterOrderManagerProps {
  orders: Order[];
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus, note: string) => void;
  onUpdateStatus?: (orderId: string, newStatus: any) => void;
  onAssignDriver?: (orderId: string, driverName: string) => void;
}

export const MasterOrderManager: React.FC<MasterOrderManagerProps> = ({
  orders,
  onUpdateOrderStatus,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((o) => {
    const code = o.trackingNumber || o.trackingCode || '';
    const rec = o.recipientName || o.deliveryAddress?.fullName || '';
    const sen = o.senderName || o.pickupAddress?.fullName || '';
    const matchesSearch =
      code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sen.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-400" />
            Quản Lý Vận Đơn Toàn Hệ Thống (Staff Master Dispatcher)
          </h3>
          <p className="text-xs text-slate-400">Xem danh sách bưu gửi, điều phối xe vận chuyển & kiểm soát cước phí toàn bộ Hub</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm mã vận đơn, người nhận..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input rounded-xl pl-9 pr-3 py-1.5 text-xs w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-1.5 text-xs"
          >
            <option value="ALL" className="bg-slate-900">Tất Cả Trạng Thái</option>
            <option value="CONFIRMED" className="bg-slate-900">CONFIRMED (Chờ Lấy)</option>
            <option value="PICKED_UP" className="bg-slate-900">PICKED_UP (Đã Nhập Kho)</option>
            <option value="IN_TRANSIT" className="bg-slate-900">IN_TRANSIT (Luân Chuyển)</option>
            <option value="OUT_FOR_DELIVERY" className="bg-slate-900">OUT_FOR_DELIVERY (Phát Hàng)</option>
            <option value="DELIVERED" className="bg-slate-900">DELIVERED (Đã Giao)</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-3.5 px-4">Mã Vận Đơn</th>
                <th className="py-3.5 px-4">Nơi Gửi ➔ Nơi Nhận</th>
                <th className="py-3.5 px-4">Dịch Vụ & Trọng Lượng</th>
                <th className="py-3.5 px-4">Cước Phí (VND)</th>
                <th className="py-3.5 px-4">Tài Xế Phụ Trách</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Điều Phối Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredOrders.map((o) => {
                const orderId = o.id || o._id;
                const trackingNum = o.trackingNumber || o.trackingCode;
                const costVal = o.cost || o.shippingFee || 0;

                return (
                  <tr key={orderId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <span 
                        onClick={() => setSelectedOrder(o)}
                        className="font-mono font-bold text-purple-300 hover:underline cursor-pointer"
                      >
                        {trackingNum}
                      </span>
                      <div className="text-[10px] text-slate-500">{o.createdAt}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{o.originCity || 'Hà Nội'} ➔ {o.destinationCity || 'Hồ Chí Minh'}</div>
                      <div className="text-[11px] text-slate-400">Nhận: {o.recipientName || o.deliveryAddress?.fullName} ({o.recipientPhone || o.deliveryAddress?.phone})</div>
                    </td>

                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-bold text-slate-200 text-[11px]">{o.serviceType || 'TIÊU CHUẨN'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Thực: {o.weightKg || o.actualWeight}kg • Cước: <span className="text-cyan-300 font-bold">{o.chargeableWeightKg || o.chargeableWeight}kg</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-400">
                      {costVal.toLocaleString('vi-VN')} ₫
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {o.driverName || <span className="text-slate-500 italic">Chưa gán tài xế</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                        o.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        o.status === 'IN_TRANSIT' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}>
                        {o.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {o.status !== 'DELIVERED' && (
                        <button
                          onClick={() => {
                            if (onUpdateOrderStatus) {
                              onUpdateOrderStatus(orderId, 'IN_TRANSIT', 'Điều phối viên thúc đẩy vận chuyển qua kho Hub');
                            } else if (onUpdateStatus) {
                              onUpdateStatus(orderId, 'IN_TRANSIT');
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold transition cursor-pointer"
                        >
                          Chuyển Trạng Thái ➔
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Order Detailed Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl glass-panel rounded-3xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-lg font-mono">Chi Tiết Vận Đơn: {selectedOrder.trackingNumber || selectedOrder.trackingCode}</h4>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Người Gửi:</span>
                  <span className="font-bold text-white">{selectedOrder.senderName || selectedOrder.pickupAddress?.fullName}</span>
                  <p className="text-slate-400 text-[11px]">{selectedOrder.senderAddress || selectedOrder.pickupAddress?.address}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Người Nhận:</span>
                  <span className="font-bold text-white">{selectedOrder.recipientName || selectedOrder.deliveryAddress?.fullName}</span>
                  <p className="text-slate-400 text-[11px]">{selectedOrder.recipientAddress || selectedOrder.deliveryAddress?.address}</p>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-slate-300 mb-2">Lịch Sử Sự Kiện Audit Track Logs:</h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(selectedOrder.events || []).map((evt: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-purple-400">{evt.status}</span> • <span className="text-slate-300">{evt.description}</span>
                        {evt.actor && <div className="text-slate-500 text-[10px]">Tác vụ bởi: {evt.actor}</div>}
                      </div>
                      <span className="text-slate-500 text-[10px] shrink-0">{evt.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
