// Quy tắc phân loại lý do giao thất bại (giải quyết điểm #7 ở Phần 0)
const REASON_CATEGORY_MAP = {
  CANNOT_CONTACT: 'CUSTOMER_FAULT',
  CUSTOMER_REFUSED: 'CUSTOMER_FAULT',
  WRONG_ADDRESS: 'OPERATIONAL_FAULT',
  CUSTOMER_RESCHEDULE: 'CUSTOMER_FAULT',
  OTHER: 'OTHER'
};

// Nhóm lý do bắt buộc phải có ảnh minh chứng (giải quyết điểm #4)
const REASONS_REQUIRE_PHOTO_PROOF = ['CUSTOMER_REFUSED'];

// Nhóm lý do bắt buộc xác nhận đã liên hệ khách trước (theo luồng 3.2 đặc tả gốc)
const REASONS_REQUIRE_CONTACT_CONFIRM = ['WRONG_ADDRESS'];

// Danh sách toàn bộ nhóm lý do hợp lệ (dùng để validate input)
const VALID_REASON_GROUPS = Object.keys(REASON_CATEGORY_MAP);

module.exports = {
  REASON_CATEGORY_MAP,
  REASONS_REQUIRE_PHOTO_PROOF,
  REASONS_REQUIRE_CONTACT_CONFIRM,
  VALID_REASON_GROUPS
};
