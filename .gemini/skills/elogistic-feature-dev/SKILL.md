---
name: elogistic-feature-dev
description: "Hướng dẫn bắt buộc khi implement bất kỳ chức năng Backend hoặc Frontend nào cho dự án E-Logistics (Node.js/Express/Mongoose + React/Vite). PHẢI dùng skill này trước khi viết route, controller, service, model, hoặc page/component mới, kể cả khi người dùng chỉ mô tả ngắn gọn 'code UC-xx', 'thêm API cho...', 'tạo trang...'. Skill này định nghĩa cấu trúc thư mục bắt buộc của backend/frontend_admin/frontend_web, quy ước đặt tên field, pattern chống race condition (atomic update), pattern chống Mass Assignment/IDOR, pattern transaction cộng audit log, và checklist bắt buộc trước khi báo cáo đã xong. Dùng cả khi chỉnh sửa code cũ để tinh chỉnh theo đúng chuẩn."
---

# E-Logistics Feature Development Skill

Dự án quản lý logistics: Backend Node.js/Express/Mongoose (MongoDB), 2 Frontend Vite/React riêng (`frontend_admin`, `frontend_web`). Skill này là nguồn sự thật duy nhất về cấu trúc, quy ước code và thực thi nghiệp vụ — không tự suy diễn khác đi.

## 0. Việc đầu tiên khi nhận yêu cầu

Trước khi viết bất kỳ dòng code nào, xác định:
1. Đây là **Backend**, **frontend_admin**, hay **frontend_web**? (xem mục 1.2 để biết route/actor thuộc app nào)
2. Chức năng này có **race condition** không (bất kỳ thao tác đổi `status` của Order dựa trên điều kiện trạng thái hiện tại như `EDITABLE_STATUSES` `['CREATED', 'READY_TO_PICK', 'PENDING_VERIFICATION']` hoặc `CANCELLABLE_STATUSES` `['CREATED', 'PENDING_VERIFICATION', 'READY_TO_PICK']`) → nếu có, bắt buộc dùng Atomic Conditional Update (mục 2.3), không được tách check-rồi-update thành 2 lệnh.
3. Có field nào Client **không được phép tự set** không (`role`, `status`, `sellerId`, các field tính toán server-side như `chargeableWeight`, `baseFee`, `shippingFee`, `volumetricWeight`, `actual_fee`) → whitelist rõ ràng (mục 2.2).
4. Các số tiền (`codAmount`, `goodsValue`, `baseFee`, `shippingFee`, `walletBalance`) bắt buộc lưu ở dạng **Số nguyên Đồng (VND)** (dùng `Number.isInteger` / `Math.floor`).

Nếu thiếu thông tin để trả lời các câu trên, hỏi lại người dùng trước khi code — không tự giả định.

## 1. Cấu trúc thư mục bắt buộc

### 1.1 Backend (`backend/src/`)

```
app.js           → Mount routes chính: /api/auth, /api/orders, /api/admin
server.js        → Khởi chạy HTTP server & MongoDB connection
config/          → Kết nối DB (db.js), biến môi trường
models/          → Schema Mongoose + validator cấp DB + hook (pre-save...)
                   (Order, User, OrderLog, AuthLog, PasswordResetOtp)
                   KHÔNG chứa business logic
services/        → TOÀN BỘ business logic thật (order.service.js, pricing.service.js, notification.service.js)
                   KHÔNG biết gì về req/res — nhận tham số thuần, throw Error có statusCode
controllers/     → CHỈ nhận req/res, gọi đúng hàm service, trả response theo mục 2.5
                   (order.controller.js, admin.controller.js, auth.controller.js)
routes/          → CHỈ khai báo endpoint + gắn middleware (auth.routes.js, order.routes.js, admin.routes.js)
middleware/      → auth.middleware.js (protect, authorize), rateLimit.middleware.js, error.middleware.js
utils/           → Hàm thuần túy (idGenerator.js - mã vận đơn, generateToken.js)
websocket/       → Xử lý Socket.IO (real-time tracking, thông báo live)
```

**Quy tắc đặt file mới**: mỗi domain nghiệp vụ (order, auth, user, warehouse/hub...) có đúng 1 file `.service.js`. KHÔNG viết 2 hàm cùng chức năng ở 2 file khác nhau.

### 1.2 Frontend — CÓ 2 APP RIÊNG BIỆT, không dùng chung code tự động

| App | Actor phục vụ | Route chính | Trang hiện có (`pages/`) |
|---|---|---|---|
| `frontend_web/` | Seller (có login) + Buyer (không login, tra cứu công khai) | `/seller/*`, `/tracking/*`, `/auth/*` | `seller/` (`OrderListPage`, `CreateOrderPage`, `BatchOrderPage`, `ProfilePage`, `CodWalletPage`, `SellerDashboardPage`, `PayoutHistoryPage`, `TicketListPage`, `CreateTicketPage`), `public/` (`PublicTrackingPage`, `LandingPage`, `PricingPage`), `auth/` (`LoginPage`, `RegisterPage`, `ForgotPasswordPage`) |
| `frontend_admin/` | Admin, Kế toán, CSKH, Điều phối viên, Nhân viên Kho | `/dashboard`, `/dispatch/*`, `/orders/*`, `/reports/*`, `/security/*`, `/users/*` | `orders/` (`GlobalOrderListPage`, `RiskReviewPage`), `users/` (`UserManagementPage`), `dispatch/`, `reports/`, `security/`, `dashboard/`, `auth/` |

Cấu trúc bên trong mỗi app (dùng đúng tên):
```
src/
├── api/           → 1 file .api.ts / 1 domain (order.api.ts, auth.api.ts...), gọi qua axiosClient
├── components/
│   ├── ui/            → component nền tảng (button, modal, table...)
│   ├── shared/ (web)   → dùng chung nhiều trang
│   ├── admin/ (web)    → riêng cho khu Seller (frontend_web)
│   ├── layout/         → Header, Sidebar, Footer, LayoutWrapper
│   └── [domain]/ (admin) → component chuyên biệt theo domain (orders, dispatch...)
├── context/       → AuthContext (mỗi app có bản riêng, KHÔNG import chéo)
├── hooks/         → useAuth, useDebounce, use[Domain]
├── pages/
│   └── [domain]/      → 1 folder / 1 domain nghiệp vụ, PascalCase + hậu tố "Page"
├── routes/        → AppRoutes.tsx, ProtectedRoute.tsx (+ RoleBaseRoute.tsx ở admin)
└── types/         → TypeScript interface khớp 1:1 tên field Backend (xem mục 2.1)
```

**Đồng bộ `order.types.ts` giữa 2 app**: `frontend_web/src/types/order.types.ts` là bản gốc duy nhất. Sửa xong copy nguyên văn sang `frontend_admin/src/types/order.types.ts`. Không tự định nghĩa lại riêng ở admin.

## 2. Quy ước bắt buộc khi code Backend

### 2.1 Tên field — camelCase phẳng, KHÔNG snake_case

Schema thật dùng:
- **Order**: `trackingCode`, `orderIdSan`, `idempotencyKey`, `payloadHash`, `status`, `sellerId`, `pickupAddress` (`fullName`, `phone`, `address`, `ward`, `district`, `province`, `coordinates`), `deliveryAddress`, `items` (`name`, `quantity`, `weight`), `dimensions` (`length`, `width`, `height`), `actualWeight`, `volumetricWeight`, `chargeableWeight`, `isCod`, `codAmount`, `goodsValue`, `baseFee`, `insuranceFee`, `discountAmount`, `discountCode`, `shippingFee`, `pickupHub`, `deliveryHub`, `flagFeeWarning`, `flagCodAnomaly`, `needsManualRouting`, `cancelReason`, `cancelNote`, `cancelledBy`, `cancelledAt`, `currentDriverId`, `driver`.
- **User**: `fullName`, `email`, `phoneNumber`, `password`, `role` (`SELLER`, `BUYER`, `DRIVER`, `LINE_HAUL_DRIVER`, `HUB_STAFF`, `HUB_COORDINATOR`, `CS`, `ACCOUNTANT`, `ADMIN`), `companyName`, `taxCode`, `avatarUrl`, `address`, `bankName`, `bankAccount`, `bankAccountName`, `walletBalance`, `hubId`, `isActive`, `failedLoginAttempts`, `lockUntil`, `mustChangePassword`, `refreshToken`.
- **OrderLog**: `orderId`, `actionBy`, `preStatus`, `postStatus`, `actionType` (`CREATED`, `STATUS_CHANGED`, `INFO_UPDATED`, `CANCELLED`, `EXCEPTION`), `note`.
- **AuthLog**: `userId`, `action` (`REGISTER_SUCCESS`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_CHANGED`, `ADMIN_CREATE_USER`, `ADMIN_UPDATE_USER`, `ADMIN_STATUS_CHANGE`), `ipAddress`, `userAgent`, `note`.

Mở đúng file `.model.js` liên quan để lấy tên chính xác — không dùng snake_case cũ.

### 2.2 Chống Mass Assignment — Whitelist tường minh

KHÔNG BAO GIỜ `Model.findByIdAndUpdate(id, req.body)` hoặc `new Model(req.body)`.
Bắt buộc dùng hàm sanitize / Joi destructure các field cho phép:
```javascript
const sanitizedInput = { ...body };
delete sanitizedInput.actual_fee;
delete sanitizedInput.chargeable_weight;
delete sanitizedInput.shippingFee;
delete sanitizedInput.baseFee;
delete sanitizedInput.insuranceFee;
delete sanitizedInput.role;
delete sanitizedInput.status;
delete sanitizedInput.sellerId;
```

### 2.3 Chống Race Condition — Atomic Conditional Update (BẮT BUỘC cho thao tác đổi status)

KHÔNG check-rồi-update tách rời. Điều kiện trạng thái (`status: { $in: ALLOWED_STATUSES }`) nằm NGAY TRONG câu lệnh update.
Lưu ý rẽ nhánh `isAdmin` để Admin không bị từ chối bởi ownership filter:
```javascript
const atomicQueryFilter = {
  _id: orderId,
  ...(isAdmin ? {} : { sellerId: userId }), // Admin bypass ownership check!
  status: { $in: ALLOWED_STATUSES }
};

const updatedOrder = await Order.findOneAndUpdate(
  atomicQueryFilter,
  { $set: payload },
  { session, returnDocument: 'after', runValidators: true }
);

if (!updatedOrder) {
  const reCheck = await Order.findById(orderId);
  if (!reCheck) throw makeError(404, 'Đơn hàng không tồn tại.');
  if (!isAdmin && reCheck.sellerId.toString() !== userId.toString()) {
    throw makeError(403, 'Bạn không có quyền thao tác trên đơn hàng này.');
  }
  throw makeError(409, 'Đơn hàng đã được xử lý, không thể thao tác.', 'ORDER_STATUS_LOCKED');
}
```

### 2.4 Transaction + Audit Log & Tác vụ phụ

- Ghi Model chính + `OrderLog` / `AuthLog` trong CÙNG 1 Mongoose Transaction Session (`startTransaction()` → `commitTransaction()` / `abortTransaction()`).
- Tác vụ PHỤ (gửi email, thông báo real-time cho Điều phối viên via Socket/Notification Service) PHẢI nằm NGOÀI transaction, gọi SAU KHI transaction đã commit, dùng `.catch()` không `await` để tránh rollback nghiệp vụ chính:
```javascript
if (result.wasRouted) {
  notifyDispatcherOrderRemoved(result.cancelledOrder).catch(err => {
    console.error('⚠️ Lỗi gửi thông báo gỡ đơn cho Điều phối viên:', err.message);
  });
}
```

### 2.5 Format response & lỗi

```javascript
// Thành công
res.status(200).json({ success: true, message: '...', data: result });

// Lỗi nghiệp vụ có statusCode trong Service
const err = new Error('Message tiếng Việt rõ ràng cho người dùng');
err.statusCode = 400 | 403 | 404 | 409 | 422 | 429;
err.code = 'SNAKE_CASE_ERROR_CODE';
throw err;
```

Trong Controller:
```javascript
try {
  const result = await xxxService.doX(...);
  return res.status(200).json({ success: true, ...result });
} catch (err) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message, code: err.code || 'BAD_REQUEST' });
  }
  next(err); // Lỗi không lường trước → error.middleware.js (500)
}
```

### 2.6 Idempotency & Rate Limiting

- Dùng Unique Indexes trên MongoDB (`trackingCode`, `orderIdSan`, `idempotencyKey`) + catch `err.code === 11000` + đối soát SHA-256 `payloadHash`. KHÔNG dùng Redis.
- Áp dụng Middleware Rate Limiting phù hợp (`createOrderRateLimiter`, `trackingRateLimiter`, `loginLimiter`, `registerLimiter`, `otpLimiter`, `adminLimiter`).
- Đối với API tra cứu công khai (`/api/orders/track/:trackingCode`), bắt buộc **Mask dữ liệu PII** (`maskName`, `maskPhone`, `maskAddress`).

### 2.7 Validation & Phone Regex

- Validate Joi trong `.service.js` (hoặc `.controller.js` nếu đơn giản).
- Số điện thoại Việt Nam dùng regex standard: `const VN_PHONE_REGEX = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;`

## 3. Trước khi báo cáo "đã xong" — checklist bắt buộc

KHÔNG xác nhận hoàn thành chỉ bằng câu chữ chung chung. Phải cung cấp:

1. **Code thật** — paste nguyên văn file/hàm đã tạo/sửa.
2. **Log chạy thật** — nếu có race condition hoặc transaction, bắt buộc chạy test script (hoặc `Promise.all`), paste log terminal gốc có status code và response body.
3. **Xác nhận không dính lỗi**:
   - Mass Assignment (đã sanitize/whitelist)
   - IDOR (đã check ownership, có nhánh `isAdmin` bypass)
   - Race condition (dùng atomic filter trong `findOneAndUpdate`)
   - Hash password lặp (dùng `if (!this.isModified('password')) return;` trong `user.model.js`)
   - Tác vụ phụ làm rollback transaction chính
   - Tên field sai khác `.model.js` (dùng snake_case thay vì camelCase)
   - Thiếu đồng bộ `order.types.ts` giữa `frontend_web` và `frontend_admin`

## 4. Khi không chắc — hỏi, đừng đoán

Dừng lại hỏi người dùng nếu thiếu:
- Field mới cần thêm vào `.model.js`
- Trạng thái Order cho phép thao tác (`ALLOWED_STATUSES`)
- Phân quyền (Seller, Admin, CS, Dispatcher, Driver...)
