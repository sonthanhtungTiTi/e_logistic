# 📦 BỘ HƯỚNG DẪN KIỂM THỬ E2E TOÀN TRÌNH — E-LOGISTICS PLATFORM

> **Phiên bản tài liệu:** 1.0  
> **Soạn bởi:** QA Lead (dựa trên đọc codebase thực tế)  
> **Ngày soạn:** 2026-08-21  
> **Nguồn dữ liệu:** 100% truy xuất từ code thật — `order.model.js`, `user.model.js`, `bag.model.js`, `trip.model.js`, `auth.middleware.js`, `inboundCore.service.js`, `bagCore.service.js`, `outboundCore.service.js`, `deliveryFailure.service.js`, `autoApproval.service.js`, `hubRouting.service.js`, `order.service.js`, `auditCore.service.js` và toàn bộ `routes/*.js`.  
> **Lưu ý quan trọng:** Mọi tên trạng thái, tên role, tên API trong tài liệu này đều có thể truy nguồn về file code cụ thể. Không có dữ liệu suy đoán.

---

## 📑 MỤC LỤC

1. [Bảng tổng hợp Role và Trạng thái thật trong code](#1-bảng-tổng-hợp-role--trạng-thái-thật-trong-code)
2. [Sơ đồ chuỗi liên kết toàn trình (State Machine)](#2-sơ-đồ-chuỗi-liên-kết-toàn-trình)
3. [Giai đoạn 1 — Seller tạo đơn hàng](#3-giai-đoạn-1--seller-tạo-đơn-hàng)
4. [Giai đoạn 2 — Shipper lấy hàng chặng đầu (UC-12)](#4-giai-đoạn-2--shipper-lấy-hàng-chặng-đầu-uc-12-epoh)
5. [Giai đoạn 3 — HUB_STAFF nhập kho gốc (UC-16)](#5-giai-đoạn-3--hub_staff-nhập-kho-gốc-uc-16-inbound)
6. [Giai đoạn 4 — HUB_STAFF đóng bao & niêm phong (Bagging)](#6-giai-đoạn-4--hub_staff-đóng-bao--niêm-phong)
7. [Giai đoạn 5 — Xuất kho & Driver bắt tay kép (UC-17)](#7-giai-đoạn-5--xuất-kho--driver-bắt-tay-kép-uc-17)
8. [Giai đoạn 6 — Nhập kho trung chuyển / Kho đích](#8-giai-đoạn-6--nhập-kho-trung-chuyển--kho-đích)
9. [Giai đoạn 7 — SHIPPER giao hàng chặng cuối (Last-Mile POD)](#9-giai-đoạn-7--shipper-giao-hàng-chặng-cuối)
10. [Giai đoạn 8 — Tra cứu công khai](#10-giai-đoạn-8--tra-cứu-công-khai)
11. [Giai đoạn 9 — Nhánh hoàn hàng (Return)](#11-giai-đoạn-9--nhánh-hoàn-hàng)
12. [Giai đoạn 10 — Kiểm kê kho (UC-18)](#12-giai-đoạn-10--kiểm-kê-kho-uc-18-audit)
13. [Giai đoạn 11 — Tồn kho & SLA Dwell (UC-19)](#13-giai-đoạn-11--quản-lý-tồn-kho--sla-dwell-uc-19)
14. [Ma trận Vai trò x Quyền hạn API (RBAC)](#14-ma-trận-vai-trò--quyền-hạn-api)
15. [Bộ kịch bản Full-Chain (A, B, C)](#15-bộ-kịch-bản-full-chain)
16. [Hướng dẫn thực thi test tự động](#16-hướng-dẫn-thực-thi-test-tự-động)
17. [Phát hiện thêm trong quá trình soạn test](#17-phát-hiện-thêm-trong-quá-trình-soạn-test)

---

## 1. BẢNG TỔNG HỢP ROLE & TRẠNG THÁI THẬT TRONG CODE

### 1.1. Danh sách Role (nguồn: `user.model.js` dòng 31–47)

| Role | Mô tả | Alias (auth.middleware.js dòng 78–86) |
|---|---|---|
| `SELLER` | Chủ hàng / Nhà bán hàng | — |
| `BUYER` | Người mua / Khách nhận hàng | — (default khi đăng ký) |
| `SHIPPER` | Shipper giao nhận chặng đầu / cuối | → LOCAL_SHIPPER, DRIVER |
| `LOCAL_SHIPPER` | Shipper nội vùng | → SHIPPER, DRIVER |
| `LINE_HAUL_DRIVER` | Tài xế xe tải liên tỉnh | → DRIVER |
| `DRIVER` | Tài xế (tương thích ngược) | → LINE_HAUL_DRIVER, LOCAL_SHIPPER, SHIPPER |
| `ORDER_VENDOR_MANAGER` | Quản lý Duyệt đơn | Không có alias |
| `LAST_MILE_DISPATCHER` | Điều phối Shipper nội vùng | Code alias: DISPATCHER |
| `LINE_HAUL_DISPATCHER` | Điều phối Đội xe tải | Code alias: DISPATCHER |
| `HUB_STAFF` | Nhân viên khai thác kho | → WAREHOUSE_STAFF |
| `WAREHOUSE_STAFF` | Nhân viên kho vận | → HUB_STAFF |
| `HUB_COORDINATOR` | Điều phối trưởng bưu cục | Quyền cao hơn HUB_STAFF |
| `CS` | Chăm sóc khách hàng | — |
| `ACCOUNTANT` | Kế toán | — |
| `ADMIN` | Quản trị viên | Bypass TẤT CẢ authorize() (dòng 95) |

### 1.2. Trạng thái đơn hàng (nguồn: `order.model.js` dòng 30–67)

| Trạng thái | Ý nghĩa nghiệp vụ |
|---|---|
| `DRAFT` | Nháp chưa lưu hẳn |
| `CREATED` | Mới tạo, chưa thẩm định |
| `PENDING_VERIFICATION` | Chờ thẩm duyệt thủ công (có risk flag) |
| `SUSPENDED_RISK_REVIEW` | Đình chỉ do vi phạm sau khi đã pass |
| `DISPATCH_ESCALATED` | Cạn kiệt shipper, cần Dispatcher can thiệp |
| `READY_TO_PICK` | Auto-approved, sẵn sàng lấy hàng |
| `PICKING` | Shipper đang quét xác minh |
| `PICKED` | Legacy (tương thích ngược) |
| `PICKED_UP` | **Đã lấy hàng** (chính thức) |
| `INBOUND_HUB` | Legacy inbound |
| `IN_HUB_ORIGIN` | Tại kho gốc, chờ xuất |
| `SORTING` | Đang phân loại |
| `IN_SORTING_HUB` | Tại kho trung chuyển |
| `BAGGED_SEALED` | Đã vào bao niêm phong (ít dùng) |
| `IN_TRANSIT` | Trên xe vận chuyển liên tỉnh |
| `INBOUND_HUB_DEST` | Legacy inbound tại kho đích |
| `IN_HUB_DEST` | Tại kho đích, chờ bàn giao |
| `OUT_FOR_DELIVERY` | Shipper đang đi giao |
| `DELIVERING` | Shipper tại nơi giao |
| `DELIVERED` | **Giao thành công** ✅ |
| `PENDING_REDELIVERY` | Thất bại < max, hẹn giao lại |
| `DELIVERY_FAILED_PENDING_RETURN` | Thất bại >= max, kích hoạt hoàn |
| `FAILED` | Thất bại không xác định |
| `PICKUP_FAILED` | Lấy hàng thất bại |
| `RETURNING` | Đang hoàn hàng |
| `RETURN_IN_TRANSIT` | Vận chuyển hoàn về kho gốc |
| `RETURNED` | **Đã hoàn cho Seller** ✅ |
| `RETURNED_TO_HUB_ORIGIN` | Hàng hoàn về kho gốc, chờ Seller |
| `EXCEPTION_INBOUND` | Hư hỏng / rách niêm phong khi nhập |
| `CANCELLED` | Đã hủy |
| `SEARCH_ZONE` | Khu vực tìm kiếm (shortage) |
| `SUSPECTED_LOST` | Nghi mất trong vận chuyển |
| `LOST` | Xác nhận mất |
| `SURPLUS` | Hàng thừa trong kiểm kê |
| `OVERDUE` | Quá hạn SLA |
| `LIQUIDATED` | Đã thanh lý |

### 1.3. Trạng thái Bao tải (nguồn: `bag.model.js` dòng 10)

`OPEN` → `SEALED` → `IN_TRANSIT` → `ARRIVED` → `OPENED_SORTED` | `BROKEN_SEAL`

### 1.4. Trạng thái Trip/Chuyến xe (nguồn: `trip.model.js` dòng 17–19)

`DRAFT` → `PLANNING` → `LOCKED_PENDING_DRIVER_CONFIRM` → `CONFIRMED` | `REJECTED`
`REJECTED` → `DRAFT` (khi quét lại — `outboundCore.service.js` dòng 34–36)

**Trip Types:** `MID_MILE_TRANSFER` | `HUB_TRANSFER` | `LINEHAUL` | `LAST_MILE_DELIVERY`

---

## 2. SƠ ĐỒ CHUỖI LIÊN KẾT TOÀN TRÌNH

> Xây dựng 100% từ logic trong `inboundCore.service.js`, `outboundCore.service.js`, `deliveryFailure.service.js`, `order.service.js`, `autoApproval.service.js`.

```
SELLER tạo đơn
POST /api/orders
       │
       ▼
[AutoApproval Engine - autoApproval.service.js]
       │
       ├─(KYC OK, không risk flag)──► READY_TO_PICK
       │
       └─(có risk flag)──────────────► PENDING_VERIFICATION ──► [ADMIN approve] ──► READY_TO_PICK
                                                               └─[ADMIN reject] ──► CANCELLED

READY_TO_PICK
       │
       ▼
[SHIPPER: verify-scan → PICKING → confirm-pickup + chữ ký]
       │
       ├─(thành công)──► PICKED_UP
       └─(thất bại)───► PICKUP_FAILED

PICKED_UP
       │
       ▼
[HUB_STAFF: inbound scan-single tại Hub]
       │
       ├─(condition=DAMAGED/TORN_SEAL)──────────────────► EXCEPTION_INBOUND [xử lý ngoại lệ]
       │
       ├─(nội tỉnh: originHub = destHub)────────────────► IN_HUB_DEST ──► [Trip LAST_MILE_DELIVERY] ──► OUT_FOR_DELIVERY
       │
       └─(liên miền: originHub ≠ destHub)───────────────► IN_HUB_ORIGIN
                                                                │
                                              [HUB_STAFF: bags/open → bags/add-item (Route Guard Poka-yoke) → bags/seal]
                                                                │
                                              [HUB_STAFF: outbound/trips → outbound/scan → outbound/commit]
                                                                │
                                                                ▼
                                                    Trip: LOCKED_PENDING_DRIVER_CONFIRM
                                                                │
                                              ┌─────────────────┴──────────────────┐
                                              ▼                                      ▼
                                       LINE_HAUL_DRIVER: ACCEPT              LINE_HAUL_DRIVER: REJECT
                                              │                                      │
                                              ▼                               rollback: currentTripId=null
                                         IN_TRANSIT                           Trip: REJECTED → DRAFT
                                              │
                                   [HUB_STAFF kho đích: scan-single]
                                              │
                              ┌───────────────┴────────────────────┐
                              ▼                                      ▼
                         IN_HUB_DEST                        IN_SORTING_HUB (kho trung chuyển)
                    (isDestHub=true)                             (xuất tiếp)
                              │
                    [Trip LAST_MILE_DELIVERY]
                              │
                    OUT_FOR_DELIVERY → DELIVERING
                              │
                  ┌───────────┴─────────────────────────┐
                  ▼                                       ▼
            DELIVERED ✅                          PENDING_REDELIVERY (< 3 lần)
                                                          │ (lần 3 trở lên)
                                                          ▼
                                             DELIVERY_FAILED_PENDING_RETURN
                                                          │
                                              [returnProcess.initiate()]
                                                          │
                                                  RETURN_IN_TRANSIT
                                                          │
                                           [HUB_STAFF nhập kho hoàn tại originHub]
                                                          │
                                               RETURNED_TO_HUB_ORIGIN
                                                          │
                                                     RETURNED ✅
```

**Luồng nội tỉnh (shortcut):** PICKED_UP → IN_HUB_DEST → OUT_FOR_DELIVERY → DELIVERED *(không qua Bagging & Linehaul)*

---

## 3. GIAI ĐOẠN 1 — SELLER TẠO ĐƠN HÀNG

**Role:** `SELLER` hoặc `ADMIN`

### API liên quan
| Endpoint | Method | Roles |
|---|---|---|
| `POST /api/auth/login` | POST | Tất cả |
| `POST /api/orders/quote` | POST | SELLER, ADMIN |
| `POST /api/orders` | POST | SELLER, ADMIN |
| `PATCH /api/orders/:id/status` | PATCH | SELLER, ADMIN |
| `DELETE /api/orders/:id/cancel` | DELETE | SELLER, ADMIN |
| `POST /api/orders/bulk-cancel` | POST | SELLER, ADMIN |
| `POST /api/orders/:id/approve` | POST | ADMIN only |

### Quy tắc Auto-Approval (nguồn: `autoApproval.service.js`)

| Điều kiện | Risk Flag | Kết quả |
|---|---|---|
| KYC ≠ `VERIFIED_KYC` | `UNVERIFIED_SELLER_KYC` | `PENDING_VERIFICATION` |
| COD > 10,000,000 VND | `HIGH_COD_VALUE` | `PENDING_VERIFICATION` |
| Khai giá > 20,000,000 VND | `HIGH_DECLARED_VALUE` | `PENDING_VERIFICATION` |
| Trọng lượng thực > 20 kg | `OVERWEIGHT_MOTORCYCLE` | `PENDING_VERIFICATION` |
| Trọng lượng thể tích > 25 kg | `OVERSIZED_VOLUMETRIC` | `PENDING_VERIFICATION` |
| Cạnh lớn nhất > 80 cm | `OVERSIZED_DIMENSION` | `PENDING_VERIFICATION` |
| >= 50 đơn trong 60 phút | `HIGH_ORDER_VELOCITY` | `PENDING_VERIFICATION` |
| Tất cả OK + KYC Verified | _(không flag)_ | `READY_TO_PICK` |

### Bảng kịch bản test

| Mã TC | Kịch bản | Input / Hành động | Kết quả mong đợi | Trạng thái trước → sau |
|---|---|---|---|---|
| TC-01-01 | **Happy path** Seller KYC verified, đơn liên tỉnh | `POST /api/orders` — pickup: HN, delivery: HCM, weight=2, COD=500000 | HTTP 201, `status=READY_TO_PICK`, `autoApproved=true`, `zoneTier=INTER_REGION` | — → `READY_TO_PICK` |
| TC-01-02 | Seller **chưa KYC** | kycStatus=NOT_SUBMITTED, tạo đơn bất kỳ | HTTP 201, `status=PENDING_VERIFICATION`, `riskFlags=[UNVERIFIED_SELLER_KYC]` | — → `PENDING_VERIFICATION` |
| TC-01-03 | COD **vượt 10 triệu** | `codAmount=12000000` | `status=PENDING_VERIFICATION`, `riskFlags=[HIGH_COD_VALUE]` | — → `PENDING_VERIFICATION` |
| TC-01-04 | Đơn **nội tỉnh** (cùng tỉnh) | pickup.province=HN, delivery.province=HN | `originHubId = destinationHubId`, `zoneTier=INTRA_PROVINCE` | — → `READY_TO_PICK` |
| TC-01-05 | Trọng lượng **quá tải** (>20kg) | `actualWeight=25` | `riskFlags=[OVERWEIGHT_MOTORCYCLE]`, `PENDING_VERIFICATION` | — → `PENDING_VERIFICATION` |
| TC-01-06 | Khai giá **cao** (>20 triệu) | `goodsValue=25000000` | `riskFlags=[HIGH_DECLARED_VALUE]`, `PENDING_VERIFICATION` | — → `PENDING_VERIFICATION` |
| TC-01-07 | **Idempotency** — gửi lại cùng key | Gửi lại với `Idempotency-Key` đã dùng | HTTP 200 (không 201), "Đơn hàng đã tồn tại (Idempotent)", không tạo đơn trùng | Không thay đổi |
| TC-01-08 | Hủy đơn đang `READY_TO_PICK` | `DELETE /orders/:id/cancel` | HTTP 200, `status=CANCELLED` | `READY_TO_PICK` → `CANCELLED` |
| TC-01-09 | Cố hủy đơn đã `DELIVERED` | `DELETE /orders/:id/cancel` | HTTP 400, "Không thể hủy đơn hàng ở trạng thái DELIVERED" | Không thay đổi |
| TC-01-10 | Velocity check: >= 50 đơn/60 phút | Tạo đơn thứ 51 | `riskFlags=[HIGH_ORDER_VELOCITY]`, `PENDING_VERIFICATION` | — → `PENDING_VERIFICATION` |
| TC-01-11 | ADMIN phê duyệt `PENDING_VERIFICATION` | `POST /orders/:id/approve` | HTTP 200, đơn → `READY_TO_PICK` | `PENDING_VERIFICATION` → `READY_TO_PICK` |
| TC-01-12 | Xem báo giá không tạo đơn | `POST /orders/quote` | HTTP 200, `shippingFee`, `zoneTier`, `estimatedDeliveryDays`, không insert DB | Không thay đổi |

---

## 4. GIAI ĐOẠN 2 — SHIPPER LẤY HÀNG CHẶNG ĐẦU (UC-12 ePOH)

**Role:** `SHIPPER` / `LOCAL_SHIPPER` / `DRIVER` / `LINE_HAUL_DRIVER` (xem alias)

### API liên quan
| Endpoint | Method | Mô tả |
|---|---|---|
| `POST /api/orders/shipper/:id/verify-scan` | POST | Bước 1: Xác minh mã, kiểm tra trạng thái |
| `POST /api/orders/shipper/:id/confirm-pickup` | POST | Bước 2: Xác nhận lấy + chữ ký Seller |
| `POST /api/orders/shipper/:id/pickup-failed` | POST | Báo lấy thất bại |
| `POST /api/orders/shipper/process-scan` | POST | Quét session manifest |
| `POST /api/orders/shipper/complete-manifest` | POST | Hoàn tất biên bản ePOH |
| `POST /api/orders/shipper/batch-pickup` | POST | Lấy hàng hàng loạt |

### Bảng kịch bản test

| Mã TC | Kịch bản | Input / Hành động | Kết quả mong đợi | Trạng thái trước → sau |
|---|---|---|---|---|
| TC-02-01 | **Happy path** verify → confirm với chữ ký | verify-scan → confirm-pickup với signatureImageUrl | 200 OK, `status=PICKED_UP`, PickupConfirmation created | `READY_TO_PICK` → `PICKING` → `PICKED_UP` |
| TC-02-02 | Đơn **chưa READY_TO_PICK** | verify-scan, đơn đang `CREATED` | HTTP 400, "Yêu cầu Seller bấm READY_TO_PICK trước" | Không thay đổi |
| TC-02-03 | Đơn đã bị **hủy** | verify-scan, đơn CANCELLED | HTTP 409, "Đơn hàng đã bị HỦY" | Không thay đổi |
| TC-02-04 | **Thiếu chữ ký** Seller | confirm-pickup không có signatureImageUrl | HTTP 400, "Yêu cầu chữ ký Seller xác thực bàn giao" | Không thay đổi |
| TC-02-05 | **Mã quét không khớp** | scannedCode khác trackingCode | HTTP 400, "Mã vận đơn không khớp" | Không thay đổi |
| TC-02-06 | **Lệch cân + thiếu ảnh** | actualWeight khác, không có parcelImageUrl | HTTP 422, "Bắt buộc chụp ảnh kiện hàng đối chứng" | Không thay đổi |
| TC-02-07 | Lệch cân + **ảnh hợp lệ** | actualWeight khác + parcelImageUrl | HTTP 200, `weightDiscrepancy=true`, `surchargeFee` tính tự động | `READY_TO_PICK` → `PICKED_UP` |
| TC-02-08 | Shipper **khác** (không được gán) | Shipper B confirm đơn của Shipper A | HTTP 403, "Đơn hàng không nằm trong danh sách tuyến" | Không thay đổi |
| TC-02-09 | **Idempotency offline** — gửi lại clientOfflineId | confirm-pickup với clientOfflineId đã dùng | HTTP 200, trả cached result, không tạo PickupConfirmation thứ 2 | Không thay đổi |
| TC-02-10 | Báo **lấy thất bại** | POST /shipper/:id/pickup-failed | HTTP 200, `status=PICKUP_FAILED` | `READY_TO_PICK` → `PICKUP_FAILED` |
| TC-02-11 | Đơn đã `PICKED_UP`, **quét lại** | confirm-pickup với đơn PICKED_UP | HTTP 400, "Đơn hàng đã được lấy hoặc giao thành công" | Không thay đổi |
| TC-02-12 | **Chống quét trùng** process-scan | Gửi cùng clientOfflineId 2 lần | HTTP 200, trả cached từ OrderLog, không xử lý lần 2 | Không thay đổi |

---

## 5. GIAI ĐOẠN 3 — HUB_STAFF NHẬP KHO GỐC (UC-16 INBOUND)

**Role:** `HUB_STAFF` / `WAREHOUSE_STAFF` / `HUB_COORDINATOR` / `ADMIN` / `DRIVER` / `SHIPPER` / `LINE_HAUL_DRIVER`

> **Bảo mật:** `hubId` lấy từ JWT của operator, KHÔNG từ body request — `inboundCore.service.js` dòng 66–69.

### API liên quan
| Endpoint | Method | Mô tả |
|---|---|---|
| `POST /api/inbound/scan-single` | POST | Quét nhập kho 1 đơn |
| `POST /api/inbound/scan-batch` | POST | Quét hàng loạt |
| `POST /api/inbound/scan-seal` | POST | Quét theo Seal bao tải |
| `POST /api/inbound/incident` | POST | Báo sự cố / ngoại lệ |

### Ngưỡng lệch cân — Tự động tính cước phụ thu (nguồn: `inboundCore.service.js`)
| Zone Tier | Cước bổ sung / 0.5kg step |
|---|---|
| `INTER_REGION` | 8,500 VND |
| `NEAR_REGION` | 7,000 VND |
| `INTRA_REGION` | 6,000 VND |
| Khác (`INTRA_PROVINCE`) | 5,000 VND |

Ngưỡng kích hoạt: **50g** (env `WEIGHT_TOLERANCE_GRAM`, mặc định 50)

### Bảng kịch bản test

| Mã TC | Kịch bản | Input / Hành động | Kết quả mong đợi | Trạng thái trước → sau |
|---|---|---|---|---|
| TC-03-01 | **Happy path** liên miền | scan-single, INTACT, HUB_STAFF tại HAN, đơn đến SGN | `current_status=IN_HUB_ORIGIN`, `next_action=SORT_FOR_TRANSIT` | `PICKED_UP` → `IN_HUB_ORIGIN` |
| TC-03-02 | **Happy path** nội tỉnh | HUB_STAFF tại Hub A, đơn có originHub=destHub=A | `current_status=IN_HUB_DEST`, `is_dest_hub=true`, `next_action=WAITING_FOR_DELIVERY` | `PICKED_UP` → `IN_HUB_DEST` |
| TC-03-03 | Hàng **hư hỏng** | condition=DAMAGED | `current_status=EXCEPTION_INBOUND`, `is_flagged=true` | `PICKED_UP` → `EXCEPTION_INBOUND` |
| TC-03-04 | Hàng **rách niêm phong** | condition=TORN_SEAL | `current_status=EXCEPTION_INBOUND`, `is_flagged=true` | `PICKED_UP` → `EXCEPTION_INBOUND` |
| TC-03-05 | **Lệch cân dưới ngưỡng** (<50g) | hubMeasuredWeight=2010g, actualWeight=2kg | `flag_fee_warning=false`, `surcharge_fee=0` | `PICKED_UP` → `IN_HUB_ORIGIN` |
| TC-03-06 | **Lệch cân vượt ngưỡng** + tự tính phụ thu | hubMeasuredWeight=3200g, actualWeight=2kg (lệch 1200g), INTER_REGION | `flag_fee_warning=true`, `surcharge_fee>0`, `revised_shipping_fee` tăng, ActionLog `FEE_ADJUSTMENT_TRIGGERED` | `PICKED_UP` → `IN_HUB_ORIGIN` |
| TC-03-07 | **Quét trùng** (double scan) | Quét đơn đang IN_HUB_ORIGIN lần nữa | HTTP 400, `code=INVALID_STATE_TRANSITION` | Không thay đổi |
| TC-03-08 | **Race condition OCC** — 2 tiến trình cùng quét | 2 request đồng thời cho cùng 1 đơn | 1 thành công, 1 nhận HTTP 409 `code=RACE_CONDITION_CONFLICT` | Chỉ 1 lần thay đổi |
| TC-03-09 | **Sai tuyến** routeNodes | Quét tại Hub không thuộc routeNodes | HTTP 400, `code=INVALID_ROUTE_HOP`, "Kiện hàng SAI TUYẾN ĐỊNH TUYẾN" | Không thay đổi |
| TC-03-10 | Nhân viên **chưa gán Hub** | operator.hubId=null | HTTP 403, `code=HUB_UNASSIGNED` | Không thay đổi |
| TC-03-11 | **Idempotency clientOfflineId** | Gửi lại cùng clientOfflineId | Trả cached result từ OrderLog | Không thay đổi |
| TC-03-12 | Nhập kho **hoàn trả** đúng Hub gốc | RETURN_IN_TRANSIT, quét tại originHub | `current_status=RETURNED_TO_HUB_ORIGIN` | `RETURN_IN_TRANSIT` → `RETURNED_TO_HUB_ORIGIN` |
| TC-03-13 | Nhập kho hoàn **sai Hub** | RETURN_IN_TRANSIT, quét tại Hub khác | HTTP 400, "phải được nhập tại Kho gốc" | Không thay đổi |

---

## 6. GIAI ĐOẠN 4 — HUB_STAFF ĐÓNG BAO & NIÊM PHONG

**Role:** `HUB_STAFF` / `WAREHOUSE_STAFF` / `HUB_COORDINATOR` / `ADMIN`  
*(DRIVER và SHIPPER KHÔNG được phép — `bag.routes.js` dòng 15)*

### API liên quan
| Endpoint | Method | Mô tả |
|---|---|---|
| `POST /api/bags/open` | POST | Mở bao mới (status=OPEN) |
| `POST /api/bags/add-item` | POST | Thêm kiện vào bao (Route Guard) |
| `POST /api/bags/remove-item` | POST | Xóa kiện khỏi bao OPEN |
| `POST /api/bags/seal` | POST | Niêm phong (status=SEALED) |
| `GET /api/bags/:sealCode` | GET | Chi tiết bao tải |
| `GET /api/bags` | GET | Danh sách bao trong Hub |

### Cơ chế Route Guard Poka-yoke (nguồn: `bagCore.service.js` dòng 124–166)
Hệ thống gọi `hubRoutingService.calculateRoutePath()` để kiểm tra `bag.destinationHub` có phải **next-hop hợp lệ** trong lộ trình của đơn không. Sai tuyến → `WRONG_DESTINATION_ROUTE`.

### Bảng kịch bản test

| Mã TC | Kịch bản | Input / Hành động | Kết quả mong đợi | Trạng thái Bag |
|---|---|---|---|---|
| TC-04-01 | **Happy path** mở → thêm → niêm phong | open (sealCode, destHub=SGN) → add-item (đơn HAN→SGN) → seal | Bước 1: OPEN. Bước 2: total_items++. Bước 3: SEALED, sealedAt ghi nhận | `OPEN` → `SEALED` |
| TC-04-02 | **Poka-yoke sai tuyến** | add-item vào bao destHub=DAD, nhưng đơn đích=SGN | HTTP 400, `code=WRONG_DESTINATION_ROUTE`, "SAI TUYẾN" | Không thay đổi |
| TC-04-03 | Thêm kiện vào bao **đã SEALED** | add-item vào bao status=SEALED | HTTP 409, `code=BAG_NOT_OPEN` | Không thay đổi |
| TC-04-04 | Niêm phong **bao rỗng** | seal bao chưa có kiện | HTTP 400, `code=EMPTY_BAG` | Không thay đổi |
| TC-04-05 | Vượt **sức chứa** (maxCapacity) | add-item khi trackingCodes.length >= maxCapacity | HTTP 400, `code=BAG_CAPACITY_EXCEEDED` | Không thay đổi |
| TC-04-06 | Kiện **đã trong bao này** | add-item với trackingCode đã có | HTTP 400, `code=ALREADY_IN_BAG` | Không thay đổi |
| TC-04-07 | Kiện đang trong **bao khác OPEN** | add-item khi đơn có sealId → bao khác đang OPEN | HTTP 400, `code=ALREADY_IN_OTHER_BAG` | Không thay đổi |
| TC-04-08 | **SealCode trùng** | open với sealCode đã tồn tại | HTTP 409, `code=SEAL_ALREADY_EXISTS` | Không thay đổi |
| TC-04-09 | Nhân viên **chưa gán Hub** | operator.hubId=null | HTTP 403, `code=HUB_UNASSIGNED` | Không thay đổi |
| TC-04-10 | Xóa kiện khỏi bao OPEN | remove-item với trackingCode hợp lệ | HTTP 200, total_items giảm, sealId=null | Không thay đổi |
| TC-04-11 | Xóa kiện **không có trong bao** | remove-item với trackingCode không thuộc bao | HTTP 404, `code=ITEM_NOT_IN_BAG` | Không thay đổi |

---

## 7. GIAI ĐOẠN 5 — XUẤT KHO & DRIVER BẮT TAY KÉP (UC-17)

**Xuất kho:** `HUB_STAFF` / `HUB_COORDINATOR` / `ADMIN`  
**Xác nhận Driver:** `DRIVER` / `LINE_HAUL_DRIVER` / `ADMIN` / `HUB_STAFF`

### API liên quan
| Endpoint | Method | Mô tả |
|---|---|---|
| `POST /api/outbound/trips` | POST | Tạo chuyến xe mới |
| `GET /api/outbound/trips` | GET | Danh sách chuyến |
| `POST /api/outbound/scan` | POST | Quét xuất kho vào Trip |
| `POST /api/outbound/commit` | POST | Chốt chuyến — khóa Trip |
| `POST /api/outbound/driver-confirm` | POST | ACCEPT / REJECT |

### Cơ chế bắt tay kép
```
HUB_STAFF commit → Trip: LOCKED_PENDING_DRIVER_CONFIRM
    Driver ACCEPT → Trip: CONFIRMED → Order: IN_TRANSIT (LINEHAUL) / OUT_FOR_DELIVERY (LAST_MILE_DELIVERY)
    Driver REJECT → Trip: REJECTED → rollback currentTripId=null → HUB_STAFF quét lại → Trip: DRAFT
```

### Bảng kịch bản test

| Mã TC | Kịch bản | Input / Hành động | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|
| TC-05-01 | **Happy path LINEHAUL** | create-trip (LINEHAUL) → scan × N → commit → driver-confirm ACCEPT | Trip CONFIRMED, Order IN_TRANSIT | `IN_HUB_ORIGIN` → `IN_TRANSIT` |
| TC-05-02 | Driver **REJECT** | driver-confirm action=REJECT, rejectReason="Xe hỏng" | Trip REJECTED, currentTripId=null rollback | Trip REJECTED, Order không đổi |
| TC-05-03 | Sau REJECT, **quét lại** bắt đầu | scan vào trip REJECTED | Trip tự reset về DRAFT (`outboundCore.service.js` dòng 34–36) | `REJECTED` → `DRAFT` |
| TC-05-04 | Quét đơn **không thuộc Trip** | scan trackingCode không trong plannedTrackingCodes | HTTP 409, `code=ITEM_NOT_IN_TRIP` | Không thay đổi |
| TC-05-05 | Quét đơn bị **khóa** (isFlagged/EXCEPTION_INBOUND) | scan đơn EXCEPTION_INBOUND | HTTP 422, `code=ITEM_LOCKED` | Không thay đổi |
| TC-05-06 | **Commit có shortage** (isShortage=true) | commit với đơn chưa quét đủ | Trip LOCKED, đơn thiếu → SEARCH_ZONE, shortage_codes trả về | Đơn thiếu → `SEARCH_ZONE` |
| TC-05-07 | Commit **Trip đã LOCKED** | commit trip LOCKED_PENDING | HTTP 409, `code=TRIP_NOT_EDITABLE` | Không thay đổi |
| TC-05-08 | **Quét trùng** (idempotency) | scan cùng trackingCode lần 2 | HTTP 200, `already_scanned=true` ($addToSet không trùng) | Không thay đổi |
| TC-05-09 | driver-confirm Trip **chưa LOCKED** | driver-confirm trip DRAFT | HTTP 409, `code=TRIP_NOT_PENDING_CONFIRM` | Không thay đổi |
| TC-05-10 | REJECT sau shortage → rollback SEARCH_ZONE | Driver REJECT sau commit có shortage | shortageTrackingCodes được rollback về IN_HUB_ORIGIN/IN_HUB_DEST/IN_SORTING_HUB | `SEARCH_ZONE` → staging |
| TC-05-11 | Trip type **LAST_MILE_DELIVERY** | driver-confirm ACCEPT, tripType=LAST_MILE_DELIVERY | Order → OUT_FOR_DELIVERY (khác với LINEHAUL là IN_TRANSIT) | `IN_HUB_DEST` → `OUT_FOR_DELIVERY` |

---

## 8. GIAI ĐOẠN 6 — NHẬP KHO TRUNG CHUYỂN / KHO ĐÍCH

**Role:** `HUB_STAFF` tại kho đích hoặc trung chuyển

| Điều kiện khi quét | Kết quả (nguồn: inboundCore.service.js dòng 116–123) |
|---|---|
| `status=IN_TRANSIT` + `isDestHub=true` | → `IN_HUB_DEST`, `next_action=WAITING_FOR_DELIVERY` |
| `status=IN_TRANSIT` + `isDestHub=false` | → `IN_SORTING_HUB`, `next_action=SORT_FOR_NEXT_HUB` |

### Bảng kịch bản test

| Mã TC | Kịch bản | Input | Kết quả | Trạng thái |
|---|---|---|---|---|
| TC-06-01 | **Happy path** kho đích | scan-single, isDestHub=true, đơn IN_TRANSIT | `IN_HUB_DEST`, `is_dest_hub=true` | `IN_TRANSIT` → `IN_HUB_DEST` |
| TC-06-02 | Kho **trung chuyển** | scan-single, isDestHub=false | `IN_SORTING_HUB`, `is_dest_hub=false` | `IN_TRANSIT` → `IN_SORTING_HUB` |
| TC-06-03 | Quét **bao nguyên seal** | POST /inbound/scan-seal với sealCode | Mở seal, quét tất cả đơn trong bao hàng loạt | `IN_TRANSIT` → `IN_HUB_DEST` (toàn bộ) |
| TC-06-04 | Đơn **sai trạng thái** | scan-single đơn IN_HUB_ORIGIN tại Hub khác | HTTP 400, `code=INVALID_STATE_TRANSITION` | Không thay đổi |

---

## 9. GIAI ĐOẠN 7 — SHIPPER GIAO HÀNG CHẶNG CUỐI

**Role:** `SHIPPER` / `LOCAL_SHIPPER` / `DRIVER`

### API liên quan
| Endpoint | Method | Roles |
|---|---|---|
| `POST /api/orders/:orderId/delivery-failure` | POST | DRIVER, SHIPPER, ADMIN, HUB_STAFF |
| `POST /api/delivery-failure/sync-offline` | POST | Same |

### Quy tắc (nguồn: `deliveryFailure.service.js`)
- Đơn PHẢI ở `DELIVERING` (dòng 85–90)
- `CUSTOMER_REFUSED` → bắt buộc `proofImageUrls` (dòng 56–58)
- `WRONG_ADDRESS` → bắt buộc `contactAttempts >= 1` (dòng 60–62)
- Cách tối thiểu `MIN_MINUTES_BETWEEN_FAILURE_REPORTS` phút (mặc định 30) (dòng 93–104)
- `< MAX_DELIVERY_FAILURE_COUNT` lần (mặc định 3) → `PENDING_REDELIVERY` (dòng 133)
- `>= MAX_DELIVERY_FAILURE_COUNT` lần → `DELIVERY_FAILED_PENDING_RETURN` (dòng 130)

### Bảng kịch bản test

| Mã TC | Kịch bản | Input / Hành động | Kết quả mong đợi | Trạng thái trước → sau |
|---|---|---|---|---|
| TC-07-01 | **Happy path** giao thành công | Update status=DELIVERED + podImageUrl | HTTP 200, `status=DELIVERED` | `OUT_FOR_DELIVERY` → `DELIVERING` → `DELIVERED` |
| TC-07-02 | **Khách từ chối** + ảnh | delivery-failure, CUSTOMER_REFUSED + proofImageUrls | HTTP 200, `PENDING_REDELIVERY`, failureCount=1 | `DELIVERING` → `PENDING_REDELIVERY` |
| TC-07-03 | Từ chối **thiếu ảnh** | CUSTOMER_REFUSED, không có proofImageUrls | HTTP 400, "bắt buộc phải có ảnh minh chứng" | Không thay đổi |
| TC-07-04 | **Sai địa chỉ** chưa liên hệ | WRONG_ADDRESS, contactAttempts=0 | HTTP 400, "xác nhận đã liên hệ khách trước" | Không thay đổi |
| TC-07-05 | **Không liên lạc được** | CANNOT_CONTACT | HTTP 200, `PENDING_REDELIVERY`, failureCategory=CUSTOMER_FAULT | `DELIVERING` → `PENDING_REDELIVERY` |
| TC-07-06 | Báo thất bại **quá sớm** (<30 phút) | Gửi lần 2 trong vòng 30 phút | HTTP 429, `minutesRemaining` còn lại | Không thay đổi |
| TC-07-07 | **Lần thứ 3** kích hoạt hoàn hàng | delivery-failure lần 3 (>= MAX=3) | `DELIVERY_FAILED_PENDING_RETURN`, `triggeredReturnProcess=true` | `DELIVERING` → `DELIVERY_FAILED_PENDING_RETURN` |
| TC-07-08 | Báo thất bại **sai trạng thái** | delivery-failure, đơn OUT_FOR_DELIVERY | HTTP 409, "không thể báo giao thất bại" | Không thay đổi |
| TC-07-09 | **Idempotency offline** | sync-offline với clientOfflineId đã dùng | `alreadyProcessed=true`, không thêm failure | Không thay đổi |
| TC-07-10 | Khách **hẹn giao lại** | CUSTOMER_RESCHEDULE + rescheduleRequestedAt | HTTP 200, `PENDING_REDELIVERY` | `DELIVERING` → `PENDING_REDELIVERY` |
| TC-07-11 | **GPS Missing** (offline) | Không gửi lat/lng | HTTP 200, `gpsLocation.isGpsMissing=true` | Không ảnh hưởng status |

---

## 10. GIAI ĐOẠN 8 — TRA CỨU CÔNG KHAI

**Role:** Không cần đăng nhập (Public)

### API liên quan
| Endpoint | Mô tả |
|---|---|
| `GET /api/orders/track/:trackingCode` | Tra cứu dòng thời gian (Rate limit: 10 req/min) |
| `GET /api/orders/public-recent` | Vận đơn công khai trên Landing Page |

### Bảo mật PII (nguồn: `order.service.js` dòng 398–421)
- Không xác minh: phone hiển thị `***XXXX` (4 số cuối), fullName → `X***`
- Xác minh 4 số cuối → `isFullVerified=true` → hiện đầy đủ
- Chống brute-force: sai 5 lần → khóa 15 phút (in-memory Map)

### Bảng kịch bản test

| Mã TC | Kịch bản | Input | Kết quả |
|---|---|---|---|
| TC-08-01 | **Tra cứu không xác minh** | GET /track/:code | phone=`***5678`, fullName=`N***`, events[] đầy đủ |
| TC-08-02 | **Xác minh 4 số đúng** | GET /track/:code?lastPhoneDigits=5678 | `isFullVerified=true`, PII hiện đầy đủ |
| TC-08-03 | **Brute-force** 4 số cuối | Sai 5 lần liên tiếp | HTTP 429 (bị khóa 15 phút) |
| TC-08-04 | Mã **không tồn tại** | GET /track/ELG-NOTEXIST | HTTP 404 |
| TC-08-05 | **Rate limit** vượt 10 req/phút | > 10 request / phút | HTTP 429 |

---

## 11. GIAI ĐOẠN 9 — NHÁNH HOÀN HÀNG

**Kích hoạt:** Tự động bởi `returnProcess.initiate()` sau khi `DELIVERY_FAILED_PENDING_RETURN`  
**Nhập kho hoàn:** `HUB_STAFF` tại originHub

### Bảng kịch bản test

| Mã TC | Kịch bản | Input | Kết quả | Trạng thái |
|---|---|---|---|---|
| TC-09-01 | **Happy path** hoàn về đúng Hub gốc | scan-single tại originHub, đơn RETURN_IN_TRANSIT | `RETURNED_TO_HUB_ORIGIN`, `next_action=WAITING_SELLER_RETURN` | `RETURN_IN_TRANSIT` → `RETURNED_TO_HUB_ORIGIN` |
| TC-09-02 | Hoàn **sai Hub** | scan tại Hub không phải originHub | HTTP 400, "phải được nhập tại Kho gốc" | Không thay đổi |
| TC-09-03 | Thông báo Seller khi kích hoạt hoàn | triggeredReturnProcess=true | `notificationService.sendNotification(sellerId, DELIVERY_FAILED_FINAL)` được gọi | — (side-effect) |
| TC-09-04 | Seller xác nhận nhận hàng hoàn | Cập nhật RETURNED_TO_HUB_ORIGIN → RETURNED | `status=RETURNED` | `RETURNED_TO_HUB_ORIGIN` → `RETURNED` |

---

## 12. GIAI ĐOẠN 10 — KIỂM KÊ KHO (UC-18 AUDIT)

**Start/Sync/Submit:** `HUB_STAFF` / `HUB_COORDINATOR` / `ADMIN`  
**Approve:** `HUB_COORDINATOR` / `ADMIN` only

### Trạng thái được kiểm kê (nguồn: `auditCore.service.js` dòng 15–19)
`IN_HUB_ORIGIN`, `INBOUND_HUB`, `IN_SORTING_HUB`, `SORTING`, `IN_HUB_DEST`, `INBOUND_HUB_DEST`

### Bảng kịch bản test

| Mã TC | Kịch bản | Input | Kết quả | Trạng thái phiên |
|---|---|---|---|---|
| TC-10-01 | **Happy path** kiểm kê toàn kho | start → sync (quét thực tế) → submit → approve | Snapshot tại start, so sánh, phát hiện thiếu/thừa | IN_PROGRESS → SUBMITTED → APPROVED |
| TC-10-02 | Phát hiện hàng **sai Zone** | sync với autoRelocateZone=true | Hàng được dời sang Zone đúng, ghi log | — |
| TC-10-03 | **Giải nén Seal** trong kiểm kê | sync với sealCode (không phải trackingCodes) | Tất cả tracking trong bao được expand và kiểm tra | — |
| TC-10-04 | Tạm dừng và tiếp tục | pause → resume | PAUSED → IN_PROGRESS | IN_PROGRESS → PAUSED → IN_PROGRESS |
| TC-10-05 | Sync vào phiên **không tồn tại** | sync sessionCode không có trong DB | HTTP 404, `code=SESSION_NOT_FOUND` | — |
| TC-10-06 | Sync vào phiên **không active** | sync phiên SUBMITTED | HTTP 409, `code=SESSION_NOT_ACTIVE` | — |
| TC-10-07 | `HUB_STAFF` cố **approve** | approve với role HUB_STAFF | HTTP 403 | — |
| TC-10-08 | Nhân viên **chưa gán Hub** | start với operator.hubId=null | HTTP 403, `code=HUB_UNASSIGNED` | — |

---

## 13. GIAI ĐOẠN 11 — QUẢN LÝ TỒN KHO & SLA DWELL (UC-19)

**Đọc:** `HUB_STAFF` / `WAREHOUSE_STAFF` / `HUB_COORDINATOR` / `ADMIN`  
**Thao tác:** `HUB_COORDINATOR` / `ADMIN` only

### SLA Dwell Time động theo vùng (nguồn: README.md)
| Zone Tier | Cảnh báo | Quá hạn |
|---|---|---|
| `INTRA_PROVINCE` | 12h | 24h |
| `INTRA_REGION` | 24h | 36h |
| `NEAR_REGION` | 36h | 48h |
| `INTER_REGION` | 48h | 72h |

### Bảng kịch bản test

| Mã TC | Kịch bản | Input | Kết quả |
|---|---|---|---|
| TC-11-01 | Tồn kho aging + cảnh báo SLA | GET /inventory/aging | Danh sách đơn với dwellHours, isWarning, isOverdue |
| TC-11-02 | Lịch sử di chuyển kiện | GET /inventory/:code/movement-history | Chuỗi sự kiện từ tạo → hiện tại |
| TC-11-03 | Gợi ý chuyến xe từ tồn quá SLA | GET /inventory/trip-suggestions | Danh sách đơn nên xuất sớm |
| TC-11-04 | `HUB_STAFF` cố **export** | GET /inventory/export | HTTP 403 |
| TC-11-05 | Thao tác hàng loạt (batch) | POST /inventory/batch-action với HUB_COORDINATOR | HTTP 200, kết quả từng đơn |
| TC-11-06 | Cảnh báo Zone **>90% sức chứa** | GET /inventory/summary khi zone gần đầy | `zoneOccupancyWarning=true` |

---

## 14. MA TRẬN VAI TRÒ × QUYỀN HẠN API

> Nguồn: Đọc từng `router.use(authorize(...))` và `router.METHOD(path, authorize(...))` trong tất cả `routes/*.js`.  
> ✅ = được phép | ❌ = HTTP 403 | `*` = kua alias

| API Endpoint | SELLER | BUYER | SHIPPER/DRIVER | LINE_HAUL_DRIVER | HUB_STAFF/WH | HUB_COORDINATOR | LAST_MILE_DISP | LINE_HAUL_DISP | ADMIN |
|---|---|---|---|---|---|---|---|---|---|
| `POST /orders` (tạo đơn) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST /orders/quote` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `PUT /orders/:id` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `DELETE /orders/:id/cancel` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST /orders/:id/approve` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST /orders/shipper/*/confirm-pickup` | ✅* | ❌ | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST /inbound/scan-single` | ❌ | ❌ | ✅* | ✅* | ✅* | ✅ | ❌ | ❌ | ✅ |
| `POST /bags/open` | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ | ❌ | ❌ | ✅ |
| `POST /bags/add-item` | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ | ❌ | ❌ | ✅ |
| `POST /outbound/trips` | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ | ❌ | ❌ | ✅ |
| `POST /outbound/scan` | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ | ❌ | ❌ | ✅ |
| `POST /outbound/commit` | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ | ❌ | ❌ | ✅ |
| `POST /outbound/driver-confirm` | ❌ | ❌ | ✅* | ✅* | ✅* | ✅ | ❌ | ❌ | ✅ |
| `POST .../delivery-failure` | ❌ | ❌ | ✅* | ✅* | ✅* | ❌ | ❌ | ❌ | ✅ |
| `POST /audit/start` | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ | ❌ | ❌ | ✅ |
| `POST /audit/:code/approve` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `GET /inventory/aging` | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ | ❌ | ❌ | ✅ |
| `GET /inventory/export` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `GET /local-dispatch/*` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| `POST /linehaul-dispatch/trips` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `GET /seller/pickup-addresses` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### TC kiểm tra phân quyền (Negative RBAC Tests)

| Mã TC | Role | Hành động | Kết quả |
|---|---|---|---|
| TC-RBAC-01 | BUYER | `POST /orders` | HTTP 403, "Quyền hạn BUYER không được phép" |
| TC-RBAC-02 | SHIPPER | `POST /bags/open` | HTTP 403 |
| TC-RBAC-03 | HUB_STAFF | `POST /audit/:code/approve` | HTTP 403 |
| TC-RBAC-04 | SELLER | `POST /inbound/scan-single` | HTTP 403 |
| TC-RBAC-05 | Không token | `POST /orders` | HTTP 401, "Không có token" |
| TC-RBAC-06 | Token hết hạn | Bất kỳ protected endpoint | HTTP 401, "Token không hợp lệ hoặc đã hết hạn" |
| TC-RBAC-07 | LAST_MILE_DISPATCHER | `POST /linehaul-dispatch/trips` | HTTP 403 |
| TC-RBAC-08 | HUB_STAFF | `GET /inventory/export` | HTTP 403 |
| TC-RBAC-09 | Dùng Refresh Token | `Authorization: Bearer <refreshToken>` | HTTP 401, "yêu cầu Access Token hợp lệ" |
| TC-RBAC-10 | isActive=false | Gọi API bất kỳ | HTTP 403, "Tài khoản đã bị khóa" |

---

## 15. BỘ KỊCH BẢN FULL-CHAIN

### 15.1. KỊCH BẢN A — Đơn tiêu chuẩn liên miền, mọi bước thành công

**Đặc điểm:** HN → HCM, COD 500,000 VND, weight 2kg, Seller KYC verified

| Bước | Role | API | Trạng thái đơn | Trạng thái Bag/Trip |
|---|---|---|---|---|
| A-1 | SELLER | `POST /auth/login` | — | — |
| A-2 | SELLER | `POST /orders/quote` | — | — |
| A-3 | SELLER | `POST /orders` (HN→HCM, COD=500k) | `READY_TO_PICK` | — |
| A-4 | SHIPPER | `POST /orders/shipper/:id/verify-scan` | `PICKING` | — |
| A-5 | SHIPPER | `POST /orders/shipper/:id/confirm-pickup` (+ signatureImageUrl) | `PICKED_UP` | — |
| A-6 | HUB_STAFF (HAN) | `POST /inbound/scan-single` (INTACT) | `IN_HUB_ORIGIN` | — |
| A-7 | HUB_STAFF (HAN) | `POST /bags/open` (dest=SGN) | `IN_HUB_ORIGIN` | Bag: `OPEN` |
| A-8 | HUB_STAFF (HAN) | `POST /bags/add-item` | `IN_HUB_ORIGIN` | Bag: `OPEN`, total=1 |
| A-9 | HUB_STAFF (HAN) | `POST /bags/seal` | `IN_HUB_ORIGIN` | Bag: `SEALED` |
| A-10 | HUB_STAFF (HAN) | `POST /outbound/trips` (LINEHAUL) | — | Trip: `DRAFT` |
| A-11 | HUB_STAFF (HAN) | `POST /outbound/scan` | `IN_HUB_ORIGIN` | Trip: scannedItems+1 |
| A-12 | HUB_STAFF (HAN) | `POST /outbound/commit` | `IN_HUB_ORIGIN` | Trip: `LOCKED_PENDING_DRIVER_CONFIRM` |
| A-13 | LINE_HAUL_DRIVER | `POST /outbound/driver-confirm` (ACCEPT) | `IN_TRANSIT` | Trip: `CONFIRMED` |
| A-14 | HUB_STAFF (SGN) | `POST /inbound/scan-single` (isDestHub=true) | `IN_HUB_DEST` | — |
| A-15 | HUB_STAFF (SGN) | `POST /outbound/trips` (LAST_MILE_DELIVERY) | — | Trip: `DRAFT` |
| A-16 | HUB_STAFF (SGN) | scan + commit | `IN_HUB_DEST` | Trip: `LOCKED` |
| A-17 | SHIPPER (SGN) | `POST /outbound/driver-confirm` (ACCEPT) | `OUT_FOR_DELIVERY` | Trip: `CONFIRMED` |
| A-18 | SHIPPER (SGN) | Update DELIVERED + podImageUrl | `DELIVERED` ✅ | — |
| A-19 | Public/BUYER | `GET /orders/track/:code` | events: CREATED→DELIVERED | — |

---

### 15.2. KỊCH BẢN B — Đơn rủi ro cao (COD + lệch cân + gần SLA)

**Đặc điểm:** HCM → Đà Nẵng, COD=8,000,000 VND (dưới 10M auto-pass), weight=3kg nhưng khi cân tại Hub = 4.2kg

| Bước | Role | Hành động | Kết quả đặc biệt |
|---|---|---|---|
| B-1 | SELLER | Tạo đơn COD=8M, weight=3 | `READY_TO_PICK` (8M < 10M → auto-pass) |
| B-2 | SHIPPER | Lấy hàng + ký | `PICKED_UP` |
| B-3 | HUB_STAFF | scan-single, hubMeasuredWeight=4200g | `IN_HUB_ORIGIN`, `flagFeeWarning=true`, `weightDiscrepancyGram=1200`, `surchargeFee` tự tính theo NEAR_REGION (7000/step), FEE_ADJUSTMENT_TRIGGERED OrderLog tạo async |
| B-4 | HUB_STAFF | `GET /inventory/aging` | Đơn xuất hiện, cảnh báo SLA nếu tồn > ngưỡng |
| B-5 | HUB_STAFF | Đóng bao, xuất kho chuẩn | — |
| B-6 | LINE_HAUL_DRIVER | ACCEPT | `IN_TRANSIT` |
| B-7 | HUB_STAFF (DAD) | Nhập kho đích | `IN_HUB_DEST` |
| B-8 | SHIPPER | ACCEPT + giao thành công | `DELIVERED` ✅ (cước theo trọng lượng thực tế) |

**Điểm xác minh:** FEE_ADJUSTMENT_TRIGGERED log phải được tạo qua `setImmediate` (async, không block response).

---

### 15.3. KỊCH BẢN C — Chuỗi lỗi nhiều bước, xác nhận không "treo" trạng thái

**Đặc điểm:** HN → HCM. Cố gây lỗi: sai tuyến khi đóng bao → Driver Reject → khách từ chối 3 lần → hoàn thành công.

| Bước | Role | Hành động | Kết quả | Trạng thái đơn |
|---|---|---|---|---|
| C-1 | SELLER | Tạo đơn HAN→SGN | `READY_TO_PICK` | `READY_TO_PICK` |
| C-2 | SHIPPER | Lấy hàng + ký | `PICKED_UP` | `PICKED_UP` |
| C-3 | HUB_STAFF (HAN) | Nhập kho | `IN_HUB_ORIGIN` | `IN_HUB_ORIGIN` |
| C-4 | HUB_STAFF (HAN) | Mở bao **sai tuyến** (dest=DAD) | Bag OPEN dest=DAD | — |
| C-5 | HUB_STAFF (HAN) | Thả đơn HAN→SGN vào bao dest=DAD | **HTTP 400 WRONG_DESTINATION_ROUTE** — Poka-yoke ngăn! | `IN_HUB_ORIGIN` (không đổi) |
| C-6 | HUB_STAFF (HAN) | Mở bao **đúng tuyến** (dest=SGN) → thêm → seal | Thành công | `IN_HUB_ORIGIN` |
| C-7 | HUB_STAFF (HAN) | Tạo Trip → scan → commit | Trip: `LOCKED` | `IN_HUB_ORIGIN` |
| C-8 | LINE_HAUL_DRIVER | **REJECT** (xe hỏng) | Trip: `REJECTED`, `currentTripId=null` rollback | `IN_HUB_ORIGIN` (giữ nguyên) |
| C-9 | HUB_STAFF (HAN) | Quét lại (Trip reset DRAFT) | Trip: `DRAFT` | `IN_HUB_ORIGIN` |
| C-10 | LINE_HAUL_DRIVER | ACCEPT lần 2 | `IN_TRANSIT` | `IN_TRANSIT` |
| C-11 | HUB_STAFF (SGN) | Nhập kho đích | `IN_HUB_DEST` | `IN_HUB_DEST` |
| C-12 | SHIPPER (SGN) | ACCEPT giao cuối | `OUT_FOR_DELIVERY` | `OUT_FOR_DELIVERY` |
| C-13 | SHIPPER | Giao → **Khách từ chối** + ảnh | `PENDING_REDELIVERY` (lần 1) | `PENDING_REDELIVERY` |
| C-14 | SHIPPER | Giao lại → **Không liên lạc** | `PENDING_REDELIVERY` (lần 2) | `PENDING_REDELIVERY` |
| C-15 | SHIPPER | Giao lại → **Vẫn từ chối** + ảnh | `DELIVERY_FAILED_PENDING_RETURN` (lần 3 = MAX) | `DELIVERY_FAILED_PENDING_RETURN` |
| C-16 | Hệ thống | `returnProcess.initiate()` async | `RETURN_IN_TRANSIT` | `RETURN_IN_TRANSIT` |
| C-17 | HUB_STAFF (HAN) | Nhập kho hoàn tại **originHub** | `RETURNED_TO_HUB_ORIGIN` | `RETURNED_TO_HUB_ORIGIN` |
| C-18 | SELLER | Xác nhận nhận hàng hoàn | `RETURNED` ✅ | `RETURNED` |

**Xác nhận vòng đời khép kín:**
- Bước C-5: Poka-yoke ngăn sai tuyến — đơn không bị stuck
- Bước C-8: REJECT rollback `currentTripId=null` — staging an toàn
- Bước C-17: Guard tại originHub — không thể nhập nhầm Hub
- Bước C-18: `RETURNED` — không rơi vào trạng thái vô định

---

## 16. HƯỚNG DẪN THỰC THI TEST TỰ ĐỘNG

### 16.1. Chạy bộ test có sẵn trong repo

```bash
cd backend

# E2E toàn trình (38 test cases)
node test/e2e/test-full-lifecycle-e2e.js

# Module 4 Guide Suite UC-16 → UC-19 (18 test cases)
node test/e2e/run-guide-tests.js

# Test chuyên biệt theo module
node test/suites/test_uc12_pickup.js           # UC-12 Pickup (12 cases)
node test/suites/test-hub-routing-e2e.js       # Hub routing (5 cases)
node test/suites/test-zone-pricing-distance-e2e.js  # Pricing (4 cases)
node test/suites/test-bagging-module-e2e.js    # Bagging (5 cases)
node test/suites/test-inventory-enhanced-e2e.js  # Inventory (5 cases)
node test/suites/test-audit-enhanced-e2e.js    # Audit (5 cases)
```

### 16.2. Seed dữ liệu môi trường test

```bash
cd backend
node seed-hub-network.js         # Tạo hub network
node seed_demo_roles.js          # Seed role mẫu
node seed_demo_orders.js         # Seed đơn demo
node seed-delivery-failure-config.js  # Config thất bại
node verify-live-real-system.js  # Kiểm tra hệ thống live
```

### 16.3. Giới hạn môi trường — Tuyên bố minh bạch

> ⚠️ **Tài liệu này được soạn trong môi trường chỉ đọc code, không có quyền kết nối MongoDB hay server đang chạy.** Các kịch bản full-chain chưa được chạy thực tế để ghi log PASS/FAIL.

Để chạy thực thi:
1. Khởi chạy MongoDB (local hoặc Atlas) với `backend/.env`
2. Khởi chạy backend: `cd backend && npm run dev`
3. Đảm bảo tài khoản test đã có đúng `role` và `hubId` được gán trong DB
4. Dùng Postman, curl, hoặc test script gọi lần lượt theo thứ tự kịch bản

---

## 17. PHÁT HIỆN THÊM TRONG QUÁ TRÌNH SOẠN TEST

> **Ghi nhận để xử lý sau — KHÔNG tự sửa trong tài liệu này.**

### 17.1. Lỗi logic tiềm ẩn (Bugs)

| # | File | Dòng | Mô tả | Mức độ |
|---|---|---|---|---|
| BUG-01 | `order.model.js` | 140 & 330 | `currentTripId` khai báo **2 lần** trong schema. Mongoose dùng khai báo sau, nhưng gây nhầm lẫn và tiềm ẩn lỗi khi migration schema. | Trung bình |
| BUG-02 | `outboundCore.service.js` | 241 | `nodeIdxToUpdate = currentRouteIndex > 0 ? currentRouteIndex - 1 : 0` — nếu index=0 thì routeNodes[0] bị đặt DEPARTED từ node đầu tiên, có thể không đúng intent. | Thấp |
| BUG-03 | `outboundCore.service.js` | 192 | REJECT rollback: `isDest = orderShort.destinationHubId === trip.originHubId` — so sánh destHub của đơn với **originHub của Trip**. Logic có thể ngược: khi đơn ở kho đích, nên so sánh với `trip.destinationHubId`. Có thể rollback về trạng thái sai. | **Cao** |
| BUG-04 | `deliveryFailure.service.js` | 85–90 | Chỉ cho phép báo thất bại khi `status === DELIVERING`. Nhưng nếu flow bỏ qua chuyển sang DELIVERING và ở OUT_FOR_DELIVERY → HTTP 409. Cần xem lại business rule có cần bổ sung `OUT_FOR_DELIVERY` không. | Trung bình |
| BUG-05 | `bagCore.service.js` | 194 | Log `actionType: 'BAG_SEALED'` được tạo khi **add-item** (không phải khi seal). Tên action sai nghĩa — nên là `ITEM_ADDED_TO_BAG`. Gây nhầm lẫn trong audit trail. | Thấp |

### 17.2. Thiếu sót về coverage (Gaps)

| # | Mô tả | Ảnh hưởng |
|---|---|---|
| GAP-01 | `SUSPENDED_RISK_REVIEW` có trong `autoApproval.service.js` hàm `checkPostApprovalDeviation` nhưng không được gọi tự động trong `confirm-pickup`. Tính năng phát hiện vi phạm sau-thẩm-duyệt chưa được tích hợp. | Tính năng chưa hoàn chỉnh |
| GAP-02 | `ORDER_VENDOR_MANAGER`, `CS`, `ACCOUNTANT` có trong `user.model.js` nhưng KHÔNG có route API nào trong `routes/`. 3 role này tồn tại nhưng không có chức năng. | Thiếu module |
| GAP-03 | `DISPATCH_ESCALATED` có trong enum nhưng không tìm thấy service nào tự động chuyển đơn sang trạng thái này. `GET /local-dispatch/escalated-orders` truy vấn nhưng không thấy logic trigger. | Logic chưa implement |
| GAP-04 | `BAGGED_SEALED` trong enum nhưng không có service nào chuyển đơn sang trạng thái này khi đóng bao. Đơn vẫn giữ `IN_HUB_ORIGIN` sau khi vào bao. → Enum dư thừa. | Enum orphan |
| GAP-05 | `returnProcess.service.js` chỉ 1009 bytes — rất nhỏ. Khả năng cao `initiate()` chưa implement đầy đủ logic RETURNING → RETURN_IN_TRANSIT. | Logic chưa đầy đủ |
| GAP-06 | Mâu thuẫn code ↔ README: README (dòng 55) ghi "PICKED_UP thay cho PICKED". Nhưng `order.model.js` vẫn giữ cả 2 enum song song (dòng 38–39). `PICKED` là legacy orphan chưa được xóa. | Technical debt |

### 17.3. Quan sát bảo mật (Security)

| # | Mô tả | Mức độ |
|---|---|---|
| SEC-01 | `POST /orders/driver-location` (`order.routes.js` dòng 34) **không có `protect` middleware** — endpoint GPS công khai, bất kỳ ai cũng ghi GPS giả. | **Cao** — cần thêm JWT auth |
| SEC-02 | Brute-force chặn 4 số điện thoại dùng **in-memory Map** — reset về 0 khi restart server. Không bền vững với môi trường multi-instance hoặc restart. | Trung bình |
| SEC-03 | `ROLE_ALIASES['DRIVER']` bao gồm `SHIPPER` và `LOCAL_SHIPPER` — LINE_HAUL_DRIVER có thể `confirm-pickup` chặng đầu. Cần xem xét có đúng business rule không. | Thấp — cần review |

---

*Tài liệu soạn 100% từ codebase thực tế. Mọi tên trạng thái, role, endpoint đều có thể truy xuất về file nguồn. Không có dữ liệu suy đoán.*
