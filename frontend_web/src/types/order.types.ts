export type OrderStatus =
  | 'DRAFT'
  | 'CREATED'
  | 'PENDING_VERIFICATION'
  | 'READY_TO_PICK'
  | 'PICKING'
  | 'PICKED'
  | 'INBOUND_HUB'
  | 'SORTING'
  | 'BAGGED_SEALED'
  | 'IN_TRANSIT'
  | 'INBOUND_HUB_DEST'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNING'
  | 'RETURNED'
  | 'CANCELLED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PICKED_UP';

export interface Address {
  fullName: string;
  phone: string;
  address: string;
  ward: string;
  district: string;
  province: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

export interface OrderItem {
  _id?: string;
  name: string;
  quantity: number;
  weight: number;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface Order {
  _id: string;
  trackingCode: string;
  orderIdSan?: string;
  idempotencyKey?: string;
  payloadHash?: string;
  status: OrderStatus;
  sellerId: string | { _id: string; fullName: string; email: string; phoneNumber?: string };
  pickupAddress: Address;
  deliveryAddress: Address;
  items: OrderItem[];
  dimensions: Dimensions;
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  isCod: boolean;
  codAmount: number;
  goodsValue: number;
  baseFee: number;
  insuranceFee: number;
  discountAmount: number;
  discountCode?: string | null;
  shippingFee: number;
  pickupHub?: string | null;
  deliveryHub?: string | null;
  flagFeeWarning: boolean;
  flagCodAnomaly: boolean;
  needsManualRouting: boolean;
  cancelReason?: string | null;
  cancelNote?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  currentDriverId?: string | null;
  createdAt: string;
  updatedAt: string;

  // Backward compatibility alias properties for legacy demo UI components
  id?: string;
  trackingNumber?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  chargeableWeightKg?: number;
  serviceType?: string;
  cost?: number;
  originCity?: string;
  destinationCity?: string;
  driverName?: string;
  driverPhone?: string;
  events?: Array<{
    timestamp: string;
    location: string;
    status: OrderStatus;
    description: string;
    actor?: string;
  }>;
}

export interface CalculatorParams {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  serviceType: string;
  originCity?: string;
  destinationCity?: string;
}

export interface QuoteRequestPayload {
  pickupAddress: {
    province: string;
    district: string;
    ward?: string;
    address?: string;
  };
  deliveryAddress: {
    province: string;
    district: string;
    ward?: string;
    address?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    weight: number;
  }>;
  dimensions?: Dimensions;
  goodsValue?: number;
  discountCode?: string;
}

export interface QuoteResponseData {
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  baseFee: number;
  insuranceFee: number;
  discountAmount: number;
  discountError?: string;
  shippingFee: number;
  pickupHub?: string;
  deliveryHub?: string;
}

export interface CreateOrderPayload {
  orderIdSan?: string;
  idempotencyKey?: string;
  confirmProceedWithoutDiscount?: boolean;
  pickupAddress: Address;
  deliveryAddress: Address;
  items: OrderItem[];
  dimensions?: Dimensions;
  actualWeight?: number;
  isCod?: boolean;
  codAmount?: number;
  goodsValue?: number;
  discountCode?: string;
  deliveryNote?: string;
}

export interface CancelOrderPayload {
  reason: 'SELLER_CHANGED_MIND' | 'WRONG_INFO' | 'OUT_OF_STOCK' | 'OTHER';
  customReason?: string;
}

export interface BulkCancelPayload {
  orderIds: string[];
  reason: 'SELLER_CHANGED_MIND' | 'WRONG_INFO' | 'OUT_OF_STOCK' | 'OTHER';
  customReason?: string;
}
