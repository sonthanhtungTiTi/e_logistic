import { axiosAdminClient } from './axiosClient';

export interface PendingKycItem {
  _id: string;
  sellerId: string;
  shopName: string;
  sellerFullName: string;
  phoneNumber: string;
  email: string;
  idType: 'CCCD' | 'CMND' | 'PASSPORT';
  idFullName: string;
  maskedIdNumber: string;
  submittedAt: string;
  submissionCount: number;
  hasBusinessLicense: boolean;
  duplicateIdWarning: boolean;
  duplicateCount?: number;
}

export interface DuplicateShopItem {
  sellerId: string;
  shopName: string;
  phoneNumber: string;
  status: string;
}

export interface KycDetailData {
  _id: string;
  sellerId: {
    _id: string;
    fullName: string;
    companyName: string;
    phoneNumber: string;
    email: string;
    address: string;
    businessType: string;
    taxCode: string;
  };
  status: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  idType: 'CCCD' | 'CMND' | 'PASSPORT';
  idNumber: string;
  idFullName: string;
  idFrontImageUrl: string;
  idBackImageUrl: string;
  businessLicenseImageUrl: string | null;
  submittedAt: string;
  reviewedBy?: {
    _id: string;
    fullName: string;
    email: string;
  };
  reviewedAt?: string;
  rejectionReason?: string;
  submissionCount: number;
  duplicateIdWarning: boolean;
  duplicateShops: DuplicateShopItem[];
  history: Array<{
    status: string;
    idType: string;
    idNumber: string;
    idFullName: string;
    submittedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
    recordedAt: string;
  }>;
}

export interface PendingKycResponse {
  success: boolean;
  message: string;
  data: PendingKycItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const adminKycApi = {
  getPendingCount: async (): Promise<number> => {
    try {
      const res = await axiosAdminClient.get('/admin/kyc/pending-count');
      return res.data?.count ?? 0;
    } catch {
      try {
        const res = await axiosAdminClient.get('/admin/kyc/pending', {
          params: { page: 1, limit: 1 },
        });
        return res.data?.pagination?.total ?? 0;
      } catch {
        return 0;
      }
    }
  },

  getPendingList: async (page = 1, limit = 10): Promise<PendingKycResponse> => {
    const res = await axiosAdminClient.get('/admin/kyc/pending', {
      params: { page, limit },
    });
    return res.data;
  },

  getDetail: async (sellerId: string): Promise<{ success: boolean; data: KycDetailData }> => {
    const res = await axiosAdminClient.get(`/admin/kyc/${sellerId}`);
    return res.data;
  },

  approve: async (sellerId: string): Promise<{ success: boolean; message: string; data: any }> => {
    const res = await axiosAdminClient.post(`/admin/kyc/${sellerId}/approve`);
    return res.data;
  },

  reject: async (sellerId: string, reason: string): Promise<{ success: boolean; message: string; data: any }> => {
    const res = await axiosAdminClient.post(`/admin/kyc/${sellerId}/reject`, { reason });
    return res.data;
  },
};
