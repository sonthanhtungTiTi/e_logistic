import React, { useState } from 'react';
import { MasterOrderManager } from '../../components/admin/MasterOrderManager';
import { INITIAL_ORDERS } from '../../mockData';
import type { Order } from '../../types';

export const DispatchControlPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  const handleUpdateStatus = (orderId: string, newStatus: any) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const handleAssignDriver = (orderId: string, driverName: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              driverName,
              status: 'IN_TRANSIT',
              events: [
                ...o.events,
                {
                  timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
                  location: 'Kho Tổng Trung Chuyển',
                  status: 'IN_TRANSIT',
                  description: `Gán đơn thành công cho tài xế ${driverName}`,
                  actor: 'Dispatch Center',
                },
              ],
            }
          : o
      )
    );
  };

  return (
    <div className="space-y-6">
      <MasterOrderManager
        orders={orders}
        onUpdateStatus={handleUpdateStatus}
        onAssignDriver={handleAssignDriver}
      />
    </div>
  );
};
