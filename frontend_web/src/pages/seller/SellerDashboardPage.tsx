import React, { useState, useEffect, useCallback } from 'react';
import { SellerDashboard } from '../../components/SellerDashboard';
import { TrackingModal } from '../../components/shared/TrackingModal';
import { EditOrderModal } from '../../components/orders/EditOrderModal';
import { CancelOrderModal } from '../../components/orders/CancelOrderModal';
import type { Order } from '../../types';
import { orderApi } from '../../api/order.api';

export const SellerDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await orderApi.searchOrders({ limit: 50, sortBy: 'createdAt_desc' });
      if (response.data?.success) {
        setOrders(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách đơn hàng từ MongoDB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateOrderSuccess = (updatedOrder: Order, feeMsg?: string) => {
    setEditingOrder(null);
    setSelectedOrder(null);
    showToast(`Cập nhật đơn hàng ${updatedOrder.trackingCode || updatedOrder.trackingNumber} thành công!${feeMsg || ''}`);
    fetchOrders();
  };

  const handleCancelOrderSuccess = (reasonText?: string) => {
    if (!cancelingOrder) return;
    const targetCode = cancelingOrder.trackingCode || cancelingOrder.trackingNumber;
    setCancelingOrder(null);
    setSelectedOrder(null);
    showToast(`Đã hủy đơn hàng ${targetCode}.${reasonText ? ` Lý do: ${reasonText}` : ''}`);
    fetchOrders();
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
          showToast(`Khởi tạo đơn hàng ${newOrd.trackingCode} thành công!`);
          fetchOrders();
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
