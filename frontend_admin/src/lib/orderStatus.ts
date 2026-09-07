export interface StatusBadgeInfo {
  label: string;
  bg: string;
  description?: string;
}

export const ORDER_STATUS_MAP: Record<string, StatusBadgeInfo> = {
  // 1. Khởi tạo & thẩm định
  DRAFT: {
    label: 'BẢN NHÁP',
    bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    description: 'Đơn hàng đang ở dạng nháp',
  },
  CREATED: {
    label: 'MỚI TẠO',
    bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    description: 'Đơn hàng vừa được khởi tạo',
  },
  PENDING: {
    label: 'CHỜ XỬ LÝ',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Đơn hàng đang chờ xử lý',
  },
  CONFIRMED: {
    label: 'ĐÃ XÁC NHẬN',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Đơn hàng đã được xác nhận',
  },
  SELLER_PREPARING: {
    label: 'ĐANG ĐÓNG GÓI',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Shop đang chuẩn bị đóng gói hàng hóa',
  },
  PENDING_VERIFICATION: {
    label: 'CHỜ XÁC MINH RỦI RO',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Đơn hàng có cờ rủi ro, chờ thẩm định',
  },
  PENDING_APPROVAL: {
    label: 'CHỜ ADMIN DUYỆT',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Đã báo đóng gói xong, chờ Admin duyệt',
  },
  APPROVED: {
    label: 'ĐÃ DUYỆT (CHỜ GÁN XE)',
    bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    description: 'Admin đã duyệt, chờ điều phối tài xế',
  },

  // 2. Thu gom chặng đầu
  READY_TO_PICK: {
    label: 'SẴN SÀNG LẤY',
    bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    description: 'Đơn hàng sẵn sàng để tài xế đến lấy',
  },
  ASSIGNED_TO_PICKUP: {
    label: 'ĐÃ PHÂN TÀI XẾ GOM',
    bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Đã phân công tài xế xe máy thu gom',
  },
  ASSIGNED_TO_PICKUP_AND_DELIVERY: {
    label: 'ĐÃ GÁN TÀI XẾ GOM',
    bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Đã phân công tài xế thu gom bưu phẩm',
  },
  PICKING: {
    label: 'TÀI XẾ ĐANG LẤY',
    bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    description: 'Tài xế đang quét barcode tại điểm lấy',
  },
  PICKED: {
    label: 'ĐÃ LẤY HÀNG',
    bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    description: 'Tài xế đã lấy hàng thành công',
  },
  PICKED_UP: {
    label: 'ĐÃ LẤY HÀNG (VỀ KHO)',
    bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    description: 'Đã ký số ePOH, tài xế đang chuyển về bưu cục',
  },
  PICKUP_FAILED: {
    label: 'LẤY HÀNG THẤT BẠI',
    bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    description: 'Tài xế không thể lấy hàng từ Shop',
  },

  // 3. Khai thác kho & trung chuyển
  INBOUND_HUB: {
    label: 'ĐÃ NHẬP BƯU CỤC',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Kiện hàng đã nhập vào bưu cục',
  },
  INBOUND_ORIGIN_HUB: {
    label: 'ĐÃ NHẬP KHO GỐC',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Đã quét nhập kho bưu cục xuất phát',
  },
  IN_HUB_ORIGIN: {
    label: 'TẠI KHO GỐC (CHỜ XUẤT)',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Đang lưu tại kho gốc, chờ đóng bao / trung chuyển',
  },
  SORTING: {
    label: 'ĐANG PHÂN LOẠI',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Đang phân loại tuyến tại bưu cục',
  },
  IN_SORTING_HUB: {
    label: 'TẠI KHO TRUNG CHUYỂN',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Đang tại trung tâm khai thác trung chuyển',
  },
  BAGGED_SEALED: {
    label: 'ĐÃ ĐÓNG BAO SEAL',
    bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    description: 'Đã đóng bao tải và niêm phong mã Seal',
  },
  IN_TRANSIT: {
    label: 'ĐANG TRUNG CHUYỂN',
    bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    description: 'Chuyến xe tải đang luân chuyển liên tỉnh',
  },
  INBOUND_HUB_DEST: {
    label: 'ĐÃ ĐẾN KHO ĐÍCH',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Đã cập bến bưu cục phát',
  },
  IN_HUB_DEST: {
    label: 'TẠI KHO ĐÍCH (CHỜ PHÁT)',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Đang ở bưu cục phát, chuẩn bị gán tài xế giao',
  },
  INBOUND_DEST_HUB: {
    label: 'ĐÃ NHẬP KHO ĐÍCH',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Đã quét nhập vào kho bưu cục phát',
  },
  EXCEPTION_INBOUND: {
    label: 'SỰ CỐ NHẬP KHO (HỎNG/RÁCH)',
    bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    description: 'Kiện hàng có dấu hiệu hư hại hoặc rách seal',
  },

  // 4. Phát hàng chặng cuối
  PENDING_DELIVERY_ASSIGNMENT: {
    label: 'CHỜ PHÂN CÔNG GIAO',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Chờ điều phối gán tài xế giao hàng',
  },
  ASSIGNED_TO_DELIVERY: {
    label: 'ĐÃ PHÂN TÀI XẾ GIAO',
    bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Tài xế giao hàng đã nhận đơn phát',
  },
  OUT_FOR_DELIVERY: {
    label: 'ĐANG ĐI GIAO',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Tài xế đang trên đường mang hàng tới người nhận',
  },
  DELIVERING: {
    label: 'ĐANG GIAO HÀNG',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Tài xế đang liên hệ giao bưu phẩm',
  },
  DELIVERED: {
    label: 'GIAO THÀNH CÔNG',
    bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    description: 'Người nhận đã ký nhận POD và đối soát COD',
  },
  PENDING_REDELIVERY: {
    label: 'CHỜ GIAO LẠI',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Giao chưa thành công, chờ lên lịch phát lại',
  },
  DELIVERY_FAILED_PENDING_RETURN: {
    label: 'GIAO THẤT BẠI (CHỜ HOÀN)',
    bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    description: 'Giao thất bại vượt số lần cho phép, chờ hoàn',
  },
  FAILED: {
    label: 'GIAO THẤT BẠI',
    bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    description: 'Đơn hàng giao thất bại',
  },

  // 5. Chuyển hoàn & Hủy
  RETURNING: {
    label: 'ĐANG CHUYỂN HOÀN',
    bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    description: 'Bưu phẩm đang được gửi ngược về người bán',
  },
  RETURN_IN_TRANSIT: {
    label: 'TRUNG CHUYỂN HOÀN',
    bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    description: 'Đang trên xe chuyển hoàn về kho gốc',
  },
  RETURNED: {
    label: 'ĐÃ HOÀN HÀNG VỀ SHOP',
    bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    description: 'Người bán đã nhận lại bưu phẩm hoàn',
  },
  RETURNED_TO_HUB_ORIGIN: {
    label: 'HÀNG HOÀN TẠI KHO GỐC',
    bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    description: 'Hàng hoàn đã về tới bưu cục xuất phát',
  },
  CANCELLED: {
    label: 'ĐÃ HỦY ĐƠN',
    bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    description: 'Đơn hàng đã bị hủy bỏ',
  },
};

export function getOrderStatusBadge(status: string): StatusBadgeInfo {
  if (!status) {
    return {
      label: 'CHƯA RÕ',
      bg: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
  }

  const cleanStatus = status.trim().toUpperCase();
  if (ORDER_STATUS_MAP[cleanStatus]) {
    return ORDER_STATUS_MAP[cleanStatus];
  }

  return {
    label: cleanStatus.replace(/_/g, ' '),
    bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
}

export function getOrderStatusLabel(status: string): string {
  return getOrderStatusBadge(status).label;
}
