import React, { useState } from 'react';
import { HeroTracking } from '../../components/HeroTracking';
import { TrackingModal } from '../../components/shared/TrackingModal';
import { INITIAL_ORDERS } from '../../mockData';
import type { Order } from '../../types';

export const LandingPage: React.FC = () => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  return (
    <div className="space-y-12">
      <HeroTracking
        orders={INITIAL_ORDERS}
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
