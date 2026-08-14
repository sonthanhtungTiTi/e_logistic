import type { OrderStatus as BaseOrderStatus, Order as BaseOrder } from './order.types';

export type DispatchOrderStatus = BaseOrderStatus | 'PENDING' | 'CONFIRMED' | 'MISROUTED';

export interface TrackingEvent {
  timestamp: string;
  location: string;
  status: string;
  description: string;
  actor?: string;
}

export interface DispatchOrder extends BaseOrder {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  chargeableWeightKg: number;
  serviceType: string;
  cost: number;
  codAmount: number;
  status: any;
  originCity: string;
  destinationCity: string;
  createdAt: string;
  estimatedDelivery: string;
  driverName?: string;
  driverPhone?: string;
  events: TrackingEvent[];
}

export interface DispatchAssignPayload {
  orderId: string;
  driverId: string;
  driverName: string;
  vehiclePlate: string;
}
