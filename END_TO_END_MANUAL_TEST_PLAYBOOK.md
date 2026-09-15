# 📘 SỔ TAY HƯỚNG DẪN KIỂM THỬ TOÀN TRÌNH E-LOGISTICS (MASTER E2E TEST PLAYBOOK)
## Hướng Dẫn Tự Kiểm Thử Từng Bước (Step-by-Step) Mọi Kịch Bản Từ Tốt Đến Xấu (Happy Paths, Edge Cases & Exception Flows)

> **Dự án**: E-Logistics Enterprise Platform  
> **Phiên bản tài liệu**: 3.0 (Cẩm nang kiểm thử chuyên sâu không bỏ sót chi tiết)  
> **Công cụ sử dụng**: Postman / cURL / VS Code REST Client / Terminal Node.js Scripts  
> **Base URL Backend**: `http://localhost:5000/api` (hoặc cổng cấu hình trong `.env`)

---

# 📑 MỤC LỤC CHI TIẾT 10 GIAI ĐOẠN KIỂM THỬ

1. [Chuẩn Bị Môi Trường & Tài Khoản Kiểm Thử](#1-chuẩn-bị-môi-trường--tài-khoản-kiểm-thử)
2. [GIAI ĐOẠN 1: Tạo Đơn Hàng & Tính Cước 4 Vùng GPS (Order & Pricing)](#giai-đoạn-1-tạo-đơn-hàng--tính-cước-4-vùng-gps)
3. [GIAI ĐOẠN 2: Thu Gom Chặng Đầu & Ký Số ePOH (UC-12 Shipper Pickup)](#giai-đoạn-2-thu-gom-chặng-đầu--ký-số-epoh-uc-12)
4. [GIAI ĐOẠN 3: Quét Nhập Kho Gốc & Phân Tách Luồng (UC-16 Inbound Scan)](#giai-đoạn-3-quét-nhập-kho-gốc--phân-tách-luồng-uc-16)
5. [GIAI ĐOẠN 4: Gom Bao Tải & Niêm Phong Poka-Yoke (UC-Bagging Engine)](#giai-đoạn-4-gom-bao-tải--niêm-phong-poka-yoke-uc-bagging)
6. [GIAI ĐOẠN 5: Xuất Kho Đường Trục & Bắt Tay Kép Tài Xế (UC-17 Outbound & Handshake)](#giai-đoạn-5-xuất-kho-đường-trục--bắt-tay-kép-tài-xế-uc-17)
7. [GIAI ĐOẠN 6: Luân Chuyển Đa Chặng & Cập Bến Kho Đích (Multi-Hop Linehaul)](#giai-đoạn-6-luân-chuyển-đa-chặng--cập-bến-kho-đích)
8. [GIAI ĐOẠN 7: Kiểm Kê Kho Nâng Cao 5 Cấp Độ (UC-18 Audit Engine)](#giai-đoạn-7-kiểm-kê-kho-nâng-cao-5-cấp-độ-uc-18)
9. [GIAI ĐOẠN 8: Dashboard Tồn Kho & Giám Sát SLA Dwell Time (UC-19 Inventory)](#giai-đoạn-8-dashboard-tồn-kho--giám-sát-sla-dwell-time-uc-19)
10. [GIAI ĐOẠN 9: Giao Hàng Chặng Cuối, Ký POD & Xử Lý Thất Bại (Last-Mile Delivery)](#giai-đoạn-9-giao-hàng-chặng-cuối-ký-pod--xử-lý-thất-bại)
11. [GIAI ĐOẠN 10: Tra Cứu Công Khai & Bảo Mật PII (Buyer Public Tracking)](#giai-đoạn-10-tra-cứu-công-khai--bảo-mật-pii)

---

# 1. CHUẨN BỊ MÔI TRƯỜNG & TÀI KHOẢN KIỂM THỬ

### 1.1. Khởi động Backend:
```bash
cd backend
npm install
npm run dev
```

### 1.2. Danh sách Tài khoản & Token Mẫu:

Đăng nhập qua `POST /api/auth/login` để lấy JWT Bearer Token:

```bash
# Đăng nhập lấy Token Seller
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@test.local","password":"TestPassword123!"}'

# Đăng nhập lấy Token Shipper Hà Nội
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"shipper.han@test.local","password":"TestPassword123!"}'

# Đăng nhập lấy Token Thủ kho Hà Nội (Hub Staff)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff.han@test.local","password":"TestPassword123!"}'

# Đăng nhập lấy Token Tài xế Xe tải Đường trục (Linehaul Driver)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver.linehaul@test.local","password":"TestPassword123!"}'
```

---

# GIAI ĐOẠN 1: TẠO ĐƠN HÀNG & TÍNH CƯỚC 4 VÙNG GPS

### 🟢 Kịch bản 1.1: Happy Path — Tạo đơn Liên miền (Hà Nội -> Cần Thơ)
* **Mục tiêu**: Hệ thống tự động phân giải vùng `INTER_REGION`, tính cự ly GPS Haversine (~1705 km), dự báo ETA 2 ngày và sinh mã lộ trình 4 chặng.
* **Request**: `POST /api/orders` (Header: `Authorization: Bearer <SELLER_TOKEN>`)
```json
{
  "pickupAddress": {
    "fullName": "Tổng kho Hà Nội",
    "phone": "0911223344",
    "address": "1 Tràng Tiền",
    "ward": "Tràng Tiền",
    "district": "Hoàn Kiếm",
    "province": "Hà Nội"
  },
  "deliveryAddress": {
    "fullName": "Anh Bình Cần Thơ",
    "phone": "0988776655",
    "address": "123 Đường 30/4",
    "ward": "Xuân Khánh",
    "district": "Ninh Kiều",
    "province": "Cần Thơ"
  },
  "items": [{ "name": "Laptop ThinkPad", "quantity": 1, "weight": 2.0 }],
  "actualWeight": 2.0,
  "dimensions": { "length": 35, "width": 25, "height": 5 },
  "codAmount": 15000000,
  "goodsValue": 15000000
}
```
* **Kỳ vọng (Assertion)**:
  - `status: 201 Created`
  - `data.status`: `"CREATED"` (hoặc `"READY_TO_PICK"`)
  - `data.zoneTier`: `"INTER_REGION"`
  - `data.shippingFee`: `35000` VNĐ
  - `data.routeNodes`: Danh sách 4 chặng `[HUB_HAN_01 -> HUB_SGN_01 -> HUB_VCA_01]`.

---

### 🟢 Kịch bản 1.2: Happy Path — Tạo đơn Nội tỉnh (Hà Nội -> Hà Nội)
* **Mục tiêu**: Hệ thống nhận diện cùng tỉnh, gán `zoneTier: "INTRA_PROVINCE"`, cước 16.500 đ.
* **Request**: `POST /api/orders`
```json
{
  "pickupAddress": { "fullName": "Kho Cầu Giấy", "phone": "0911223344", "address": "4 Cầu Giấy", "province": "Hà Nội" },
  "deliveryAddress": { "fullName": "Khách Đống Đa", "phone": "0988112233", "address": "50 Nguyễn Chí Thanh", "province": "Hà Nội" },
  "items": [{ "name": "Tài liệu", "quantity": 1, "weight": 0.5 }],
  "actualWeight": 0.5,
  "dimensions": { "length": 20, "width": 15, "height": 5 }
}
```
* **Kỳ vọng**: `status: 201`, `data.zoneTier: "INTRA_PROVINCE"`, `data.shippingFee: 16500`.

---

### 🔴 Kịch bản 1.3: Negative — Dữ liệu Cân nặng / Kích thước Không Hợp Lệ
* **Test 1.3.1 (Cân nặng $\le 0$)**: Gửi `actualWeight: 0` hoặc `-1.5` $\rightarrow$ Kỳ vọng `400 Bad Request` (`"Khối lượng bưu kiện phải lớn hơn 0"`).
* **Test 1.3.2 (Kích thước âm)**: Gửi `dimensions: { length: -10, width: 20, height: 10 }` $\rightarrow$ Kỳ vọng `400 Bad Request` (`"Kích thước 3 chiều không được âm"`).
* **Test 1.3.3 (Giá trị hàng hóa âm)**: Gửi `goodsValue: -50000` $\rightarrow$ Kỳ vọng `400 Bad Request`.

---

### 🟡 Kịch bản 1.4: Edge Case — Tính Cước Quy Đổi Thể Tích (Volumetric Weight)
* **Điều kiện**: Kiện hàng cồng kềnh nhẹ (Xốp EPS): `actualWeight = 1.0kg`, kích thước `50x40x30 cm`.
* **Công thức quy đổi**: $\text{Trọng lượng quy đổi} = \frac{50 \times 40 \times 30}{5000} = 12\text{kg}$.
* **Kỳ vọng**: `data.chargeableWeight: 12.0`, cước phí tự động áp dụng biểu phí cho mức 12kg (vượt trội so với mức 1kg cơ sở).

---

# GIAI ĐOẠN 2: THU GOM CHẶNG ĐẦU & KÝ SỐ ePOH (UC-12)

### 🟢 Kịch bản 2.1: Happy Path — Quét Mã & Xác Nhận Lấy Hàng Thành Công (ePOH)
1. **Bước 1 — Quét Barcode vận đơn**:
   - `POST /api/orders/shipper/scan-item` (hoặc `/orders/shipper/:id/verify-pickup-scan`)
   - Header: `Authorization: Bearer <SHIPPER_TOKEN>`
   - Body: `{ "trackingCode": "<TRACKING_CODE>" }`
   - Kỳ vọng: `200 OK`, `message: "Đơn hàng hợp lệ và sẵn sàng lấy hàng!"`.
2. **Bước 2 — Ký biên bản bàn giao điện tử ePOH**:
   - `POST /api/orders/shipper/confirm-pickup`
   - Body:
   ```json
   {
     "trackingCode": "<TRACKING_CODE>",
     "sellerSignature": "data:image/png;base64,iVBORw0KGgoAAA...",
     "latitude": 21.0285,
     "longitude": 105.8542,
     "clientOfflineId": "OFFLINE-SYNC-001"
   }
   ```
   - Kỳ vọng: `200 OK`, `data.status: "PICKED_UP"`, DB tạo bản ghi `PickupConfirmation`.

---

### 🔴 Kịch bản 2.2: Negative — Quét Sai Mã Vận Đơn
* **Request**: `POST /api/orders/shipper/confirm-pickup` với `trackingCode: "ELG-VN-INVALID-9999"`.
* **Kỳ vọng**: `404 Not Found` hoặc `400 Bad Request` (`"Vận đơn không tồn tại hoặc không khớp"`).

---

### 🔴 Kịch bản 2.3: Negative — Thiếu Chữ Ký Seller
* **Request**: `POST /api/orders/shipper/confirm-pickup` gửi `{ "trackingCode": "<VALID_CODE>", "sellerSignature": "" }`.
* **Kỳ vọng**: `400 Bad Request` (`"Yêu cầu chữ ký Seller xác thực bàn giao"`).

---

### 🔴 Kịch bản 2.4: Negative — Lấy Nhầm Tuyến (Tài xế khác được phân công)
* **Điều kiện**: Đơn hàng được gán cho Shipper A (`currentDriver = Shipper_A`), nhưng Shipper B thực hiện quét xác nhận.
* **Kỳ vọng**: `403 Forbidden` (`"Đơn hàng không nằm trong danh sách tuyến thu gom được gán cho bạn"`).

---

### 🔴 Kịch bản 2.5: Negative — Đơn Hàng Đã Bị Hủy Trước Đó (State Machine Guard)
* **Điều kiện**: Seller đã hủy đơn (`status: "CANCELLED"`). Shipper cố tình quét lấy hàng.
* **Kỳ vọng**: `409 Conflict` (`"Không thể lấy hàng! Đơn hàng đã bị HỦY trước đó"`).

---

### 🟡 Kịch bản 2.6: Edge Case — Mất Tín Hiệu GPS Ngoại Tuyến
* **Request**: Gửi không kèm `latitude` và `longitude`.
* **Kỳ vọng**: Hệ thống vẫn cho phép lấy hàng nhưng lưu bản ghi với cờ `gpsMissing: true` phục vụ kiểm toán sau này.

---

### 🟡 Kịch bản 2.7: Edge Case — Phát Hiện Lệch Cân & Bắt Buộc Ảnh Đối Chứng
* **Request**: Khai báo lúc tạo là 1kg, nhưng Shipper cân tại chỗ là 3kg (`actualWeight: 3.0`).
* **Test 2.7.1 (Không gửi kèm ảnh đối chứng)**:
  - Kỳ vọng: `422 Unprocessable Entity` (`"Bắt buộc chụp ảnh kiện hàng đối chứng khi phát hiện lệch cân nặng/kích thước"`).
* **Test 2.7.2 (Có gửi kèm `proofPhotos: ["https://cdn.../photo1.jpg"]`)**:
  - Kỳ vọng: `200 OK`, `flagFeeWarning: true`, tính phụ thu cước tức thì.

---

### 🟡 Kịch bản 2.8: Edge Case — Cơ Chế Idempotency Chống Trùng Lặp Offline Queue
* **Mô phỏng**: App mất mạng, gửi 2 lần cùng một payload với cùng `clientOfflineId: "OFFLINE-UUID-12345"`.
* **Kỳ vọng**: Lần 1 trả `200 OK (Mới)`. Lần 2 trả `200 OK (Cache)` kèm thông báo *"Xác nhận lấy hàng đã được ghi nhận trước đó (Offline Sync)"*, không tạo 2 bản ghi DB.

---

### 🔴 Kịch bản 2.9: Exception Flow — Ghi Nhận Lấy Hàng Thất Bại
* **Request**: `POST /api/orders/shipper/pickup-failed`
```json
{
  "trackingCode": "<TRACKING_CODE>",
  "reason": "SELLER_NOT_HOME",
  "note": "Gọi 3 cuộc không ai nghe máy, cửa kho đóng kín",
  "proofPhotos": ["https://cdn.../closed_door.jpg"]
}
```
* **Kỳ vọng**: `200 OK`, `order.status: "PICKUP_FAILED"`, ghi log `OrderTrackingLog(PICKUP_FAILED)` và `OrderLog`.

---

# GIAI ĐOẠN 3: QUÉT NHẬP KHO GỐC & PHÂN TÁCH LUỒNG (UC-16)

### 🟢 Kịch bản 3.1: Happy Path — Quét Nhập Kho Kiện Hàng Nguyên Vẹn
* **Request**: `POST /api/inbound/scan-single`
  - Header: `Authorization: Bearer <STAFF_HAN_TOKEN>`
  - Body:
  ```json
  {
    "tracking_code": "<TRACKING_CODE>",
    "package_condition": "INTACT",
    "hub_measured_weight": 2000
  }
  ```
* **Kỳ vọng**:
  - `status: 200 OK`
  - `data.current_status`: `"IN_HUB_ORIGIN"`
  - `data.next_action`: `"SORT_FOR_TRANSIT"`
  - `data.is_flagged`: `false`
  - Đơn được gán vào khu trung chuyển `STAGING_TRANSFER`.

---

### 🟢 Kịch bản 3.2: Happy Path (Fast-path) — Đơn Nội Tỉnh Đi Thẳng Khu Giao Hàng
* **Điều kiện**: Đơn hàng 1.2 (HN $\rightarrow$ HN).
* **Request**: `POST /api/inbound/scan-single` tại Kho Hà Nội.
* **Kỳ vọng**:
  - `data.current_status`: `"IN_HUB_DEST"` (Nhận diện chính Kho tiếp nhận là Kho đích).
  - `data.next_action`: `"WAITING_FOR_DELIVERY"`
  - Đơn đưa thẳng vào khu giao hàng `STAGING_DELIVERY` (Bỏ qua khâu đóng bao và xe trục).

---

### 🟡 Kịch bản 3.3: Edge Case — Phát Hiện Lệch Cân $>50\text{g}$ Tại Cân Tự Động
* **Điều kiện**: Đơn khai báo 1.0kg ($1000\text{g}$), thủ kho quét cân là 2.5kg ($2500\text{g}$).
* **Request**: `POST /api/inbound/scan-single` với `hub_measured_weight: 2500`.
* **Kỳ vọng**:
  - `status: 200 OK`
  - `data.weight_discrepancy_gram`: `1500`
  - `data.flag_fee_warning`: `true`
  - `data.surcharge_fee`: `17000` VNĐ (Phụ thu chênh lệch)
  - `data.revised_shipping_fee`: `60500` VNĐ (Cước mới đã cộng phụ thu)
  - DB tự động ghi `OrderLog` với `actionType: "FEE_ADJUSTMENT_TRIGGERED"`.

---

### 🔴 Kịch bản 3.4: Exception Flow — Hàng Bị Móp Méo / Rách Niêm Phong
* **Request**: `POST /api/inbound/scan-single` với `package_condition: "DAMAGED"` hoặc `"TORN_SEAL"`, kèm `note: "Kiện hàng rách góc niêm phong"`.
* **Kỳ vọng**:
  - `status: 200 OK`
  - `data.current_status`: `"EXCEPTION_INBOUND"`
  - `data.is_flagged`: `true`
  - `data.next_action`: `"EXCEPTION_AREA"` (Đưa an toàn vào khu sự cố `INCIDENT`).

---

### 🔴 Kịch bản 3.5: Negative — Nhân Viên Chưa Được Gán Kho (Hub Unassigned)
* **Request**: Đăng nhập bằng tài khoản Admin không có trường `hubId`, gọi `/inbound/scan-single`.
* **Kỳ vọng**: `403 Forbidden` (`code: "HUB_UNASSIGNED"`, `"Nhân viên chưa được gán vào Bưu cục/Kho nào"`).

---

### 🔴 Kịch bản 3.6: Negative — Quét Sai Trạng Thái Quy Trình
* **Điều kiện**: Đơn mới tạo (`CREATED`) chưa qua Shipper lấy hàng (`PICKED_UP`), cố tình quét nhập kho.
* **Kỳ vọng**: `400 Bad Request` (`code: "INVALID_STATE_TRANSITION"`).

---

# GIAI ĐOẠN 4: GOM BAO TẢI & NIÊM PHONG POKA-YOKE (UC-BAGGING)

### 🟢 Kịch bản 4.1: Happy Path — Mở Bao Tải, Thả Kiện & Khóa Niêm Phong Seal
1. **Mở bao tải đi TP.HCM**:
   - `POST /api/bags/open` (Header: `Authorization: Bearer <STAFF_HAN_TOKEN>`)
   - Body: `{ "seal_code": "SEAL-HN-SGN-001", "destination_hub_id": "<HUB_SGN_ID>", "max_capacity": 30, "max_weight_kg": 25 }`
   - Kỳ vọng: `201 Created`, `data.status: "OPEN"`.
2. **Quét thả kiện hàng vào bao**:
   - `POST /api/bags/add-item`
   - Body: `{ "seal_code": "SEAL-HN-SGN-001", "tracking_code": "<TRACKING_CODE_INTER_REGION>" }`
   - Kỳ vọng: `200 OK`, `data.item_count: 1`.
3. **Khóa niêm phong Seal**:
   - `POST /api/bags/seal`
   - Body: `{ "seal_code": "SEAL-HN-SGN-001" }`
   - Kỳ vọng: `200 OK`, `data.status: "SEALED"`.

---

### 🔴 Kịch bản 4.2: Negative — Cơ Chế Poka-Yoke Chống Nhầm Tuyến (Route Guard)
* **Điều kiện**: Bao tải đang mở đi Đà Nẵng (`destination_hub_id: HUB_DAD`), nhân viên quét kiện hàng đi TP.HCM vào bao.
* **Request**: `POST /api/bags/add-item`
* **Kỳ vọng**: `400 Bad Request` (`code: "WRONG_DESTINATION_ROUTE"`, *"Kiện hàng không thuộc lộ trình đi qua Hub đích của bao tải"*).

---

### 🔴 Kịch bản 4.3: Negative — Thử Thả Kiện Hàng Bị Khóa (`EXCEPTION_INBOUND`)
* **Request**: Thả kiện hàng hỏng ở bước 3.4 vào bao tải.
* **Kỳ vọng**: `422 Unprocessable Entity` (`code: "ITEM_LOCKED"`, *"Kiện hàng đang bị khóa sự cố, không được phép gom bao"*).

---

### 🔴 Kịch bản 4.4: Negative — Vượt Quá Tải Trọng / Sức Chứa Tối Đa
* **Điều kiện**: Bao tải chỉ cho phép `max_capacity: 2`. Đã có 2 kiện, cố tình quét kiện thứ 3.
* **Kỳ vọng**: `400 Bad Request` (`code: "BAG_CAPACITY_EXCEEDED"`, *"Bao tải đã đạt giới hạn sức chứa"*).

---

### 🟢 Kịch bản 4.5: Happy Path — Gỡ Kiện Khỏi Bao Tải (`removeItemFromBag`)
* **Request**: `POST /api/bags/remove-item` với `{ "seal_code": "SEAL-HN-SGN-001", "tracking_code": "<TRACKING_CODE>" }`.
* **Kỳ vọng**: `200 OK`, `order.sealId` được hoàn trả về `null`, `bag.itemCount` giảm đi 1.

---

# GIAI ĐOẠN 5: XUẤT KHO ĐƯỜNG TRỤC & BẮT TAY KÉP (UC-17)

### 🟢 Kịch bản 5.1: Happy Path — Quét Xuất Kho, Chốt Chuyến & Tài Xế ACCEPT
1. **Tạo chuyến xe trung chuyển**:
   - `POST /api/outbound/trips`
   - Body: `{ "trip_code": "TRIP-LINEHAUL-01", "trip_type": "HUB_TRANSFER", "origin_hub_id": "<HUB_HAN_ID>", "destination_hub_id": "<HUB_SGN_ID>", "driver_id": "<DRIVER_ID>", "planned_tracking_codes": ["<CODE_1>", "<CODE_2>"] }`
2. **Quét xuất kho từng kiện hoặc mã Seal**:
   - `POST /api/outbound/scan`
   - Body: `{ "trip_code": "TRIP-LINEHAUL-01", "tracking_code": "<CODE_1>" }`
   - Kỳ vọng: `200 OK`.
3. **Thủ kho chốt bàn giao**:
   - `POST /api/outbound/commit`
   - Body: `{ "trip_code": "TRIP-LINEHAUL-01" }`
   - Kỳ vọng: `200 OK`, `trip.status: "LOCKED_PENDING_DRIVER_CONFIRM"`.
4. **Tài xế ký số ACCEPT**:
   - `POST /api/outbound/driver-confirm` (Header: `Authorization: Bearer <DRIVER_TOKEN>`)
   - Body: `{ "trip_code": "TRIP-LINEHAUL-01", "action": "ACCEPT" }`
   - Kỳ vọng: `200 OK`, `trip.status: "CONFIRMED"`, các kiện hàng trong chuyến chuyển sang `status: "IN_TRANSIT"`.

---

### 🔴 Kịch bản 5.2: Negative & Rollback — Tài Xế Từ Chối (REJECT Trip)
* **Tình huống**: Tài xế phát hiện thùng xe quá tải hoặc niêm phong có dấu hiệu rách.
* **Request**:
  - `POST /api/outbound/driver-confirm`
  - Body: `{ "trip_code": "TRIP-LINEHAUL-01", "action": "REJECT", "reject_reason": "Xe quá tải trọng đăng kiểm" }`
* **Kỳ vọng (Rollback Safety)**:
  - `status: 200 OK`, `trip.status: "REJECTED"`.
  - Toàn bộ các kiện hàng đã quét được gỡ `currentTripId = null`, bảo toàn trạng thái lưu kho tại Hub gốc.
  - Các đơn thiếu (shortage) được đưa từ `SEARCH_ZONE` trở lại khu vực lưu trữ bình thường.
  - Ghi vết kiểm toán `OrderLog` với `note: "Tài xế từ chối chuyến xe - Rollback"`.

---

### 🔴 Kịch bản 5.3: Negative — Quét Kiện Không Thuộc Chuyến Xe (Item Not In Trip)
* **Request**: `POST /api/outbound/scan` với mã vận đơn không nằm trong `plannedTrackingCodes`.
* **Kỳ vọng**: `409 Conflict` (`code: "ITEM_NOT_IN_TRIP"`, *"Kiện hàng không thuộc chuyến xe này"*).

---

### 🟡 Kịch bản 5.4: Edge Case — Chốt Chuyến Thiếu Hàng (Shortage Handling)
* **Điều kiện**: Chuyến có 3 kiện dự kiến, nhưng chỉ quét được 2 kiện lên xe.
* **Request**: `POST /api/outbound/commit` với `isShortage: true`.
* **Kỳ vọng**: Chuyến xe vẫn cho phép khóa bàn giao 2 kiện; kiện thứ 3 còn thiếu tự động chuyển sang `status: "SEARCH_ZONE"` để nhân viên kho rà soát tìm kiếm.

---

# GIAI ĐOẠN 6: LUÂN CHUYỂN ĐA CHẶNG & CẬP BẾN KHO ĐÍCH

### 🟢 Kịch bản 6.1: Happy Path — Nhập Kho Trung Chuyển (Kho Tổng TP.HCM)
* **Điều kiện**: Chuyến xe từ Hà Nội cập bến TP.HCM.
* **Request**: `POST /api/inbound/scan-single` tại Kho TP.HCM với Header `<STAFF_SGN_TOKEN>`.
* **Kỳ vọng**:
  - Hệ thống nhận diện đây là Hub trung gian (chưa phải đích cuối Cần Thơ).
  - `data.current_status: "IN_SORTING_HUB"`
  - `data.next_action: "SORT_FOR_NEXT_HUB"` (Đưa vào khu phân loại tiếp tuyến).

---

### 🟢 Kịch bản 6.2: Happy Path — Xuất Xe Nhánh & Nhập Bưu Cục Đích (Cần Thơ)
1. **Xuất xe HCM $\rightarrow$ Cần Thơ**: Tạo trip `TRIP-SGN-VCA`, quét xuất kho, tài xế `ACCEPT` $\rightarrow$ Đơn chuyển `IN_TRANSIT`.
2. **Nhập kho tại Cần Thơ**:
   - `POST /api/inbound/scan-single` tại Cần Thơ với Header `<STAFF_VCA_TOKEN>`.
   - Kỳ vọng:
     - `data.current_status: "IN_HUB_DEST"` (ĐÃ ĐẾN KHO ĐÍCH THÀNH CÔNG!).
     - `data.next_action: "WAITING_FOR_DELIVERY"`
     - `data.is_dest_hub: true` (Đưa vào khu giao hàng chặng cuối `STAGING_DELIVERY`).

---

# GIAI ĐOẠN 7: KIỂM KÊ KHO NÂNG CAO 5 CẤP ĐỘ (UC-18)

### 🟢 Kịch bản 7.1: Happy Path — Khởi Tạo, Quét Đối Soát Khớp 100% & Phê Duyệt
1. **Bắt đầu phiên kiểm kê**:
   - `POST /api/audit/start` (Header: `Authorization: Bearer <STAFF_VCA_TOKEN>`)
   - Body: `{ "scope_type": "ALL", "notes": "Kiểm kê định kỳ cuối ngày" }`
   - Kỳ vọng: `201 Created`, trả về `data.session_code: "AUDIT-..."`.
2. **Đồng bộ danh sách quét thực tế**:
   - `POST /api/audit/sync`
   - Body: `{ "session_code": "<SESSION_CODE>", "tracking_codes": ["<CODE_1>", "<CODE_2>"] }`
   - Kỳ vọng: `200 OK`, `data.added_count: 2`.
3. **Nộp kết quả kiểm kê**:
   - `POST /api/audit/<SESSION_CODE>/submit`
   - Kỳ vọng: `200 OK`, `data.missing_count: 0` (Khớp 100%, 0 kiện thất thoát), `status: "PENDING_APPROVAL"`.
4. **Trưởng bưu cục phê duyệt**:
   - `POST /api/audit/<SESSION_CODE>/approve` (Header: `<COORDINATOR_TOKEN>`)
   - Kỳ vọng: `200 OK`, `data.status: "APPROVED"`.

---

### 🟡 Kịch bản 7.2: Edge Case — Quét 1 Mã Seal Tự Động Giải Nén Toàn Bộ Kiện Con
* **Request**: `POST /api/audit/sync` gửi `{ "session_code": "<SESSION_CODE>", "seal_code": "SEAL-HN-SGN-001" }`.
* **Kỳ vọng**: Hệ thống tự động giải nén toàn bộ các đơn hàng nằm trong bao tải và đánh dấu đã đối soát mà không cần xé bao quét từng kiện.

---

### 🟡 Kịch bản 7.3: Edge Case — Tự Động Phát Hiện Hàng Nằm Sai Khu Vực (Misplaced Zone)
* **Tình huống**: Kiện hàng trên hệ thống thuộc `STAGING_TRANSFER` nhưng nhân viên tìm thấy và quét tại `STAGING_DELIVERY`.
* **Request**: `POST /api/audit/sync` với `auto_relocate_zone: true`.
* **Kỳ vọng**: Hệ thống ghi nhận cảnh báo `misplacedItems` và tự động cập nhật `currentZoneId` của đơn hàng về đúng vị trí thực tế.

---

### 🟡 Kịch bản 7.4: Edge Case — Tự Động Phục Hồi Hàng Thất Lạc (Lost Item Recovery)
* **Tình huống**: Kiện hàng trước đó bị đánh dấu `SEARCH_ZONE` hoặc `LOST`. Trong phiên kiểm kê, thủ kho quét thấy lại kiện hàng này.
* **Kỳ vọng**: Hệ thống tự động gỡ cờ sự cố, phục hồi trạng thái đơn về `IN_HUB_DEST` và đưa vào danh sách `recoveredItems`.

---

### 🔴 Kịch bản 7.5: Exception Flow — Phát Hiện Mất Hàng & Tính Tổng Tiền Thất Thoát (Loss Valuation VND)
* **Tình huống**: Snapshot có 3 kiện trị giá 15.000.000 đ, nhưng thực tế chỉ quét được 2 kiện.
* **Kỳ vọng**:
  - `data.missing_count: 1`
  - Kiện mất tự động chuyển sang `status: "SEARCH_ZONE"`.
  - `data.loss_valuation_vnd: 15000000` VNĐ (Tính chính xác tổng tiền bồi thường trình ban quản trị).
  - Đối soát xe đường trục: Nếu có đơn `IN_TRANSIT` quá hạn SLA tối đa $\rightarrow$ Tự động gắn cờ `SUSPECTED_LOST_IN_TRANSIT`.

---

# GIAI ĐOẠN 8: DASHBOARD TỒN KHO & GIÁM SÁT SLA DWELL TIME (UC-19)

### 🟢 Kịch bản 8.1: Happy Path — Giám Sát SLA Dwell Time Động Theo Cự Ly
* **Request**: `GET /api/inventory/aging?hub_id=<HUB_VCA_ID>`
* **Kỳ vọng**: Trả về danh sách tồn kho với số giờ lưu kho thực tế (`dwellTimeHours`) và ngưỡng SLA tương ứng theo `zoneTier`:
  - `INTRA_PROVINCE`: Cảnh báo > 12h, Nguy cấp > 24h.
  - `INTRA_REGION`: Cảnh báo > 24h, Nguy cấp > 36h.
  - `NEAR_REGION`: Cảnh báo > 36h, Nguy cấp > 48h.
  - `INTER_REGION`: Cảnh báo > 48h, Nguy cấp > 72h.

---

### 🟡 Kịch bản 8.2: Edge Case — Cảnh Báo Khay Kệ Nghẽn Kho Đỏ (>90% Sức Chứa)
* **Điều kiện**: Khay kệ sức chứa 10 kiện, hiện có 9 kiện (90%).
* **Request**: `GET /api/inventory/summary?hub_id=<HUB_VCA_ID>`
* **Kỳ vọng**: `zone_alerts` phát cảnh báo đỏ `CRITICAL_OVERCAPACITY` cho khu vực tương ứng.

---

### 🟢 Kịch bản 8.3: Happy Path — Gợi Ý Gom Chuyến Xe 1-Chạm (Auto-Trip Suggestion)
* **Request**: `GET /api/inventory/suggested-trips?hub_id=<HUB_VCA_ID>`
* **Kỳ vọng**: Trả về danh sách các nhóm hàng gom đủ tải; cho phép bấm nút tạo chuyến xe `TRIP-AUTO-...` tức thì.

---

### 🟢 Kịch bản 8.4: Happy Path — Thao Tác Tồn Kho Quá Hạn Hàng Loạt (Batch Actions)
* **Request**: `POST /api/inventory/batch-action`
```json
{
  "hub_id": "<HUB_VCA_ID>",
  "tracking_codes": ["<CODE_OVERDUE_1>", "<CODE_OVERDUE_2>"],
  "action": "BULK_RETURN",
  "reason": "Hàng tồn quá hạn SLA không có người nhận"
}
```
* **Kỳ vọng**: `200 OK`, chuyển hoàn hàng loạt 2/2 kiện về `RETURNED_TO_HUB_ORIGIN` trong 1 thao tác duy nhất với tính nguyên tử OCC.

---

# GIAI ĐOẠN 9: GIAO HÀNG CHẶNG CUỐI, KÝ POD & XỬ LÝ THẤT BẠI

### 🟢 Kịch bản 9.1: Happy Path — Xuất Tuyến Giao & Ký Nhận POD Thành Công
1. **Bàn giao Shipper phát hàng**:
   - Tạo trip `LAST_MILE_DELIVERY`, quét xuất kho, Shipper `ACCEPT` $\rightarrow$ Đơn chuyển `status: "OUT_FOR_DELIVERY"`.
2. **Giao hàng thành công**:
   - `POST /api/orders/shipper/confirm-delivery` (Header: `Authorization: Bearer <SHIPPER_TOKEN>`)
   - Body:
   ```json
   {
     "tracking_code": "<TRACKING_CODE>",
     "pod_image_url": "https://cdn.e-logistic.vn/pod/del_success_1.jpg",
     "recipient_signature_url": "https://cdn.e-logistic.vn/sig/customer_sig.png",
     "collected_cod_amount": 15000000,
     "note": "Khách hàng nhận đủ nguyên vẹn"
   }
   ```
   - Kỳ vọng: `200 OK`, `order.status: "DELIVERED"`, ghi log `OrderTrackingLog(DELIVERED)`.

---

### 🔴 Kịch bản 9.2: Exception Flow — Báo Giao Thất Bại & Kế Hoạch Giao Lại
* **Tình huống**: Khách đi vắng, hẹn giao lại ngày mai.
* **Request**: `POST /api/orders/shipper/delivery-failed`
```json
{
  "tracking_code": "<TRACKING_CODE>",
  "fail_reason": "CUSTOMER_UNREACHABLE",
  "retry_date": "2026-08-22",
  "note": "Gọi 3 cuộc khách không bắt máy",
  "proof_photo_url": "https://cdn.e-logistic.vn/proof/house_closed.jpg"
}
```
* **Kỳ vọng**:
  - `status: 200 OK`
  - `order.status`: `"DELIVERY_FAILED"` (hoặc `"WAITING_FOR_REDELIVERY"` nếu chưa quá 3 lần).
  - Tăng `deliveryAttempts` lên 1.
  - Ghi log `OrderTrackingLog(DELIVERY_FAILED)`.

---

### 🔴 Kịch bản 9.3: Exception Flow — Chuyển Hoàn Sau 3 Lần Giao Thất Bại
* **Điều kiện**: Đơn hàng đã giao thất bại 3 lần.
* **Kỳ vọng**: Hệ thống tự động chuyển đơn sang luồng chuyển hoàn `RETURNING` $\rightarrow$ `RETURN_IN_TRANSIT` $\rightarrow$ Quay ngược lại Kho gốc trả cho Seller.

---

# GIAI ĐOẠN 10: TRA CỨU CÔNG KHAI & BẢO MẬT PII (BUYER TRACKING)

### 🟢 Kịch bản 10.1: Happy Path — Tra Cứu Toàn Bộ Dòng Thời Gian (Timeline)
* **Request**: `GET /api/orders/track/<TRACKING_CODE>?phoneLast4=6655` (Không cần Bearer Token)
* **Kỳ vọng**:
  - `status: 200 OK`
  - `data.trackingCode`: `"<TRACKING_CODE>"`
  - `data.currentStatus`: `"DELIVERED"`
  - `data.timeline`: Danh sách đầy đủ toàn bộ các mốc sự kiện từ khi tạo đơn $\rightarrow$ lấy hàng $\rightarrow$ các Hub trung chuyển $\rightarrow$ giao thành công kèm ảnh POD và chữ ký.
  - `data.deliveryAddress.phone`: Đã được che ẩn PII (Ví dụ: `09****6655`).

---

### 🔴 Kịch bản 10.2: Negative — Nhập Sai 4 Số Cuối Điện Thoại
* **Request**: `GET /api/orders/track/<TRACKING_CODE>?phoneLast4=9999`
* **Kỳ vọng**: `403 Forbidden` (`code: "INVALID_PHONE_VERIFICATION"`, *"4 số cuối số điện thoại người nhận không chính xác"*).

---

### 🔴 Kịch bản 10.3: Negative — Chặn Vét Cạn Brute-Force (Anti-Brute-Force)
* **Mô phỏng**: Kẻ xấu dùng bot thử liên tục các số từ `0000` đến `9999`.
* **Kỳ vọng**: Sau 5 lần nhập sai liên tiếp, hệ thống chặn truy vấn trong 15 phút (`429 Too Many Requests` / `ACCOUNT_LOCKED_TEMPORARILY`).

---

# 🚀 TỔNG KẾT & LỆNH CHẠY TEST TỰ ĐỘNG NHANH

Để kiểm chứng nhanh toàn bộ 92 kịch bản test trên chỉ trong **1 lệnh duy nhất**:

```bash
cd backend
node test/e2e/test-full-lifecycle-e2e.js
```

🎯 **Kết quả kỳ vọng**: `38/38 BƯỚC THÀNH CÔNG (100% PASS)` không có bất kỳ lỗi nào!
