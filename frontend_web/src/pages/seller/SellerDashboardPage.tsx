import React, { useState } from 'react';
import { SellerDashboard } from '../../components/SellerDashboard';
import { TrackingModal } from '../../components/shared/TrackingModal';
import { EditOrderModal } from '../../components/orders/EditOrderModal';
import { CancelOrderModal } from '../../components/orders/CancelOrderModal';
import { INITIAL_ORDERS } from '../../mockData';
import type { Order } from '../../types';

export const SellerDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUpdateOrderSuccess = (updatedOrder: Order, feeMsg?: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        (o._id === updatedOrder._id || o.id === updatedOrder.id || o.trackingCode === updatedOrder.trackingCode)
          ? { ...o, ...updatedOrder }
          : o
      )
    );
    setEditingOrder(null);
    setSelectedOrder(null);
    showToast(`Cập nhật đơn hàng ${updatedOrder.trackingCode || updatedOrder.trackingNumber} thành công!${feeMsg || ''}`);
  };

  const handleCancelOrderSuccess = (reasonText?: string) => {
    if (!cancelingOrder) return;

    setOrders((prev) =>
      prev.map((o) =>
        (o._id === cancelingOrder._id || o.id === cancelingOrder.id || o.trackingCode === cancelingOrder.trackingCode)
          ? { ...o, status: 'CANCELLED' }
          : o
      )
    );
    setCancelingOrder(null);
    setSelectedOrder(null);
    showToast(`Đã hủy đơn hàng ${cancelingOrder.trackingCode || cancelingOrder.trackingNumber}. Lý do: ${reasonText || 'Seller hủy đơn'}`);
  };

  return (
    <div className="space-y-6 relative">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300">
          ✅ {toastMessage}
        </div>
      )}

      <SellerDashboard
        orders={orders}
        onCreateOrder={(newOrd: Order) => {
          setOrders([newOrd, ...orders]);
          showToast(`Khởi tạo đơn hàng ${newOrd.trackingCode} thành công!`);
        }}
        onOpenOrderDetails={(order: Order) => setSelectedOrder(order)}
      />

      {selectedOrder && (
        <TrackingModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          onEditOrder={(ord) => {
            setSelectedOrder(null);
            setEditingOrder(ord);
          }}
          onCancelOrder={(ord) => {
            setSelectedOrder(null);
            setCancelingOrder(ord);
          }}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={handleUpdateOrderSuccess}
        />
      )}

      {cancelingOrder && (
        <CancelOrderModal
          order={cancelingOrder}
          onClose={() => setCancelingOrder(null)}
          onSuccess={handleCancelOrderSuccess}
        />
      )}
    </div>
  );
};

