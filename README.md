# ?🚚 E-LOGISTICS ENTERPRISE PLATFORM (HỆ THỐNG QUẢN LÝ VẬN TẢI & KHO VẬN TOÀN DIỆN)

> **Dự án**: Nền tảng Vận tải Hàng hóa & Vận hành Bưu cục Toàn trình (End-to-End E-Logistics Ecosystem)  
> **Kiến trúc**: Hub-and-Spoke 3-Tier Master Regional Hubs (Hà Nội, Đà Nẵng, TP.HCM), Động cơ Định tuyến Thông minh & Phân vùng Cước 4 Cấp độ GPS Haversine.  
> **Trạng thái kiểm thử**: **100% PASS** trên toàn bộ 8 bộ test tự động (92/92 test cases).

---

## 📑 MỤC LỤC
1. [Tổng quan Hệ thống & Vòng đời Vận đơn](#1-tổng-quan-hệ-thống--vòng-đời-vận-đơn)
2. [Bảng Chuẩn Hóa Tên Gọi & Ánh Xạ Quy Chuẩn](#2-bảng-chuẩn-hóa-tên-gọi--ánh-xạ-quy-chuẩn)
3. [Kiến Trúc Kỹ Thuật & Cấu Trúc Thư Mục](#3-kiến-trúc-kỹ-thuật--cấu-trúc-thư-mục)
4. [Các Module Nghiệp Vụ Chính](#4-các-module-nghiệp-vụ-chính)
5. [Hướng Dẫn Cài Đặt & Khởi Chạy](#5-hướng-dẫn-cài-đặt--khởi-chạy)
6. [Báo Cáo Kiểm Thử Tự Động Toàn Diện (E2E Test Suites)](#6-báo-cáo-kiểm-thử-tự-động-toàn-diện-e2e-test-suites)

---

## 1. TỔNG QUAN HỆ THỐNG & VÒNG ĐỜI VẬN ĐƠN

Hệ thống E-Logistics bao quát 100% chu trình vật lý của đơn hàng:

```
[1. Seller Tạo Đơn] ──► [2. Shipper Gom Hàng (UC-12 ePOH)] ──► [3. Quét Nhập Kho Gốc (UC-16)]
                                                                           │
┌──────────────────────────────────────────────────────────────────────────┘
▼
[4. Gom Bao & Niêm Phong (Bagging Poka-yoke)] ──► [5. Xuất Xe & Bắt Tay Kép Tài Xế (UC-17)]
                                                                           │
┌──────────────────────────────────────────────────────────────────────────┘
▼
[6. Vận Chuyển Đường Trục (Linehaul)] ──► [7. Nhập Kho Trung Chuyển / Kho Đích]
                                                                           │
┌──────────────────────────────────────────────────────────────────────────┘
▼
[8. Kiểm Kê Kho Định Kỳ (UC-18)] ──► [9. Dashboard Tồn Kho & Dwell SLA (UC-19)] ──► [10. Giao Hàng Chặng Cuối (POD)]
```

---

## 2. BẢNG CHUẨN HÓA TÊN GỌI & ÁNH XẠ QUY CHUẨN

Nhằm đảm bảo tính đồng nhất trên toàn bộ Backend, Frontend Web, Frontend Admin và Mobile PWA, hệ thống đã chuẩn hoá tên gọi theo bảng quy chuẩn sau:

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

## 3. KIẾN TRÚC KỸ THUẬT & CẤU TRÚC THƯ MỤC

### Tech Stack:
- **Backend**: Node.js, Express 5, MongoDB / Mongoose 9, JWT, Socket.io, Joi validation.
- **Frontend Web & Seller**: React 19, TypeScript, TailwindCSS 4, Vite, Zustand, React Router 7.
- **Frontend Admin & Operations**: React 19, TypeScript, TailwindCSS 4, HTML5-QRCode Scanner, Leaflet Maps.

### Cấu trúc Thư mục:
```
e_logistic/
├── backend/
│   ├── src/
│   │   ├── config/             # Cấu hình DB MongoDB & Biến môi trường
│   │   ├── controllers/        # Điều khiển API RESTful
│   │   ├── middleware/         # Xác thực JWT, Phân quyền RBAC, Error Handler
│   │   ├── models/             # 12+ Schemas Mongoose (Order, Trip, Bag, AuditSession, ...)
│   │   ├── routes/             # Định tuyến API endpoints
│   │   ├── services/           # Lõi logic nghiệp vụ (Pricing, Routing, Inbound, Outbound, Bagging, Audit, Inventory)
│   │   ├── utils/              # Tiện ích bổ trợ (Logger, Date, Geo)
│   │   └── validations/        # Joi Schema Validators
│   └── test/
│       ├── e2e/                # Bộ test E2E Toàn trình (38/38 steps) & Guide test (18/18 steps)
│       └── suites/             # Bộ test tích hợp chuyên biệt theo từng Module (UC-12 -> UC-19)
├── frontend_web/               # Portal Người dùng, Khách mua & Seller
├── frontend_admin/             # Portal Điều hành Vận hành, Quản trị Kho & App Tài xế
├── README.md                   # Tài liệu hướng dẫn & tổng quan dự án
├── SYSTEM_BLUEPRINT_CURRENT.md # Bản thiết kế kiến trúc hệ thống hiện hành
└── MODULE_4_SPEC_AND_TEST_GUIDE.md # Đặc tả chi tiết & Cẩm nang kiểm thử Module 4
```

---

## 4. CÁC MODULE NGHIỆP VỤ CHÍNH

1. **Module 1: Quản trị Tài khoản & Phân quyền (Auth & RBAC)**
   - Đăng ký, Đăng nhập JWT, Quên mật khẩu OTP (TTL Index), Quản lý Sub-account & KYC Seller.
2. **Module 2: Quản lý Đơn hàng & Định tuyến (Order Management & 3-Tier Routing)**
   - Tự động phân giải 63 tỉnh thành về 3 Kho Tổng (Hà Nội, Đà Nẵng, TP.HCM) và tính cước 4 cấp độ GPS Haversine.
3. **Module 3: Thu gom Chặng đầu (UC-12 Shipper Pickup)**
   - Quét mã lấy hàng, biên bản bàn giao điện tử ePOH, chữ ký Seller, tải ảnh đối chứng và xử lý ngoại tuyến Idempotency.
4. **Module 4: Vận hành Kho & Luân chuyển Đường trục (Hub & Warehouse Operations)**
   - **UC-16 Inbound Scan**: Quét nhập kho, phân tách luồng nội tỉnh/liên tỉnh, tự động tính phụ thu lệch cân $>50\text{g}$.
   - **UC-Bagging Engine**: Gom bao tải, niêm phong Seal với cơ chế Poka-yoke chống nhầm tuyến.
   - **UC-17 Outbound & Driver Handshake**: Quét xuất kho, chốt chuyến xe, tài xế ký số ACCEPT/REJECT với cơ chế rollback an toàn.
   - **UC-18 Audit Session**: Kiểm kê kho thông minh, quét giải nén mã Seal, phát hiện hàng để sai Zone, phục hồi hàng thất lạc.
   - **UC-19 Inventory Management**: Giám sát SLA Dwell Time động theo vùng cước, đo vận tốc nhập/xuất 24h, cảnh báo quá tải khay kệ (>90%).
5. **Module 5: Giao hàng Chặng cuối & Tra cứu Công khai (Last-Mile Delivery & Public Tracking)**
   - Bàn giao Shipper phát hàng, ký nhận POD, tra cứu dòng thời gian công khai kèm bảo mật 4 số cuối điện thoại.

---

## 5. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY

### 5.1. Yêu cầu Môi trường:
- Node.js >= 18.x
- MongoDB Server (Local hoặc MongoDB Atlas)
- Git

### 5.2. Khởi chạy Backend:
```bash
cd backend
npm install
npm run dev
# Server lắng nghe tại http://localhost:5000 (hoặc PORT trong .env)
```

### 5.3. Khởi chạy Frontend:
```bash
# Frontend Web (Seller & Khách hàng)
cd frontend_web
npm install
npm run dev

# Frontend Admin (Ban Quản trị & Nhân viên kho)
cd frontend_admin
npm install
npm run dev
```

---

## 6. BÁO CÁO KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN (E2E TEST SUITES)

Hệ thống được trang bị 8 bộ kịch bản kiểm thử tự động toàn diện:

| Bộ Test Suite | File Thực Thi | Số Test Cases | Kết Quả |
|---|---|---|---|
| **E2E Toàn trình Toàn bộ Vòng đời** | `node test/e2e/test-full-lifecycle-e2e.js` | **38/38** | **✅ 100% PASS** |
| **Module 4 Guide Suite (UC-16 → UC-19)** | `node test/e2e/run-guide-tests.js` | **18/18** | **✅ 100% PASS** |
| **UC-12 Thu gom Kiện hàng (Pickup)** | `node test/suites/test_uc12_pickup.js` | **12/12** | **✅ 100% PASS** |
| **Định tuyến 3 Kho Tổng (Hub Routing)** | `node test/suites/test-hub-routing-e2e.js` | **5/5** | **✅ 100% PASS** |
| **Phân vùng Cước & GPS Haversine** | `node test/suites/test-zone-pricing-distance-e2e.js` | **4/4** | **✅ 100% PASS** |
| **Gom Bao & Niêm Phong Seal (Bagging)** | `node test/suites/test-bagging-module-e2e.js` | **5/5** | **✅ 100% PASS** |
| **Dashboard Tồn kho & SLA Dwell Time** | `node test/suites/test-inventory-enhanced-e2e.js` | **5/5** | **✅ 100% PASS** |
| **Kiểm Kê Kho Nâng Cao (Audit Engine)** | `node test/suites/test-audit-enhanced-e2e.js` | **5/5** | **✅ 100% PASS** |
| **TỔNG CỘNG** | **8 Test Suites** | **92/92** | **🎉 100% PASSED** |

Để chạy toàn bộ kiểm thử E2E:
```bash
cd backend
node test/e2e/test-full-lifecycle-e2e.js
```
