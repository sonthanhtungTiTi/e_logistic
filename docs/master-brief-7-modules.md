# MASTER BRIEF: E-Logistics System — Định hướng 7 Module
## Dùng cho AI thực hiện Backend/Frontend + Vai trò Giám sát (Senior Reviewer)

---

## 0. CÁCH DÙNG TÀI LIỆU NÀY

Tài liệu này có 2 vai trò song song:
1. **Định hướng cho AI thực hiện** (code Backend, thiết kế Stitch, code Frontend) — biết làm module nào trước, làm nông hay sâu, dựa trên data gì.
2. **Checklist giám sát** — trước khi coi 1 module là "xong", đối chiếu với danh sách lỗi thường gặp ở mục 1. Đây là các loại lỗi đã thực sự xảy ra trong quá trình phát triển dự án này, không phải lý thuyết suông.

**Quy tắc vàng xuyên suốt dự án**: Không có gì được coi là "đã xong" chỉ vì AI báo cáo đã code — mọi khẳng định bảo mật/logic quan trọng phải được xác nhận bằng cách mở đúng file code thật, hoặc chạy thử thực tế (script test, Postman). Báo cáo bằng lời không phải bằng chứng.

---

## 1. DANH SÁCH LỖI THƯỜNG GẶP — DÙNG LÀM CHECKLIST GIÁM SÁT MỌI MODULE

Đây là các loại lỗi đã từng xảy ra thật trong dự án, cần kiểm tra lại ở MỌI module mới, không riêng module đã phát hiện:

| # | Loại lỗi | Cách kiểm tra |
|---|---|---|
| 1 | **Đặc tả/Data Contract bị AI "bịa"** thay vì trích từ code thật (VD: sai cơ chế Refresh Token, sai tên role) | Đối chiếu từng field với code thật, không tin mô tả nếu chưa thấy code |
| 2 | **Mass Assignment / Privilege Escalation** — client tự gửi field nhạy cảm (`role`, `status`, `actual_fee`...) | Whitelist rõ input ở Controller, không bao giờ `new Model(req.body)` trực tiếp |
| 3 | **IDOR** — lấy ID đối tượng cần sửa từ `req.params`/`req.body` thay vì từ `req.user` (token) | Route sửa dữ liệu cá nhân luôn dùng `req.user._id`, không tin ID client gửi |
| 4 | **Race Condition / thiếu Idempotency** — 2 request đồng thời vượt qua check trùng lặp | Bọc thao tác ghi trong try/catch bắt lỗi E11000, kèm test bằng `Promise.all` |
| 5 | **Hash chồng hash mật khẩu** — thiếu `isModified('password')` trong pre-save hook | Test: đăng ký → login → sửa field khác → login lại, phải vẫn đăng nhập được |
| 6 | **Hardcode secret / fallback nguy hiểm** (`JWT_SECRET \|\| 'default'`) | Grep toàn bộ code tìm `\|\|` cạnh biến secret |
| 7 | **Revocation không thật** — xóa `refreshToken` trong DB nhưng endpoint `/refresh` không đối chiếu lại DB | Test: logout xong, dùng refresh token cũ gọi `/refresh`, phải nhận 401 |
| 8 | **Self-Lock** — Admin tự khóa/đổi role chính mình | So sánh `:id` với `req.user._id`, chặn nếu trùng |
| 9 | **Message lỗi không nhất quán** giữa các bản mô tả/test case và code thật | Copy nguyên văn message từ code, không tự diễn giải lại |
| 10 | **Đặc tả "hứa" điều kiến trúc hiện tại không làm được** (VD: JWT stateless nhưng hứa "hủy phiên ngay lập tức") | Đối chiếu lời hứa với cơ chế kỹ thuật thật đang dùng |
| 11 | **Không tách log lỗi phụ khỏi luồng chính** (Audit Log lỗi làm sập cả request) | Dùng try/catch lồng riêng cho tác vụ phụ, không dùng chung khối với tác vụ chính |

---

## 2. NGUYÊN TẮC PHÂN BỔ ĐỘ SÂU (Nhóm A / Nhóm B)

**Nhóm A — Làm gọn, đủ dùng**: CRUD cơ bản, không cần sáng tạo UI, ưu tiên tốc độ.
**Nhóm B — Đầu tư sâu**: các điểm thể hiện tư duy hệ thống, đáng làm UI đẹp + demo trực quan cho hội đồng.

Áp dụng cho từng module ở mục 3.

---

## 3. CHI TIẾT 7 MODULE

### MODULE 1 — Tài khoản & Phân quyền
**Trạng thái**: Backend cơ bản đã xong (Register, Login, Logout, Refresh Token revocation).
**Nhóm**: A cho toàn bộ UI (form chuẩn), B riêng phần Refresh Token Revocation (đáng demo).
**Phụ thuộc**: Không — làm trước tiên.
**Còn thiếu/cần xác nhận**:
- Route và cơ chế Refresh Token (JSON body hay Cookie) — PHẢI chốt trước khi code Frontend.
- UC03 Quên mật khẩu: đã có đặc tả riêng, nhưng dịch vụ gửi Email/OTP thực tế chưa rõ đã triển khai hay còn kế hoạch.
- Quyết định tạm: Phân quyền gộp chung vào Quản lý người dùng (role dạng enum đơn giản, không xây bảng Permission riêng) — có thể đổi sau nếu còn thời gian.
**Checklist riêng**: lỗi #2, #3, #5, #6, #7, #8, #9 ở mục 1 đều liên quan trực tiếp module này.

### MODULE 2 — Quản lý đơn hàng
**Trạng thái**: Schema đã thiết kế kỹ (Order, OrderLog), Controller đang/sẽ code.
**Nhóm**: A cho CRUD cơ bản (Cập nhật, Hủy, Tra cứu); **B rất rõ** cho Tạo đơn hàng (Idempotency + tính cước tự động) — đây là điểm kỹ thuật đáng đầu tư nhất của cả đồ án, nên làm UI/UX thể hiện rõ được (VD: hiện trạng thái "đang xử lý chống trùng" khi submit).
**Phụ thuộc**: Cần Module 1 xong (mọi thao tác đơn hàng đều gắn với `seller_id` từ token).
**Việc cần làm chung cho UC06/Import Excel/Đồng bộ API**: dùng chung 1 hàm lõi `createOrderCore()`, tránh viết lặp lại 3 lần logic tính cước + idempotency.
**Checklist riêng**: lỗi #1 (financials phải Integer), #2 (chargeable_weight/actual_fee không tin client), #4 (idempotency là trọng tâm module này).

### MODULE 5 (rút gọn) — Phân công tài xế thủ công
**Trạng thái**: Chưa làm, cần làm NGAY sau Module 2 để unblock Module 3+4.
**Nhóm**: A — chỉ cần chọn tay tài xế, gán `driver_id` vào Order, chưa cần thuật toán.
**Phụ thuộc**: Module 2 (cần có Order tồn tại).
**Lý do tách khỏi Module 5 gốc**: nếu để cuối, Module 3+4 không có dữ liệu để test luồng lấy/giao hàng.

### MODULE 3 + 4 — Vận hành lõi (Lấy hàng → Kho → Giao hàng), gộp theo State Machine
**Trạng thái**: Chưa làm — đây là module lớn nhất, chiếm nhiều thời gian nhất.
**Nhóm**: B rất rõ — State Machine 13 trạng thái là điểm nhấn trực quan dễ ăn điểm nhất khi demo (timeline UI đẹp, dễ hiểu với hội đồng không rành kỹ thuật). Live GPS Tracking cũng thuộc nhóm B.
**Phụ thuộc**: Module 2 + Module 5 (rút gọn).
**Thứ tự bắt buộc theo đúng State Machine** (không đảo được):
```
UC12 Lấy hàng → Nhập kho gốc → Phân loại → Đóng seal → 
Luân chuyển liên kho → Nhập kho đích → Xuất kho → 
UC13 Giao hàng (+ OTP/chữ ký) → UC14 Giao thất bại (tối đa 3 lần) → UC15 Hoàn hàng
```
**Cần làm sớm trong module này**: Cập nhật vị trí GPS — vì Module 2 (Theo dõi đơn hàng) cần dữ liệu này để hiển thị Live Tracking, dù về mặt số thứ tự UC nó thuộc module khác.
**Mẹo test Frontend khi Backend chưa hoàn chỉnh cả chuỗi**: viết `seed.js` tạo sẵn đơn hàng mẫu ở đủ 13 trạng thái để test UI timeline mà không cần chạy tuần tự qua Postman.

### MODULE 6 — Tài chính (Đối soát & Thanh toán COD)
**Trạng thái**: Chưa làm.
**Nhóm**: A cho UI (bảng đối soát, form xác nhận) — B cho phần logic đối soát tự động định kỳ (Sub-process 8B chạy `node-cron` theo lịch Thứ 3/Thứ 6) nếu muốn nhấn mạnh tự động hóa.
**Phụ thuộc**: Module 3+4 (cần dữ liệu `cod_amount` thật đã thu từ tài xế).

### MODULE 5 (phần còn lại) — Điều phối nâng cao (VRP, dự báo)
**Trạng thái**: Chưa làm, cố tình để cuối vì độ khó cao.
**Nhóm**: B — đây là điểm PR kỹ thuật lớn thứ 2 sau Idempotency, dù thuật toán đơn giản hóa vẫn nên đầu tư UI bản đồ + tuyến đường trực quan.
**Quyết định tạm**: viết thuật toán VRP đơn giản hóa (nearest neighbor/greedy) bằng JavaScript thuần, KHÔNG dựng Python FastAPI riêng — tránh thêm 1 stack công nghệ mới vào cuối đồ án. Có thể đổi nếu còn nhiều thời gian.
**Phụ thuộc**: Module 3+4 (đã có dữ liệu đơn hàng thật để tối ưu tuyến).

### MODULE 7 — Báo cáo
**Trạng thái**: Chưa làm, làm sau cùng.
**Nhóm**: A — dùng MongoDB Aggregation Pipeline trên dữ liệu đã có, không cần schema mới.
**Phụ thuộc**: Tất cả module trước — cần có dữ liệu thật mới có gì để tổng hợp.

---

## 4. QUY TRÌNH BÀN GIAO CHUẨN CHO MỖI MODULE (lặp lại 7 lần)

```
1. Code Backend module → tự test bằng Postman/script race-condition nếu có
2. Trích xuất Data Contract THẬT từ code (copy nguyên văn route, field, message lỗi)
   → không dùng mô tả tự "nhớ lại", luôn copy trực tiếp từ file
3. Đối chiếu Data Contract với checklist mục 1 — xác nhận không dính lỗi nào
4. Soạn brief cho Stitch: Design system chung + danh sách màn hình 
   (lấy từ Main Flow của đặc tả UC) + state lỗi (từ Alternate/Exception Flow)
5. Giao Data Contract + Figma cho AI code Frontend — yêu cầu bám đúng 
   tên field, không tự đặt tên khác
6. Sau khi Frontend xong: đối chiếu ngược — field FE gửi có khớp Joi 
   schema Backend không, có xử lý đủ mọi message lỗi đã liệt kê không
7. Coi module hoàn tất → chuyển module tiếp theo theo đúng thứ tự phụ thuộc ở mục 3
```

---

## 5. VAI TRÒ GIÁM SÁT — CÁCH DÙNG

Khi đưa module mới cho AI thực hiện (dù là Backend, Stitch, hay Frontend), nộp lại kết quả kèm:
- Đúng file code thật (không phải mô tả lại bằng lời).
- Kết quả chạy thử thật (log Postman, ảnh chụp, output script test) cho các mục ở checklist #4, #5, #7.

Việc giám sát sẽ **từ chối coi là "xong"** nếu chỉ có báo cáo bằng lời mà chưa có bằng chứng chạy thực tế — đặc biệt với các lỗi #4 (Race Condition) và #7 (Revocation), vì đây là 2 loại lỗi từng bị báo "đã sửa" nhiều lần trước khi thực sự được xác nhận đúng.
