# TODO_CONFIRM.md
# Danh sách các vấn đề cần xác nhận thủ công bởi team Ops/BA

---

## [OPS] HUB_SGN_02 — Cần xác nhận tên thật

**Phát hiện:** Trong quá trình chạy `migrate-hub-backfill.js` (ngày 2026-08-15),
phát hiện giá trị `HUB_SGN_02` tồn tại trong field `Order.deliveryHub` của các đơn
hàng thật trong DB, nhưng **không có trong danh sách `MASTER_HUB_MAP`** của file
`pricing.service.js`.

**Trạng thái hiện tại:**
- Đã tạo Hub document tạm với `name = "Hub tự động từ dữ liệu cũ (HUB_SGN_02)"`
- `_id` trong DB: `6a8016bd2c43f32e6cd53dbd`
- Các Order có `deliveryHub = "HUB_SGN_02"` đã được backfill `destinationHubId` sang ObjectId này

**Cần xác nhận:**
- [ ] Tên thật của HUB_SGN_02 là gì? (VD: "Bưu cục TP.HCM Chi nhánh 2 - Bình Thạnh")
- [ ] Địa chỉ, ward, district, province?
- [ ] Đây là ORIGIN_HUB, DEST_HUB, hay MIXED?
- [ ] Có cần thêm vào `MASTER_HUB_MAP` trong `pricing.service.js` không?

**Action:** Team Ops cập nhật trực tiếp document Hub `6a8016bd2c43f32e6cd53dbd`
qua MongoDB Atlas hoặc yêu cầu dev sửa qua API Admin sau khi có thông tin.

---

## [DEV] order.service.js trống — Cần điều tra nguồn gốc 50 đơn hàng trong DB

**Phát hiện (ngày 2026-08-15):** File `backend/src/services/order.service.js` trống
100% (0 bytes). Controller `order.controller.js` gọi `orderService.createNewOrder()`
nhưng function này không tồn tại → `POST /api/orders` crash tại runtime.

**Điều tra grep:**
- `Order.create(` → CHỈ tìm thấy trong file test suite:
  - `test_uc16_inbound.js`
  - `test-uc-public-tracking-suite.js`
- `new Order(` → Không tìm thấy ở đâu trong `src/`

**Kết luận:** 50 đơn hàng hiện có trong DB được insert trực tiếp bởi các test suite
chạy thủ công, **không qua API `POST /api/orders`**. Chức năng tạo đơn hàng qua API
**CHƯA HOẠT ĐỘNG** trên production.

**Cần xác nhận:**
- [ ] `order.service.js` có file backup ở nơi khác không?
- [ ] Ai phụ trách viết `order.service.js`? Cần assign task.
- [ ] Ưu tiên xử lý trước hay sau Module 4?

**Không thuộc phạm vi Module 4 — Báo cho team Order.**
