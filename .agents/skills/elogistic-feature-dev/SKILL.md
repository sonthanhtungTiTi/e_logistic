---
name: elogistic-feature-dev
description: "Hướng dẫn bắt buộc khi implement bất kỳ chức năng Backend hoặc Frontend nào cho dự án E-Logistics — nền tảng vận tải & kho vận Hub-and-Spoke 3 cấp (Node.js/Express/Mongoose + Redis + RabbitMQ + MongoDB Change Streams + React/Vite). PHẢI dùng skill này trước khi viết route, controller, service, model, worker, job, hoặc page/component mới, kể cả khi người dùng chỉ mô tả ngắn gọn 'code UC-xx', 'thêm API cho...', 'tạo trang...'. Skill này định nghĩa cấu trúc thư mục bắt buộc của backend/frontend_admin/frontend_web, 42 trạng thái Order, 17 role RBAC, quy ước đặt tên field, pattern chống race condition (atomic update), pattern chống Mass Assignment/IDOR, pattern Route Guard Poka-yoke, pattern Write-Behind Caching (Redis+RabbitMQ), pattern transaction cộng audit log, danh sách bug/tech-debt đã biết cần tránh lặp lại, và checklist bắt buộc trước khi báo cáo đã xong. Dùng cả khi chỉnh sửa code cũ để tinh chỉnh theo đúng chuẩn."
---

# E-Logistics Senior Fullstack Engineering & Code Quality Standards

Backend Node.js/Express 5/Mongoose 9 (MongoDB) + Redis (ioredis, Hot Cache Layer) + RabbitMQ (amqplib, Message Broker) + MongoDB Change Streams, 2 Frontend Vite 8/React 19/TypeScript 6 riêng (`frontend_admin`, `frontend_web`). Skill này là nguồn sự thật duy nhất — không tự suy diễn khác đi. Nếu phát hiện code thực tế khác với skill, ưu tiên đọc code thật và báo lại cho người dùng để cập nhật skill.

## 0. Vai trò & Triết lý

Tư duy **Senior Full Stack Engineer**: Suy nghĩ trước, đọc code sâu, code sau. Chất lượng > tốc độ. Zero technical debt.

**Trước khi code bất kỳ dòng nào:**
1. Đọc cấu trúc thư mục, model, service, component **đã tồn tại**.
2. **Audit `package.json`** của `backend/`, `frontend_web/`, `frontend_admin/` trước khi thêm dependency.
3. **KHÔNG tạo duplicate** functions, services, components, hooks, types, constants.
4. Nếu logic tương tự đã tồn tại: **Tái sử dụng, mở rộng, hoặc refactor**.
5. Xác định xem thao tác có đi qua **Write-Behind Caching Engine** (Redis + RabbitMQ, mục 3.9) hay không — đa số API cập nhật trạng thái đơn hàng đều đi qua tầng này thay vì ghi thẳng MongoDB.

**Năm câu hỏi bắt buộc:**
1. Đây là **Backend**, **frontend_admin**, hay **frontend_web**?
2. Có **race condition** (thao tác đổi `status` dựa trên `ALLOWED_STATUSES`) → bắt buộc Atomic Conditional Update (mục 3.3).
3. Có field Client **không được phép tự set** (`role`, `status`, `sellerId`, `chargeableWeight`, `baseFee`, `shippingFee`, `volumetricWeight`, `walletBalance`) → whitelist (mục 3.2).
4. Số tiền (`codAmount`, `goodsValue`, `baseFee`, `shippingFee`, `walletBalance`) → **Số nguyên Đồng VND** (`Number.isInteger`).
5. Thao tác có ghi `status` Order không → có cần đi qua `sync.service.js` (Redis Hot Layer + RabbitMQ) thay vì `Order.findOneAndUpdate` trực tiếp?

Nếu thiếu thông tin → hỏi lại, không tự giả định.

---

## 1. Cấu trúc thư mục — VERIFIED từ `overview.md` (cập nhật 14/09/2026, v2.3)

### 1.1 Backend (`backend/src/`)

```
server.js   → Entry: dotenv → connectDB → migratePickupAddresses → connectRedis
              → connectRabbitMQ → startDBSyncWorker → startRedisSyncWorker
              → startDBWatcher → http.createServer(app) → Socket.io
              → startSyncMonitorJob/startAuditLostTimeoutJob/startResetDriverRejectionQuotaJob
              (Bắt buộc JWT_SECRET trong .env, thiếu → process.exit(1))
app.js      → Express app + 24 route groups + errorMiddleware

config/
  db.js               → Kết nối MongoDB
  redis.config.js     → Kết nối Redis (ioredis)
  rabbitmq.config.js  → Kết nối RabbitMQ (amqplib), khai báo EXCHANGES.SYNC

constants/            → Hằng số nghiệp vụ (ALLOWED_STATUSES, zone tiers, ...)

controllers/ (29 files) → CHỈ req/res orchestration, KHÔNG chứa business logic
  auth.controller.js, order.controller.js, admin.controller.js,
  inbound.controller.js (UC-16), bag.controller.js (Bagging/Seal),
  outbound.controller.js (UC-17), audit.controller.js (UC-18),
  inventory.controller.js (UC-19), driverManager.controller.js,
  localDispatch.controller.js, linehaulDispatch.controller.js,
  vendorOps.controller.js, pricingConfig.controller.js, product.controller.js,
  ticket.controller.js, kyc.controller.js, shipperZone.controller.js,
  wallet.controller.js, custody.controller.js, ... (13 controllers khác)

services/ (18 files) → Business Logic Core, mỗi domain đúng 1 file .service.js
  sync.service.js            → Engine Write-Behind Caching (Redis + RabbitMQ + Double-Write)
  db-watcher.service.js      → MongoDB Change Streams Watcher (cache invalidation)
  hubRouting.service.js      → Định tuyến Hub-and-Spoke + Haversine + Dijkstra (549 dòng)
  pricing.service.js         → Tính cước 4 vùng + Risk Engine (228 dòng)
  inboundCore.service.js     → UC-16 Nhập kho atomic (348 dòng)
  bagCore.service.js         → Bagging + Route Guard Poka-yoke (383 dòng)
  outboundCore.service.js    → UC-17 Xuất kho + Driver Handshake
  auditCore.service.js       → UC-18 Kiểm kê + SEARCH_ZONE
  inventoryCore.service.js   → UC-19 SLA Dwell + Zone Capacity (496 dòng)
  order.service.js           → Core CRUD đơn hàng — MONOLITH 35.8KB/978 dòng (xem DEBT-02, mục 6)
  dispatchEngine.service.js  → Auto-dispatch engine (Low-density optimization)
  kyc.service.js             → Xử lý KYC + upload file
  notification.service.js    → Thông báo realtime + email (CHỈ export sendPasswordResetEmail — xem BUG-02, mục 6)
  autoApproval.service.js    → Auto-approve đơn không rủi ro
  deliveryFailure.service.js → Giao thất bại + retry (duy nhất dùng mongoose.startSession())
  returnProcess.service.js   → Hoàn hàng — CHỈ LÀ STUB 25 dòng (xem BUG-01, mục 6)
  telematics.service.js      → GPS driver ingestion — CHƯA TRIỂN KHAI, chỉ 956 bytes (BUG-05)
  auth.service.js            → RỖNG 0 bytes, toàn bộ logic auth nằm trong auth.controller.js (DEBT-08)

queues/consumers/
  db-sync.worker.js     → Consumer: đồng bộ Redis/RabbitMQ queue xuống MongoDB (bulk write)
  redis-sync.worker.js  → Consumer: cập nhật trạng thái Redis Hot Layer

models/ (24 Mongoose schemas) → xem chi tiết mục 2
routes/ (24 route files) → xem bảng route prefix mục 1.4
middleware/ (6 files)
  auth.middleware.js     → protect (JWT verify, check isActive/lockUntil/mustChangePassword),
                            authorize(...roles) (RBAC)
  rateLimit.middleware.js → createOrderRateLimiter (30/min), trackingRateLimiter (10/min)
                            (loginLimiter/registerLimiter/otpLimiter/adminLimiter khai báo INLINE
                            trong auth.routes.js / admin.routes.js, KHÔNG nằm ở đây)
  error.middleware.js    → Global error handler
  hubScope.middleware.js → Giới hạn phạm vi hub
  kyc.middleware.js      → Yêu cầu KYC verified
  upload.middleware.js   → Multer file upload

websocket/
  tracking.gateway.js → Socket.io: room `tracking:${trackingCode}` (GPS live),
                          `warehouse-dashboard:${hubId}`, `seller:${sellerId}`

jobs/ (5 background cron workers)
  auditLostTimeout.job.js          → Mỗi giờ: SEARCH_ZONE quá hạn → SUSPECTED_LOST → (72h) LOST
  resetDriverRejectionQuota.job.js → 00:00 hàng ngày: reset rejectionQuota.remainingToday = 3
  driverConfirmTimeout.job.js      → Timeout xác nhận tài xế → rollback Trip
  staleRedeliveryMonitor.job.js    → Monitor PENDING_REDELIVERY tồn đọng
  (⚠️ staleRedeliveryMonitor & driverConfirmTimeout KHÔNG được start trong server.js — BUG-08.
   Trước khi thêm job mới, kiểm tra server.js đã start đủ job chưa.)

validations/  → Joi schema validators
utils/        → idGenerator.js (sinh trackingCode — có nguy cơ trùng, xem BUG-07), generateToken.js,
                 geo.util.js, signatureValidator.js, Logger, Date utils
lib/          → ioSingleton (Socket.io singleton cho emit từ service)

test/
  e2e/     → 38+18 test cases (test-full-lifecycle-e2e.js, run-guide-tests.js)
  suites/  → 6 module test suites (uc12 pickup, hub routing, zone pricing, bagging, inventory, audit)
```

**Quy tắc**: mỗi domain nghiệp vụ có đúng 1 file `.service.js`. KHÔNG viết 2 hàm cùng chức năng ở 2 file.

### 1.2 Installed Dependencies (Verified từ `overview.md` mục 2)

**Backend**: `express@5.2.1`, `mongoose@9.9.1`, `ioredis@5.8.0`, `amqplib@0.10.9`, `bcryptjs`, `jsonwebtoken` (RS256, access 15m/refresh 7d), `speakeasy@2.0.0` (2FA TOTP), `socket.io@4.8.3`, `socket.io-client`, `joi@18.2.3`, `express-rate-limit@8.6.2`, `multer@2.3.0`, `qrcode@1.5.4`, `nodemailer@9.0.5`, `cors`, `dotenv`, `axios`, `nodemon` (dev)

**Frontend Web** (`frontend_web/package.json`): `react@19`, `react-dom@19`, `react-router@7.18.2`, `axios@1.19.0`, `tailwindcss@4.3.3`, `@tailwindcss/vite`, `shadcn`, `lucide-react@1.30.0`, `react-hook-form@7.85` + `@hookform/resolvers`, `zod@4.4`, `zustand@5.0.14`, `sonner@2.0.7`, `socket.io-client`, `leaflet@1.9.4` + `@types/leaflet`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `@fontsource-variable/geist`, `@base-ui/react`, `xlsx@0.18.5`, `vite@8`, `typescript@6`, `oxlint` (dev)

**Frontend Admin** (`frontend_admin/package.json`): Giống frontend_web + HTML5-QRCode Scanner, nhưng thời điểm audit gần nhất **KHÔNG CÓ** `leaflet`/`@types/leaflet`/`socket.io-client` trong danh sách — **verify lại `package.json` thật trước khi giả định**, vì `overview.md` mục 8 lại ghi Admin Portal có dùng Leaflet Maps cho GPS tracking (khả năng đã được thêm sau bản audit dependencies). Không tự suy diễn — mở file thật.

### 1.3 Frontend — 2 APP RIÊNG BIỆT

| App | Actor | Route chính |
|---|---|---|
| `frontend_web/` | Seller (login) + Buyer (public) | `/seller/*`, `/tracking/*`, `/auth/*` |
| `frontend_admin/` | Admin, Kế toán, CSKH, Điều phối, Kho, Driver/Shipper | `/dashboard`, `/dispatch/*`, `/orders/*`, `/warehouse/*`, `/driver/*`, `/shipper/*`, `/linehaul/*`, `/reports/*`, `/security/*`, `/users/*`, `/vendorOps/*` |

**`frontend_web/src/pages/seller/` (10 trang):** SellerDashboardPage, OrderListPage, CreateOrderPage (105KB), BatchOrderPage (83.6KB, import Excel), ProductListPage, ProfilePage (103.6KB, KYC+2FA+Sub-account), CodWalletPage, PayoutHistoryPage, CreateTicketPage, TicketListPage
**`frontend_web/src/pages/auth/`:** LoginPage, RegisterPage, ForgotPasswordPage
**`frontend_web/src/pages/public/`:** LandingPage, PricingPage, PublicTrackingPage
Còn lại: `api/`, `components/{layout,orders,shared,ui}/`, `context/AuthContext.tsx`, `hooks/`, `lib/`, `routes/`, `types/`

**`frontend_admin/src/pages/` — theo nhóm role (30+ trang, VERIFIED overview.md mục 8):**
| Nhóm | Trang tiêu biểu | Role |
|---|---|---|
| `warehouse/` | WarehouseInboundPage (UC-16), WarehouseBaggingPage (Poka-yoke), WarehouseOutboundPage (UC-17), WarehouseAuditPage (UC-18), WarehouseInventoryDashboardPage (UC-19), InventorySuggestionsPanel | HUB_STAFF, WAREHOUSE_MANAGER |
| `dispatch/` | DispatchControlPage, LocalDispatchPage, LineHaulDispatchPage | ORDER_MANAGER, LAST_MILE_DISPATCHER, LINE_HAUL_DISPATCHER |
| `driver/` | DriverPickupPage, DriverHandoffPage | DRIVER, SHIPPER, LINE_HAUL_DRIVER |
| `orders/` | OrderApprovalPage, GlobalOrderListPage (Socket realtime), RiskReviewPage | ORDER_MANAGER, ADMIN |
| `shipper/` | ShipperPickupPage, ShipperDeliveryPage, ShipperZonePage, ShipperProfilePage, ShipperWalletPage | SHIPPER |
| `linehaul/` | LineHaulTripsPage, LineHaulTransitPage, LineHaulHandoffPage | LINE_HAUL_DRIVER |
| `kyc/`, `users/`, `reports/`, `security/`, `vendorOps/` | — | ADMIN, ACCOUNTANT, ORDER_VENDOR_MANAGER |
| `admin/config` | PricingConfigPage | ADMIN |
| `support` | TicketManagementPage | ADMIN, CS |

**Đồng bộ `order.types.ts`**: `frontend_web` là bản gốc (185 dòng, có backward-compat aliases + payload types). `frontend_admin` chỉ có core types (93 dòng). Khi sửa Order interface → phải cập nhật cả 2.

### 1.4 Route Prefix — 24 nhóm (VERIFIED overview.md mục 4.2)

| Prefix | File | Mục đích |
|---|---|---|
| `/api/auth/*` | auth.routes.js | Đăng ký, đăng nhập, 2FA, OTP |
| `/api/orders/*` | order.routes.js | CRUD đơn hàng, tính giá, tracking, UC-12 shipper pickup |
| `/api/admin/*` | admin.routes.js | Quản trị người dùng & hệ thống |
| `/api/seller/*` | seller.routes.js | Sub-account, KYC, pickup address |
| `/api/seller/products/*` | product.routes.js | Danh mục sản phẩm Seller |
| `/api/driver-manager/*` | driverManager.routes.js | Điều phối & phân công tài xế |
| `/api/driver/*` | driver.routes.js | App tài xế: từ chối, xác nhận |
| `/api/inbound/*` | inbound.routes.js | UC-16: Nhập kho |
| `/api/trips/*` | trips.routes.js | UC-17: Tạo chuyến xe |
| `/api/outbound/*` | outbound.routes.js | UC-17: Xuất kho |
| `/api/driver/trips/*` | driverHandoff.routes.js | UC-17: Tài xế ký nhận |
| `/api/bags/*` | bag.routes.js | Bagging: Gom bao, niêm phong |
| `/api/audit/*` | audit.routes.js | UC-18: Kiểm kê kho |
| `/api/inventory/*` | inventory.routes.js | UC-19: Dashboard tồn kho |
| `/api/wallet/*` | wallet.routes.js | Ví COD & rút tiền |
| `/api/vendor-ops/*` | vendorOps.routes.js | Quản trị nhà cung cấp |
| `/api/dispatch/local/*` | localDispatch.routes.js | Điều phối Shipper nội vùng |
| `/api/dispatch/linehaul/*` | linehaulDispatch.routes.js | Điều phối xe tải liên tỉnh |
| `/api/custody/*` | custody.routes.js | Chain of Custody |
| `/api/tickets/*` | ticket.routes.js | Vé hỗ trợ & Khiếu nại CSKH |
| `/api/system/*` | system.routes.js | Giám sát trạng thái Sync Redis & RabbitMQ (`/api/system/sync-status`) |
| `/api/order-manager/*` | orderManager.routes.js | Quản lý & duyệt đơn hàng |
| `GET /api/kyc/files/:fn` | kyc.controller | Anti-IDOR KYC file streaming |
| `index.js` | routes/index.js | (empty — unused) |

---

## 2. Schema Fields — VERIFIED từ `.model.js` (24 Mongoose schemas)

### Order (order.model.js, 14.8KB — **42 trạng thái**, không phải 19)

```
DRAFT → CREATED → SELLER_PREPARING → PENDING_APPROVAL / APPROVED
→ ASSIGNED_TO_PICKUP → READY_TO_PICK → PICKING → PICKED_UP
→ INBOUND_HUB → IN_HUB_ORIGIN → BAGGED_SEALED → IN_TRANSIT
→ IN_HUB_DEST → WAITING_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERING
→ DELIVERED ✅ | DELIVERY_FAILED_PENDING_RETURN | RETURNING → RETURNED ✅
(+ PENDING_VERIFICATION, PICKUP_FAILED, DISPATCH_ESCALATED, PENDING_REDELIVERY,
   EXCEPTION_INBOUND, SEARCH_ZONE, SUSPECTED_LOST, LOST, SURPLUS, LIQUIDATED,
   FEE_ADJUSTMENT_TRIGGERED, CANCELLED, REJECTED ...)
```

Fields chính: `trackingCode` (unique), `orderIdSan` (unique sparse), `idempotencyKey` (unique sparse), `payloadHash` (SHA-256), `status`, `sellerId` (ref User), `pickupAddress`/`deliveryAddress` {`fullName`,`phone`,`address`,`ward`,`district`,`province`,`coordinates`{`lat`,`lng`}}, `items[]` {`name`,`quantity`,`weight`}, `dimensions` {`length`,`width`,`height`}, `actualWeight`, `volumetricWeight`, `chargeableWeight`, `hubMeasuredWeight`, `weightDiscrepancyGram`, `isCod`, `codAmount`, `goodsValue`, `baseFee`, `insuranceFee`, `discountAmount`, `discountCode`, `shippingFee`, `zoneTier`, `routeType` (DIRECT | HUB_ROUTED), `routeNodes[]` (hub trung gian + sequenceIndex + status + timestamps), `routeDistanceKm`, `estimatedDeliveryDays`, `pickupHub`, `deliveryHub`, `currentHubId` (ref Hub), `sealId`, `currentTripId`, `flagFeeWarning`, `flagCodAnomaly`, `needsManualRouting`, `readyToPickAt`, `pickupShipperId`, `deliveryShipperId`, `pickupFailReason/Note`, `cancelReason/Note/By/At`, `currentDriver` {`driverId`,`name`,`phone`,`avatar`}, `deliveryFailureHistory[]` {`reasonGroup`,`failureCategory`,`proofImageUrls`,`gpsLocation`}, `deliveryFailureCount`, `podImageUrl`, `driverLastLocation` {`lat`,`lng`,`updatedAt`}, `destinationLocation`, `calculatedEta`

**Indexes**: `{ status: 1 }`, `{ sellerId: 1, createdAt: -1 }`

### User (user.model.js, 7.8KB — **17 roles**, không phải 9)

```
Nhóm Khách hàng:     BUYER, SELLER
Nhóm Vận chuyển:     SHIPPER, LOCAL_SHIPPER, DRIVER, LINE_HAUL_DRIVER
Nhóm Kho vận:        HUB_STAFF, WAREHOUSE_STAFF, HUB_COORDINATOR, WAREHOUSE_MANAGER
Nhóm Quản lý:        ORDER_MANAGER, ORDER_VENDOR_MANAGER, DRIVER_MANAGER
Nhóm Điều phối:      LAST_MILE_DISPATCHER, LINE_HAUL_DISPATCHER
Nhóm Hỗ trợ:         CS, ACCOUNTANT, ADMIN
```

Fields: `fullName`, `email` (unique), `phoneNumber` (unique), `password` (select:false, bcrypt salt=10 qua pre-save `isModified('password')` guard), `role`, `vehicleInfo` {`licensePlate`,`vehicleType`}, `isWorking`, `companyName`, `taxCode`, `avatarUrl`, `address`, `latitude`, `longitude`, `bankName/Account/AccountName`, `walletBalance`, `hubId` (ref Hub), `isActive`, `failedLoginAttempts`, `lockUntil`, `mustChangePassword`, `refreshToken` (select:false), `pickupQuota`/`deliveryQuota` {`current`,`max`}, `rejectionQuota.remainingToday` (reset 00:00), `twoFactorSecret`/`twoFactorEnabled` (speakeasy TOTP), `subAccountPermissions[]`, `parentSellerId`, `zoneChangeRequest`

`matchPassword()` method dùng `bcrypt.compare()`.

### Các model khác (22 schema còn lại — chỉ nêu mục đích, mở file thật để lấy field chính xác)

| Schema | Mục đích |
|---|---|
| product.model.js | Danh mục sản phẩm Shop (SKU, trọng lượng, kích thước) |
| ticket.model.js | Vé hỗ trợ CSKH & khiếu nại |
| trip.model.js | Chuyến xe vận chuyển đường trục |
| bag.model.js | Bao tải đóng gói (sealCode, destHubId, maxCapacity, maxWeightKg, status SEALED) |
| hub.model.js | Kho / bưu cục |
| hubCoverage.model.js | Vùng phủ hub (tỉnh/quận) |
| hubConnection.model.js | Kết nối giữa hub — weighted edge cho Dijkstra (`transitTimeHours`) |
| auditSession.model.js | Phiên kiểm kê kho |
| orderLog.model.js | Audit trail nội bộ — `orderId` (ref Order, indexed), `actionBy` (ref User), `preStatus`, `postStatus`, `actionType` (8 loại: CREATED/STATUS_CHANGED/STATUS_UPDATED/INFO_UPDATED/CANCELLED/EXCEPTION/PICKED_UP/PICKUP_FAILED), `note` |
| orderTrackingLog.model.js | Timeline public — collection `order_tracking_logs`, `eventType` (9 loại: SELLER_PREPARED→CANCELLED), index `{orderId:1,timestamp:-1}` + `{trackingCode:1,timestamp:-1}` |
| kyc.model.js / kycLog.model.js | Hồ sơ KYC Seller + log thay đổi |
| custodyTransferLog.model.js | Chain of Custody (COD, hàng hóa) |
| geozone.model.js | Vùng địa lý Shipper |
| zone.model.js | Khay kệ trong kho |
| pickupAddress.model.js | Địa chỉ lấy hàng Seller |
| pickupConfirmation.model.js | ePOH: `orderId`, `shipperId`, `signatureImageUrl` (required), `proofPhotoUrls`, `gpsLat/Lng`, `gpsMissing`, `actualWeight`, `weightDiscrepancy`, `surchargeFee`, `clientOfflineId` (unique sparse — idempotency) |
| pickupManifest.model.js | Biên bản giao nhận batch |
| notificationPreference.model.js | Cài đặt thông báo |
| authLog.model.js | Log đăng nhập/security — 8 actions (REGISTER_SUCCESS...ADMIN_STATUS_CHANGE) |
| passwordResetOtp.model.js | OTP (TTL index trên `expiresAt`), `otpHash` (select:false), `channel` (email/sms) |
| systemConfig.model.js | Cấu hình hệ thống động |

---

## 3. Quy ước Backend bắt buộc

### 3.1 camelCase phẳng, KHÔNG snake_case
Mở đúng file `.model.js` để lấy tên chính xác.

### 3.2 Chống Mass Assignment — Whitelist
KHÔNG BAO GIỜ `Model.findByIdAndUpdate(id, req.body)`. Bắt buộc sanitize:
```javascript
const sanitizedInput = { ...body };
delete sanitizedInput.shippingFee; delete sanitizedInput.baseFee;
delete sanitizedInput.insuranceFee; delete sanitizedInput.chargeableWeight;
delete sanitizedInput.volumetricWeight; delete sanitizedInput.role;
delete sanitizedInput.status; delete sanitizedInput.sellerId;
delete sanitizedInput.walletBalance;
```

### 3.3 Chống Race Condition — Atomic Conditional Update
KHÔNG check-rồi-update tách rời. Điều kiện `status: { $in: ALLOWED_STATUSES }` nằm NGAY TRONG câu update:
```javascript
const atomicFilter = {
  _id: orderId,
  ...(isAdmin ? {} : { sellerId: userId }),
  status: { $in: ALLOWED_STATUSES }
};
const updated = await Order.findOneAndUpdate(atomicFilter, { $set: payload },
  { session, returnDocument: 'after', runValidators: true });
if (!updated) {
  const reCheck = await Order.findById(orderId);
  if (!reCheck) throw makeError(404, 'Đơn hàng không tồn tại.');
  if (!isAdmin && reCheck.sellerId.toString() !== userId.toString())
    throw makeError(403, 'Bạn không có quyền thao tác trên đơn hàng này.');
  throw makeError(409, 'Đơn hàng đã được xử lý.', 'ORDER_STATUS_LOCKED');
}
```
Áp dụng đúng nguyên tắc này khi tăng quota (`$inc`) — xem BUG-04 mục 6: dispatchEngine từng quên `$inc` quota sau khi gán Shipper, dẫn tới 1 Shipper nhận vô hạn đơn.

### 3.4 Transaction + Audit Log
Model chính + `OrderLog`/`AuthLog` trong CÙNG 1 Mongoose Transaction (`session.withTransaction()` hoặc `mongoose.startSession()`). Tác vụ PHỤ (email, notification) nằm NGOÀI transaction, dùng `.catch()` không `await`.

⚠️ Hiện tại đa số thao tác (inbound scan, bagging, outbound commit) dùng `findOneAndUpdate` atomic **rời rạc, KHÔNG bọc session/transaction** — chỉ `deliveryFailure.service.js` dùng `mongoose.startSession()` (DEBT-01). Khi viết code MỚI có nhiều write liên quan, ưu tiên bọc transaction thay vì lặp lại thói quen cũ.

### 3.5 Response Format
```javascript
// Controller pattern
try {
  const result = await service.doX(...);
  return res.status(200).json({ success: true, ...result });
} catch (err) {
  if (err.statusCode) return res.status(err.statusCode).json({
    success: false, message: err.message, code: err.code || 'BAD_REQUEST'
  });
  next(err);
}
```
⚠️ Codebase hiện mix 3 kiểu throw: `throw { status, message, code }`, `throw new Error(msg)`, `throw new DeliveryFailureError(...)` (DEBT-03). Code MỚI nên dùng nhất quán `makeError(statusCode, message, code)` / một `AppError` class thống nhất nếu đã tồn tại trong codebase — kiểm tra `utils/` trước khi tự tạo class mới.

### 3.6 Idempotency & Rate Limiting
Unique Indexes + `err.code === 11000` + SHA-256 `payloadHash` (tạo đơn) hoặc `clientOfflineId` (scan offline: inbound, pickup, bagging). Mask PII cho API công khai (ẩn 6 số giữa SĐT người nhận trong tracking public).

### 3.7 Validation
Joi trong `.service.js`. Phone regex: `const VN_PHONE_REGEX = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;`

### 3.8 MongoDB Anti-N+1
CẤM `await Model.*` trong vòng lặp → dùng `bulkWrite`, `insertMany`, `find({ _id: { $in: ids } })`. Không `find()` rồi `.filter()` bằng JS. Dùng `.select()` và `.populate('ref', 'field1 field2')`.

### 3.9 Write-Behind Caching & Queue Synchronization (Redis + RabbitMQ) — MỚI

Kiến trúc bắt buộc phải hiểu trước khi sửa bất kỳ API nào ghi trạng thái đơn hàng:
```
Client request
  → Redis Hot Cache: HSET order:detail:{id} + SADD sync:pending:orders {id}   (latency < 5ms)
  → Publish event → RabbitMQ (EXCHANGES.SYNC, routing key vd. redis.write.order.status)
  → db-sync.worker.js consume → bulkWrite xuống MongoDB (permanent)
  → MongoDB Change Stream → db-watcher.service.js invalidate/refresh lại Redis
```
- **Multi-tier Failover** (`sync.service.js`): Mode 1 Redis+RabbitMQ ONLINE → full write-behind. Mode 2 chỉ Redis ONLINE → ghi Redis + fallback ghi thẳng MongoDB. Mode 3 Redis OFFLINE → ghi thẳng MongoDB (bảo toàn dữ liệu).
- **Tài chính (`walletBalance`) dùng Double-Write** (`writeWalletDoubleWrite`): ghi MongoDB TRƯỚC, sau đó mới đồng bộ lên Redis — KHÔNG áp dụng write-behind thường cho tiền.
- Muốn thêm cache tĩnh (HubCoverage, HubConnection graph) → theo pattern TTL đã định nghĩa trong `sync.service.js`, không tự chế cơ chế cache riêng (DEBT-05).
- Kiểm tra sức khỏe hệ thống: `GET /api/system/sync-status` (pendingOrdersInRedis, syncLatency).

### 3.10 Route Guard Poka-yoke (Bagging)
Khi thêm đơn vào bao (`POST /api/bags/add-item`): bắt buộc kiểm tra `destHub(đơn) === destHub(bao)` trước khi cho thêm — từ chối ngay nếu sai tuyến, không cho phép "sửa sau". Áp dụng tư duy poka-yoke tương tự (chặn lỗi tại nguồn bằng validate cứng) cho mọi thao tác ghép/gộp dữ liệu khác trong kho vận (outbound scan vào Trip, audit scan vào AuditSession).

### 3.11 Hub Routing & Pricing — công thức chuẩn
```
volumetricWeight = L × W × H / 5000 (kg)
chargeableWeight = ceil(max(actualWeight, volumetricWeight) × 2) / 2   ← round lên 0.5kg
extraWeightSteps = ceil((chargeableWeight - 1.0) / 0.5)  nếu > 1.0kg
baseFee = BASE[zoneTier] + extraWeightSteps × RATE[zoneTier]
insuranceFee = goodsValue > 1.000.000 ? goodsValue × 0.005 : 0
shippingFee = max(0, baseFee + insuranceFee - discountAmount)

distanceKm = haversineKm × 1.25   (hệ số đường bộ VN)
Dijkstra qua HubConnection (weight = transitTimeHours), fallback calculateRoutePath() hard-coded
  nếu DB HubConnection trống.

Risk Engine: flagFeeWarning nếu shippingFee > 500.000đ;
             flagCodAnomaly nếu codAmount > 10.000.000đ HOẶC codAmount > 2×goodsValue
             → status PENDING_VERIFICATION thay vì CREATED.
```
Zone tiers: `INTRA_PROVINCE` (16.500đ/+5.000đ mỗi 0.5kg), `INTRA_REGION` (22.000đ/+6.000đ), `NEAR_REGION` (28.000đ/+7.000đ), `INTER_REGION` (35.000đ/+8.500đ). Các con số này hiện đang hard-code trong `pricing.service.js` nhưng đã có `pricingConfig.controller.js` cho phép Admin chỉnh động qua `/api/admin/pricing-config` — ưu tiên đọc từ config động thay vì hard-code khi viết code mới liên quan đến cước phí.

---

## 4. Targeted Patch Mode & Git-Friendliness

- Chỉ sửa đúng dòng cần sửa, KHÔNG viết lại toàn bộ file.
- Giữ nguyên layout, line endings, import order. Minimize git diff noise.
- Tự hỏi: "Có thể đạt mục tiêu bằng ít file, ít dòng hơn không?"

---

## 5. Frontend Rules

- **TypeScript strict**: NO `any`, NO `@ts-ignore`. Explicit return types.
- **UI States**: Mọi component xử lý 4 state: Loading, Error, Empty, Success.
- **Form validation**: Dùng `react-hook-form` + `zod` (đã cài sẵn).
- **Styling & Theme**: TailwindCSS v4 + shadcn UI. Toast dùng `sonner`. Đồng bộ màu chủ đạo **Xanh dương (Primary Blue `#2563eb` / `bg-blue-600` / `text-blue-600`)** toàn hệ thống, KHÔNG phối màu ngẫu nhiên (nhiều màu xanh lá, tím, cam, vàng) trên menu navigation và không dùng gradient ngẫu nhiên trên button (`bg-gradient-to-r...`).
- **Active Navigation Poka-yoke**: Mọi menu trong Sidebar, SubNav, Navbar (cả `frontend_web` và `frontend_admin`) PHẢI kiểm tra chính xác `location.pathname` (hoặc match route). CHỈ NÚT/MENU ĐANG ACTIVE mới hiển thị hiệu ứng active (`bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25`). Các nút/menu không active PHẢI giữ màu trung tính (`text-slate-600 dark:text-slate-300 hover:bg-slate-100`). Tuyệt đối KHÔNG hardcode màu active trên nút inactive (ví dụ: nút "Tạo Đơn Vận Chuyển Mới" chỉ active khi ở đúng `/seller/orders/create`, không được duy trì tô màu xanh khi chuyển sang `/seller/orders/batch` hay trang khác).
- **Responsive Architecture (Mobile-First UI)**: TẤT CẢ các trang trong hệ thống (`frontend_web` và `frontend_admin`) PHẢI đáp ứng hoàn hảo giao diện Mobile khi bật chế độ Web Responsive:
  - Layout chính bọc trong container linh hoạt (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3` hoặc `flex-col lg:flex-row`).
  - Bảng dữ liệu (Data Tables) bắt buộc có container bọc `overflow-x-auto` để scroll ngang trên điện thoại mà không làm tràn viewport.
  - Sidebar/Menu trên điện thoại: Tự động ẩn trên màn hình nhỏ (`hidden lg:flex` / `hidden md:flex`) và cung cấp Mobile Drawer / Mobile Menu Bar (hỗ trợ toggle mở/đóng menu linh hoạt trên Mobile).
  - Touch Target & Padding: Nút bấm và input có chiều cao/padding phù hợp cảm ứng di động (`p-2.5`, `py-3`, `min-h-[44px]`).
- **State management**: `zustand` cho global state (authStore: user/tokens/login/logout/refreshAuth), `AuthContext`/`AdminAuthContext` cho auth.
- **Icons**: `lucide-react`.
- **Routing**: `react-router@7`, dùng `ProtectedRoute`/`RoleRoute`/`PublicRoute` guards đã có sẵn.
- **API calls**: Axios interceptor tự attach JWT + tự refresh khi 401 — không tự viết lại logic này.
- **Realtime**: `socket.io-client` join đúng room theo vai trò (`tracking:{code}`, `seller:{id}`, `warehouse-dashboard:{hubId}`) — không tạo kết nối socket mới nếu đã có singleton.
- ⚠️ Trước khi thêm page mới >100KB (như `CreateOrderPage.tsx` 105KB hiện tại), cân nhắc tách component/hook thay vì viết dồn vào 1 file — tránh lặp lại DEBT-06.

---

## 6. Vấn đề đã biết — TRÁNH LẶP LẠI khi viết code mới

> Trích từ `overview.md` mục 15. Nếu code mới chạm vào các file này, PHẢI cân nhắc fix song song hoặc ít nhất không làm vấn đề nặng thêm.

**Bug nghiêm trọng (🔴):**
- BUG-01: `returnProcess.service.js` chỉ là stub — đơn `DELIVERY_FAILED_PENDING_RETURN` không tự chuyển `RETURNING → RETURNED`.
- BUG-02: `notification.service.js` KHÔNG có hàm `sendNotification()` thật — mọi lời gọi bị silent-drop bởi guard `typeof === 'function'`. Nếu code mới cần gửi thông báo, kiểm tra hàm này có thật sự tồn tại trước khi gọi, đừng giả định nó hoạt động.
- BUG-03: Cộng `walletBalance` khi `confirm-delivery` KHÔNG ghi `CustodyTransferLog` — thiếu audit trail dòng tiền COD.
- BUG-04: `dispatchEngine.service.js` gán Shipper nhưng KHÔNG `$inc` quota (`pickupQuota.current`, `currentWeightKg`) → Shipper nhận vô hạn đơn.

**Bug trung bình (🟡):** telematics.service.js chưa triển khai (BUG-05) · proximity score dùng `estimatedDistanceKm = 1.5` hard-code thay vì Haversine thật (BUG-06) · tracking code sinh từ `Date.now()` + random 2 chữ số có thể trùng khi tải cao (BUG-07) · `staleRedeliveryMonitor`/`driverConfirmTimeout` job không được start trong `server.js` (BUG-08) · SMTP App Password Gmail hard-code fallback trong `notification.service.js` — KHÔNG bao giờ thêm credential hard-code, luôn bắt buộc từ `.env` (BUG-09) · `autoApproval.service.js` trả `READY_TO_PICK` thay vì `APPROVED`, bỏ qua 1 bước state machine (BUG-10).

**Technical debt (🔵):** thiếu MongoDB transaction cho hầu hết thao tác quan trọng (DEBT-01) · `order.service.js` monolith 978 dòng cần tách theo Creation/Lifecycle/Query/Tracking (DEBT-02) · lỗi chưa chuẩn hóa — 3 kiểu throw khác nhau (DEBT-03) · logging chỉ dùng `console.log/error`, chưa có Winston (DEBT-04) · Discount codes (`FREESHIP15`, `ELOG50`, `WELCOME10`, `EXPIRED2025`) hard-code trong `pricing.service.js` thay vì collection riêng (DEBT-07) · `auth.service.js` rỗng, logic auth nằm sai tầng trong controller (DEBT-08).

---

## 7. Checklist trước khi báo cáo "đã xong"

1. **Code thật** — paste file/hàm đã tạo/sửa.
2. **Log chạy thật** — nếu có race condition/transaction, chạy test script, paste log.
3. **Xác nhận:**
   - [ ] Codebase inspected, code reused (zero duplication)
   - [ ] Targeted patch mode (minimal git diff)
   - [ ] Mass Assignment sanitized
   - [ ] IDOR ownership check + `isAdmin` bypass
   - [ ] Race condition → atomic filter (kể cả `$inc` quota, không chỉ `status`)
   - [ ] Password hash guard (`isModified`)
   - [ ] Side effects (email, notification) NGOÀI transaction
   - [ ] Field names khớp `.model.js` (camelCase)
   - [ ] `order.types.ts` đồng bộ 2 app
   - [ ] TypeScript strict (no `any`)
   - [ ] MongoDB queries optimized (no N+1)
   - [ ] Nếu ghi `status` Order: đi qua `sync.service.js` (Write-Behind) đúng chuẩn, không ghi tắt MongoDB trừ khi đang ở Mode 3 fallback
   - [ ] Không thêm credential/secret hard-code (học từ BUG-09)
   - [ ] Zero lint/build/runtime errors

---

## 8. Khi không chắc — hỏi, đừng đoán

Dừng lại hỏi nếu thiếu: Field mới trong model, `ALLOWED_STATUSES` cho state transition cụ thể, phân quyền role (trong 17 role), dependency mới, hoặc hành vi thật của `package.json` khác với mục 1.2 (dependencies đổi theo thời gian — luôn verify lại file thật).
