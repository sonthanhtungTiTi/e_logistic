# Data Contract — Module 1: Tài khoản & Phân quyền (Auth & User Management)

## 📌 0. XÁC NHẬN CƠ CHẾ KỸ THUẬT & ĐỊNH NGHĨA FIELD

### 0.1 Cơ chế Session & Token Authentication
* **Access Token**: Được trả về trong **JSON response body** khi login/register. Client đính kèm ở header `Authorization: Bearer <accessToken>`. Thời hạn: 15 phút.
* **Refresh Token**: Được trả về trong **JSON response body** (KHÔNG dùng HTTP-only Cookie). Client lưu trữ cục bộ (LocalStorage/Zustand). Khi lấy Access Token mới (`POST /api/auth/refresh`), Client truyền Refresh Token qua **Request Body JSON** (`{ "refreshToken": "..." }`). Thời hạn: 7 ngày.
* **Revocation (Hủy phiên)**: Server xóa `refreshToken` trong DB về `null` khi user Logout, khi Admin Lock/Deactivate tài khoản, hoặc khi đổi/reset mật khẩu.

### 0.2 Field Trạng Thái Tài Khoản (DB Schema)
* **Tên field trong DB (`User` model)**: `isActive`
* **Kiểu dữ liệu**: `Boolean` (`true`: Hoạt động, `false`: Khóa/Vô hiệu hóa)
* **Xác nhận khớp giữa Controller & Middleware**:
  * Ghi (Admin Controller - `setUserStatus`): `targetUser.isActive = false` / `true`
  * Đọc (Auth Middleware - `protect`): `if (!req.user.isActive) return res.status(403)...`
  * Middleware `protect` thực hiện `User.findById(decoded.id)` mỗi request -> Phản ánh trạng thái realtime ngay lập tức.

### 0.3 Danh Sách Vai Trò Hợp Lệ (Roles Enum)
Duy nhất 9 role sau được phép trong hệ thống (`user.model.js`):
`'SELLER'`, `'BUYER'`, `'DRIVER'`, `'LINE_HAUL_DRIVER'`, `'HUB_STAFF'`, `'HUB_COORDINATOR'`, `'CS'`, `'ACCOUNTANT'`, `'ADMIN'`

---

## 🌐 1. CLIENT / PUBLIC API ROUTES (`/api/auth`)

### 1.1 Đăng ký tài khoản (Public Register)
* **Endpoint**: `POST /api/auth/register`
* **Access**: Public
* **Request Body (JSON)**:
```json
{
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "phoneNumber": "0912345678",
  "password": "password123",
  "confirmPassword": "password123"
}
```
* **Response Thành công (201 Created)**:
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "role": "SELLER",
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```
* **Error Messages (Copy nguyên văn từ code)**:
  * `400`: `Vui lòng cung cấp họ tên`
  * `400`: `Email không đúng định dạng`
  * `400`: `Vui lòng cung cấp email`
  * `400`: `Số điện thoại không hợp lệ`
  * `400`: `Vui lòng cung cấp số điện thoại`
  * `400`: `Mật khẩu phải từ 6 ký tự`
  * `400`: `Vui lòng cung cấp mật khẩu`
  * `400`: `Mật khẩu xác nhận không khớp`
  * `400`: `Vui lòng xác nhận mật khẩu`
  * `400`: `Email hoặc số điện thoại đã tồn tại`
  * `400`: `Dữ liệu người dùng không hợp lệ`
  * `500`: `Lỗi máy chủ nội bộ, vui lòng thử lại sau`

---

### 1.2 Đăng nhập (Public Login)
* **Endpoint**: `POST /api/auth/login`
* **Access**: Public
* **Request Body (JSON)**:
```json
{
  "identifier": "user@example.com hoặc 0912345678",
  "password": "password123"
}
```
* **Response Thành công (200 OK)**:
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "role": "SELLER",
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```
* **Error Messages (Copy nguyên văn từ code)**:
  * `400`: `Vui lòng cung cấp Email hoặc Số điện thoại`
  * `400`: `Vui lòng cung cấp Mật khẩu`
  * `401`: `Đăng nhập thất bại. Người dùng <identifier> không tồn tại.`
  * `401`: `Mật khẩu không đúng. Tài khoản sẽ bị khóa sau khi nhập sai 5 lần.`
  * `403`: `Tài khoản tạm thời bị khóa. Vui lòng thử lại sau <minutesLeft> phút.`
  * `403`: `Tài khoản chưa được kích hoạt hoặc đã bị vô hiệu hóa.`
  * `403`: `Tài khoản chưa được phân quyền, vui lòng liên hệ quản trị viên.`
  * `500`: `Lỗi máy chủ nội bộ, vui lòng thử lại sau.`

---

### 1.3 Lấy thông tin cá nhân (Get Profile)
* **Endpoint**: `GET /api/auth/profile`
* **Access**: Private (Chỉ cần Logged in)
* **Header**: `Authorization: Bearer <accessToken>`
* **Response Thành công (200 OK)**:
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "phoneNumber": "0912345678",
  "role": "SELLER",
  "isActive": true,
  "createdAt": "2026-08-09T10:00:00.000Z"
}
```
* **Error Messages**:
  * `401`: `Không được ủy quyền, không có token` / `Không được ủy quyền, token không hợp lệ hoặc đã hết hạn`
  * `403`: `Tài khoản đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ quản trị viên.`
  * `404`: `Không tìm thấy người dùng.`
  * `500`: `Lỗi máy chủ nội bộ.`

---

### 1.4 Cập nhật hồ sơ cá nhân (Update Profile)
* **Endpoint**: `PUT /api/auth/profile`
* **Access**: Private
* **Header**: `Authorization: Bearer <accessToken>`
* **Request Body (JSON)** (Whitelist fields: `fullName`, `phoneNumber`, `email`, `newPassword`):
```json
{
  "fullName": "Nguyen Van B",
  "phoneNumber": "0987654321",
  "email": "newemail@example.com",
  "newPassword": "newpassword123"
}
```
* **Response Thành công (200 OK)**:
```json
{
  "message": "Cập nhật hồ sơ thành công.",
  "user": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "fullName": "Nguyen Van B",
    "email": "newemail@example.com",
    "phoneNumber": "0987654321",
    "role": "SELLER"
  }
}
```
* **Error Messages**:
  * `400`: `Họ tên phải từ 2 ký tự`
  * `400`: `Số điện thoại không hợp lệ`
  * `400`: `Email không đúng định dạng`
  * `400`: `Mật khẩu mới phải từ 6 ký tự`
  * `400`: `Vui lòng cung cấp ít nhất một trường cần cập nhật.`
  * `400`: `Email này đã được sử dụng bởi tài khoản khác.`
  * `400`: `Số điện thoại này đã được sử dụng bởi tài khoản khác.`
  * `400`: `Mật khẩu không hợp lệ, không được trùng với mật khẩu hiện tại.`
  * `404`: `Không tìm thấy tài khoản.`
  * `500`: `Cập nhật hồ sơ thất bại. Vui lòng thử lại sau.`

---

### 1.5 Cấp lại Access Token (Refresh Token)
* **Endpoint**: `POST /api/auth/refresh`
* **Access**: Public
* **Request Body (JSON)**:
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```
* **Response Thành công (200 OK)**:
```json
{
  "accessToken": "eyJhbGciOi..."
}
```
* **Error Messages**:
  * `400`: `Vui lòng cung cấp Refresh Token`
  * `401`: `Refresh Token không hợp lệ hoặc đã hết hạn`
  * `401`: `Refresh Token đã bị thu hồi hoặc không còn hiệu lực`
  * `403`: `Tài khoản đã bị vô hiệu hóa`
  * `500`: `Lỗi máy chủ nội bộ`

---

### 1.6 Đăng xuất (Logout)
* **Endpoint**: `POST /api/auth/logout`
* **Access**: Private
* **Header**: `Authorization: Bearer <accessToken>`
* **Response Thành công (200 OK)**:
```json
{
  "message": "Đăng xuất thành công. Vui lòng chuyển về màn hình Đăng nhập."
}
```

---

### 1.7 Quên mật khẩu — Bước 1: Yêu cầu mã OTP (Forgot Password)
* **Endpoint**: `POST /api/auth/forgot-password`
* **Access**: Public
* **Request Body (JSON)**:
```json
{
  "identifier": "user@example.com hoặc 0912345678"
}
```
* **Response Thành công (200 OK)**:
```json
{
  "message": "Mã OTP đã được gửi đến user@example.com. Hiệu lực trong 10 phút.",
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "channel": "email"
}
```
* **Error Messages**:
  * `400`: `Vui lòng nhập Email hoặc Số điện thoại`
  * `404`: `Tài khoản không tồn tại.`
  * `503`: `Không thể gửi mã xác thực. Vui lòng thử lại sau.`
  * `500`: `Lỗi máy chủ nội bộ, vui lòng thử lại sau.`

---

### 1.8 Quên mật khẩu — Bước 2: Xác thực mã OTP (Verify OTP)
* **Endpoint**: `POST /api/auth/verify-otp`
* **Access**: Public
* **Request Body (JSON)**:
```json
{
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "otp": "123456"
}
```
* **Response Thành công (200 OK)**:
```json
{
  "message": "Xác thực OTP thành công. Vui lòng nhập mật khẩu mới.",
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```
* **Error Messages**:
  * `400`: `Mã OTP gồm 6 chữ số`
  * `400`: `Vui lòng nhập mã OTP`
  * `400`: `Yêu cầu đặt lại mật khẩu không tồn tại hoặc đã được sử dụng.`
  * `400`: `Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.`
  * `400`: `Vượt quá số lần nhập sai. Yêu cầu đã bị hủy, vui lòng thực hiện lại từ đầu.`
  * `400`: `Mã OTP không chính xác. Còn <attemptsLeft> lần thử.`
  * `500`: `Lỗi máy chủ nội bộ, vui lòng thử lại sau.`

---

### 1.9 Quên mật khẩu — Bước 3: Đặt lại mật khẩu (Reset Password)
* **Endpoint**: `POST /api/auth/reset-password`
* **Access**: Public
* **Request Body (JSON)**:
```json
{
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "newPassword": "newpassword123",
  "confirmNewPassword": "newpassword123"
}
```
* **Response Thành công (200 OK)**:
```json
{
  "message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới."
}
```
* **Error Messages**:
  * `400`: `Mật khẩu phải từ 6 ký tự`
  * `400`: `Vui lòng nhập mật khẩu mới`
  * `400`: `Mật khẩu xác nhận không khớp`
  * `400`: `Vui lòng xác nhận mật khẩu mới`
  * `400`: `Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng thực hiện lại từ đầu.`
  * `404`: `Tài khoản không tồn tại.`
  * `500`: `Đặt lại mật khẩu thất bại. Vui lòng thử lại sau.`

---

### 1.10 Đổi mật khẩu (Change Password - Logged In)
* **Endpoint**: `PUT /api/auth/change-password`
* **Access**: Private
* **Header**: `Authorization: Bearer <accessToken>`
* **Request Body (JSON)**:
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123",
  "confirmNewPassword": "newpassword123"
}
```
* **Response Thành công (200 OK)**:
```json
{
  "message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới."
}
```
* **Error Messages**:
  * `400`: `Vui lòng nhập mật khẩu hiện tại`
  * `400`: `Mật khẩu mới phải từ 6 ký tự trở lên`
  * `400`: `Vui lòng nhập mật khẩu mới`
  * `400`: `Mật khẩu xác nhận không khớp với mật khẩu mới`
  * `400`: `Vui lòng xác nhận mật khẩu mới`
  * `400`: `Mật khẩu mới không được trùng với mật khẩu hiện tại.`
  * `401`: `Mật khẩu hiện tại không đúng. Còn <attemptsLeft> lần thử trước khi bị khóa.`
  * `403`: `Chức năng đổi mật khẩu tạm thời bị khóa. Vui lòng thử lại sau <minutesLeft> phút.`
  * `403`: `Nhập sai mật khẩu quá 5 lần. Chức năng bị tạm khóa 15 phút.`
  * `404`: `Không tìm thấy tài khoản.`
  * `500`: `Đổi mật khẩu thất bại. Vui lòng thử lại sau.`

---

## 🛠️ 2. ADMIN MANAGEMENT API ROUTES (`/api/admin/users`)

### 2.1 Lấy danh sách người dùng (List Users)
* **Endpoint**: `GET /api/admin/users?role=SELLER&isActive=true&page=1&limit=20`
* **Access**: Private / Admin (`protect`, `authorize('ADMIN')`)
* **Header**: `Authorization: Bearer <accessToken>`
* **Response Thành công (200 OK)**:
```json
{
  "total": 50,
  "page": 1,
  "limit": 20,
  "users": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Nguyen Van A",
      "email": "user@example.com",
      "phoneNumber": "0912345678",
      "role": "SELLER",
      "isActive": true,
      "createdAt": "2026-08-09T10:00:00.000Z"
    }
  ]
}
```
* **Error Messages**:
  * `403`: `Vai trò <ROLE> không có quyền truy cập tính năng này`
  * `500`: `Lỗi máy chủ nội bộ.`

---

### 2.2 Tạo tài khoản nhân viên / nội bộ (Create Staff User)
* **Endpoint**: `POST /api/admin/users`
* **Access**: Private / Admin
* **Header**: `Authorization: Bearer <accessToken>`
* **Request Body (JSON)**:
```json
{
  "fullName": "Nhan Vien Kho 1",
  "email": "staff1@logistics.com",
  "phoneNumber": "0988776655",
  "role": "HUB_STAFF"
}
```
* **Response Thành công (201 Created)**:
```json
{
  "message": "Tạo tài khoản thành công. Email thông tin đăng nhập đã được gửi.",
  "user": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "fullName": "Nhan Vien Kho 1",
    "email": "staff1@logistics.com",
    "phoneNumber": "0988776655",
    "role": "HUB_STAFF",
    "mustChangePassword": true
  }
}
```
*(Trường hợp gửi email thất bại: trả về thêm `tempPassword` trong JSON để Admin gửi thủ công)*.
* **Error Messages**:
  * `400`: `Vui lòng cung cấp họ tên`
  * `400`: `Email không đúng định dạng` / `Vui lòng cung cấp email`
  * `400`: `Số điện thoại không hợp lệ` / `Vui lòng cung cấp số điện thoại`
  * `400`: `Vai trò không hợp lệ. Các vai trò được phép: SELLER, BUYER, DRIVER, LINE_HAUL_DRIVER, HUB_STAFF, HUB_COORDINATOR, CS, ACCOUNTANT, ADMIN`
  * `400`: `Email này đã được sử dụng bởi tài khoản khác.`
  * `400`: `Số điện thoại này đã được sử dụng bởi tài khoản khác.`
  * `500`: `Thao tác thất bại. Vui lòng thử lại sau.`

---

### 2.3 Cập nhật tài khoản người dùng bất kỳ (Admin Update User)
* **Endpoint**: `PUT /api/admin/users/:id`
* **Access**: Private / Admin
* **Header**: `Authorization: Bearer <accessToken>`
* **Request Body (JSON)**:
```json
{
  "fullName": "Nguyen Van C",
  "email": "updated@example.com",
  "phoneNumber": "0911223344",
  "role": "HUB_COORDINATOR"
}
```
* **Response Thành công (200 OK)**:
```json
{
  "message": "Cập nhật tài khoản thành công.",
  "user": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "fullName": "Nguyen Van C",
    "email": "updated@example.com",
    "phoneNumber": "0911223344",
    "role": "HUB_COORDINATOR",
    "isActive": true
  }
}
```
* **Error Messages**:
  * `400`: `Vai trò không hợp lệ. Các vai trò được phép: SELLER, BUYER, DRIVER, LINE_HAUL_DRIVER, HUB_STAFF, HUB_COORDINATOR, CS, ACCOUNTANT, ADMIN`
  * `400`: `Email này đã được sử dụng bởi tài khoản khác.`
  * `400`: `Số điện thoại này đã được sử dụng bởi tài khoản khác.`
  * `404`: `Không tìm thấy tài khoản.`
  * `500`: `Thao tác thất bại. Vui lòng thử lại sau.`

---

### 2.4 Thay đổi trạng thái tài khoản (Lock / Unlock / Deactivate)
* **Endpoint**: `PATCH /api/admin/users/:id/status`
* **Access**: Private / Admin
* **Header**: `Authorization: Bearer <accessToken>`
* **Request Body (JSON)**:
```json
{
  "action": "lock"
}
```
*(Giá trị `action` được chấp nhận: `"lock"` | `"unlock"` | `"deactivate"`)*
* **Response Thành công (200 OK)**:
```json
{
  "message": "Admin khóa tài khoản thành công.",
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "isActive": false
}
```
* **Error Messages**:
  * `400`: `Thao tác không hợp lệ. Chỉ chấp nhận: lock, unlock, deactivate.`
  * `400`: `Không thể tự khóa hoặc vô hiệu hóa tài khoản đang đăng nhập.`
  * `404`: `Không tìm thấy tài khoản.`
  * `500`: `Thao tác thất bại. Vui lòng thử lại sau.`

