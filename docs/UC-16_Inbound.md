# Đặc Tả Kỹ Thuật & Cấu Trúc Đơn Vị UC-16: Nhập Kho (Inbound Scan)

## 1. Tổng Quan Use Case (Overview)
- **Mã Use Case:** UC-16
- **Tên Use Case:** Nhập Kho (Inbound Scan)
- **Mục tiêu:** Cho phép Nhân viên Kho (HUB_STAFF/HUB_COORDINATOR) quét mã từng kiện hàng hoặc quét lô hàng loạt khi về đến cửa kho (từ Thu gom/Chuyển hoàn hoặc Luân chuyển liên kho). Đối chiếu luồng tuyến, cập nhật trạng thái đơn nguyên tử (Atomic Update) và dán cờ bất thường nếu hàng bị hư hỏng/rách niêm phong.

---

## 2. Luồng Nghiệp Vụ & Ma Trận Chuyển Trạng Thái (State Machine Matrix)

| Trạng Thái Hiện Tại | Vị Trí Hub Nhân Viên Đang Đứng | Trạng Thái Mới Sau Quét | Hành Động Phân Loại Kế Tiếp (`next_action`) |
| :--- | :--- | :--- | :--- |
| `PICKED_UP` / `PICKED` | **Origin Hub** (Bưu cục gốc) | `IN_HUB_ORIGIN` | `SORT_FOR_TRANSIT` (Gom vào bao tải / Xuất trung chuyển) |
| `IN_TRANSIT` | **Sorting Hub** (Kho tổng / Trung chuyển) | `IN_SORTING_HUB` | `SORT_FOR_NEXT_HUB` (Luân chuyển chặng tiếp) |
| `IN_TRANSIT` | **Destination Hub** (Bưu cục phát) | `IN_HUB_DEST` | `WAITING_FOR_DELIVERY` (Chờ giao chặng cuối) |
| `RETURN_IN_TRANSIT` / `RETURNING` | **Origin Hub** (Bưu cục gốc) | `RETURNED_TO_HUB_ORIGIN` | `WAITING_SELLER_RETURN` (Lưu kệ chờ trả Seller) |
| *Tất cả trường hợp rách tem/hư hỏng (`DAMAGED`/`TORN_SEAL`)* | Bất kỳ Hub hợp lệ nào | `EXCEPTION_INBOUND` | Dán cờ `is_flagged = true`, ghi log sự cố |

> **Quy tắc ngăn chặn (Barrier Rule):** Bất kỳ đơn hàng ở trạng thái hủy (`CANCELLED`) hoặc chưa hoàn thành pickup đều bị hệ thống từ chối với mã lỗi `INVALID_STATE_TRANSITION` (HTTP 400 Bad Request).

---

## 3. Kiến Trúc Bảo Mật & Chống Lỗ Hổng Kỹ Thuật

### 3.1. Chống IDOR (Privilege Escalation & Unauthorized Hub Access)
- **Vấn đề:** Client cố tình gửi `hub_id` giả mạo trong JSON body để quét hàng tại Hub khác.
- **Giải pháp:** Trong `inbound.validation.js`, trường `hub_id` / `hubId` bị loại bỏ (`Joi.any().strip()`). Backend trích xuất duy nhất `hubId` từ Token JWT của nhân viên (`req.user.hubId`).

### 3.2. Chống Race Condition & Double-Scan (Kiểm soát Concurrency)
- **Vấn đề:** 2 nhân viên hoặc ứng dụng mobile gửi 2 request trùng mã vận đơn trong cùng 1 millisecond.
- **Giải pháp:** Sử dụng Mongoose Atomic Conditional Update `Order.findOneAndUpdate({ _id: order._id, status: order.status }, { $set: ... }, { returnDocument: 'after' })`. Nếu status đã thay đổi ở tiến trình trước, câu query trả về `null` và hệ thống trả ngay lỗi `RACE_CONDITION_CONFLICT` (HTTP 409 Conflict).

### 3.3. Asynchronous Audit Logging & Tracking Integration
- Log lịch sử `OrderLog` và `OrderTrackingLog` được thực thi không đồng bộ qua `setImmediate(...)`, đảm bảo không làm nghẽn hoặc làm nổ transaction chính của việc nhập kho.

---

## 4. Danh Sách Endpoints (API Specification)

### 4.1. Quét Nhập Kho Đơn Lẻ (Single Scan)
- **Endpoint:** `POST /api/inbound/scan-single`
- **Authentication:** `Bearer JWT Token` (Role: `HUB_STAFF`, `HUB_COORDINATOR`, `ADMIN`, `DRIVER`)
- **Request Body:**
```json
{
  "tracking_code": "ELG1786691615588",
  "package_condition": "INTACT",
  "note": "Hàng nguyên vẹn"
}
```
- **Response Success (HTTP 200):**
```json
{
  "success": true,
  "message": "Nhập kho thành công",
  "data": {
    "tracking_code": "ELG1786691615588",
    "previous_status": "PICKED_UP",
    "current_status": "IN_HUB_ORIGIN",
    "next_action": "SORT_FOR_TRANSIT",
    "is_flagged": false,
    "hub_id": "6a7ec0192ef0dd71b931ca31"
  }
}
```

### 4.2. Quét Nhập Kho Hàng Loạt (Batch Scan)
- **Endpoint:** `POST /api/inbound/scan-batch`
- **Authentication:** `Bearer JWT Token`
- **Request Body:**
```json
{
  "tracking_codes": ["ELG1786691620347", "ELG1786691620348"],
  "package_condition": "INTACT"
}
```
- **Response Success (HTTP 200):**
```json
{
  "success": true,
  "message": "Đã xử lý 3 kiện: 2 thành công, 1 thất bại",
  "data": {
    "total": 3,
    "success_count": 2,
    "failed_count": 1,
    "success_items": [...],
    "failed_items": [...]
  }
}
```

---

## 5. Danh Sách File Đã Cấu Trúc
- Validation Schema: `backend/src/validations/inbound.validation.js`
- Core Service: `backend/src/services/inboundCore.service.js`
- Controller Layer: `backend/src/controllers/inbound.controller.js`
- Route Layer: `backend/src/routes/inbound.routes.js`
- Senior Audit Test Suite: `backend/test_uc16_inbound.js`
