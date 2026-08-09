# BÁO CÁO KIẾN TRÚC VÀ LOGIC TRIỂN KHAI DỰ ÁN E-LOGISTICS
*(Tài liệu dành cho báo cáo Khóa luận tốt nghiệp - Version 1.0)*

---

## I. TỔNG QUAN HỆ THỐNG VÀ TECH STACK
Dự án được xây dựng dựa trên tiêu chuẩn Enterprise-grade, tuân thủ chặt chẽ mô hình **BCE (Boundary - Control - Entity)** kết hợp **Domain-Driven Design (DDD)**.
- **Backend Core**: Node.js kết hợp framework ExpressJS (sử dụng JavaScript thuần).
- **Database**: MongoDB (với Mongoose ODM), hỗ trợ lưu trữ dữ liệu dạng Document linh hoạt cho các luồng nghiệp vụ log phức tạp.
- **Security & Authentication**: JSON Web Token (JWT) kết hợp `bcrypt` và `express-rate-limit`.

### Cấu trúc Thư mục (Tuân thủ BCE)
Hệ thống loại bỏ hoàn toàn mã code thừa rườm rà, tập trung vào 4 thư mục chính trong `src/`:
1. `models/` (Entity): Nơi định nghĩa sơ đồ dữ liệu, Validate đầu vào cấp thấp (DB Level).
2. `routes/` (Boundary): Điểm tiếp nhận request từ Client, điều phối API và giới hạn lưu lượng (Rate Limiter).
3. `controllers/` (Control): Chứa 100% logic nghiệp vụ hệ thống.
4. `middleware/`: Lớp bảo vệ đóng vai trò gác cổng (Kiểm tra Token, Phân quyền Role-based).

---

## II. THIẾT LẬP MÔI TRƯỜNG & BẢO MẬT KHỞI ĐỘNG (SETUP & FAIL-FAST)

### 1. Fail-fast Security Boot
Trong file `server.js`, hệ thống được trang bị cơ chế **Fail-fast**. Nếu file `.env` thiếu khóa bí mật `JWT_SECRET`, Node.js sẽ lập tức từ chối khởi động (`process.exit(1)`) để ngăn chặn việc chạy Server với trạng thái không an toàn.
```javascript
if (!process.env.JWT_SECRET) {
  console.error('❌ LỖI NGHIÊM TRỌNG: Thiếu JWT_SECRET trong biến môi trường (.env)');
  process.exit(1);
}
```

### 2. Cài đặt file `.env.example`
Một file `.env.example` đã được tạo để đảm bảo khi đẩy source code lên GitHub, chìa khóa thực tế sẽ được đưa vào `.gitignore`, tránh làm lộ chuỗi kết nối Database và Khóa bí mật.

---

## III. MODULE 1: QUẢN LÝ TÀI KHOẢN (AUTH & RBAC)

### 1. Model & Vai trò (Roles)
File `user.model.js` lưu trữ thông tin với **11 Tác nhân** (ADMIN, SELLER, DRIVER, WAREHOUSE_STAFF...). Mật khẩu được băm (hash) tự động thông qua Hook `pre('save')` của Mongoose bằng `bcrypt` trước khi lưu xuống DB.

### 2. Logic Đăng ký & Chống Leo thang đặc quyền (Privilege Escalation)
Hệ thống sử dụng thư viện `Joi` để bắt lỗi định dạng (Validation).
- **API `/api/auth/register` (Dành cho Seller/Khách hàng):** Cố định Role trong code là `SELLER`. Không cho phép Client tự truyền trường Role nhằm chống hacker gửi payload `{ "role": "ADMIN" }`.
- **API `/api/auth/staff` (Dành riêng cho Quản trị viên):** Cho phép truyền Role để tạo tài khoản nhân viên. Tuy nhiên, nó được bọc bởi middleware `protect` và `authorize('ADMIN')`, bắt buộc người tạo phải mang Token của Admin.

### 3. Middleware & Chống Tấn công dò mật khẩu (Brute Force)
File `auth.middleware.js` kiểm tra Header `Authorization: Bearer <Token>`. 
Trong `auth.routes.js`, sử dụng `express-rate-limit` để giới hạn: Nếu gọi API `/login` hoặc `/register` **sai 5 lần trong 15 phút**, IP đó sẽ bị khóa tạm thời.

---

## IV. MODULE 2: QUẢN LÝ ĐƠN HÀNG VÀ CHUỖI CUNG ỨNG

### 1. Thiết kế Dữ liệu Tiền tệ & Lỗ hổng Float
File `order.model.js` thiết kế 15 trạng thái Đơn hàng bằng chuỗi Tiếng Anh in hoa (`DRAFT`, `READY_TO_PICK`, `IN_TRANSIT`...) để chuẩn hóa hệ thống.
Tất cả các biến liên quan đến Tiền (Phí vận chuyển, Giá trị hàng, Tiền thu hộ COD) đều được quy đổi về **VND (Integer)**. Kèm theo đó là Validator chặn số thập phân:
```javascript
validate: { validator: Number.isInteger, message: 'Số tiền phải là số nguyên' }
```

### 2. Logic Tạo Đơn (Order Creation) - `order.controller.js`
Đây là Trái tim của Hệ thống Logistics, giải quyết 3 bài toán lớn:

#### A. Chống Mass Assignment (Tự động tính toán Server-side)
Hệ thống không tin tưởng các biến `chargeableWeight` (Cân nặng tính cước) và `shippingFee` (Phí vận chuyển) từ phía Client (Seller). 
- Server tự dùng công thức `(Dài * Rộng * Cao) / 5000 * 1000` để tính Trọng lượng quy đổi thể tích (Volumetric Weight).
- Server tự so sánh Trọng lượng thực tế và Thể tích để lấy Trọng lượng cao hơn làm Cân nặng tính cước.
- Server tự áp dụng công thức tính Cước phí.

#### B. Đảm bảo toàn vẹn dữ liệu (Mongoose Transactions)
Khi tạo đơn hàng, hệ thống phải thực hiện 2 thao tác:
1. Lưu Đơn hàng (`Order.save()`).
2. Lưu Lịch sử thao tác (`OrderLog.create()`).
Để tránh tình trạng "Tạo đơn thành công nhưng Lưu lịch sử thất bại do mất kết nối", cả 2 thao tác được gói trong **Session Transaction**. Nếu 1 trong 2 gặp lỗi, MongoDB sẽ tự động Rollback (hủy toàn bộ) cả hai.

#### C. Chống lặp Request (Idempotency) & Xử lý Mã sàn TMĐT (`orderIdSan`)
Do mạng lag, Seller có thể bấm tạo đơn 2 lần liên tiếp.
- `orderIdSan` được định nghĩa `unique: true, sparse: true` (Cho phép trống nếu Seller tự tạo, nhưng nếu Sàn đẩy về thì phải là duy nhất).
- Tại Controller, nếu gửi lên chuỗi rỗng `""` thì tự động xóa đi (`delete object.orderIdSan`) để tránh bẫy Sparse Index.
- Toàn bộ nội dung đơn hàng được băm (hash) SHA-256 thành biến `payloadHash`.
- Nếu có 2 Request đẩy xuống cùng lúc, MongoDB sẽ báo lỗi `E11000` (Duplicate Key). Tại khối `catch` trong Controller, hệ thống sẽ:
  - Nếu `payloadHash` giống nhau: Báo `200 OK` và trả về Tracking Code cũ (Giải quyết hoàn hảo bài toán Idempotency).
  - Nếu `payloadHash` khác nhau: Báo `409 Conflict` (Hành vi gian lận sửa thông tin).

---
*Tài liệu này phản ánh chính xác cấu trúc và logic mã nguồn hiện tại trong dự án.*
