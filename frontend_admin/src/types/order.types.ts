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
  | 'CANCELLED';

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
  sellerId: {
    _id: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
  } | string;
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
}

export interface AdminApprovePayload {
  pickupHub?: string;
  deliveryHub?: string;
  overrideNote?: string;
}
