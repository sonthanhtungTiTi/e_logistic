import { axiosClient } from './axiosClient';

export interface ZoneConfig {
  name: string;
  baseFee: number;
  extraWeightFee: number;
  baseWeightKg: number;
  stepKg: number;
}

export interface PricingConfig {
  volumetricDivisor: number;
  zones: {
    INTRA_PROVINCE: ZoneConfig;
    INTRA_REGION: ZoneConfig;
    NEAR_REGION: ZoneConfig;
    INTER_REGION: ZoneConfig;
  };
  insurance: {
    threshold: number;
    rate: number;
  };
  riskThresholds: {
    feeWarning: number;
    codWarning: number;
  };
}

export interface VoucherItem {
  code: string;
  description: string;
  discountType: 'FIXED' | 'PERCENT';
  value: number;
  maxDiscount?: number;
  active: boolean;
}

export const pricingApi = {
  getPricingAndVouchers: () =>
    axiosClient.get<{
      success: boolean;
      data: {
        pricing: PricingConfig;
        vouchers: VoucherItem[];
      };
    }>('/admin/pricing-config'),

  updatePricingConfig: (config: PricingConfig) =>
    axiosClient.put<{ success: boolean; message: string; data: PricingConfig }>('/admin/pricing-config', config),

  saveVoucher: (voucher: VoucherItem) =>
    axiosClient.post<{ success: boolean; message: string; data: VoucherItem[] }>('/admin/vouchers', voucher),

  deleteVoucher: (code: string) =>
    axiosClient.delete<{ success: boolean; message: string; data: VoucherItem[] }>(`/admin/vouchers/${code}`),
};
