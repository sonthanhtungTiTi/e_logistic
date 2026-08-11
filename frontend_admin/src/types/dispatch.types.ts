export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'MISROUTED';

export interface TrackingEvent {
  timestamp: string;
  location: string;
  status: OrderStatus;
  description: string;
  actor?: string;
}

export interface Order {
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
  codAmount?: number;
  status: OrderStatus;
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
