import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SellerDashboard } from '../../components/SellerDashboard';
import { TrackingModal } from '../../components/shared/TrackingModal';
import { EditOrderModal } from '../../components/orders/EditOrderModal';
import { CancelOrderModal } from '../../components/orders/CancelOrderModal';
import type { Order } from '../../types';
import { orderApi } from '../../api/order.api';

import { socket } from '../../api/socket';

export const SellerDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setLoading] = useState<boolean>(true);
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

    const handleOrderUpdated = (payload: any) => {
      if (!payload) return;
      const updatedOrder = payload.order || payload;
      const updatedCode = updatedOrder.trackingCode || updatedOrder.trackingNumber;
      if (!updatedCode) return;

      setOrders((prevOrders) => {
        const index = prevOrders.findIndex(
          (o) => (o.trackingCode || o.trackingNumber) === updatedCode || o._id === updatedOrder._id
        );
        if (index !== -1) {
          const newOrders = [...prevOrders];
          newOrders[index] = { ...newOrders[index], ...updatedOrder };
          showToast(`⚡ Vận đơn [${updatedCode}] vừa cập nhật trạng thái Realtime: ${updatedOrder.status}`);
          return newOrders;
        }
        return prevOrders;
      });
    };

    socket.on('order:updated', handleOrderUpdated);
    socket.on('order:status_changed', handleOrderUpdated);

    return () => {
      socket.off('order:updated', handleOrderUpdated);
      socket.off('order:status_changed', handleOrderUpdated);
    };
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

  const handleReadyToPick = async (order: Order) => {
    const code = order.trackingCode || order.trackingNumber;
    try {
      const response = await orderApi.updateOrderStatus(order._id || (order as any).id, 'READY_TO_PICK');
      if (response.data?.success) {
        showToast(`Đã xác nhận đơn hàng ${code} đóng gói xong (READY_TO_PICK)! Hệ thống đã đưa vào tuyến thu gom.`);
        fetchOrders();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể chuyển trạng thái đơn hàng');
    }
  };

  return (
    <div className="space-y-6 relative">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <SellerDashboard
        orders={orders}
        onCreateOrder={(newOrd: Order) => {
          showToast(`Khởi tạo đơn hàng ${newOrd.trackingCode} thành công!`);
          fetchOrders();
        }}
        onOpenOrderDetails={(order: Order) => setSelectedOrder(order)}
        onEditOrder={(order: Order) => setEditingOrder(order)}
        onCancelOrder={(order: Order) => setCancelingOrder(order)}
        onReadyToPick={handleReadyToPick}
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
          onReadyToPick={handleReadyToPick}
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
