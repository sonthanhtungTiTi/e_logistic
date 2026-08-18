import axiosClient from '@/api/axiosClient';
import type {
  InboundScanRequest,
  InboundScanResponse,
  SealScanPayload,
  SealScanResponse,
  IncidentPayload,
  IncidentResponse,
} from '@/types/logistics.types';

// IndexedDB helper cho offline queue
const OFFLINE_STORE = 'offline_inbound_queue';
const DB_NAME = 'elogistic_offline';
const DB_VERSION = 1;

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(OFFLINE_STORE, { keyPath: 'client_offline_id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToOfflineQueue(payload: InboundScanRequest & { client_offline_id: string }) {
  try {
    const db = await openOfflineDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      tx.objectStore(OFFLINE_STORE).put(payload);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB unavailable (SSR, private mode, etc.) — silently ignore
  }
}

async function flushOfflineQueue() {
  try {
    const db = await openOfflineDB();
    const allItems: InboundScanRequest[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readonly');
      const req = tx.objectStore(OFFLINE_STORE).getAll();
      req.onsuccess = () => resolve(req.result as InboundScanRequest[]);
      req.onerror = () => reject(req.error);
    });

    for (const item of allItems) {
      try {
        await axiosClient.post('/inbound/scan-single', item);
        // Xóa khỏi queue sau khi gửi thành công
        const tx = db.transaction(OFFLINE_STORE, 'readwrite');
        tx.objectStore(OFFLINE_STORE).delete((item as any).client_offline_id);
      } catch {
        // Còn offline, giữ lại queue
      }
    }
  } catch {
    // IndexedDB unavailable
  }
}

// Lắng nghe sự kiện 'online' để tự flush queue
if (typeof window !== 'undefined') {
  window.addEventListener('online', flushOfflineQueue);
}

export const warehouseApi = {
  /**
   * Quét nhập kho đơn lẻ (giữ nguyên hành vi cũ + thêm offline queue)
   * Backward compatible: vẫn nhận InboundScanRequest cũ
   */
  scanInbound: async (payload: InboundScanRequest): Promise<InboundScanResponse> => {
    try {
      const res = await axiosClient.post<InboundScanResponse>('/inbound/scan-single', payload);
      return res.data;
    } catch (err: any) {

      // Offline fallback: lưu vào IndexedDB nếu mất mạng (network error)
      if (!err.response && (payload as any).client_offline_id) {
        await saveToOfflineQueue(payload as InboundScanRequest & { client_offline_id: string });
        // Trả về response giả để UI không bị block
        throw Object.assign(new Error('Offline — đã lưu vào hàng đợi, sẽ tự gửi lại khi có mạng'), {
          isOfflineQueued: true,
          code: 'OFFLINE_QUEUED',
        });
      }

      throw err;
    }
  },

  /**
   * Quét nhập kho theo Seal bao tải
   * POST /inbound/scan-seal
   */
  scanSealInbound: (payload: SealScanPayload): Promise<SealScanResponse> =>
    axiosClient.post<SealScanResponse>('/inbound/scan-seal', payload).then((r) => r.data),

  /**
   * Báo cáo sự cố / ngoại lệ kiện hàng
   * POST /inbound/incident
   */
  reportIncident: (payload: IncidentPayload): Promise<IncidentResponse> =>
    axiosClient.post<IncidentResponse>('/inbound/incident', payload).then((r) => r.data),

  // Expose flush để component có thể gọi thủ công nếu cần
  flushOfflineQueue,
};
