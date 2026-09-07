import { useEffect } from 'react';
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { adminKycApi } from '../api/adminKyc.api';
import { useAdminAuth } from './useAdminAuth';

interface KycCountStore {
  pendingCount: number;
  setPendingCount: (count: number) => void;
  refreshCount: () => Promise<void>;
}

export const useKycCountStore = create<KycCountStore>((set) => ({
  pendingCount: 0,
  setPendingCount: (count) => set({ pendingCount: count }),
  refreshCount: async () => {
    try {
      const count = await adminKycApi.getPendingCount();
      set({ pendingCount: count });
    } catch {
      // Ignored
    }
  },
}));

let globalSocket: Socket | null = null;
let listenerCount = 0;

export const usePendingKycCount = () => {
  const { user } = useAdminAuth();
  const { pendingCount, refreshCount } = useKycCountStore();

  const isEligible = user && ['ADMIN', 'CS'].includes(user.role);

  useEffect(() => {
    if (!isEligible) return;

    // Lần đầu nạp số lượng
    refreshCount();

    // Kết nối Socket singleton cho KYC
    listenerCount++;
    if (!globalSocket) {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      globalSocket = io(`http://${hostname}:5000`, { transports: ['websocket'] });

      globalSocket.on('kyc:update', (data: any) => {
        if (typeof data?.pendingCount === 'number') {
          useKycCountStore.getState().setPendingCount(data.pendingCount);
        } else {
          useKycCountStore.getState().refreshCount();
        }

        // Khi có hồ sơ mới gửi lên, thông báo nhanh bằng Toast
        if (data?.type === 'NEW_SUBMISSION') {
          const shop = data.shopName ? ` từ "${data.shopName}"` : '';
          toast.info(`🔔 Có hồ sơ KYC mới${shop} đang chờ thẩm định!`, {
            description: 'Vào mục "Xác Minh Danh Tính (KYC)" để xem hồ sơ.',
            duration: 5000,
          });
        }
      });
    }

    // Polling định kỳ mỗi 30s để dự phòng kết nối
    const interval = setInterval(() => {
      refreshCount();
    }, 30000);

    return () => {
      clearInterval(interval);
      listenerCount--;
      if (listenerCount <= 0 && globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
    };
  }, [isEligible, refreshCount]);

  return {
    pendingCount,
    refreshCount,
  };
};
