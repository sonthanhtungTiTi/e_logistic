import axiosClient from './axiosClient';

export interface WarehouseOrderQuery {
  q?: string;
  status?: string;
  zone?: string;
  page?: number;
  limit?: number;
}

export interface WarehouseBagQuery {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface WarehouseStaffQuery {
  q?: string;
  role?: string;
}

export const warehouseLookupApi = {
  getOrders: (params?: WarehouseOrderQuery) => axiosClient.get('/warehouse/lookup/orders', { params }),
  getBags: (params?: WarehouseBagQuery) => axiosClient.get('/warehouse/lookup/bags', { params }),
  getStaff: (params?: WarehouseStaffQuery) => axiosClient.get('/warehouse/staff', { params }),
  updateStaffRole: (id: string, role: string) => axiosClient.patch(`/warehouse/staff/${id}/role`, { role }),
};
