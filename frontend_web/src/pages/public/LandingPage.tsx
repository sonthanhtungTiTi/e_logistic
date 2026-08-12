import React, { useState, useEffect } from 'react';
import { HeroTracking } from '../../components/HeroTracking';
import { TrackingModal } from '../../components/shared/TrackingModal';
import type { Order } from '../../types';
import { orderApi } from '../../api/order.api';

export const LandingPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        const response = await orderApi.getPublicRecentOrders();
        if (response.data?.success && Array.isArray(response.data.data)) {
          setOrders(response.data.data);
        }
      } catch (err) {
        console.error('Lỗi tải vận đơn công khai từ MongoDB:', err);
      }
    };
    fetchRecentOrders();
  }, []);

  return (
    <div className="space-y-12">
      <HeroTracking
        orders={orders}
        onOpenOrderDetails={(order: Order) => setSelectedOrder(order)}
      />

      {selectedOrder && (
        <TrackingModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
        />
      )}
    </div>
  );
};
