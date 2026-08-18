import axiosClient from './axiosClient';

export interface OpenBagDto {
  seal_code: string;
  destination_hub_id: string;
  max_capacity?: number;
  max_weight_kg?: number;
  notes?: string;
}

export interface AddItemDto {
  seal_code: string;
  tracking_code: string;
}

export interface RemoveItemDto {
  seal_code: string;
  tracking_code: string;
}

export interface SealBagDto {
  seal_code: string;
  notes?: string;
}

export const bagApi = {
  openBag: (data: OpenBagDto) => axiosClient.post('/bags/open', data),
  addItem: (data: AddItemDto) => axiosClient.post('/bags/add-item', data),
  removeItem: (data: RemoveItemDto) => axiosClient.post('/bags/remove-item', data),
  sealBag: (data: SealBagDto) => axiosClient.post('/bags/seal', data),
  getBag: (sealCode: string) => axiosClient.get(`/bags/${sealCode}`),
  listBags: (status?: string) => axiosClient.get('/bags', { params: { status } }),
};
