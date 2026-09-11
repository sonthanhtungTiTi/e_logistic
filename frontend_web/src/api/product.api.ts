import axiosClient from './axiosClient';

export interface ProductItem {
  _id: string;
  sellerId: string;
  name: string;
  sku?: string;
  weightKg: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  priceVnd: number;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const productApi = {
  getProducts: (params?: { search?: string; category?: string; page?: number; limit?: number }) =>
    axiosClient.get<{ success: boolean; count: number; total: number; data: ProductItem[] }>('/seller/products', { params }),

  getProductById: (id: string) =>
    axiosClient.get<{ success: boolean; data: ProductItem }>(`/seller/products/${id}`),

  createProduct: (data: Partial<ProductItem>) =>
    axiosClient.post<{ success: boolean; message: string; data: ProductItem }>('/seller/products', data),

  updateProduct: (id: string, data: Partial<ProductItem>) =>
    axiosClient.put<{ success: boolean; message: string; data: ProductItem }>(`/seller/products/${id}`, data),

  deleteProduct: (id: string) =>
    axiosClient.delete<{ success: boolean; message: string; data: { id: string } }>(`/seller/products/${id}`),
};
