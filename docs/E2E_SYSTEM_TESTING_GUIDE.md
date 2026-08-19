# 📘 HƯỚNG DẪN KIỂM THỬ TOÀN TRÌNH HỆ THỐNG E-LOGISTIC
## (E2E End-to-End System Testing Guide)

Tài liệu này cung cấp danh sách và các bước thực hiện kiểm thử theo **đúng thứ tự luồng vận hành thực tế** của hệ thống E-Logistic (từ khởi tạo tài khoản, tạo đơn, luân chuyển qua các kho, xử lý giao thất bại đến đối soát ví COD).

---

## 🗺️ SƠ ĐỒ LUỒNG VẬN HÀNH TỔNG THỂ

```text
[GIAI ĐOẠN 1] Auth & Seller Setup (Đăng ký, 2FA, KYC, Sub-account)
       │
       ▼
[GIAI ĐOẠN 2] Tạo Đơn & Định Tuyến (Tính cước dynamic, Phân giải 3 Master Hubs)
       │
       ▼
[GIAI ĐOẠN 3] Lấy Hàng & Nhập Kho Gốc (ePOH Manifest, Inbound Scan UC-16)
       │
       ▼
[GIAI ĐOẠN 4] Gom Bao & Outbound Trung Chuyển (Bagging, Double Handshake UC-17)
       │
       ▼
[GIAI ĐOẠN 5] Quản Lý Kho & Kiểm Kê (Sorting Hub, Audit Seal UC-18, Dashboard UC-19)
       │
       ▼
[GIAI ĐOẠN 6] Giao Hàng Cuối & Báo Thất Bại (Delivery Failure, Offline Batch Sync, CronJob 48h)
       │
       ├───────────────────────────────┐
       ▼ (Giao thành công)            ▼ (Báo thất bại 3 lần)
[GIAI ĐOẠN 7] Ví COD & Đối Soát     [QUY TRÌNH 7] Hoàn Hàng Về Seller
```

---

## 📋 CÁC BƯỚC KIỂM THỬ THEO THỨ TỰ THỜI GIAN

### 🟢 GIAI ĐOẠN 1: KHỞI TẠO TÀI KHOẢN & BẢO MẬT (AUTH & SELLER SETUP)

#### Step 1.1: Đăng ký & Xác thực OTP Email
- **Mục tiêu**: Xác minh luồng đăng ký tài khoản Seller có kiểm tra OTP Email qua SMTP.
- **Endpoint**: 
  - `POST /api/auth/register` (Body: `{ fullName, email, phoneNumber, password }`)
  - `POST /api/auth/verify-otp` (Body: `{ email, otp }`)
- **Kết quả kỳ vọng**: OTP được gửi về Email thực tế, sau khi verify tài khoản chuyển sang trạng thái `isActive: true`.

#### Step 1.2: Đăng nhập & Nhận JWT Tokens
- **Endpoint**: `POST /api/auth/login` (Body: `{ identifier, password }`)
- **Kết quả kỳ vọng**: Trả về `accessToken` (sử dụng cho header `Authorization: Bearer <token>`) và `refreshToken`.

#### Step 1.3: Cấu hình KYC Xác thực & 2FA Bảo mật
- **Endpoint**:
  - `POST /api/seller/kyc` (Upload giấy phép kinh doanh / CCCD)
  - `POST /api/seller/2fa/enable` (Khởi tạo mã QR TOTP Authenticator)
- **Kết quả kỳ vọng**: Tài khoản Seller nâng cấp lên `KYC_VERIFIED`, các giao dịch tài chính yêu cầu mã 2FA.

#### Step 1.4: Thêm Kho Lấy Hàng & Phân Quyền Sub-account
- **Endpoint**:
  - `POST /api/seller/pickup-addresses` (Thêm danh sách kho gửi hàng)
  - `POST /api/seller/sub-accounts` (Tạo tài khoản nhân viên kho / kế toán bị giới hạn quyền)
- **Kết quả kỳ vọng**: Sub-account chỉ truy cập được đúng tài nguyên được cấp phép via `requirePermission`.

---

### 🔵 GIAI ĐOẠN 2: TẠO ĐƠN HÀNG & ĐỊNH TUYẾN TỰ ĐỘNG (ORDER CREATION & ROUTING)

#### Step 2.1: Tính Cước Phí Động (Zone & Weight Pricing)
- **Endpoint**: `POST /api/orders/calculate-fee`
- **Payload**: Tọa độ GPS lấy hàng, tọa độ GPS giao hàng, kích thước 3 chiều, trọng lượng thực.
- **Kết quả kỳ vọng**: Hệ thống tính $ChargeableWeight = \max(Actual, Volumetric)$, khoảng cách Haversine và tính ra cước phí chính xác.

#### Step 2.2: Tạo Đơn Hàng Mới
- **Endpoint**: `POST /api/orders`
- **Payload**: Địa chỉ lấy/giao, danh sách sản phẩm, tiền COD (`isCod: true`), giá trị hàng.
- **Kết quả kỳ vọng**: Trả về mã vận đơn dạng `ELG-VN-XXXXXX`, đơn ở trạng thái `'CREATED'`.

#### Step 2.3: Kiểm Tra Tự Động Định Tuyến 3 Master Hubs
- **Cơ chế**: Dựa vào Tỉnh/Thành lấy và giao, hệ thống tự động phân giải về 1 trong 3 Master Hubs (`HUB_HPH_01` - Bắc, `HUB_DAD_01` - Trung, `HUB_VCA_01` - Nam).
- **Kết quả kỳ vọng**: Đơn được gán tự động `pickupHub` và `deliveryHub`.

---

### 🟡 GIAI ĐOẠN 3: LẤY HÀNG & NHẬP KHO GỐC (PICKUP & INBOUND HUB ORIGIN)

#### Step 3.1: Gán Tài Xế Lấy Hàng (Driver Assignment)
- **Endpoint**: `PATCH /api/orders/:id/assign-driver`
- **Kết quả kỳ vọng**: Trạng thái đơn chuyển sang `'PICKING'`, tài xế nhận thông báo trên App.

#### Step 3.2: Xác Nhận Lấy Hàng ePOH Manifest (UC-12)
- **Endpoint**: `POST /api/driver/pickup-confirm`
- **Payload**: Mã vận đơn, tọa độ GPS hiện tại (Geofencing check), chữ ký Canvas Stroke.
- **Kết quả kỳ vọng**: Trạng thái đơn chuyển sang `'PICKED_UP'`, tạo biên bản điện tử ePOH.

#### Step 3.3: Quét Nhập Kho Gốc (Inbound Engine UC-16)
- **Endpoint**: `POST /api/inbound/scan`
- **Payload**: `{ tracking_code, actual_weight, length, width, height }`
- **Kết quả kỳ vọng**: 
  - Trạng thái đơn chuyển sang `'IN_HUB_ORIGIN'`.
  - Tự động gợi ý Vị trí Staging Area trong kho (Staging Transfer / Delivery).
  - Cảnh báo `flagFeeWarning = true` nếu trọng lượng thực chênh lệch > 50g so với khai báo.

---

### 🟠 GIAI ĐOẠN 4: GOM BAO & XUẤT KHO TRUNG CHUYỂN (BAGGING & OUTBOUND UC-17)

#### Step 4.1: Gom Kiện Hàng Vào Bao Tải Niêm Phong Seal
- **Endpoint**: 
  - `POST /api/bags` (Tạo bao mới status `'OPEN'`)
  - `POST /api/bags/:bagId/items` (Quét thả kiện vào bao — Kiểm tra Poka-Yoke đúng tuyến)
  - `POST /api/bags/:bagId/seal` (Khóa niêm phong mã Seal — status `'SEALED'`)
- **Kết quả kỳ vọng**: Các kiện hàng được gom gọn dưới 1 mã Seal duy nhất.

#### Step 4.2: Tạo Chuyến Xe Trung Chuyển & Quét Outbound (UC-17)
- **Endpoint**: 
  - `POST /api/trips` (Tạo chuyến xe Mid-mile / Last-mile)
  - `POST /api/outbound/scan` (Quét mã Seal / Mã kiện lên xe)
- **Kết quả kỳ vọng**: Chuyến xe ở trạng thái `'DRAFT'`, danh sách `scannedItems` ghi nhận đủ các kiện.

#### Step 4.3: Bắt Tay Kép Outbound (Double Handshake)
- **Endpoint**:
  - `POST /api/outbound/commit` (Điều phối viên chốt danh sách xuất kho ➔ status `'LOCKED_PENDING_DRIVER_CONFIRM'`)
  - `POST /api/driver/trips/confirm` (Tài xế bấm ACCEPT trên ứng dụng)
- **Kết quả kỳ vọng**: Đơn hàng tự động chuyển trạng thái sang `'IN_TRANSIT'` (Trung chuyển) hoặc `'OUT_FOR_DELIVERY'` (Giao hàng).

---

### 🔴 GIAI ĐOẠN 5: QUẢN LÝ KHO & KIỂM KÊ (SORTING HUB & AUDIT UC-18, UC-19)

#### Step 5.1: Quét Nhập Kho Đích / Kho Trung Chuyển
- **Endpoint**: `POST /api/inbound/scan-seal` (Nhập nguyên bao tải via Mã Seal)
- **Kết quả kỳ vọng**: Tự động giải nén toàn bộ kiện con bên trong bao tải, chuyển trạng thái đơn sang `'IN_SORTING_HUB'` hoặc `'IN_HUB_DEST'`.

#### Step 5.2: Kiểm Kê Kho Tự Động Qua Mã Seal (UC-18)
- **Endpoint**: `POST /api/audit/scan`
- **Kết quả kỳ vọng**: 
  - Quét 1 mã Seal tự động khớp và kiểm kê toàn bộ kiện con bên trong.
  - Tự động phát hiện và cập nhật vị trí các kiện nằm sai khu vực (`misplacedZone`).

#### Step 5.3: Giám Sát Dashboard Tồn Kho & Gom Xe 1-Chạm (UC-19)
- **Endpoint**: `GET /api/inventory/dashboard`
- **Kết quả kỳ vọng**: Hiển thị tỷ lệ lấp đầy kho, phát cảnh báo quá tải đỏ (`CRITICAL_OVERCAPACITY`), gợi ý danh sách kiện gom xe 1-chạm.

---

### 🟣 GIAI ĐOẠN 6: GIAO HÀNG CUỐI & XỬ LÝ GIAO THẤT BẠI (DELIVERY FAILURE MODULE)

#### Step 6.1: Gán Tuyến Giao Hàng Shipper
- **Status đơn**: `'DELIVERING'` (Đang trên đường giao tới người mua).

#### Step 6.2 (Case A - Giao Thành Công):
- **Endpoint**: `POST /api/orders/:id/deliver-success`
- **Kết quả kỳ vọng**: Trạng thái đơn `'DELIVERED'`, tiền COD được ghi nhận tự động vào Ví Seller.

#### Step 6.3 (Case B - Báo Giao Thất Bại Lần 1 & 2):
- **Endpoint**: `POST /api/orders/:orderId/delivery-failure`
- **Payload**: `{ reasonGroup, contactAttempts, proofImageUrls, latitude, longitude, clientOfflineId }`
- **Kiểm tra Validation**:
  - Nếu `reasonGroup = 'CUSTOMER_REFUSED'` ➔ Bắt buộc phải có `proofImageUrls`.
  - Nếu `reasonGroup = 'WRONG_ADDRESS'` ➔ Bắt buộc `contactAttempts >= 1`.
  - Nếu gọi 2 lần liên tiếp < 30 phút ➔ Trả về HTTP 429.
- **Kết quả kỳ vọng**: Trạng thái đơn chuyển sang `'PENDING_REDELIVERY'`, tăng `deliveryFailureCount` lên 1 hoặc 2.

#### Step 6.4 (Case C - Báo Giao Thất Bại Lần 3):
- **Endpoint**: `POST /api/orders/:orderId/delivery-failure` (Lần 3)
- **Kết quả kỳ vọng**: 
  - Trạng thái đơn chuyển sang `'DELIVERY_FAILED_PENDING_RETURN'`.
  - Tự động kích hoạt **Quy trình 7: Khởi tạo quy trình hoàn hàng về cho Seller**.

#### Step 6.5 (Case D - Đồng Bộ Offline Batch Sync):
- **Endpoint**: `POST /api/delivery-failure/sync-offline`
- **Payload**: Mảng `reports: [{ orderId, clientOfflineId, reasonGroup, ... }]`
- **Kết quả kỳ vọng**: Xử lý tuần tự batch sync. Nếu `clientOfflineId` đã tồn tại, hệ thống trả về `alreadyProcessed: true` và không đếm tăng 2 lần.

#### Step 6.6 (Background Job Monitering 48h):
- **Cơ chế**: Job định kỳ quét các đơn ở trạng thái `'PENDING_REDELIVERY'` quá 48h.
- **Kết quả kỳ vọng**: Tự động phát cảnh báo `STALE_REDELIVERY_ALERT` đến Điều phối viên / Seller.

---

### 🟢 GIAI ĐOẠN 7: VÍ COD & ĐỐI SOÁT RÚT TIỀN (COD SETTLEMENT & WITHDRAWAL)

#### Step 7.1: Kiểm Tra Số Dư Ví COD Seller
- **Endpoint**: `GET /api/seller/wallet`
- **Kết quả kỳ vọng**: Hiển thị biến động số dư COD khả dụng sau khi đơn chuyển sang `'DELIVERED'`.

#### Step 7.2: Yêu Cầu Rút Tiền Về Ngân Hàng
- **Endpoint**: `POST /api/seller/wallet/withdraw`
- **Payload**: `{ amount, bankAccount, bankName, twoFactorCode }`
- **Kết quả kỳ vọng**: Hệ thống kiểm tra mã 2FA TOTP, trừ số dư khả dụng và tạo lệnh chuyển khoản ngân hàng.

---

## 🧪 BỘ SCRIPT TEST TỰ ĐỘNG CÓ SẴN TRONG CODEBASE

Bạn có thể chạy trực tiếp các bộ test tự động đã viết sẵn trong thư mục `backend/test/suites/` bằng lệnh Terminal:

```bash
# 1. Test toàn bộ Module Báo Giao Thất Bại (DF-01 đến DF-12)
node backend/test/suites/test-delivery-failure-suite.js

# 2. Test Xuất kho & Bắt tay kép Double Handshake (UC-17)
node backend/test/suites/test-prompt-c-dod.js

# 3. Test Module Gom Bao & Niêm Phong Seal (Bagging Engine)
node backend/test/suites/test-bagging-module-e2e.js

# 4. Test Nhập Kho & Phân Luồng Staging (UC-16)
node backend/test/suites/test-api-inbound-scan.js

# 5. Test Định Tuyến 63 Tỉnh Thành về 3 Master Hubs
node backend/test/suites/test-hub-routing-e2e.js

# 6. Test Kiểm Kê Kho Tự Động (Audit Engine UC-18)
node backend/test/suites/test-audit-enhanced-e2e.js

# 7. Test Dashboard Tồn Kho & Gom Xe 1-Chạm (UC-19)
node backend/test/suites/test-inventory-enhanced-e2e.js
```
