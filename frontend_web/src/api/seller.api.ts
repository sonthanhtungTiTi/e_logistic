import axiosClient from './axiosClient';

export interface PickupAddressItem {
  _id: string;
  label: string;
  province: string;
  district: string;
  ward: string;
  addressDetail: string;
  contactName?: string;
  contactPhone?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface KycDocItem {
  _id: string;
  documentType: 'BUSINESS_LICENSE' | 'ID_CARD_FRONT' | 'ID_CARD_BACK' | 'TAX_CERTIFICATE';
  fileUrl: string;
  status: 'PENDING_KYC' | 'VERIFIED_KYC' | 'REJECTED_KYC';
  rejectReason?: string;
  submittedAt: string;
}

export interface SubAccountItem {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  subAccountPermissions: string[];
  isActive: boolean;
  createdAt: string;
}

export const sellerApi = {
  // 1. Pickup Addresses
  getPickupAddresses: () =>
    axiosClient.get<PickupAddressItem[]>('/seller/pickup-addresses'),
  createPickupAddress: (data: Partial<PickupAddressItem>) =>
    axiosClient.post<PickupAddressItem>('/seller/pickup-addresses', data),
  setDefaultPickupAddress: (id: string) =>
    axiosClient.put<PickupAddressItem>(`/seller/pickup-addresses/${id}/default`),
  deletePickupAddress: (id: string) =>
    axiosClient.delete<{ message: string }>(`/seller/pickup-addresses/${id}`),

  // 2. KYC Verification
  getKycStatus: () =>
    axiosClient.get<{ kycStatus: string; documents: KycDocItem[] }>('/auth/kyc/status'),
  submitKycDoc: (data: { documentType: string; fileUrl: string }) =>
    axiosClient.post<KycDocItem>('/auth/kyc/submit', data),

  // 3. Notification Preferences
  getNotificationPreferences: () =>
    axiosClient.get('/auth/notifications/preferences'),
  updateNotificationPreference: (data: { eventType: string; channel: 'email' | 'sms' | 'push'; enabled: boolean }) =>
    axiosClient.put('/auth/notifications/preferences', data),

  // 4. 2FA TOTP
  setup2FA: () =>
    axiosClient.post<{ qrCodeUrl: string; manualEntryKey: string }>('/auth/2fa/setup'),
  verifyEnable2FA: (token: string) =>
    axiosClient.post<{ message: string; backupCodes: string[] }>('/auth/2fa/verify-enable', { token }),
  loginStep2: (data: { tempToken: string; totpCode: string }) =>
    axiosClient.post('/auth/2fa/login-step2', data),
  disable2FA: (password: string) =>
    axiosClient.post('/auth/2fa/disable', { password }),

  // 5. Self Deactivation
  requestDeactivation: () =>
    axiosClient.post<{ message: string; confirmToken?: string; blockingReason?: string }>('/auth/self-deactivate/request'),
  confirmDeactivation: (data: { confirmToken: string; password: string; reason?: string }) =>
    axiosClient.post<{ message: string }>('/auth/self-deactivate/confirm', data),

  // 6. Sub Accounts
  listSubAccounts: () =>
    axiosClient.get<SubAccountItem[]>('/seller/sub-accounts'),
  createSubAccount: (data: Record<string, unknown>) =>
    axiosClient.post<SubAccountItem>('/seller/sub-accounts', data),
  updateSubAccountPermissions: (id: string, permissions: string[]) =>
    axiosClient.put(`/seller/sub-accounts/${id}/permissions`, { permissions }),
  deleteSubAccount: (id: string) =>
    axiosClient.delete(`/seller/sub-accounts/${id}`),
};
