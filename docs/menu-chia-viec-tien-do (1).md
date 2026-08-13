# MENU CHIA VIỆC CHI TIẾT — E-Logistics System
## Dùng để giao việc nhỏ cho AI, tránh loạn code + theo dõi tiến độ

---

## CÁCH DÙNG FILE NÀY

1. Mỗi dòng trong bảng là **1 việc nhỏ, giao cho AI 1 lần, 1 mục đích duy nhất** — không gộp nhiều việc vào 1 lần yêu cầu để tránh AI làm lan man, tự ý thêm bớt.
2. Cột **Trạng thái**: bạn tự cập nhật `⬜ Chưa làm` / `🔄 Đang làm` / `✅ Xong` / `⚠️ Cần xác nhận` sau mỗi lần AI báo cáo.
3. Cột **App** (chỉ áp dụng cho task Frontend): `Admin` = frontend_admin, `Web` = frontend_web, `Flutter` = mobile tài xế, `—` = không áp dụng (Backend/chung).
4. Khi báo cáo tiến độ cho tôi, dùng đúng mẫu ở mục "CÁCH BÁO CÁO TIẾN ĐỘ" bên dưới.
5. Nguyên tắc: **1 task = 1 file/1 chức năng cụ thể**, không giao kiểu "làm hết Module 2" trong 1 lần.

---

## RANH GIỚI 3 APP (đã chốt)

| App | Actor phục vụ | Đặc điểm UI |
|---|---|---|
| **frontend_admin** | Admin, Kế toán, CSKH, Điều phối viên (Bưu cục/Kho Tổng), Nhân viên Kho | Dashboard nội bộ, Sidebar, bảng biểu dày đặc dữ liệu |
| **frontend_web** | Seller (có login) + Buyer (không login, chỉ tra cứu) | Landing Page + User Panel, hướng khách hàng, thoáng/đẹp |
| **Flutter App** | Tài xế, Tài xế trung chuyển | Mobile tối giản, thao tác nhanh, GPS ngầm |

---

## GIAI ĐOẠN 1 — Module Tài khoản & Phân quyền

| # | Task giao cho AI | Deliverable cần AI trả về | App | Trạng thái |
|---|---|---|---|---|
| 1.1 | Xác nhận cơ chế Refresh Token (JSON body hay Cookie) | Trích nguyên văn code response `/login` | — | ✅ |
| 1.2 | Xác nhận route thật `/api/users/me` | Trích nguyên văn routes | — | ⬜ |
| 1.3 | Viết UC03 Quên mật khẩu — đối chiếu code thật | Paste route + controller thật | — | ⬜ |
| 1.4 | Code `changePassword` | Paste nguyên hàm | — | ⬜ |
| 1.5 | Code `updateProfile` (whitelist + IDOR) | Paste nguyên hàm | — | ⬜ |
| 1.6 | Code `createStaffUser` + mật khẩu tạm | Paste nguyên hàm | — | ⬜ |
| 1.7 | Code Khóa/Mở khóa + chặn Self-Lock | Paste route + logic so sánh ID | — | ⬜ |
| 1.8 | Middleware `protect` — tra `status` từ DB? | Paste middleware | — | ⬜ |
| 1.9 | Trích Data Contract thật Module 1 | File `.md` | — | ⬜ |
| 1.10 | Test race condition Đăng ký | Log kết quả chạy thật | — | ⬜ |
| 1.11 | Test Revocation (`verify-revoke.js`) | Log kết quả chạy thật | — | ⬜ |
| 1.12a | Boilerplate: `types/user.types.ts` | File TS interface | Web | 🔄 (đang giao) |
| 1.12b | Boilerplate: `api/axiosClient.ts` | File TS + interceptor | Web | 🔄 (đang giao) |
| 1.12c | Boilerplate: `context/AuthContext.tsx` | File TSX | Web | 🔄 (đang giao) |
| 1.13 | Thiết kế Figma — Đăng ký/Đăng nhập/Quên MK/Hồ sơ | Link/ảnh Figma | Web | ⬜ |
| 1.14 | Code Frontend theo Data Contract + Figma (1.13) | Component + demo | Web | ⬜ |
| 1.15 | Thiết kế Figma — Admin: bảng User + Modal | Link/ảnh Figma | Admin | ⬜ |
| 1.16 | Code Frontend Admin User Management | Component + demo | Admin | ⬜ |
| 1.17 | Copy `components/ui`, `lib/utils.ts`, theme từ Web sang Admin | Xác nhận đã copy, diff nếu có sửa | Admin | ⬜ |
| 1.18 | Đối chiếu Frontend ↔ Backend: field có khớp không | Danh sách đối chiếu | Web+Admin | ⬜ |

---

## GIAI ĐOẠN 2 — Module Đơn hàng

| # | Task | Deliverable | App | Trạng thái |
|---|---|---|---|---|
| 2.1 | Code `createOrderCore()` | Paste nguyên hàm | — | ⬜ |
| 2.2 | Code `createOrder` (UC06) | Paste nguyên Controller | — | ⬜ |
| 2.3 | Code Idempotency (E11000 + payload_hash) | Paste đoạn try/catch | — | ⬜ |
| 2.4 | Code Transaction Order+OrderLog | Kết quả `rs.status()` + paste session | — | ⬜ |
| 2.5 | Test race condition tạo đơn | Log chạy thật | — | ⬜ |
| 2.6 | Test transaction rollback | Log chạy thật | — | ⬜ |
| 2.7 | Code `updateOrder` (UC07) | Paste Controller | — | ⬜ |
| 2.8 | Code `cancelOrder` (UC08) | Paste Controller | — | ⬜ |
| 2.9 | Code `trackOrder` (UC09, public) | Paste route + Controller | — | ⬜ |
| 2.10 | Code `getOrderTimeline` (UC10) | Paste Controller | — | ⬜ |
| 2.11 | Code sinh barcode (UC11) | File barcode mẫu | — | ⬜ |
| 2.12 | Viết `seed.js` — 13 trạng thái mẫu | File seed + kết quả | — | ⬜ |
| 2.13 | Trích Data Contract Module 2 | File `.md` | — | ⬜ |
| 2.14 | Boilerplate `types/order.types.ts` | File TS interface | Web | ⬜ |
| 2.15 | Thiết kế Figma — Tạo đơn, Danh sách, Chi tiết/Timeline (Seller) | Link/ảnh | Web | ⬜ |
| 2.16 | Code Frontend Seller — quản lý đơn | Component + demo | Web | ⬜ |
| 2.17 | Thiết kế Figma — Tra cứu đơn (Buyer, public) | Link/ảnh | Web | ⬜ |
| 2.18 | Code Frontend Buyer — tra cứu | Component + demo | Web | ⬜ |
| 2.19 | Thiết kế Figma — Admin xem toàn bộ đơn hàng | Link/ảnh | Admin | ⬜ |
| 2.20 | Code Frontend Admin — Order Management | Component + demo | Admin | ⬜ |
| 2.21 | (Sau) Import Excel | Paste Controller | — | ⬜ |
| 2.22 | (Sau) Đồng bộ API Sàn TMĐT | Paste Controller + webhook route | — | ⬜ |

---

## GIAI ĐOẠN 3 — Phân công tài xế (thủ công)

| # | Task | Deliverable | App | Trạng thái |
|---|---|---|---|---|
| 3.1 | Code API gán `driver_id` | Paste Controller | — | ⬜ |
| 3.2 | Thiết kế Figma — chọn tài xế cho đơn | Link/ảnh | Admin | ⬜ |
| 3.3 | Code Frontend | Component + demo | Admin | ⬜ |

---

## GIAI ĐOẠN 4 — Vận hành lõi (Lấy hàng → Kho → Giao hàng)

| # | Task | Deliverable | App | Trạng thái |
|---|---|---|---|---|
| 4.1 | Code UC12 Xác nhận lấy hàng | Paste Controller | — | ⬜ |
| 4.2 | Code cập nhật GPS | Paste Controller + Schema | — | ⬜ |
| 4.3 | Code UC16 Nhập kho | Paste Controller | — | ⬜ |
| 4.4 | Code API Quét mã QR (dùng chung) | Paste code + thư viện | — | ⬜ |
| 4.5 | Code đóng/mở seal | Paste Controller | — | ⬜ |
| 4.6 | Code luân chuyển liên kho | Paste Controller | — | ⬜ |
| 4.7 | Code UC17 Xuất kho đích | Paste Controller | — | ⬜ |
| 4.8 | Code UC13 Giao hàng + OTP/chữ ký | Paste Controller | — | ⬜ |
| 4.9 | Code UC14 Giao thất bại (max 3) | Paste Controller | — | ⬜ |
| 4.10 | Code UC15 Hoàn hàng | Paste Controller | — | ⬜ |
| 4.11 | Test full chain qua Postman | Log từng bước | — | ⬜ |
| 4.12 | Thiết kế Figma — App Tài xế | Link/ảnh | Flutter | ⬜ |
| 4.13 | Code Flutter — Tài xế lấy/giao hàng | Screen + demo | Flutter | ⬜ |
| 4.14 | Thiết kế Figma — Nhân viên kho | Link/ảnh | Admin | ⬜ |
| 4.15 | Code Frontend — Nhân viên kho | Component + demo | Admin | ⬜ |
| 4.16 | Thiết kế Figma — Live Tracking (Buyer) | Link/ảnh | Web | ⬜ |
| 4.17 | Code Frontend — Live Tracking | Component + demo | Web | ⬜ |
| 4.18 | (Sau) UC18 Kiểm kê kho | Paste Controller | — | ⬜ |

---

## GIAI ĐOẠN 5 — Tài chính

| # | Task | Deliverable | App | Trạng thái |
|---|---|---|---|---|
| 5.1 | Code UC22 Đối soát COD theo ca | Paste Controller | — | ⬜ |
| 5.2 | Code UC23 Thanh toán COD định kỳ | Paste job + lịch chạy | — | ⬜ |
| 5.3 | Code UC24 Quản lý công nợ | Paste Controller | — | ⬜ |
| 5.4 | Thiết kế Figma + Code — Đối soát (Kế toán) | Link/ảnh + demo | Admin | ⬜ |
| 5.5 | Thiết kế Figma + Code — Ví COD (Seller) | Link/ảnh + demo | Web | ⬜ |

---

## GIAI ĐOẠN 6 — Điều phối nâng cao (VRP, dự báo)

| # | Task | Deliverable | App | Trạng thái |
|---|---|---|---|---|
| 6.1 | Code thuật toán VRP đơn giản (JS) | Paste hàm + input/output mẫu | — | ⬜ |
| 6.2 | Code UC21 Điều chỉnh tuyến | Paste Controller | — | ⬜ |
| 6.3 | Code dự báo nhu cầu (đơn giản hóa) | Paste hàm tính toán | — | ⬜ |
| 6.4 | Thiết kế Figma — bản đồ tuyến, điều chỉnh | Link/ảnh | Admin | ⬜ |
| 6.5 | Code Frontend | Component + demo | Admin | ⬜ |

---

## GIAI ĐOẠN 7 — Báo cáo

| # | Task | Deliverable | App | Trạng thái |
|---|---|---|---|---|
| 7.1 | Aggregation — Báo cáo doanh thu | Paste query | — | ⬜ |
| 7.2 | Aggregation — Vận chuyển/SLA | Paste query | — | ⬜ |
| 7.3 | Aggregation — Hiệu suất/tài xế/COD | Paste query | — | ⬜ |
| 7.4 | Thiết kế Figma — Dashboard biểu đồ | Link/ảnh | Admin | ⬜ |
| 7.5 | Code Frontend (Chart.js/Recharts) | Component + demo | Admin | ⬜ |

---

## CÁCH BÁO CÁO TIẾN ĐỘ

```
Task: [số thứ tự, VD 2.3]
Đã làm: [mô tả ngắn 1-2 câu]
Code thật: [paste nguyên file/hàm liên quan — KHÔNG mô tả lại bằng lời]
Đã test: [có/chưa — nếu có, paste log kết quả chạy thật]
```

Không đánh dấu ✅ nếu chỉ có báo cáo bằng lời, chưa có code thật hoặc log chạy thử kèm theo.
