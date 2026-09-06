  # E-LOGISTIC — TỔNG QUAN HỆ THỐNG (System Overview for AI Context)

  > **Dự án:** Khóa luận tốt nghiệp K18 — Hệ thống Quản lý Vận chuyển Thương mại Điện tử  
  > **Stack:** Node.js/Express + MongoDB (Mongoose) | React/TypeScript + Vite + TailwindCSS  
  > **Kiến trúc:** Monorepo 3 thư mục: `backend/`, `frontend_web/`, `frontend_admin/`

  ---

  ## 1. KIẾN TRÚC TỔNG THỂ

  ```
  e_logistic/
  ├── backend/src/           # REST API + WebSocket (Port 5000)
  │   ├── models/            # 19 Mongoose Schema
  │   ├── controllers/       # 21 Controller
  │   ├── services/          # 13 Business Logic Service
  │   ├── routes/            # 17 Route files
  │   ├── middleware/         # Auth, RateLimit, HubScope, KYC, Error
  │   ├── jobs/              # 4 Cron Jobs (audit, driver quota reset...)
  │   ├── validations/       # Joi schemas (inbound, outbound, audit, bag, inventory)
  │   ├── websocket/         # Socket.io Gateway (Live GPS Tracking)
  │   ├── lib/               # ioSingleton (Socket.io shared instance)
  │   ├── config/            # db.js (MongoDB connection)
  │   └── migrations/        # Data migration scripts
  ├── frontend_web/src/      # Seller & Public Portal (Port 5173)
  │   ├── pages/seller/      # 9 trang: Dashboard, CreateOrder, BatchOrder, OrderList, Profile...
  │   ├── pages/auth/        # Login/Register
  │   ├── pages/public/      # Tracking công khai
  │   ├── components/        # Navbar, Sidebar, HeroTracking, AuthModal, SellerDashboard...
  │   ├── api/               # 8 API modules (auth, order, seller, location, finance, socket...)
  │   └── context/           # AuthContext, ThemeContext
  ├── frontend_admin/src/    # Operations & Admin Portal (Port 5174)
  │   ├── pages/warehouse/   # Inbound, Outbound, Bagging, Audit, Inventory Dashboard
  │   ├── pages/driver/      # DriverPickup, DriverHandoff
  │   ├── pages/orders/      # GlobalOrderList, RiskReview
  │   ├── pages/dispatch/    # DispatchControl
  │   ├── components/        # AdminSidebar, AdminNavbar, Warehouse components
  │   ├── api/               # 14 API modules (warehouse, driver, outbound, audit, inventory...)
  │   └── layouts/           # AdminLayout, DriverLayout
  └── docs/                  # 16 tài liệu thiết kế & test case
  ```

  ---

  ## 2. HỆ THỐNG VAI TRÒ (12 Roles)

  | Role | Mô tả | Scope |
  |------|--------|-------|
  | `SELLER` | Người bán hàng — tạo đơn, quản lý profile, ví COD | Dữ liệu cá nhân |
  | `BUYER` | Người mua — tra cứu đơn công khai | Public tracking |
  | `DRIVER` | Tài xế gom/giao hàng last-mile | Đơn được gán |
  | `LINE_HAUL_DRIVER` | Tài xế tuyến liên kho (Line-haul) | Chuyến xe được gán |
  | `HUB_STAFF` | Nhân viên kho — quét nhập/xuất kho | Kho được gán (`hubId`) |
  | `HUB_COORDINATOR` | Điều phối viên kho | Kho được gán |
  | `ORDER_MANAGER` | Duyệt đơn hàng loạt từ Seller | Toàn hệ thống |
  | `DRIVER_MANAGER` | Phân công tài xế, duyệt từ chối đơn | Theo khu vực (`serviceAreas`) |
  | `WAREHOUSE_MANAGER` | Quản lý kho — xác nhận nhập/xuất | Gắn 1 Hub (`assignedHubId`) |
  | `CS` | Chăm sóc khách hàng | Toàn hệ thống |
  | `ACCOUNTANT` | Kế toán — đối soát COD | Toàn hệ thống |
  | `ADMIN` | Quản trị hệ thống — CRUD users, cấu hình | Toàn quyền |

  ---

  ## 3. DATA MODELS (19 Schema)

  ### Core Models
  - **`User`** — 12 roles, profile seller (company/tax/bank), 2FA TOTP, KYC, sub-account, rejection quota
  - **`Order`** — ~35 trạng thái, dual assignment (pickup/delivery), routeNodes multi-hub, COD/fees, delivery failure history, dimensions/weight, risk flags
  - **`OrderLog`** — Audit trail mọi thay đổi trạng thái đơn
  - **`OrderTrackingLog`** — Log GPS tracking public

  ### Hub & Routing
  - **`Hub`** — Bưu cục/kho (tên, địa chỉ, tọa độ, zones)
  - **`HubCoverage`** — Vùng phủ sóng hub theo tỉnh/quận
  - **`HubConnection`** — Kết nối giữa 2 hub (khoảng cách km, ETA giờ) → đồ thị cho Dijkstra
  - **`Zone`** — Khu vực phân loại trong kho

  ### Warehouse Operations
  - **`Bag`** — Bao niêm phong (sealCode, hubId, status, orders[])
  - **`Trip`** — Chuyến xe liên kho (origin/dest hub, driver, bags[], status)
  - **`AuditSession`** — Phiên kiểm kê kho (scanned/expected counts, discrepancies)
  - **`PickupManifest`** — Bảng kê gom hàng cho tài xế
  - **`PickupConfirmation`** — Xác nhận lấy hàng (ảnh chụp, chữ ký)

  ### Auth & Security
  - **`PasswordResetOtp`** — OTP quên mật khẩu (6 số, TTL 10 phút, max 5 lần thử)
  - **`AuthLog`** — Log đăng nhập/đăng xuất
  - **`KYC`** — Hồ sơ xác minh danh tính seller
  - **`NotificationPreference`** — Cài đặt thông báo user
  - **`PickupAddress`** — Địa chỉ kho lấy hàng seller (multi-pickup)
  - **`SystemConfig`** — Cấu hình hệ thống (key-value)

  ---

  ## 4. ORDER STATE MACHINE (~35 trạng thái)

  ### Luồng chính (Happy Path)
  ```
  CREATED → SELLER_PREPARING → PENDING_APPROVAL → APPROVED
    → [DIRECT] ASSIGNED_TO_PICKUP_AND_DELIVERY → PICKED_UP → DELIVERING → DELIVERED
    → [HUB_ROUTED] ASSIGNED_TO_PICKUP → PICKED_UP → INBOUND_ORIGIN_HUB → SORTING
      → BAGGED_SEALED → IN_TRANSIT → INBOUND_DEST_HUB
      → PENDING_DELIVERY_ASSIGNMENT → ASSIGNED_TO_DELIVERY → DELIVERING → DELIVERED
  ```

  ### Luồng ngoại lệ
  - **Giao thất bại:** `DELIVERING → FAILED → PENDING_REDELIVERY` (tối đa 3 lần) → `DELIVERY_FAILED_PENDING_RETURN`
  - **Hoàn hàng:** `RETURNING → RETURN_IN_TRANSIT → RETURNED`
  - **Hủy đơn:** Bất kỳ trạng thái trước `PICKED_UP` → `CANCELLED`
  - **Thất lạc kho:** `SEARCH_ZONE → SUSPECTED_LOST → LOST → LIQUIDATED`
  - **Lấy hàng thất bại:** `PICKING → PICKUP_FAILED`

  ### 2 nhánh định tuyến
  - **`DIRECT`**: Cùng hub (nội tỉnh) → giao thẳng, không qua kho
  - **`HUB_ROUTED`**: Liên kho → luân chuyển qua 1+ hub trung chuyển (Dijkstra routing)

  ---

  ## 5. BUSINESS SERVICES (Logic lõi)

  | Service | Chức năng |
  |---------|-----------|
  | `order.service.js` | Tạo đơn (idempotency SHA-256), cập nhật, hủy, tính cước tự động |
  | `pricing.service.js` | Tính cước theo vùng (4 tier), trọng lượng quy đổi, bảo hiểm, mã giảm giá, risk engine |
  | `hubRouting.service.js` | Dijkstra pathfinding, zone tier (INTRA_PROVINCE/INTRA_REGION/NEAR_REGION/INTER_REGION), ETA |
  | `inboundCore.service.js` | Quét nhập kho, cân lại, phân zone, phát hiện lệch cân |
  | `outboundCore.service.js` | Xuất kho, gán trip, xác nhận tài xế nhận hàng |
  | `bagCore.service.js` | Gom bao niêm phong, quét mã seal, đóng/mở bao |
  | `auditCore.service.js` | Kiểm kê kho, phát hiện thừa/thiếu/thất lạc, deadline tìm kiếm |
  | `inventoryCore.service.js` | Dashboard tồn kho realtime, thống kê theo zone/status/aging |
  | `deliveryFailure.service.js` | Báo giao thất bại (5 lý do), auto-return sau 3 lần, GPS proof |
  | `notification.service.js` | Push notification qua Socket.io realtime |
  | `auth.service.js` | Xác thực, JWT token management |
  | `returnProcess.service.js` | Xử lý hoàn hàng |
  | `telematics.service.js` | GPS tracking tài xế |

  ---

  ## 6. API ROUTES (17 route files)

  | Route Prefix | File | Vai trò truy cập |
  |-------------|------|-------------------|
  | `/api/auth` | `auth.routes.js` | Public (register, login, logout, refresh, 2FA, KYC, password reset) |
  | `/api/orders` | `order.routes.js` | SELLER, ADMIN (CRUD đơn hàng, quote, batch import) |
  | `/api/seller` | `seller.routes.js` | SELLER (sub-account, pickup address, profile, 2FA, KYC, deactivation) |
  | `/api/order-manager` | `orderManager.routes.js` | ORDER_MANAGER (duyệt đơn hàng loạt, pending list) |
  | `/api/driver-manager` | `driverManager.routes.js` | DRIVER_MANAGER (phân công tài xế, duyệt từ chối, quota monitor) |
  | `/api/driver` | `driver.routes.js` | DRIVER (từ chối đơn pickup/delivery) |
  | `/api/inbound` | `inbound.routes.js` | HUB_STAFF (quét nhập kho UC-16) |
  | `/api/outbound` | `outbound.routes.js` | HUB_STAFF (xuất kho UC-17) |
  | `/api/bags` | `bag.routes.js` | HUB_STAFF (gom bao & niêm phong) |
  | `/api/trips` | `trips.routes.js` | HUB_STAFF (tạo chuyến xe liên kho) |
  | `/api/driver/trips` | `driverHandoff.routes.js` | LINE_HAUL_DRIVER (xác nhận nhận hàng) |
  | `/api/audit` | `audit.routes.js` | HUB_STAFF (kiểm kê kho UC-18) |
  | `/api/inventory` | `inventory.routes.js` | HUB_STAFF, WAREHOUSE_MANAGER (dashboard tồn kho UC-19) |
  | `/api/wallet` | `wallet.routes.js` | SELLER (ví COD, rút tiền) |
  | `/api/admin` | `admin.routes.js` | ADMIN (CRUD users, system config) |
  | `/api/delivery-failure` | `deliveryFailure.routes.js` | DRIVER (báo giao thất bại) |

  ---

  ## 7. FRONTEND PAGES

  ### Frontend Web (Seller Portal — Port 5173)
  | Page | Chức năng |
  |------|-----------|
  | `SellerDashboardPage` | Tổng quan đơn hàng, thống kê, biểu đồ |
  | `CreateOrderPage` | Tạo đơn vận chuyển (form địa chỉ VN 4 cấp, tính cước realtime, risk check) |
  | `BatchOrderPage` | Import Excel hàng loạt (4 bước: Upload → Mapping cột → Preview → Xác nhận) |
  | `OrderListPage` | Danh sách đơn, lọc theo trạng thái/ngày, chi tiết tracking |
  | `ProfilePage` | Hồ sơ seller (thông tin cá nhân, doanh nghiệp, KYC, 2FA, sub-account, pickup addresses, bank) |
  | `CodWalletPage` | Ví COD & số dư |
  | `PayoutHistoryPage` | Lịch sử rút tiền |
  | `CreateTicketPage` | Tạo khiếu nại |
  | `TicketListPage` | Danh sách khiếu nại |
  | `HeroTracking` | Tra cứu đơn hàng công khai (tracking number, live GPS map) |

  ### Frontend Admin (Operations Portal — Port 5174)
  | Page | Chức năng |
  |------|-----------|
  | `WarehouseInboundPage` | Quét nhập kho (Camera QR/Barcode + nhập tay, cân lại, phân zone) |
  | `WarehouseOutboundPage` | Xuất kho (tạo trip, quét bao/đơn ra, gán tài xế line-haul) |
  | `WarehouseBaggingPage` | Gom bao niêm phong (tạo seal, quét đơn vào bao, đóng seal) |
  | `WarehouseAuditPage` | Kiểm kê kho (quét đối soát, phát hiện thừa/thiếu/thất lạc) |
  | `WarehouseInventoryDashboardPage` | Dashboard tồn kho realtime (theo zone, aging, alerts) |
  | `DriverPickupPage` | Lịch thu gom tài xế (danh sách đơn cần lấy, xác nhận lấy hàng) |
  | `DriverHandoffPage` | Xác nhận bàn giao hàng tài xế line-haul |
  | `GlobalOrderListPage` | Danh sách đơn hàng toàn hệ thống (cho Order Manager) |
  | `RiskReviewPage` | Duyệt đơn rủi ro cao (flagFeeWarning, flagCodAnomaly) |
  | `DispatchControlPage` | Điều phối phân công tài xế |

  ---

  ## 8. TÍNH CƯỚC & ĐỊNH TUYẾN (Pricing & Routing Engine)

  ### Bảng cước theo vùng (Zone-Based Pricing)
  | Vùng | Cước cơ bản (≤1kg) | Phụ trội /0.5kg |
  |------|---------------------|-----------------|
  | Nội tỉnh (`INTRA_PROVINCE`) | 16.500đ | +5.000đ |
  | Nội miền (`INTRA_REGION`) | 22.000đ | +6.000đ |
  | Cận miền (`NEAR_REGION`) | 28.000đ | +7.000đ |
  | Liên miền (`INTER_REGION`) | 35.000đ | +8.500đ |

  ### Công thức
  - **Trọng lượng quy đổi** = (D×R×C) / 5000
  - **Trọng lượng tính cước** = max(thực tế, quy đổi), làm tròn lên 0.5kg
  - **Phí bảo hiểm** = 0.5% giá trị hàng (nếu > 1.000.000đ)
  - **Cước cuối** = baseFee + insuranceFee - discountAmount

  ### Risk Engine
  - `flagFeeWarning`: Cước > 500.000đ
  - `flagCodAnomaly`: COD > 10.000.000đ hoặc COD > 2× giá trị hàng
  - Đơn có risk → trạng thái `PENDING_VERIFICATION` thay vì `CREATED`

  ### Hub Routing (Dijkstra)
  - Graph-based pathfinding giữa các Hub
  - Tự động tính route nodes, khoảng cách km, ETA giờ
  - Hỗ trợ 7 hub chính: Hà Nội, TP.HCM, Đà Nẵng, Cần Thơ, Bình Dương, Đồng Nai, Hải Phòng

  ---

  ## 9. BẢO MẬT & MIDDLEWARE

  | Middleware | Chức năng |
  |-----------|-----------|
  | `auth.middleware.js` | JWT verify, role-based access (`requireRole`), sub-account permission check (`requirePermission`), seller context resolve |
  | `rateLimit.middleware.js` | Giới hạn request/IP (chống brute-force login, OTP spam) |
  | `hubScope.middleware.js` | `requireOwnHub` — WAREHOUSE_MANAGER chỉ thao tác trên hub được gán |
  | `kyc.middleware.js` | Kiểm tra trạng thái KYC trước khi cho phép tạo đơn |
  | `error.middleware.js` | Global error handler |

  ### Cơ chế bảo mật
  - **JWT Access Token** (15 phút) + **Refresh Token** (7 ngày, lưu DB, revocable)
  - **Khóa tài khoản** sau 5 lần sai mật khẩu (khóa 30 phút)
  - **2FA TOTP** (Google Authenticator) + backup codes
  - **Idempotency** tạo đơn: SHA-256 payload hash + idempotencyKey header
  - **Password hash**: bcrypt (salt 10 rounds), pre-save hook với `isModified` check
  - **Sub-account**: 6 permission types, parentSellerId isolation

  ---

  ## 10. REALTIME & BACKGROUND JOBS

  ### WebSocket (Socket.io)
  - **Live GPS Tracking**: Room-based (`order:{trackingCode}`), driver emit vị trí → client nhận realtime
  - **Warehouse Dashboard**: Room `warehouse-dashboard:{hubId}` — cập nhật số liệu nhập/xuất kho
  - **Seller Notifications**: Room `seller:{sellerId}` — thông báo trạng thái đơn hàng

  ### Cron Jobs
  | Job | Schedule | Chức năng |
  |-----|----------|-----------|
  | `auditLostTimeout.job.js` | Mỗi 30 phút | Chuyển đơn `SUSPECTED_LOST` quá hạn → `LOST` |
  | `resetDriverRejectionQuota.job.js` | 00:00 hàng ngày | Reset quota từ chối đơn tài xế về 3 |
  | `driverConfirmTimeout.job.js` | Định kỳ | Timeout xác nhận tài xế nhận đơn |
  | `staleRedeliveryMonitor.job.js` | Định kỳ | Monitor đơn chờ giao lại quá lâu |

  ---

  ## 11. UI/UX DESIGN SYSTEM

  - **Theme**: Dark Mode (mặc định) + Light Mode (toggle), CSS class `body.light-theme`
  - **Style**: Flat UI (không box-shadow), viền mỏng `#e2e8f0` phân tách khối
  - **Palette Dark**: Navy `#030712` → Slate `#0f172a`, Accent: Cyan-400, Blue-500, Emerald-400
  - **Palette Light**: Slate-50 `#f8fafc`, Cards: White `#ffffff`, Text: `#0f172a`, Accent đậm hơn
  - **Components**: Glass panels, glass cards, glass inputs (với override Light Mode)
  - **Buttons chính**: Giữ chữ trắng `#ffffff` trên nền gradient/solid color ở cả 2 theme
  - **Font**: System default + font-mono cho mã vận đơn
  - **Responsive**: Mobile-first, sidebar collapse trên mobile

  ---

  ## 12. MODULES PHÁT TRIỂN (7 Module)

  | # | Module | Trạng thái | Mô tả |
  |---|--------|-----------|--------|---------------------|
  | 1 | Tài khoản & Phân quyền | ✅ Code xong + đã test | Register, Login, Logout, Refresh Token, 2FA, KYC, Sub-account, Password Reset | 12 role trong enum; CS/ACCOUNTANT chưa có route riêng |
  | 2 | Quản lý Đơn hàng | ✅ Code xong | Tạo đơn (idempotency), cập nhật, hủy, import Excel, tính cước tự động | Chưa có test case race condition riêng |
  | 3 | Vận hành Gom hàng | ✅ Code xong | UC-12 Lấy hàng, xác nhận pickup, pickup manifest | — |
  | 4 | Vận hành Kho & Giao hàng | ✅ Code xong | UC-16→19: Nhập kho, Xuất kho, Gom bao, Kiểm kê, Tồn kho, Giao/Thất bại/Hoàn | — |
  | 5 | Điều phối & Phân công | ✅ Code xong | Phân công tài xế (pickup/delivery), duyệt từ chối, quota 3/ngày (trừ lúc gửi - Option A) | Chưa có đặc tả UC dạng bảng |
  | 5b | Risk Engine | ⚠️ Code xong, thiếu đặc tả | flagFeeWarning, flagCodAnomaly, PENDING_VERIFICATION, RiskReviewPage | Cần UC + test case |
  | 6 | Tài chính | 🔄 Cơ bản | Ví COD seller, rút tiền (atomic findOneAndUpdate — đã fix race condition) | Đối soát tự động chưa triển khai |
  | 7 | Báo cáo | 📋 Chưa làm | Aggregation pipeline trên dữ liệu hiện có | — |

  ---

  ## 13. CONVENTIONS & PATTERNS

  - **Tiền tệ**: Integer VND (không dùng float), validate `Number.isInteger`
  - **Tracking Code**: Format `VN-LOG-XXXXXXXX` (8 ký tự random)
  - **API Response**: `{ status, message, data }` hoặc `{ message }` khi lỗi
  - **Error Codes**: HTTP status + message tiếng Việt
  - **Auth Header**: `Authorization: Bearer <accessToken>`
  - **Idempotency**: Header `X-Idempotency-Key` + SHA-256 body hash
  - **Validation**: Joi schemas cho warehouse operations, whitelist input ở controller
  - **State transitions**: Kiểm tra trạng thái hiện tại trước khi cho phép chuyển
  - **Audit trail**: OrderLog ghi nhận mọi thay đổi (actor, action, oldStatus, newStatus, metadata)