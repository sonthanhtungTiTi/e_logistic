# TÀI LIỆU LOGIC CODE & HƯỚNG DẪN TEST POSTMAN
## Module Authentication (Quản lý Tài khoản - UC01)

---

## PHẦN 1: GIẢI THÍCH LOGIC CODE CHI TIẾT (Theo Use Case Đăng ký & Đăng nhập)

### A. Kiến trúc Tổng quan (Module Auth)

Toàn bộ luồng xác thực đi qua **3 lớp**:

```
Client (Postman)
    │
    ▼
[Route] auth.routes.js          ← Lớp Boundary: Nhận request, Rate Limit
    │
    ▼
[Controller] auth.controller.js ← Lớp Control: 100% Logic nghiệp vụ
    │
    ▼
[Model] user.model.js           ← Lớp Entity: Lưu/đọc MongoDB, Hash password
    │
    ▼
[Model] authLog.model.js        ← Lưu lịch sử thao tác (Audit Log)
```

---

### B. Hai loại Token được tạo ra khi đăng nhập thành công

| Token | Thời gian sống | Mục đích |
|---|---|---|
| `accessToken` | 15 phút | Gắn vào Header mỗi request để xác thực |
| `refreshToken` | 7 ngày | Dùng để xin cấp lại accessToken khi hết hạn |

**Lý do:** Nếu accessToken bị đánh cắp, hacker chỉ dùng được trong tối đa 15 phút. Sau đó Token hết hạn tự động, an toàn hơn nhiều so với 1 token sống 30 ngày như thiết kế ban đầu.

---

### C. Logic hàm `registerUser` — UC Đăng ký tài khoản Seller

```
Bước 1. Joi Validation (Kiểm tra định dạng trước khi chạm DB)
         ├── Có trường lạ (vd: role="ADMIN") → 400 "role is not allowed"
         ├── Thiếu trường/sai định dạng → 400 lỗi tương ứng
         └── Hợp lệ → Đi tiếp

Bước 2. Kiểm tra trùng lặp ($or query email/phoneNumber)
         ├── Tồn tại → 400 "Email hoặc số điện thoại đã tồn tại"
         └── Không trùng → Đi tiếp

Bước 3. Mongoose .create() & pre-save hook
         ├── Backend tự gán `role: 'SELLER'`
         ├── Hook kiểm tra `isModified('password')` (tránh hash chồng hash)
         ├── Băm mật khẩu (bcrypt) → Lưu DB
         └── Lỗi Race Condition E11000 (hai người cùng đk 1 lúc) → bắt catch → 400 "đã tồn tại"

Bước 4. Cấp token & Ghi Audit Log
         ├── Tạo accessToken (15m) + refreshToken (7d)
         ├── Lưu refreshToken vào DB
         ├── Ghi AuthLog: action='REGISTER_SUCCESS', note='Tài khoản đăng ký mới'
         └── Ngoại lệ: Lỗi ghi log KHÔNG làm hỏng luồng đăng ký

Bước 5. Trả về thông tin User + 2 Tokens (HTTP 201)
```

**⚠️ Lưu ý nghiệp vụ & Hướng phát triển:**
- **Race Condition:** Đã bọc `try/catch` và xử lý mã lỗi `11000` của MongoDB để đảm bảo tính Idempotency, không bao giờ lộ lỗi 500 nếu có 2 request trùng nhau đến cùng lúc.
- **Xác thực danh tính:** Hiện tại người dùng đăng ký xong tự động đăng nhập ngay (không qua xác thực OTP/Email). Đây là một thiết kế mang tính tiện lợi, nhưng có rủi ro tạo tài khoản ảo. Hướng nâng cấp trong tương lai là bắt buộc gửi mã OTP qua SĐT trước khi kích hoạt.

---

### D. Logic hàm `loginUser` — Bám sát từng bước đặc tả UC01

```
Bước 5. Nhận request → Joi kiểm tra định dạng đầu vào
         ├── Thiếu identifier hoặc password → 400 "Vui lòng cung cấp..."
         └── Hợp lệ → Đi tiếp

Bước 6. Tìm user trong DB theo Email HOẶC Số điện thoại ($or query)
         ├── Không tìm thấy → 401 "Người dùng X không tồn tại."
         └── Tìm thấy → Đi tiếp

Bước 7. Kiểm tra khóa tạm thời (lockUntil > Date.now())
         └── Đang bị khóa → 403 "Tài khoản bị khóa tạm thời..."

         So sánh mật khẩu bằng bcrypt.compare()
         ├── Sai → failedLoginAttempts += 1
         │         Nếu >= 5 lần: lockUntil = 15 phút sau
         │         → 401 "Mật khẩu không đúng."
         └── Đúng → Đi tiếp

         Kiểm tra isActive
         └── isActive = false → 403 "Tài khoản chưa kích hoạt..."

         Kiểm tra role
         └── Không có role → 403 "Tài khoản chưa được phân quyền"

Bước 8. Tạo accessToken (15 phút) + refreshToken (7 ngày)
         Reset: failedLoginAttempts = 0, lockUntil = undefined
         Lưu refreshToken vào DB

Bước 9. Ghi AuthLog: userId, action='LOGIN_SUCCESS', IP, UserAgent

Bước 10. Trả về: _id, fullName, email, role, accessToken, refreshToken
```

---

### D. Biến bảo mật trong User Model

Các trường mới thêm vào `user.model.js` để hỗ trợ kiểm soát đăng nhập:

| Trường | Kiểu | Mặc định | Vai trò |
|---|---|---|---|
| `failedLoginAttempts` | Number | 0 | Đếm số lần nhập sai mật khẩu liên tiếp |
| `lockUntil` | Date | null | Thời điểm hết hạn khóa tài khoản |
| `refreshToken` | String | null | Lưu Refresh Token hiện tại của user |

---

## PHẦN 2: DỮ LIỆU TEST POSTMAN (COPY & PASTE NGAY)

> **URL gốc:** `http://localhost:5000`
> **Content-Type:** `application/json` (tất cả đều dùng raw JSON trong Body)

---

### API 1: Đăng ký tài khoản Seller
**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/register`  
**Headers:** Không cần  
**Body tab:** Body → raw → JSON

#### TC_UCDK_01 — Đăng ký hợp lệ (Expected: 201 Created)
```json
{
  "fullName": "Nguyễn Văn A",
  "email": "seller01@gmail.com",
  "phoneNumber": "0912345678",
  "password": "password123"
}
```
**Kết quả mong muốn:**
```json
{
  "_id": "...",
  "fullName": "Nguyễn Văn A",
  "email": "seller01@gmail.com",
  "role": "SELLER",
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

#### TC_UCDK_02 — Cố tình chèn role trái phép (Expected: 400 Bad Request)
> Kiểm tra hệ thống phòng thủ leo thang đặc quyền (Privilege Escalation). 
> Joi validation không có `.unknown(true)`, nên mọi field không định nghĩa sẽ bị chặn ngay ở cửa.
```json
{
  "fullName": "Hacker Cố Tình",
  "email": "hacker123@gmail.com",
  "phoneNumber": "0911111111",
  "password": "password123",
  "role": "ADMIN"
}
```
**Kết quả mong muốn:**
```json
{ "message": "\"role\" is not allowed" }
```

---

#### TC_UCDK_03 — Email sai định dạng (Expected: 400 Bad Request)
```json
{
  "fullName": "Test User",
  "email": "khong-co-at-sign",
  "phoneNumber": "0912345678",
  "password": "password123"
}
```
**Kết quả mong muốn:**
```json
{ "message": "Email không đúng định dạng" }
```

---

#### TC_UCDK_04 — Mật khẩu quá ngắn (Expected: 400 Bad Request)
```json
{
  "fullName": "Test User",
  "email": "test@gmail.com",
  "phoneNumber": "0912345678",
  "password": "12345"
}
```
**Kết quả mong muốn:**
```json
{ "message": "Mật khẩu phải từ 6 ký tự" }
```

---

#### TC_UCDK_05 — Số điện thoại không hợp lệ (Expected: 400 Bad Request)
```json
{
  "fullName": "Test User",
  "email": "test@gmail.com",
  "phoneNumber": "abc123",
  "password": "password123"
}
```
**Kết quả mong muốn:**
```json
{ "message": "Số điện thoại không hợp lệ" }
```

---

#### TC_UCDK_06 — Trùng Email hoặc Số điện thoại (Expected: 400 Bad Request)
> ⚠️ Chạy TC_UCDK_01 trước để có dữ liệu trong DB
```json
{
  "fullName": "Người Khác",
  "email": "seller01@gmail.com",
  "phoneNumber": "0999999999",
  "password": "password123"
}
```
**Kết quả mong muốn:**
```json
{ "message": "Email hoặc số điện thoại đã tồn tại" }
```

---

#### TC_UCDK_07 — Race Condition (Hai request gửi cùng lúc trùng Email) (Expected: 400 Bad Request)
> Dù vượt qua vòng check trùng lặp đầu tiên, MongoDB sẽ văng lỗi E11000 lúc `User.create`.
> Gửi lại Body y hệt TC_UCDK_01. Backend sẽ bắt lỗi E11000 và không ném lỗi 500.
**Kết quả mong muốn:**
```json
{ "message": "Email hoặc số điện thoại đã tồn tại" }
```

---

### API 2: Đăng nhập
**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/login`  
**Headers:** Không cần  
**Body tab:** Body → raw → JSON

---

#### TC_UCDN_01 — Đăng nhập bằng Email hợp lệ (Expected: 200 OK)
> ⚠️ Phải chạy TC_UCDK_01 trước
```json
{
  "identifier": "seller01@gmail.com",
  "password": "password123"
}
```
**Kết quả mong muốn:**
```json
{
  "_id": "...",
  "fullName": "Nguyễn Văn A",
  "email": "seller01@gmail.com",
  "role": "SELLER",
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```
> 📌 **Lưu lại `accessToken`** — dùng cho test API /profile và /orders

---

#### TC_UCDN_02 — Đăng nhập bằng Số điện thoại hợp lệ (Expected: 200 OK)
```json
{
  "identifier": "0912345678",
  "password": "password123"
}
```
**Kết quả mong muốn:** Giống TC_UCDN_01 (200 OK + accessToken)

---

#### TC_UCDN_03 — Thiếu identifier (Expected: 400 Bad Request)
```json
{
  "password": "password123"
}
```
**Kết quả mong muốn:**
```json
{ "message": "Vui lòng cung cấp Email hoặc Số điện thoại" }
```

---

#### TC_UCDN_04 — Thiếu password (Expected: 400 Bad Request)
```json
{
  "identifier": "seller01@gmail.com"
}
```
**Kết quả mong muốn:**
```json
{ "message": "Vui lòng cung cấp Mật khẩu" }
```

---

#### TC_UCDN_05 — Thiếu cả hai (Expected: 400 Bad Request)
```json
{}
```
**Kết quả mong muốn:**
```json
{ "message": "Vui lòng cung cấp Email hoặc Số điện thoại" }
```

---

#### TC_UCDN_06 — Tên đăng nhập không tồn tại (Expected: 401 Unauthorized)
```json
{
  "identifier": "khongtontai@gmail.com",
  "password": "password123"
}
```
**Kết quả mong muốn:**
```json
{ "message": "Đăng nhập thất bại\nNgười dùng khongtontai@gmail.com không tồn tại." }
```

---

#### TC_UCDN_07 — Đúng email, sai mật khẩu (Expected: 401 Unauthorized)
```json
{
  "identifier": "seller01@gmail.com",
  "password": "SaiMatKhau999"
}
```
**Kết quả mong muốn:**
```json
{ "message": "Đăng nhập thất bại\nMật khẩu không đúng." }
```

---

#### TC_UCDN_08 — Kiểm thử Brute Force Lock (Expected: 403 lần thứ 6+)
> Gửi TC_UCDN_07 **5 lần liên tiếp** với mật khẩu sai.
> Lần thứ 6, gửi lại:
```json
{
  "identifier": "seller01@gmail.com",
  "password": "SaiMatKhau999"
}
```
**Kết quả mong muốn (lần thứ 6):** HTTP **403 Forbidden**
```json
{ "message": "Tài khoản của bạn đã bị khóa tạm thời do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút." }
```

---

### API 3: Xem thông tin Profile (Cần Token)
**Method:** `GET`  
**URL:** `http://localhost:5000/api/auth/profile`

**Cách gắn Token trong Postman:**
1. Chọn tab **Authorization**
2. Type → **Bearer Token**
3. Dán `accessToken` nhận được từ TC_UCDN_01 vào ô Token

#### TC_UCPF_01 — Xem Profile với Token hợp lệ (Expected: 200 OK)
> (Không cần Body, chỉ cần Token trong Header)

**Kết quả mong muốn:**
```json
{
  "_id": "...",
  "fullName": "Nguyễn Văn A",
  "email": "seller01@gmail.com",
  "phoneNumber": "0912345678",
  "role": "SELLER",
  "isActive": true
}
```

---

#### TC_UCPF_02 — Xem Profile không có Token (Expected: 401 Unauthorized)
> Không gắn Token, gọi thẳng API

**Kết quả mong muốn:**
```json
{ "message": "Không được ủy quyền, không có token" }
```

---

### API 4: Tạo tài khoản nội bộ (Chỉ Admin)
**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/staff`  
**Authorization:** Bearer Token của tài khoản ADMIN

#### TC_UCST_01 — Seller cố tạo tài khoản Staff (Expected: 403 Forbidden)
> Dùng `accessToken` của Seller (TC_UCDN_01)
```json
{
  "fullName": "Tài xế mới",
  "email": "driver01@elogistic.com",
  "phoneNumber": "0988888888",
  "password": "driver123",
  "role": "DRIVER"
}
```
**Kết quả mong muốn:**
```json
{ "message": "Vai trò SELLER không có quyền truy cập tính năng này" }
```

---

## PHẦN 3: BẢNG TEST CASE TỔNG HỢP

| Test ID | API | Mô tả | HTTP Status | Pass/Fail |
|---|---|---|---|---|
| TC_UCDK_01 | POST /register | Đăng ký hợp lệ | 201 | |
| TC_UCDK_02 | POST /register | Chèn field lạ (role) | 400 | |
| TC_UCDK_03 | POST /register | Email sai định dạng | 400 | |
| TC_UCDK_04 | POST /register | Mật khẩu < 6 ký tự | 400 | |
| TC_UCDK_05 | POST /register | Số điện thoại chữ cái | 400 | |
| TC_UCDK_06 | POST /register | Trùng Email/SĐT | 400 | |
| TC_UCDK_07 | POST /register | Bắt lỗi Race Condition (E11000) | 400 | |
| TC_UCDN_01 | POST /login | Đăng nhập bằng Email | 200 | |
| TC_UCDN_02 | POST /login | Đăng nhập bằng SĐT | 200 | |
| TC_UCDN_03 | POST /login | Thiếu identifier | 400 | |
| TC_UCDN_04 | POST /login | Thiếu password | 400 | |
| TC_UCDN_05 | POST /login | Thiếu cả hai | 400 | |
| TC_UCDN_06 | POST /login | Sai identifier | 401 | |
| TC_UCDN_07 | POST /login | Sai mật khẩu | 401 | |
| TC_UCDN_08 | POST /login | Brute Force lần 6 | 403 | |
| TC_UCPF_01 | GET /profile | Có Token hợp lệ | 200 | |
| TC_UCPF_02 | GET /profile | Không có Token | 401 | |
| TC_UCST_01 | POST /staff | Seller cố tạo Staff | 403 | |
| TC_UCDX_01 | POST /logout | Đăng xuất thành công | 200 | |
| TC_UCDX_02 | POST /logout | Không có Token | 401 | |
| TC_UCDX_03 | POST /logout | Dùng lại accessToken cũ (giới hạn thiết kế đã biết) | 200 | |
| **TC_UCDX_04** | **POST /refresh** | **Dùng refreshToken cũ sau logout — phải bị chặn** | **401** | |
| TC_UCRF_01 | POST /refresh | Refresh Token hợp lệ → cấp accessToken mới | 200 | |
| TC_UCRF_02 | POST /refresh | Không có Refresh Token | 401 | |
| TC_UCRF_03 | POST /refresh | Refresh Token giả mạo (sai chữ ký) | 401 | |

---


## API 5: Đăng xuất hệ thống — Kiến trúc, Logic & Dữ liệu Test

---

### Xác nhận Kiến trúc Token (TH2 — Dual Token, Server-Side Refresh)

Hệ thống hiện đang triển khai **Tình huống 2 (TH2)** — lưu Refresh Token trong DB:

| Token | TTL | Lưu ở đâu | Vai trò |
|---|---|---|---|
| `accessToken` | 15 phút | Phía Client (RAM/localStorage) | Xác thực mỗi API request |
| `refreshToken` | 7 ngày | MongoDB (`users.refreshToken`) | Xin cấp accessToken mới khi hết hạn |

**Hệ quả khi Đăng xuất trong TH2:**
- Server xóa `refreshToken` trong DB → Client không thể xin cấp accessToken mới nữa.
- `accessToken` cũ vẫn còn hiệu lực **tối đa 15 phút** rồi tự hết hạn tự nhiên — hành vi này là **thiết kế chấp nhận được** (không phải bug).
- So với TH1 (JWT thuần 30 ngày), TH2 an toàn hơn nhiều: cửa sổ rủi ro từ 30 ngày rút xuống còn 15 phút.

---

### Giải thích Logic `logoutUser` — Bám sát đặc tả UC Đăng xuất

```
Bước 3. Middleware 'protect' kiểm tra accessToken TRƯỚC khi vào hàm
         ├── Token không có / sai / hết hạn → 401 (Luồng thay thế 3.1)
         └── Token hợp lệ → req.user gán từ DB (KHÔNG lấy từ req.body, an toàn)
                             đi vào hàm logoutUser

Bước 4. Xóa refreshToken trong MongoDB (hủy khả năng gia hạn phiên)
         └── User.findByIdAndUpdate(req.user._id, { refreshToken: null })
             ✅ req.user._id lấy từ token đã decode — không thể giả mạo user khác
             Ngoại lệ 4.1: Lỗi DB → catch ngoài xử lý, vẫn trả 200
             (accessToken còn lại tự hết hạn sau ≤15 phút — rủi ro chấp nhận được)

Bước 5. Ghi Audit Log — action = 'LOGOUT'
         └── try/catch LỒNG RIÊNG — lỗi ghi log KHÔNG làm hỏng đăng xuất
             ✅ userId lấy từ req.user._id (middleware decode)
             ✅ ipAddress và userAgent lấy từ req.ip / req.headers — không tin client
             Ngoại lệ 5.1: Lỗi → console.warn, tiếp tục trả 200

Bước 6. Trả 200 "Đăng xuất thành công"
         → Client nhận response → xóa accessToken khỏi localStorage/cookie
```

**Tại sao lỗi vẫn trả 200?**
Đặc tả yêu cầu: "hệ thống vẫn tiếp tục chuyển người dùng về màn hình Đăng nhập" dù có lỗi. Người dùng không được bị kẹt màn hình vì lỗi server.

---

### Dữ liệu Test Postman — Đăng xuất

**Method:** `POST`
**URL:** `http://localhost:5000/api/auth/logout`
**Body:** Không cần (để trống)
**Authorization:** Tab Authorization → Type: **Bearer Token** → dán `accessToken` từ bước đăng nhập

---

#### TC_UCDX_01 — Đăng xuất thành công (Expected: 200 OK)
> ⚠️ Chạy TC_UCDN_01 trước → copy `accessToken` → gắn vào Authorization tab.

**Headers (Postman tự thêm):**
```
Authorization: Bearer <accessToken_từ_đăng_nhập>
```
*(Body: để trống)*

**Kết quả mong muốn:**
```json
{ "message": "Đăng xuất thành công. Vui lòng chuyển về màn hình Đăng nhập." }
```

**Xác minh bổ sung trong MongoDB Atlas:**
1. Collection `users` → document `seller01@gmail.com` → field `refreshToken` phải là `null`.
2. Collection `authlogs` → bản ghi mới nhất phải có `action: "LOGOUT"`, `userId` đúng.

---

#### TC_UCDX_02 — Gọi logout không có Token (Expected: 401 Unauthorized)
> Xóa Authorization header → gọi API.

*(Body: để trống, Authorization: None)*

**Kết quả mong muốn:**
```json
{ "message": "Không được ủy quyền, không có token" }
```

---

#### TC_UCDX_03 — Dùng lại accessToken cũ sau khi đã đăng xuất
> Sau khi chạy TC_UCDX_01 thành công, dùng nguyên `accessToken` đó gọi lại `/logout`.

**Kết quả mong muốn (trong vòng 15 phút):** HTTP **200 OK**
```json
{ "message": "Đăng xuất thành công. Vui lòng chuyển về màn hình Đăng nhập." }
```

> ⚠️ **ĐÂY LÀ GIỚI HẠN THIẾT KẾ ĐÃ BIẾT TRƯỚC — KHÔNG PHẢI BUG.**
>
> **Giải thích:** Hệ thống đang dùng kiến trúc Dual Token (TH2). Sau khi logout, `refreshToken` đã bị xóa khỏi DB, nhưng `accessToken` (JWT stateless) vẫn còn hiệu lực tối đa **15 phút** vì không có cơ chế blacklist.
>
> **Tại sao chấp nhận được?**
> - Cửa sổ rủi ro chỉ còn **15 phút** (so với 30 ngày nếu dùng JWT thuần).
> - Kẻ tấn công cần sở hữu accessToken VÀ phải sử dụng trong ≤15 phút — khó hơn nhiều so với TH1.
>
> **Hướng khắc phục (ghi vào phần Hướng phát triển của Khóa luận):**
> - Triển khai **Redis Token Blacklist**: khi logout, lưu `jti` (JWT ID) vào Redis với TTL = thời gian còn lại của token. Mỗi request, middleware kiểm tra jti có trong blacklist không.
> - Hoặc rút ngắn `accessToken` xuống còn **5 phút** để giảm cửa sổ rủi ro hơn nữa.

---

### Hướng phát triển (ghi vào Khóa luận)

| Vấn đề | Hiện tại | Hướng nâng cấp |
|---|---|---|
| accessToken vẫn hợp lệ sau logout | Hết hạn tự nhiên sau 15 phút | Redis Blacklist theo `jti` |
| Multi-device logout | Logout 1 thiết bị, thiết bị khác vẫn đăng nhập | Lưu mảng refreshTokens, xóa theo deviceId |
| Rate limit route /logout | Chưa có | Không bắt buộc, logout ít bị lạm dụng |


---

## API 5: Đăng xuất hệ thống — Giải thích Logic & Dữ liệu Test

### Giải thích Logic `logoutUser` — Bám sát đặc tả UC Đăng xuất

```
Bước 3. Middleware 'protect' kiểm tra token TRƯỚC khi vào hàm
         ├── Token hết hạn / không có → 401 (Luồng thay thế 3.1, middleware chặn luôn)
         └── Token hợp lệ → req.user được gán, đi vào hàm logoutUser

Bước 4. Hủy refreshToken phía server
         └── findByIdAndUpdate → set refreshToken = null trong MongoDB
             Ngoại lệ 4.1: Nếu lỗi DB → catch bên ngoài xử lý,
             vẫn trả 200 (client tự xóa token, accessToken hết hạn sau 15 phút)

Bước 5. Ghi Audit Log (action = 'LOGOUT')
         └── try/catch riêng biệt — lỗi log KHÔNG làm gián đoạn đăng xuất
             Ngoại lệ 5.1: Lỗi ghi log → console.warn + tiếp tục trả 200

Bước 6. Trả về 200 "Đăng xuất thành công"
         (Client nhận được → xóa token khỏi localStorage/cookie)
```

**Điểm thiết kế quan trọng — tại sao luôn trả 200 khi lỗi?**
- Đặc tả yêu cầu: dù server có lỗi, người dùng vẫn được đăng xuất.
- `accessToken` có TTL 15 phút → dù không xóa được `refreshToken` trong DB, token sẽ tự hết hạn.
- Trải nghiệm người dùng không bị gián đoạn.

---

### Dữ liệu Test Postman — Đăng xuất

**Method:** `POST`
**URL:** `http://localhost:5000/api/auth/logout`
**Authorization:** Tab **Authorization** → Type: **Bearer Token** → dán `accessToken`
**Body:** Không cần (để trống)

---

#### TC_UCDX_01 — Đăng xuất thành công (Expected: 200 OK)
> ⚠️ Phải đăng nhập trước (TC_UCDN_01), lấy `accessToken` rồi gắn vào Authorization.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Không cần Body)*

**Kết quả mong muốn:**
```json
{ "message": "Đăng xuất thành công. Vui lòng chuyển về màn hình Đăng nhập." }
```

**Xác minh thêm trong MongoDB Atlas:**
- Vào Collection `users` → tìm user `seller01@gmail.com` → trường `refreshToken` phải là `null`.
- Vào Collection `authlogs` → phải có bản ghi mới nhất với `action: "LOGOUT"`.

---

#### TC_UCDX_02 — Gọi logout không có Token (Expected: 401 Unauthorized)
> Xóa Authorization header, gọi thẳng API.

**Kết quả mong muốn:**
```json
{ "message": "Không được ủy quyền, không có token" }
```

---

#### TC_UCDX_03 — Gọi logout lần 2 bằng Token cũ sau khi đã đăng xuất
> Dùng lại đúng `accessToken` vừa dùng ở TC_UCDX_01 gọi lại.

**Lưu ý hành vi:** `accessToken` vẫn còn hạn 15 phút nên middleware `protect` vẫn cho qua. Hệ thống sẽ cố xóa refreshToken (đã null) và ghi log lần 2. Đây là hành vi bình thường — để xử lý triệt để cần thêm blacklist token (tính năng nâng cao, ghi chú vào phần "Hướng phát triển").

**Kết quả mong muốn:**
```json
{ "message": "Đăng xuất thành công. Vui lòng chuyển về màn hình Đăng nhập." }
```
