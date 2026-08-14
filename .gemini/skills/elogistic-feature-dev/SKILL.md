---
name: elogistic-feature-dev
description: "Hướng dẫn bắt buộc khi implement bất kỳ chức năng Backend hoặc Frontend nào cho dự án E-Logistics (Node.js/Express/Mongoose + React/Vite). PHẢI dùng skill này trước khi viết route, controller, service, model, hoặc page/component mới, kể cả khi người dùng chỉ mô tả ngắn gọn 'code UC-xx', 'thêm API cho...', 'tạo trang...'. Skill này định nghĩa cấu trúc thư mục bắt buộc của backend/frontend_admin/frontend_web, quy ước đặt tên field, pattern chống race condition (atomic update), pattern chống Mass Assignment/IDOR, pattern transaction cộng audit log, và checklist bắt buộc trước khi báo cáo đã xong. Dùng cả khi chỉnh sửa code cũ để tinh chỉnh theo đúng chuẩn."
---

# E-Logistics Senior Fullstack Engineering & Code Quality Standards

Backend Node.js/Express/Mongoose (MongoDB), 2 Frontend Vite/React riêng (`frontend_admin`, `frontend_web`). Skill này là nguồn sự thật duy nhất — không tự suy diễn khác đi.

## 0. Vai trò & Triết lý

Tư duy **Senior Full Stack Engineer**: Suy nghĩ trước, đọc code sâu, code sau. Chất lượng > tốc độ. Zero technical debt.

**Trước khi code bất kỳ dòng nào:**
1. Đọc cấu trúc thư mục, model, service, component **đã tồn tại**.
2. **Audit `package.json`** của `backend/`, `frontend_web/`, `frontend_admin/` trước khi thêm dependency.
3. **KHÔNG tạo duplicate** functions, services, components, hooks, types, constants.
4. Nếu logic tương tự đã tồn tại: **Tái sử dụng, mở rộng, hoặc refactor**.

**Bốn câu hỏi bắt buộc:**
1. Đây là **Backend**, **frontend_admin**, hay **frontend_web**?
2. Có **race condition** (thao tác đổi `status` dựa trên `EDITABLE_STATUSES` / `CANCELLABLE_STATUSES`) → bắt buộc Atomic Conditional Update (mục 3.3).
3. Có field Client **không được phép tự set** (`role`, `status`, `sellerId`, `chargeableWeight`, `baseFee`, `shippingFee`, `volumetricWeight`) → whitelist (mục 3.2).
4. Số tiền (`codAmount`, `goodsValue`, `baseFee`, `shippingFee`, `walletBalance`) → **Số nguyên Đồng VND** (`Number.isInteger`).

Nếu thiếu thông tin → hỏi lại, không tự giả định.

---

## 1. Cấu trúc thư mục — VERIFIED từ codebase thật

### 1.1 Backend (`backend/src/`)

```
app.js              → Mount routes: /api/auth, /api/orders, /api/admin + errorMiddleware
server.js           → Khởi chạy HTTP server & MongoDB connection

config/
  db.js             → Kết nối MongoDB

models/
  order.model.js           → Order schema (State Machine 19 trạng thái)
  user.model.js            → User schema (9 roles) + bcrypt pre-save hook
  orderLog.model.js        → Audit log đơn hàng (8 actionTypes)
  orderTrackingLog.model.js → Timeline tracking công khai (9 eventTypes)
  authLog.model.js         → Audit log xác thực (8 actions)
  passwordResetOtp.model.js → OTP quên mật khẩu (TTL index)
  pickupConfirmation.model.js → Bằng chứng lấy hàng (chữ ký, GPS, ảnh)
  pickupManifest.model.js    → Biên bản bàn giao ePOH (đang triển khai)

services/
  order.service.js        → Business logic đơn hàng (CRUD, cancel, search, tracking)
  pricing.service.js      → Tính cước, volumetric weight, phí bảo hiểm
  auth.service.js         → Xác thực, JWT, refresh token
  notification.service.js → Gửi email (nodemailer), thông báo
  telematics.service.js   → GPS driver location ingestion

controllers/
  order.controller.js → CHỈ req/res orchestration, gọi service, trả response
  admin.controller.js → CRUD user, khóa/mở khóa/vô hiệu hóa tài khoản
  auth.controller.js  → Login, register, OTP, refresh, profile

routes/
  order.routes.js → Order API + UC-12 shipper pickup endpoints
  auth.routes.js  → Auth API (login/register/otp/profile) + inline loginLimiter, registerLimiter, otpLimiter
  admin.routes.js → Admin API (protect + authorize('ADMIN')) + inline adminLimiter
  index.js        → (empty - unused)

middleware/
  auth.middleware.js      → protect (JWT verify), authorize (role check)
  rateLimit.middleware.js  → createOrderRateLimiter (30/min), trackingRateLimiter (10/min)
  error.middleware.js      → Global error handler (500)

utils/
  idGenerator.js        → Sinh mã vận đơn trackingCode
  generateToken.js      → JWT access + refresh token
  geo.util.js           → GPS geofencing utilities
  signatureValidator.js → Xác thực chữ ký canvas

websocket/
  tracking.gateway.js → Socket.IO real-time GPS tracking
```

**Quy tắc**: mỗi domain nghiệp vụ có đúng 1 file `.service.js`. KHÔNG viết 2 hàm cùng chức năng ở 2 file.

**Lưu ý Rate Limiters**: `loginLimiter`, `registerLimiter`, `otpLimiter` định nghĩa inline trong `auth.routes.js`. `adminLimiter` inline trong `admin.routes.js`. Chỉ `createOrderRateLimiter` và `trackingRateLimiter` nằm trong `rateLimit.middleware.js`.

### 1.2 Installed Dependencies (Verified)

**Backend** (`backend/package.json`):
`express@5`, `mongoose@9`, `bcryptjs`, `jsonwebtoken`, `joi`, `cors`, `dotenv`, `express-rate-limit`, `axios`, `nodemailer`, `socket.io`, `socket.io-client`, `nodemon` (dev)

**Frontend Web** (`frontend_web/package.json`):
`react@19`, `react-dom@19`, `react-router@7`, `axios`, `tailwindcss@4`, `@tailwindcss/vite`, `shadcn`, `lucide-react`, `react-hook-form`, `@hookform/resolvers`, `zod@4`, `zustand`, `sonner`, `socket.io-client`, `leaflet`, `@types/leaflet`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `@fontsource-variable/geist`, `@base-ui/react`, `vite@8`, `typescript@6`, `oxlint` (dev)

**Frontend Admin** (`frontend_admin/package.json`):
Giống frontend_web nhưng **KHÔNG CÓ** `leaflet`, `@types/leaflet`, `socket.io-client`.

### 1.3 Frontend — 2 APP RIÊNG BIỆT

| App | Actor | Route chính |
|---|---|---|
| `frontend_web/` | Seller (login) + Buyer (public) | `/seller/*`, `/tracking/*`, `/auth/*` |
| `frontend_admin/` | Admin, Kế toán, CSKH, Điều phối, Kho | `/dashboard`, `/dispatch/*`, `/orders/*`, `/reports/*`, `/security/*`, `/users/*` |

**frontend_web/src/ (VERIFIED):**
```
api/         → auth.api.ts, axiosClient.ts, finance.api.ts, location.api.ts, order.api.ts, ticket.api.ts
components/
  (root)     → AuthModal.tsx, DriverDashboard.tsx, Footer.tsx, HeroTracking.tsx,
               Navbar.tsx, SellerDashboard.tsx
  layout/    → Footer.tsx, Navbar.tsx
  orders/    → CancelOrderModal, CompleteShopInfoModal, EditOrderModal,
               OrderDetailModal, OrderSubNav, OrderSuccessModal, PrintWaybillModal
  shared/    → Barcode128, Calculator, QRCodeSVG, TrackingModal,
               VietnamAddressSelector, WarehouseMapPicker
  ui/        → button.tsx
context/     → AuthContext.tsx
hooks/       → useAuth.ts, useDebounce.ts
lib/         → formatters.ts, utils.ts
pages/
  auth/      → LoginPage, RegisterPage, ForgotPasswordPage
  public/    → LandingPage, PricingPage, PublicTrackingPage
  seller/    → OrderListPage, CreateOrderPage, BatchOrderPage, ProfilePage,
               CodWalletPage, SellerDashboardPage, PayoutHistoryPage,
               TicketListPage, CreateTicketPage
routes/      → AppRoutes.tsx, ProtectedRoute.tsx
types/       → index.ts, auth.types.ts, order.types.ts, finance.types.ts, user.types.ts
```

**frontend_admin/src/ (VERIFIED):**
```
api/         → audit.api.ts, auth.api.ts, axiosClient.ts, dispatch.api.ts,
               location.api.ts, order.api.ts, report.api.ts, user.api.ts
components/
  (root)     → AdminAuthModal.tsx
  admin/     → AuditStreamViewer, MasterOrderManager, OperationsOverview, UserSecurityControl
  layout/    → AdminNavbar.tsx, AdminSidebar.tsx
  shared/    → AuditFilterBar, SecurityStatusBadge, VietnamAddressSelector
  ui/        → button.tsx
context/     → AdminAuthContext.tsx
hooks/       → useAdminAuth.ts, useDebounce.ts
lib/         → formatters.ts, utils.ts
pages/
  auth/      → AdminLoginPage, UnauthorizedPage
  dashboard/ → OperationsDashboardPage
  dispatch/  → DispatchControlPage
  orders/    → GlobalOrderListPage, RiskReviewPage
  reports/   → SlaReportPage
  security/  → SecurityAuditPage
  users/     → UserManagementPage
routes/      → AdminRoutes.tsx, ProtectedAdminRoute.tsx, RoleBaseRoute.tsx
types/       → index.ts, auth.types.ts, order.types.ts, audit.types.ts,
               dispatch.types.ts, user.types.ts
```

**Đồng bộ `order.types.ts`**: `frontend_web` là bản gốc (185 dòng, có backward-compat aliases + payload types). `frontend_admin` chỉ có core types (93 dòng). Khi sửa Order interface → phải cập nhật cả 2.

---

## 2. Schema Fields — VERIFIED từ `.model.js`

### Order (19 statuses)
`DRAFT`, `CREATED`, `PENDING_VERIFICATION`, `READY_TO_PICK`, `PICKING`, `PICKED`, `INBOUND_HUB`, `SORTING`, `BAGGED_SEALED`, `IN_TRANSIT`, `INBOUND_HUB_DEST`, `OUT_FOR_DELIVERY`, `DELIVERING`, `DELIVERED`, `FAILED`, `PICKUP_FAILED`, `RETURNING`, `RETURNED`, `CANCELLED`

Fields: `trackingCode` (unique), `orderIdSan` (unique sparse), `idempotencyKey` (unique sparse), `payloadHash`, `status`, `sellerId` (ref User), `pickupAddress` {`fullName`, `phone`, `address`, `ward`, `district`, `province`, `coordinates` {`lat`, `lng`}}, `deliveryAddress` (same shape), `items` [{`name`, `quantity`, `weight`}], `dimensions` {`length`, `width`, `height`}, `actualWeight`, `volumetricWeight`, `chargeableWeight`, `isCod`, `codAmount`, `goodsValue`, `baseFee`, `insuranceFee`, `discountAmount`, `discountCode`, `shippingFee`, `pickupHub`, `deliveryHub`, `flagFeeWarning`, `flagCodAnomaly`, `needsManualRouting`, `readyToPickAt`, `pickupFailReason`, `pickupFailNote`, `cancelReason`, `cancelNote`, `cancelledBy` (ref User), `cancelledAt`, `currentHubId` (ref Hub), `currentDriver` {`driverId` (ref User), `name`, `phone`, `avatar`}, `podImageUrl`, `failedAttempts`, `currentDriverId` (ref User - legacy), `driver` {`fullName`, `phone` - legacy}, `driverLastLocation` {`lat`, `lng`, `updatedAt`}, `destinationLocation` {`lat`, `lng`}, `calculatedEta`

**Indexes**: `{ status: 1 }`, `{ sellerId: 1, createdAt: -1 }`

### User (9 roles)
`SELLER`, `BUYER`, `DRIVER`, `LINE_HAUL_DRIVER`, `HUB_STAFF`, `HUB_COORDINATOR`, `CS`, `ACCOUNTANT`, `ADMIN`

Fields: `fullName`, `email` (unique), `phoneNumber` (unique), `password` (select:false), `role`, `vehicleInfo` {`licensePlate`, `vehicleType`}, `isWorking`, `companyName`, `taxCode`, `avatarUrl`, `address`, `latitude`, `longitude`, `bankName`, `bankAccount`, `bankAccountName`, `walletBalance`, `hubId` (ref Hub), `isActive`, `failedLoginAttempts`, `lockUntil`, `mustChangePassword`, `refreshToken` (select:false)

**Pre-save hook**: `if (!this.isModified('password')) return;` → bcrypt hash

### OrderLog (8 actionTypes)
`CREATED`, `STATUS_CHANGED`, `STATUS_UPDATED`, `INFO_UPDATED`, `CANCELLED`, `EXCEPTION`, `PICKED_UP`, `PICKUP_FAILED`

Fields: `orderId` (ref Order, indexed), `actionBy` (ref User), `preStatus`, `postStatus`, `actionType`, `note`

### OrderTrackingLog (9 eventTypes)
`SELLER_PREPARED`, `READY_TO_PICK`, `PICKED_UP`, `HUB_ARRIVED`, `HUB_DEPARTED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED`, `CANCELLED`

Fields: `orderId` (ref Order), `trackingCode`, `eventType`, `title`, `description`, `locationName`, `hubId` (ref Hub), `driverInfo` {`name`, `phone`, `hotline`, `avatar`}, `podImageUrl`, `timestamp`
Collection: `order_tracking_logs`. Indexes: `{ orderId: 1, timestamp: -1 }`, `{ trackingCode: 1, timestamp: -1 }`

### AuthLog (8 actions)
`REGISTER_SUCCESS`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_CHANGED`, `ADMIN_CREATE_USER`, `ADMIN_UPDATE_USER`, `ADMIN_STATUS_CHANGE`

Fields: `userId` (ref User, indexed), `action`, `ipAddress`, `userAgent`, `note`

### PasswordResetOtp
Fields: `userId` (ref User), `otpHash` (select:false), `expiresAt`, `failedAttempts`, `isUsed`, `channel` (email/sms), `sentTo`. TTL index on `expiresAt`.

### PickupConfirmation
Fields: `orderId` (ref Order), `shipperId` (ref User), `signatureImageUrl` (required), `proofPhotoUrls`, `gpsLat`, `gpsLng`, `gpsMissing`, `actualWeight`, `weightDiscrepancy`, `surchargeFee`, `confirmedAt`, `clientOfflineId` (unique sparse — idempotency)

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

### 3.4 Transaction + Audit Log
Model chính + `OrderLog`/`AuthLog` trong CÙNG 1 Mongoose Transaction. Tác vụ PHỤ (email, notification) nằm NGOÀI transaction, dùng `.catch()` không `await`.

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

### 3.6 Idempotency & Rate Limiting
Unique Indexes + `err.code === 11000` + SHA-256 `payloadHash`. KHÔNG dùng Redis. Mask PII cho API công khai.

### 3.7 Validation
Joi trong `.service.js`. Phone regex: `const VN_PHONE_REGEX = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;`

### 3.8 MongoDB Anti-N+1
CẤM `await Model.*` trong vòng lặp → dùng `bulkWrite`, `insertMany`, `find({ _id: { $in: ids } })`. Không `find()` rồi `.filter()` bằng JS. Dùng `.select()` và `.populate('ref', 'field1 field2')`.

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
- **Styling**: TailwindCSS v4 + shadcn UI. Toast dùng `sonner`.
- **State management**: `zustand` cho global state, `AuthContext` cho auth.
- **Icons**: `lucide-react`.
- **Routing**: `react-router@7`.

---

## 6. Checklist trước khi báo cáo "đã xong"

1. **Code thật** — paste file/hàm đã tạo/sửa.
2. **Log chạy thật** — nếu có race condition/transaction, chạy test script, paste log.
3. **Xác nhận:**
   - [ ] Codebase inspected, code reused (zero duplication)
   - [ ] Targeted patch mode (minimal git diff)
   - [ ] Mass Assignment sanitized
   - [ ] IDOR ownership check + `isAdmin` bypass
   - [ ] Race condition → atomic filter
   - [ ] Password hash guard (`isModified`)
   - [ ] Side effects NGOÀI transaction
   - [ ] Field names khớp `.model.js` (camelCase)
   - [ ] `order.types.ts` đồng bộ 2 app
   - [ ] TypeScript strict (no `any`)
   - [ ] MongoDB queries optimized (no N+1)
   - [ ] Zero lint/build/runtime errors

---

## 7. Khi không chắc — hỏi, đừng đoán

Dừng lại hỏi nếu thiếu: Field mới trong model, `ALLOWED_STATUSES`, phân quyền role, dependency mới.
