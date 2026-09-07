# 📋 BÁO CÁO AUDIT BACKEND E-LOGISTIC
> **Ngày audit**: 2026-08-27 | **Phạm vi**: Toàn bộ `backend/src/`

---

## 1. TỔNG QUAN KIẾN TRÚC

| Thành phần | Số file | Ghi chú |
|---|---|---|
| Controllers | 21 | Xử lý req/res |
| Services | 13 | Business logic |
| Models | 19 | Mongoose schemas |
| Routes | 17 | API endpoints |
| Middleware | 5 | Auth, Rate Limit, Error, Hub Scope, KYC |
| Jobs | 4 | Cron/Scheduled tasks |
| Validations | 5 | Joi schemas |

---

## 2. DANH SÁCH TÍNH NĂNG HIỆN CÓ

### Module 1: Xác thực & Phân quyền
- ✅ Đăng nhập (Email/SĐT) + Khóa tạm 5 phút sau 5 lần sai
- ✅ Đăng ký Seller (OTP email xác thực trước)
- ✅ Refresh Token + Thu hồi khi logout
- ✅ Quên mật khẩu (OTP 6 số, hash bcrypt, TTL 10 phút)
- ✅ Đổi mật khẩu (khóa 15 phút nếu sai 5 lần)
- ✅ Bảo mật 2FA TOTP (QR → Verify → Enable + 10 Backup Codes)
- ✅ 12 roles: SELLER, BUYER, DRIVER, LINE_HAUL_DRIVER, HUB_STAFF, HUB_COORDINATOR, CS, ACCOUNTANT, ADMIN, ORDER_MANAGER, DRIVER_MANAGER, WAREHOUSE_MANAGER

### Module 2: Quản lý Người dùng (Admin)
- ✅ CRUD users + lọc role/isActive
- ✅ Tạo tài khoản nội bộ (mật khẩu tạm, mustChangePassword)
- ✅ Khóa / Mở khóa / Vô hiệu hóa (self-lock prevention)

### Module 3: Quản lý Đơn hàng
- ✅ Tạo đơn (Idempotency, tính cước tự động, hub routing, routeNodes đa kho)
- ✅ Cập nhật / Hủy đơn lẻ + hàng loạt
- ✅ Tra cứu & Lọc (search, status, riskFlag, hub)
- ✅ Tra cứu công khai (rate limited)
- ✅ In nhãn vận đơn + Phê duyệt Risk Review

### Module 4: Luồng Duyệt đơn (Order Manager)
- ✅ Seller báo chuẩn bị xong → PENDING_APPROVAL
- ✅ Duyệt đơn hàng loạt → APPROVED

### Module 5: Điều phối Tài xế (Driver Manager)
- ✅ Phân tài xế gom/giao hàng (DIRECT vs HUB_ROUTED)
- ✅ Từ chối đơn (Quota 3 lượt/ngày) + Duyệt yêu cầu từ chối
- ✅ Reset quota tự động 00:00

### Module 6: Lấy hàng Shipper (UC-12)
- ✅ Quét xác minh + Xác nhận lấy hàng (chữ ký, GPS, cân nặng)
- ✅ Biên bản bàn giao ePOH (2-Phase Session)
- ✅ Lấy hàng hàng loạt + Lấy hàng thất bại

### Module 7: Nhập kho
- ✅ Quét đơn lẻ / hàng loạt / theo Seal
- ✅ Báo cáo sự cố (Incident → EXCEPTION_INBOUND)

### Module 8: Gom bao & Niêm phong
- ✅ Mở / Thêm / Xóa / Seal bao tải

### Module 9: Xuất kho & Chuyến xe
- ✅ Tạo Trip / Quét xuất kho / Commit / Tài xế xác nhận

### Module 10: Kiểm kê kho
- ✅ Bắt đầu / Đồng bộ / Tạm dừng / Nộp / Phê duyệt
- ✅ Job timeout SUSPECTED_LOST → LOST

### Module 11: Quản lý tồn kho
- ✅ Aging list / Summary / Gợi ý chuyến / Export CSV
- ✅ Thao tác đơn lẻ + hàng loạt (RELOCATE, LIQUIDATE)

### Module 12: Giao hàng thất bại
- ✅ Báo thất bại (Transaction, Idempotency, chống gian lận)
- ✅ Auto PENDING_REDELIVERY hoặc DELIVERY_FAILED_PENDING_RETURN

### Module 13: Ví COD Seller
- ✅ Xem số dư + Rút tiền (Atomic Update chống Double-Withdrawal)

### Module 14: Seller Nâng cao
- ✅ KYC (Nộp/Duyệt - Transaction)
- ✅ Sub-Account (CRUD + phân quyền)
- ✅ Multi Pickup Address (CRUD, mặc định - Transaction)
- ✅ Tạm ngưng tài khoản + Notification Preferences

---

## 3. LỖI LOGIC PHÁT HIỆN

### 🔴 NGHIÊM TRỌNG (7 lỗi)

| # | Lỗi | File:Line | Mô tả |
|---|---|---|---|
| BUG-01 | Race Condition updateOrder | order.service.js:152 | findOne→check→assign→save, không atomic |
| BUG-02 | Race Condition cancelOrder | order.service.js:178 | findOne→check→set CANCELLED→save |
| BUG-03 | Race Condition updateStatus | order.service.js:351 | Không có state machine guard, nhảy tự do |
| BUG-04 | Mass Assignment createOrder | order.service.js:118 | `...data` spread trực tiếp từ req.body |
| BUG-05 | Mass Assignment updateOrder | order.service.js:169 | `Object.assign(order, data)` |
| BUG-06 | Thiếu Transaction confirmPickup | order.service.js:559 | Order.save + PickupConfirmation.create riêng rẽ |
| BUG-07 | Thiếu next(err) | order.controller.js:384 | Request hang nếu error không có statusCode |

### 🟡 TRUNG BÌNH (9 lỗi)

| # | Lỗi | File:Line | Mô tả |
|---|---|---|---|
| BUG-08 | VALID_ROLES thiếu 3 roles | admin.controller.js:7 | Thiếu ORDER_MANAGER, DRIVER_MANAGER, WAREHOUSE_MANAGER |
| BUG-09 | isAdmin check sai | order.controller.js:190 | `role !== 'SELLER'` → BUYER/DRIVER cũng thành admin |
| BUG-10 | approveOrder thiếu Audit Log | order.controller.js:392 | Vi phạm quy tắc 3.4 SKILL.md |
| BUG-11 | /driver-location không auth | order.routes.js:34 | Bất kỳ ai gửi GPS giả mạo được |
| BUG-12 | PII leak public-recent | order.controller.js:246 | Trả toàn bộ order gồm SĐT, địa chỉ, COD |
| BUG-13 | N+1 bulkCancel | order.service.js:224 | Vòng for gọi cancelOrder từng đơn |
| BUG-14 | N+1 assignPickup/Delivery | driverManager.controller.js:184 | findById+save cho từng order |
| BUG-15 | Duplicate token functions | twoFactor.controller.js:10 | Copy từ auth.controller.js |
| BUG-16 | sendRegisterOtp thiếu userId | auth.controller.js:903 | PasswordResetOtp tạo không có userId |

### 🟢 NHẸ (4 lỗi)

| # | Lỗi | File:Line | Mô tả |
|---|---|---|---|
| BUG-17 | Hardcoded currentDriver | order.model.js:292 | Default 'Phạm Tấn Triệu' trong schema |
| BUG-18 | Hardcoded GPS default | order.model.js:306 | Tọa độ HCM cố định |
| BUG-19 | 36 statuses vs 19 documented | order.model.js:36 | Nhiều status trùng ngữ nghĩa |
| BUG-20 | Typo "Duyện" | kyc.controller.js:143 | Nên là "Duyệt" |

---

## 4. ƯU TIÊN SỬA LỖI

### Đợt 1 — Bảo mật (Khẩn cấp)
- BUG-04, BUG-05: Sanitize input (whitelist fields)
- BUG-11: Thêm `protect` cho `/driver-location`
- BUG-12: `.select()` chỉ field công khai

### Đợt 2 — Race Condition
- BUG-01, BUG-02, BUG-03: Chuyển sang Atomic Conditional Update
- BUG-06: Thêm Transaction cho confirmPickup

### Đợt 3 — Logic
- BUG-07: Thêm `next(err)`
- BUG-08: Thêm 3 roles mới
- BUG-09: Fix isAdmin whitelist
- BUG-10: Thêm Audit Log

### Đợt 4 — Performance & Cleanup
- BUG-13, BUG-14: bulkWrite
- BUG-15, BUG-17, BUG-18, BUG-19, BUG-20: Cleanup

---

## 5. KẾT LUẬN

Hệ thống có **kiến trúc module rõ ràng** với 14+ module phủ toàn bộ vòng đời đơn hàng. Tuy nhiên có **7 lỗi nghiêm trọng** (Race Condition + Mass Assignment) cần sửa trước khi production.
