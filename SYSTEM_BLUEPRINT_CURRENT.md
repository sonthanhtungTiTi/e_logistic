# SYSTEM_BLUEPRINT_CURRENT.md

## 1. TỔNG QUAN HIỆN TRẠNG (CURRENT STATE & CAPABILITIES)

### Hệ thống đã làm được gì:
*   **Authentication & Authorization:** Hoàn thiện luồng Đăng ký, Đăng nhập, Quên mật khẩu. Đã áp dụng phân quyền (RBAC) với JWT cho nhiều vai trò (Admin, Seller, Hub Staff, Driver, etc.).
*   **Order Management (Quản lý Đơn hàng):** Đã hoàn thiện luồng nghiệp vụ tạo đơn hàng (Create), Tra cứu (Search), Cập nhật (Update), Hủy đơn (Cancel/Bulk Cancel), Lấy báo giá (Quote), In nhãn vận đơn (Print Label).
*   **Public Tracking:** Cho phép tra cứu công khai hành trình vận đơn dựa trên mã đơn hàng (Tracking Code) và bảo mật thông tin PII bằng 4 số cuối điện thoại.
*   **Warehouse Inbound (UC-16):** Giao diện quét mã vạch nhập kho dành cho Nhân viên kho với thiết kế tích hợp Súng quét mã vạch USB (tự động focus, nhận phím Enter), bắt ngoại lệ tình trạng bưu kiện (Nguyên vẹn, Móp méo, Rách niêm phong).

### Hệ thống đang có gì (Work in Progress / Mocked):
*   **Shipper Pickup Handlers (UC-12):** Các API lấy hàng của Tài xế (như `processItemScanHandler`, `completePickupManifestHandler`, `confirmPickupHandler`, `pickupFailedHandler`) hiện tại đang bị **Mock (Stubbed)** trong `order.controller.js`. Chúng chỉ trả về kết quả JSON cứng `{ success: true, message: "..." }` mà chưa có logic lưu DB.
*   **Live Tracking & Telematics:** API `updateDriverLocation` hiện tại đang fallback về tài xế tĩnh (`drv_123`) nếu không có `req.user`. Hệ thống thông báo Dispatcher bị giả lập qua biến môi trường `SIMULATE_DISPATCHER_FAIL`.
*   **Pickup Manifest:** Model `pickupManifest.model.js` hiện là một file trống 100%.

### Tech Stack thực tế:
*   **Frontend (Web & Admin):**
    *   **Core:** React 19, Vite, TypeScript.
    *   **Styling:** TailwindCSS 4, thư viện UI Shadcn, Base UI.
    *   **Routing & State:** React Router 7, Zustand.
    *   **Forms & Validation:** React Hook Form, Zod.
    *   **Bổ trợ:** Leaflet (Map trên Web), html5-qrcode (cho Frontend Admin).
*   **Backend:**
    *   **Core:** Node.js, Express 5.2.1.
    *   **Database:** MongoDB thông qua Mongoose 9.9.1.
    *   **Bảo mật:** bcryptjs, jsonwebtoken, cors, express-rate-limit.
    *   **Realtime:** Socket.io (WebSocket) cho Live Tracking.
    *   **Khác:** Joi (Validation), Nodemailer.

---

## 2. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

*   **Mô hình luồng dữ liệu:**
    *   Các Frontend (Web và Admin) giao tiếp với Backend thông qua các module HTTP Client (Axios) được bọc sẵn (AxiosClient) kèm tự động gắn JWT Token.
    *   Logic Backend được xử lý qua 3 lớp: `Routes` -> `Controllers` -> `Services`. Các thao tác tương tác Database được đặt tại `Services`.
*   **Cấu trúc triển khai (Deployment/Containerization):**
    *   Hiện tại hệ thống đang được chạy dưới dạng native Node scripts (`npm run dev`). Không tìm thấy bất kỳ file `Dockerfile` hay `docker-compose.yml` nào trong thư mục lõi, cho thấy hệ thống chưa được Container hóa.
*   **Bảo mật & Middleware:**
    *   **Authentication:** Sử dụng JWT Token. Mật khẩu được mã hóa bởi `bcryptjs` qua `pre-save hook` trong Mongoose.
    *   **Authorization (RBAC):** Frontend có `RoleBaseRoute` để chặn view dựa trên `UserRole`. Backend có các Role Enum kiểm soát quyền truy cập API.
    *   **IDOR Guard:** Các controller như `getOrderById` kiểm tra tính sở hữu (`order.sellerId === userId`) trừ khi người dùng là Admin.
    *   **Global Error Handling:** Mọi lỗi được gom về Middleware `error.middleware.js` ở tầng cuối của Express.

---

## 3. CẤU TRÚC DATABASE (DATABASE SCHEMA & RELATIONS)

Sử dụng cơ sở dữ liệu **MongoDB (NoSQL)**.

*   **User:**
    *   *Fields:* fullName, email, phoneNumber, password (hash, select: false), role, vehicleInfo (licensePlate, vehicleType), isWorking, companyName, walletBalance, hubId, isActive.
    *   *Enum (Role):* SELLER, BUYER, DRIVER, LINE_HAUL_DRIVER, HUB_STAFF, HUB_COORDINATOR, CS, ACCOUNTANT, ADMIN.
    *   *Relations:* `hubId` (ref: Hub).
*   **Order:**
    *   *Fields:* trackingCode, status, originHubId, destinationHubId, sellerId, pickupAddress, deliveryAddress, items, dimensions, actualWeight, chargeableWeight, codAmount, shippingFee, currentHubId, currentDriver, podImageUrl.
    *   *Enum (Status):* DRAFT, CREATED, READY_TO_PICK, IN_TRANSIT, DELIVERED, CANCELLED, etc. (tổng cộng 26 trạng thái).
    *   *Relations:* `sellerId` (ref: User), `originHubId`, `destinationHubId`, `currentHubId` (ref: Hub).
    *   *Indexes:* `{ status: 1 }`, `{ sellerId: 1, createdAt: -1 }`.
*   **OrderTrackingLog:**
    *   *Fields:* orderId, trackingCode, eventType, title, description, locationName, hubId, driverInfo, timestamp.
    *   *Indexes:* `{ orderId: 1, timestamp: -1 }`, `{ trackingCode: 1, timestamp: -1 }`.
*   **OrderLog:**
    *   Lưu vết thay đổi trạng thái, có trường *action* (Enum: STATUS_CHANGED, CREATED, INFO_UPDATED, etc.).
*   **AuthLog:**
    *   Lưu lịch sử đăng nhập/đăng ký. *Fields:* userId, action, ipAddress, userAgent.
*   **PasswordResetOtp:**
    *   Lưu OTP reset mật khẩu (hashed OTP). Sử dụng **TTL index** (`expireAfterSeconds: 0`) trên cột `expiresAt` để tự động xóa sau khi hết hạn.
*   **PickupConfirmation:**
    *   *Fields:* orderId, shipperId, signatureImageUrl, proofPhotoUrls, gpsLat, gpsLng.
    *   *Unique Sparse Index:* `clientOfflineId` để chống trùng lặp khi app bị mất mạng.

---

## 4. CẤU TRÚC THƯ MỤC & PHÂN BỔ (DIRECTORY STRUCTURE)

```
E_LOGISTIC/
├── backend/
│   ├── prisma/             # (Chứa schema.prisma nhưng không được sử dụng ở runtime)
│   ├── src/
│   │   ├── config/         # Cấu hình Database kết nối MongoDB
│   │   ├── controllers/    # Tiếp nhận Request, trả về JSON Payload
│   │   ├── middleware/     # Auth checks, Global Error Handler
│   │   ├── models/         # Mongoose Schemas định nghĩa cấu trúc dữ liệu
│   │   ├── routes/         # Khai báo Express API endpoints
│   │   ├── services/       # Nơi chứa Logic nghiệp vụ và giao tiếp Database
│   │   ├── utils/          # Các hàm hỗ trợ tiện ích
│   │   ├── validations/    # Payload Validators
│   │   └── websocket/      # Xử lý Socket.io (VD: tracking.gateway)
├── frontend_admin/         # React SPA cho Admin, Warehouse Staff và Tài xế (PWA)
│   ├── src/
│   │   ├── api/            # API client calls (Axios wrappers)
│   │   ├── components/     # UI Components dùng chung và theo Features
│   │   ├── hooks/          # Custom React Hooks
│   │   ├── layouts/        # Layout tổng thể (AdminLayout, DriverLayout)
│   │   ├── pages/          # Các trang (WarehouseInbound, Orders Dashboard, Dispatch...)
│   │   ├── routes/         # Routing logic và RoleBaseRoute guard
│   │   └── types/          # TypeScript definitions
├── frontend_web/           # React SPA cho Người dùng cuối, Khách hàng, Seller
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/        # React Context (Auth State...)
│   │   ├── hooks/
│   │   ├── pages/          # Public (Landing), Auth (Login), Seller Dashboard...
│   │   ├── routes/
│   │   └── types/
└── docs/                   # Tài liệu thiết kế hệ thống
```

---

## 5. QUY CHUẨN ĐẶT TÊN & CODING CONVENTIONS

*   **Naming Conventions:**
    *   **File Name:** Tên file backend sử dụng định dạng hậu tố chức năng: `[name].model.js`, `[name].controller.js`. Tên file frontend React Component dùng chuẩn **PascalCase**: `OrderListPage.tsx`.
    *   **Biến & Hàm:** Sử dụng chuẩn **camelCase** xuyên suốt cho JavaScript/TypeScript.
    *   **API Endpoints:** RESTful chuẩn mực (`/api/orders`, `/api/orders/:id`, `/api/orders/:id/status`).
*   **Coding Standards:**
    *   **Payload Response:** Độ đồng nhất cực cao (100%). Mọi Endpoint trả về cùng một cấu trúc chuẩn:
        ```json
        {
          "success": true/false,
          "message": "String",
          "data": { ... },
          "pagination": { ... } // Nếu là list
        }
        ```
    *   **Xử lý Lỗi (Error Handling):** Chuẩn mực. Các hàm controller đều được wrap trong block `try/catch` và ném ngoại lệ xuống `next(err)` để Global Error Middleware xử lý đồng nhất (HTTP Status Codes chính xác).

---

## ⚠️ Technical Debt & Khuyến nghị

1.  **Xung đột ORM/ODM (Prisma vs Mongoose):** Dự án có tồn tại thư mục `backend/prisma/schema.prisma` khai báo DB Postgres. Tuy nhiên, mã nguồn server (`server.js`, `db.js`) hoàn toàn trỏ vào kết nối MongoDB và dùng Mongoose Schemas. *Khuyến nghị:* Xóa bỏ thư mục `prisma` nếu không còn sử dụng để tránh gây hiểu nhầm kiến trúc.
2.  **Thiếu Model Hệ thống (Missing Schema "Hub"):** Rất nhiều Mongoose models như `User` hay `Order` đang tham chiếu khóa ngoại tới model `Hub` (`ref: 'Hub'`). Tuy nhiên, không có bất kỳ file `hub.model.js` nào nằm trong thư mục `backend/src/models`. Điều này sẽ gây ra lỗi crash `Schema hasn't been registered for model "Hub"` khi Mongoose gọi hàm `.populate('hubId')`.
3.  **File Rác / Lỗi Cấu trúc:** File `backend/src/models/pickupManifest.model.js` đang trống 100% (0 bytes). Cần khởi tạo cấu trúc dữ liệu hoặc xóa file.
4.  **Mock API (Dead ends):** Ở cuối file `order.controller.js` có khoảng 6 handlers liên quan đến UC-12 Shipper Pickup (Ví dụ: `processItemScanHandler`, `confirmPickupHandler`) hoàn toàn chưa có logic nghiệp vụ (chỉ `return { success: true }`). Cần lập kế hoạch phát triển các API này.
5.  **Thiếu Containerization:** Chưa có bất kỳ config Docker nào (Dockerfile / docker-compose). Cần bổ sung để chuẩn hóa môi trường Dev/Prod.
