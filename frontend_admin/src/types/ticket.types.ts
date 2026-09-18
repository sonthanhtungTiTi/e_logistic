export type TicketStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_USER'
  | 'ESCALATED'
  | 'PENDING_REFUND'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';

export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type TicketCategory =
  | 'DELIVERY_DELAY'
  | 'DAMAGED_GOODS'
  | 'LOST_GOODS'
  | 'COD_DISPUTE'
  | 'ADDRESS_CHANGE'
  | 'FEE_DISPUTE'
  | 'PICKUP_FAIL'
  | 'OTHER';

export interface TicketPermissions {
  canClaim: boolean;
  canResolve: boolean;
  canProposeRefund: boolean;
  maxRefundAmount: number;
  canRevealPii: boolean;
  canEscalate: boolean;
}

export interface TicketMessage {
  _id: string;
  ticketId: string;
  seq?: number;
  senderId?: string;
  senderName: string;
  senderRole: 'SELLER' | 'BUYER' | 'CS' | 'ADMIN' | 'SYSTEM' | string;
  visibility: 'PUBLIC' | 'INTERNAL';
  body?: string;
  message?: string;
  attachments?: Array<{
    url: string;
    mime?: string;
    sizeBytes?: number;
    name?: string;
  }>;
  status?: 'sending' | 'sent' | 'failed';
  clientMsgId?: string | null;
  createdAt: string;
}

export interface Order360Data {
  _id: string;
  trackingCode: string;
  status: string;
  currentHub?: {
    _id: string;
    name: string;
    hubCode?: string;
  } | null;
  codAmount: number;
  declaredValue: number;
  shippingFee: number;
  weightKg?: number;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  createdAt: string;
}

export interface OrderTimelineItem {
  _id?: string;
  eventType: string;
  title: string;
  description?: string;
  locationName?: string;
  timestamp: string;
}

export interface CustodyLogItem {
  _id?: string;
  transferType: string;
  fromActor?: {
    name: string;
    role: string;
  };
  toActor?: {
    name: string;
    role: string;
  };
  packageCondition?: string;
  conditionNote?: string;
  timestamp: string;
}

export interface ProofItem {
  type: string;
  url: string;
  mime?: string;
  label: string;
}

export interface RequesterProfile {
  _id: string;
  name: string;
  phoneMasked: string;
  email?: string;
  totalOrders30d: number;
  isVip: boolean;
  kycStatus: string;
}

export interface RelatedTicketSummary {
  _id: string;
  ticketCode: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  subject: string;
  createdAt: string;
}

export interface TicketContextData {
  ticket: {
    _id: string;
    ticketCode: string;
    category: TicketCategory;
    subCategory?: string;
    priority: TicketPriority;
    status: TicketStatus;
    subject: string;
    assignee?: {
      _id: string;
      fullName: string;
      email: string;
      csLevel?: string;
    } | null;
    lastActivityAt?: string;
    sla?: {
      firstResponseDueAt?: string | null;
      resolutionDueAt?: string | null;
      breachedResolution?: boolean;
      warnedResolution?: boolean;
    };
    remainingMs?: number | null;
    breached?: boolean;
    createdAt: string;
    updatedAt: string;
  };
  messages: TicketMessage[];
  order: Order360Data | null;
  orderTimeline: OrderTimelineItem[];
  custodyLog: CustodyLogItem[];
  proofs: ProofItem[];
  requesterProfile: RequesterProfile;
  relatedTickets: RelatedTicketSummary[];
  permissions: TicketPermissions;
}

export interface TicketContextResponse {
  success: boolean;
  data: TicketContextData;
}

export interface RevealPiiResponse {
  success: boolean;
  data: {
    phone: string;
    name: string;
    address: string;
  };
}

export interface TicketQueueItemData {
  _id: string;
  ticketCode: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  sellerId?: {
    _id: string;
    fullName?: string;
    companyName?: string;
    email?: string;
    phoneNumber?: string;
  };
  assignedTo?: {
    _id: string;
    fullName: string;
    email: string;
  };
  assigneeId?: {
    _id: string;
    fullName: string;
    email: string;
  };
  sla?: {
    resolutionDueAt?: string | null;
    breachedResolution?: boolean;
  };
  remainingMs?: number | null;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}
