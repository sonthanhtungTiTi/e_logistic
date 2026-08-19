import React, { useState, useEffect, useCallback, useContext } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { HeroTracking } from '../../components/HeroTracking';
import { TrackingModal } from '../../components/shared/TrackingModal';
import { EditOrderModal } from '../../components/orders/EditOrderModal';
import { CancelOrderModal } from '../../components/orders/CancelOrderModal';
import type { Order } from '../../types';
import { orderApi } from '../../api/order.api';
import { AuthContext } from '../../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchRecentOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    try {
      const response = await orderApi.searchOrders({ limit: 8 });
      if (response.data?.success && Array.isArray(response.data.data)) {
        setOrders(response.data.data);
      }
    } catch (err) {
      console.error('Lỗi tải vận đơn từ CSDL:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchRecentOrders();
  }, [fetchRecentOrders]);

  const handleUpdateOrderSuccess = (updatedOrder: Order, feeMsg?: string) => {
    setEditingOrder(null);
    setSelectedOrder(null);
    showToast(`Cập nhật đơn hàng ${updatedOrder.trackingCode || updatedOrder.trackingNumber} thành công!${feeMsg || ''}`);
    fetchRecentOrders();
  };

  const handleCancelOrderSuccess = (reasonText?: string) => {
    if (!cancelingOrder) return;
    const targetCode = cancelingOrder.trackingCode || cancelingOrder.trackingNumber;
    setCancelingOrder(null);
    setSelectedOrder(null);
    showToast(`Đã hủy đơn hàng ${targetCode}.${reasonText ? ` Lý do: ${reasonText}` : ''}`);
    fetchRecentOrders();
  };

  return (
    <div className="space-y-12 relative">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <HeroTracking
        orders={orders}
        onOpenOrderDetails={(order: Order) => setSelectedOrder(order)}
        onEditOrder={(order: Order) => setEditingOrder(order)}
        onCancelOrder={(order: Order) => setCancelingOrder(order)}
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
