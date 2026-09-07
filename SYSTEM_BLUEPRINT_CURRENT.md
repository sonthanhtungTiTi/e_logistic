# SYSTEM_BLUEPRINT_CURRENT.md (BẢN THIẾT KẾ & HIỆN TRẠNG HỆ THỐNG HIỆN HÀNH)

> **Dự án**: E-Logistics Enterprise Platform (Mô hình Brownfield Enterprise Architecture)  
> **Phiên bản**: 3.0 (Hoàn thiện 100% Vòng đời Logistics Khép kín & Kiểm thử E2E Đạt chuẩn)  
> **Tài liệu tham chiếu**: `README.md`, `MODULE_4_SPEC_AND_TEST_GUIDE.md`

---

## 1. TỔNG QUAN HIỆN TRẠNG & NĂNG LỰC HỆ THỐNG (CURRENT CAPABILITIES)

### 🌟 Hệ thống đã hoàn thiện 100% (Production-Ready):
*   **Authentication & Authorization (RBAC & Aliases):**
    *   Đăng ký, Đăng nhập JWT, Quên mật khẩu với OTP (TTL Index tự động xóa sau khi hết hạn).
    *   Hỗ trợ đầy đủ các vai trò: `SELLER`, `BUYER`, `SHIPPER`/`LOCAL_SHIPPER`, `DRIVER`/`LINE_HAUL_DRIVER`, `HUB_STAFF`/`WAREHOUSE_STAFF`, `HUB_COORDINATOR`, `ACCOUNTANT`, `CS`, `ADMIN`.
    *   Tích hợp bản đồ Role Aliases trong middleware `auth.middleware.js` giúp tương thích hoàn toàn giữa các module.
*   **Order Lifecycle & Pricing Engine:**
    *   Tự động tính cước 4 cấp độ vùng (`INTRA_PROVINCE`, `INTRA_REGION`, `NEAR_REGION`, `INTER_REGION`) dựa trên khoảng cách GPS Haversine và thời gian dự kiến (ETA).
    *   Kiểm soát chặt chẽ dữ liệu đầu vào: Cân nặng phải dương, kích thước không âm, bảo vệ chống gian lận dữ liệu.
*   **Shipper Pickup Handlers (UC-12):**
    *   Hoàn thiện toàn bộ logic quét mã lấy hàng, biên bản bàn giao điện tử ePOH (`PickupConfirmation`), chữ ký Seller, tải ảnh kiện hàng đối chứng khi phát hiện lệch cân.
    *   Cơ chế Idempotency dựa trên `clientOfflineId` giúp đồng bộ dữ liệu ngoại tuyến an toàn, chống tạo trùng bản ghi.
    *   Tự động ghi nhận `OrderTrackingLog` và `OrderLog` đầy đủ cho các sự kiện `PICKED_UP` và `PICKUP_FAILED`.
*   **Hub Operations & Routing (Module 4):**
    *   **3-Tier Master Regional Routing**: Tự động ánh xạ 63 tỉnh/thành về 3 Kho Tổng (Hà Nội, Đà Nẵng, TP.HCM), tự động xây dựng lộ trình `routeNodes` tối ưu.
    *   **UC-16 Inbound Scan**: Quét nhập kho, phân luồng thông minh (đơn nội tỉnh chuyển thẳng `IN_HUB_DEST` / `WAITING_FOR_DELIVERY`), tự động tính phụ thu lệch cân $>50\text{g}$ và ghi nhận `OrderLog(FEE_ADJUSTMENT_TRIGGERED)`.
    *   **UC-Bagging Poka-yoke**: Gom bao tải, niêm phong Seal với cơ chế Route Guard chống nhầm tuyến, kiểm soát định mức sức chứa và tải trọng.
    *   **UC-17 Outbound & Driver Double Handshake**: Quét xuất kho, chốt chuyến xe, tài xế xác nhận nhận hàng (`ACCEPT` $\rightarrow$ `IN_TRANSIT`) hoặc từ chối (`REJECT` $\rightarrow$ Rollback an toàn toàn bộ kiện về trạng thái ban đầu).
    *   **UC-18 Audit Session**: Kiểm kê kho thông minh, quét giải nén mã Seal, phát hiện hàng để sai Zone, phục hồi hàng thất lạc, đối soát thời gian trung chuyển quá hạn SLA (`SUSPECTED_LOST_IN_TRANSIT`), tính tổng tiền hàng thất thoát (VND).
    *   **UC-19 Inventory Management**: Giám sát SLA Dwell Time động theo `zoneTier`, đo vận tốc Nhập/Xuất 24h, cảnh báo quá tải khay kệ (>90%), gợi ý gom chuyến xe 1-chạm.
*   **Last-mile Delivery & Public Tracking:**
    *   Bàn giao Shipper giao hàng chặng cuối (`OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`), tải lên ảnh POD và chữ ký người nhận.
    *   Tra cứu hành trình vận đơn công khai bảo mật 4 số cuối điện thoại của người nhận, giới hạn tần suất truy vấn (Rate Limiter) chống vét cạn brute-force.

---

## 2. BẢNG CHUẨN HÓA TÊN GỌI & ÁNH XẠ QUY CHUẨN (NAMING CONVENTION MAPPING)

| # | Tên cũ / Biến thể cũ | Tên mới chuẩn hoá | Loại (Scope) | Lý do đổi / Chuẩn hoá |
|---|---|---|---|---|
| 1 | `SHIPPER`, `LOCAL_SHIPPER` | `SHIPPER` / `LOCAL_SHIPPER` (Role alias) | Role / Auth | Đồng bộ vai trò giao nhận chặng đầu (First-mile) và chặng cuối (Last-mile) |
| 2 | `DRIVER`, `LINE_HAUL_DRIVER` | `DRIVER` / `LINE_HAUL_DRIVER` (Role alias) | Role / Auth | Chuẩn hoá vai trò tài xế xe tải đường trục (Linehaul) và kết nối liên tỉnh |
| 3 | `WAREHOUSE_STAFF`, `HUB_STAFF` | `HUB_STAFF` / `WAREHOUSE_STAFF` (Role alias) | Role / Auth | Đồng bộ danh xưng nhân viên khai thác kho bãi và bưu cục thao tác trên Web/App |
| 4 | `/orders/shipper/verify-pickup-scan` (thiếu param) | `/orders/shipper/:id/verify-pickup-scan` & `/orders/shipper/scan-item` | API Endpoint | Đảm bảo tính nhất quán giữa RESTful endpoint và tương thích ngược với Mobile App |
| 5 | `/bagging/open`, `/bagging/add-item` | `/bags/open`, `/bags/add-item`, `/bags/seal` | API Endpoint | Đồng bộ toàn bộ tài nguyên bao tải theo RESTful chuẩn danh từ số nhiều `/api/bags` |
| 6 | `/outbound/scan-item`, `/outbound/commit-trip` | `/outbound/scan`, `/outbound/commit`, `/outbound/driver-confirm` | API Endpoint | Đơn giản hoá và chuẩn hoá tên hành động xuất kho và ký số bàn giao |
| 7 | `flagFeeWarning` (chỉ cờ boolean) | `flagFeeWarning`, `surchargeFee`, `revisedShippingFee` | Schema / Field | Tự động tính toán phụ thu và cập nhật tổng cước khi lệch cân $>50\text{g}$ |
| 8 | `assignedTrackingCodes` | `plannedTrackingCodes` | Schema / Field | Thống nhất tên trường danh sách đơn dự kiến xuất kho trong `Trip` |
| 9 | `PICKED` | `PICKED_UP` | Status / Enum | Chuẩn hoá trạng thái đơn hàng sau khi Shipper xác nhận lấy hàng thành công (UC-12 ePOH) |
| 10 | `MISSING` (đơn lẻ trong kiểm kê) | `SEARCH_ZONE` | Status / Enum | Thống nhất trạng thái đưa hàng nghi thất thoát vào khu vực rà soát tìm kiếm |
| 11 | `SUSPECTED_LOST` | `SUSPECTED_LOST_IN_TRANSIT` | Action / Tracking | Phân biệt rõ mất hàng tại kho với trường hợp xe đường trục quá hạn SLA tối đa |
| 12 | `FEE_ADJUSTMENT_TRIGGERED` | `FEE_ADJUSTMENT_TRIGGERED` (New action) | OrderLog Action | Ghi vết kiểm toán tài chính khi trọng lượng hàng thực tế làm thay đổi cước |
| 13 | Dwell SLA tĩnh cố định (24h/48h) | Dynamic SLA theo `zoneTier` (`INTRA_PROVINCE`: 12h/24h, `INTRA_REGION`: 24h/36h, `NEAR_REGION`: 36h/48h, `INTER_REGION`: 48h/72h) | Logic nghiệp vụ | Phản ánh chính xác cam kết chất lượng dịch vụ logistics theo từng cấp cự ly |
| 14 | Quét đơn nội tỉnh bị ép qua `IN_HUB_ORIGIN` | Đi thẳng `IN_HUB_DEST` & `WAITING_FOR_DELIVERY` | Logic nghiệp vụ | Tối ưu luồng đơn nội tỉnh, không bắt buộc tạo bao tải và chuyến xe trung chuyển |

---

## 3. CẤU TRÚC DATABASE (DATABASE SCHEMAS & RELATIONS)

Hệ thống sử dụng cơ sở dữ liệu **MongoDB (NoSQL)** thông qua Mongoose:

1. **User (`user.model.js`)**:
   - `fullName`, `email`, `phoneNumber`, `password` (hashed, `select: false`), `role`, `hubId` (ref: `Hub`), `walletBalance`, `isActive`.
   - *Roles*: `SELLER`, `BUYER`, `SHIPPER`, `LOCAL_SHIPPER`, `DRIVER`, `LINE_HAUL_DRIVER`, `HUB_STAFF`, `WAREHOUSE_STAFF`, `HUB_COORDINATOR`, `ACCOUNTANT`, `CS`, `ADMIN`.
2. **Order (`order.model.js`)**:
   - `trackingCode`, `status`, `sellerId`, `originHubId`, `destinationHubId`, `currentHubId`, `currentZoneId`, `sealId`, `currentTripId`, `pickupAddress`, `deliveryAddress`, `items`, `actualWeight`, `chargeableWeight`, `dimensions`, `codAmount`, `shippingFee`, `surchargeFee`, `revisedShippingFee`, `flagFeeWarning`, `isFlagged`, `zoneTier`, `routeDistanceKm`, `estimatedDeliveryDays`, `routeNodes`, `currentRouteIndex`, `dwellStartTime`, `lastMovedAt`, `podImageUrl`, `recipientSignatureUrl`.
3. **Hub (`hub.model.js`)**:
   - `code`, `name`, `type` (`SORTING`, `TRANSIT`, `DELIVERY`, `HYBRID`), `province`, `district`, `address`, `location` (GeoJSON Point), `capacity`, `isActive`.
4. **HubZone (`hubZone.model.js`)**:
   - `hubId`, `code`, `name`, `zoneType` (`INBOUND`, `OUTBOUND`, `STAGING_TRANSFER`, `STAGING_DELIVERY`, `RETURN`, `INCIDENT`, `SEARCH`), `capacity`, `currentStockCount`.
5. **Trip (`trip.model.js`)**:
   - `tripCode`, `tripType` (`MID_MILE_TRANSFER`, `HUB_TRANSFER`, `LINEHAUL`, `LAST_MILE_DELIVERY`), `originHubId`, `destinationHubId`, `driverId`, `plannedTrackingCodes`, `scannedItems`, `shortageTrackingCodes`, `status` (`DRAFT`, `PLANNING`, `LOCKED_PENDING_DRIVER_CONFIRM`, `CONFIRMED`, `REJECTED`, `DEPARTED`, `ARRIVED`), `lockedAt`, `driverConfirmedAt`, `driverRejectedAt`, `rejectReason`.
6. **Bag (`bag.model.js`)**:
   - `sealCode`, `originHubId`, `destinationHubId`, `itemCount`, `totalWeightKg`, `maxCapacity`, `maxWeightKg`, `status` (`OPEN`, `SEALED`, `IN_TRANSIT`, `ARRIVED`), `sealedAt`, `sealedBy`.
7. **AuditSession (`auditSession.model.js`)**:
   - `sessionCode`, `hubId`, `scope` (`ALL`, `ZONE`, `DESTINATION`, `DATE_RANGE`), `snapshotTrackingCodes`, `scannedItems`, `missingTrackingCodes`, `misplacedItems`, `recoveredItems`, `lossValuationVnd`, `status` (`IN_PROGRESS`, `PAUSED`, `PENDING_APPROVAL`, `APPROVED`), `startedAt`, `submittedAt`, `approvedAt`.
8. **PickupConfirmation (`pickupConfirmation.model.js`)**:
   - `orderId`, `shipperId`, `sellerSignatureUrl`, `proofPhotoUrls`, `clientOfflineId`, `gpsLat`, `gpsLng`, `gpsMissing`, `notes`, `confirmedAt`.
9. **OrderTrackingLog (`orderTrackingLog.model.js`)**:
   - `orderId`, `trackingCode`, `eventType`, `title`, `description`, `locationName`, `hubId`, `driverInfo`, `podImageUrl`, `timestamp`.
10. **OrderLog (`orderLog.model.js`)**:
    - `orderId`, `trackingCode`, `preStatus`, `postStatus`, `actionType`, `actionBy`, `hubId`, `note`, `metadata`, `createdAt`.

---

## 4. KẾT QUẢ KIỂM THỬ TOÀN TRÌNH (E2E VERIFICATION)

Hệ thống đã trải qua kiểm thử tự động toàn diện với kết quả **100% PASS** trên toàn bộ 8 bộ test:

```
======================================================================
🏁 KẾT QUẢ E2E TOÀN TRÌNH (test-full-lifecycle-e2e.js):
   - Đơn 1: Liên miền HN -> HCM -> Cần Thơ (Gom bao, Xe trục, Nhập/Xuất đa chặng, Giao thành công): PASS
   - Đơn 2: Lệch cân (>50g) khai báo 1.0kg nhưng thực tế 2.5kg (Tự động phụ thu cước 17.000 đ): PASS
   - Đơn 3: Rách niêm phong góc đáy (Chuyển an toàn vào khu sự cố EXCEPTION_INBOUND): PASS
   - Đơn 4: Nội tỉnh HN -> HN (Đi thẳng IN_HUB_DEST & WAITING_FOR_DELIVERY, bỏ qua xe trục): PASS
   - Bắt tay tài xế: Rollback an toàn khi REJECT, Khởi hành an toàn khi ACCEPT: PASS
   - Kiểm kê kho Audit: Quét đối soát 100% khớp, 0 kiện thất thoát: PASS
   - Dashboard tồn kho: Đo lường Dwell time & Dynamic SLA thresholds chuẩn xác: PASS
   - Tra cứu công khai Public Tracking: Hiển thị đầy đủ timeline & bảo mật 4 số cuối: PASS
   - TỔNG CỘNG: 38/38 BƯỚC THÀNH CÔNG (100% PASS)
======================================================================
```
