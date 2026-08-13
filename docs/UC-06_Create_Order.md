# ĐẶC TẢ USE CASE: UC-06 — TẠO ĐƠN HÀNG, TÍNH CƯỚC PHÍ VÀ SINH MÃ VẬN ĐƠN

---

## BẢNG 1: ĐẶC TẢ KỸ THUẬT VÀ XỬ LÝ SỰ KIỆN (TECHNICAL SPECIFICATION & EVENT LOGIC)

| Thành phần / Luồng | STT / Mã | Actor / Module | Logic kỹ thuật & Xử lý CSDL chi tiết (Node.js + Mongoose/MongoDB) |
| :--- | :--- | :--- | :--- |
| **Mã Use Case** | — | — | **UC-06** |
| **Tên Use Case** | — | — | **Tạo đơn hàng, tính cước phí và sinh mã vận đơn** |
| **Mô tả sơ lược** | — | — | Cho phép Seller tạo mới đơn hàng trên Web Portal hoặc qua API. Hệ thống validate dữ liệu đầu vào, loại bỏ các trường bị cấm (Whitelist), tự động tính Chargeable Weight (làm tròn lên $0.5\text{ kg}$) và cước phí (+ phí khai giá) ở Server, định tuyến Bưu cục theo Tỉnh/Quận-Huyện, sinh `tracking_id` duy nhất, sàng lọc rủi ro tài chính và lưu an toàn vào MongoDB qua Mongoose Transaction Session. |
| **Actor chính** | — | — | **Seller (Nhà bán hàng)** |
| **Actor phụ** | — | — | Không có (Các module Pricing, Routing, Risk Engine là service nội bộ cùng Express App). |
| **Tiền điều kiện** | — | — | 1. Seller đã xác thực JWT Access Token hợp lệ, status = `"ACTIVE"`.<br>2. Hồ sơ Seller đã có địa chỉ lấy hàng mặc định. |
| **Hậu điều kiện** | — | — | Đơn hàng được tạo thành công với `tracking_id` duy nhất. Trạng thái đơn ở mức `CREATED` (hợp lệ) hoặc `PENDING_VERIFICATION` (bị dán cờ rủi ro). Tiền cước/COD lưu dạng Integer (Đồng). Ghi nhận `OrderLog`. |

---

### LUỒNG SỰ KIỆN CHÍNH (MAIN FLOW)

| STT | Actor / Service | Chi tiết xử lý kỹ thuật |
| :---: | :--- | :--- |
| **1** | **Seller** | Truy cập màn hình "Tạo đơn hàng", nhập: Người nhận, Địa chỉ nhận (Tỉnh/Thành, Quận/Huyện, Phường/Xã, Chi tiết), Hàng hóa (Tên, Khối lượng thực $\text{kg}$), Kích thước $D \times R \times C\text{ cm}$ (tùy chọn), COD, Khai giá (`goods_value`), Mã giảm giá. Client tự tạo chuỗi `idempotency_key` (UUIDv4) gán vào Request Header. |
| **2** | **Seller** | Bấm nút "Lấy báo giá". |
| **3** | **Hệ thống** | *(Express Middleware)*: Kiểm tra IP Rate Limit. Whitelist Payload dữ liệu (chặn các trường `actual_fee`, `chargeable_weight` từ Client). Validate điều kiện biên: khối lượng $> 0$, kích thước $\ge 0$, $\text{COD} \ge 0$. |
| **4** | **Hệ thống** | *(Pricing Service)*: Tính $\text{Chargeable Weight} = \max(\text{khối lượng thực}, (D \times R \times C) / 5000)$, làm tròn lên bậc $0.5\text{ kg}$ gần nhất (`Math.ceil(weight * 2) / 2`). Query Master Data Hubs theo Tỉnh/Quận-Huyện. Tính cước phí gốc + Phí khai giá/bảo hiểm (nếu `goods_value > 0`), áp mã giảm giá. Trả kết quả báo giá cho Seller xem trước (chưa lưu CSDL). |
| **5** | **Seller** | Kiểm tra chi tiết báo giá, bấm nút "Xác nhận tạo đơn hàng". |
| **6** | **Hệ thống** | *(Order Controller)*: Tiếp nhận Request. Kiểm tra `order_id_san` (nếu là đơn TMĐT) hoặc sử dụng `idempotency_key` (nếu Seller tạo đơn tay) để chuẩn bị ghi Unique Index. |
| **7** | **Hệ thống** | *(Id Generator)*: Sinh Mã vận đơn (`tracking_id`) duy nhất theo chuẩn hệ thống (VD: `ELG100293848VN`). |
| **8** | **Hệ thống** | *(Risk Engine Logic)*: Server tự recalculate 100% cước phí từ dữ liệu thô (chống Parameter Tampering). So sánh cước phí/COD với ngưỡng rủi ro:<br>– Không vượt ngưỡng: `status = "CREATED"`.<br>– Vượt ngưỡng: Gắn cờ `flag_fee_warning` / `flag_cod_anomaly`, `status = "PENDING_VERIFICATION"`. |
| **9** | **Hệ thống** | *(Mongoose Session)*: Exec `await mongoose.startSession()`. Chạy `session.withTransaction()` ghi đồng thời 2 Collection: `Order` (ép kiểu `cod_amount`, `actual_fee`, `goods_value` thành Integer - Đồng) và `OrderLog`. Commit Transaction. |
| **10** | **Hệ thống** | Trả HTTP 201 Created kèm JSON thông tin đơn hàng, `tracking_id`, `status` và URL in nhãn vận đơn. |

---

### LUỒNG THAY THẾ (ALTERNATE FLOW)

| Mã | Tình huống / Kích hoạt | Xử lý Kỹ thuật |
| :---: | :--- | :--- |
| **3.1** | Validator Error | Dữ liệu sai định dạng (SĐT sai, khối lượng $\le 0$, kích thước $< 0$, COD $< 0$) $\rightarrow$ Express Validator / Joi trả HTTP 400 Bad Request kèm danh sách lỗi từng trường. |
| **4.1** | Trống $D \times R \times C$ | Bỏ qua Volumetric Weight, hệ thống dùng trực tiếp Khối lượng thực tế (đã làm tròn lên bậc $0.5\text{ kg}$) làm Chargeable Weight để tính cước. |
| **4.2** | Mã giảm giá lỗi | Mã hết hạn/hết lượt $\rightarrow$ Thông báo lỗi, tính lại cước phí theo giá gốc, yêu cầu Seller xác nhận đồng ý tạo đơn theo giá gốc hoặc đổi mã khác. |
| **4.3** | Trống tiền COD | Seller không nhập COD hoặc COD = 0 $\rightarrow$ Tự động gán `is_cod = false` và `cod_amount = 0`. |
| **8.1** | Vượt ngưỡng rủi ro | Cước phí/COD vượt ngưỡng $\rightarrow$ Khởi tạo đơn ở `status = "PENDING_VERIFICATION"`, thông báo "Đơn hàng đang chờ Kế toán/CSKH kiểm tra", tự động tạo Ticket tra soát. |

---

### LUỒNG NGOẠI LỆ (EXCEPTION FLOW)

| Mã | Tình huống / Kích hoạt | Xử lý Kỹ thuật |
| :---: | :--- | :--- |
| **3.2** | Rate Limit Exceeded | IP gửi request vượt tần suất cho phép $\rightarrow$ Middleware chặn và trả HTTP 429 Too Many Requests, ngưng xử lý Use Case. |
| **5.1** | Outside Service Area | Địa chỉ lấy/giao hàng không khớp mã Tỉnh/Quận-Huyện trong Master Data Hubs $\rightarrow$ HTTP 400 Bad Request kèm "Địa chỉ không thuộc phạm vi phục vụ", kết thúc Use Case. |
| **6.1** | Duplicate Key (E11000) | Catch block bắt lỗi Duplicate Unique Index (`order_id_san` / `idempotency_key`):<br>– `payload_hash` trùng khớp $\rightarrow$ Trả về đơn hàng cũ đã tạo trước đó kèm HTTP 200 OK.<br>– `payload_hash` khác biệt $\rightarrow$ Trả về HTTP 409 Conflict. |
| **8.2** | Routing Unmapped | Địa chỉ hợp lệ nhưng chưa mapping được Hub cụ thể $\rightarrow$ Gán tạm Hub cấp Tỉnh, bật cờ `needs_manual_routing = true`, lưu đơn ở `PENDING_VERIFICATION` để Điều phối viên rà soát tay. |
| **9.1** | DB / Server Crash | Lỗi ghi CSDL $\rightarrow$ Kích hoạt `await session.abortTransaction(); session.endSession();` để hoàn tác giao dịch và giải phóng connection, trả HTTP 500 Internal Server Error, kết thúc Use Case. |

---

### GHI CHÚ KỸ THUẬT (TECHNICAL NOTES)

1. **Chargeable Weight**: $\text{Volumetric Weight} = (D \times R \times C) / 5000$. Làm tròn lên bậc $0.5\text{ kg}$ gần nhất (`Math.ceil(weight * 2) / 2`).
2. **Server-side Recalculation**: Server tự tính lại 100% cước phí tại Bước 8 từ dữ liệu thô, không tin cước do Client gửi lên.
3. **Replica Set**: Mongoose Session yêu cầu MongoDB chạy chế độ Replica Set (`rs.status()`).
4. **Idempotence**: Dựa hoàn toàn vào MongoDB Unique Index (`E11000`) + `payload_hash`, không dùng Redis trong Use Case này.

---

## BẢNG 2: BẢNG BÁO CÁO NGHIỆP VỤ (DÀNH CHO BÁO CÁO WORD)

### Đặc tả Use Case: Tạo đơn hàng

| Thành phần | Nội dung đặc tả nghiệp vụ |
| :--- | :--- |
| **Tên Use Case** | **Tạo đơn hàng** |
| **Mô tả sơ lược** | Use case này cho phép Người bán hàng (Seller) tạo mới đơn hàng vận chuyển trên hệ thống. Hệ thống sẽ kiểm tra thông tin, tự động tính toán cước phí vận chuyển, xác định bưu cục xử lý, cấp Mã vận đơn duy nhất và lưu thông tin đơn hàng vào hệ thống. |
| **Actor chính** | Người bán hàng (Seller) |
| **Actor phụ** | Không |
| **Tiền điều kiện (Pre-condition)** | Người bán hàng đã đăng nhập thành công vào hệ thống và đã thiết lập địa chỉ lấy hàng mặc định trong hồ sơ cá nhân. |
| **Hậu điều kiện (Post-condition)** | Đơn hàng được tạo thành công, được cấp Mã vận đơn duy nhất và lưu vào cơ sở dữ liệu ở trạng thái "Mới tạo" (hoặc "Chờ xác minh" nếu cước phí/tiền thu hộ bất thường). Hệ thống hiển thị thông báo tạo đơn thành công. |

#### 1. Luồng sự kiện chính (Main Flow)

| Người bán hàng (Seller) | Hệ thống (System) |
| :--- | :--- |
| 1. Chọn chức năng “Tạo đơn hàng”, nhập/chọn thông tin bao gồm: Thông tin người nhận, địa chỉ giao hàng (Tỉnh/Thành, Quận/Huyện, Phường/Xã, địa chỉ chi tiết), tên hàng hóa, khối lượng thực tế, kích thước kiện hàng (Dài × Rộng × Cao - tùy chọn), tiền thu hộ (COD), giá trị hàng hóa và mã giảm giá (nếu có). | |
| 2. Nhấn nút “Lấy báo giá”. | |
| | 3. Hệ thống kiểm tra tính đầy đủ và hợp lệ của thông tin vừa nhập (các trường bắt buộc, định dạng số điện thoại chuẩn, các giá trị tiền mặt và khối lượng không được nhỏ hơn hoặc bằng 0). |
| | 4. Hệ thống tự động tính khối lượng tính cước (so sánh giữa khối lượng thực tế và khối lượng quy đổi từ kích thước thể tích, chọn giá trị lớn hơn và làm tròn lên bậc 0.5 kg gần nhất). Hệ thống xác định bưu cục phục vụ, tính tổng cước phí vận chuyển (bao gồm phí bảo hiểm nếu có), áp dụng mã giảm giá và hiển thị bảng chi tiết báo giá cho Seller xem trước (chưa lưu đơn vào cơ sở dữ liệu). |
| 5. Kiểm tra chi tiết báo giá cước phí và nhấn nút “Xác nhận tạo đơn hàng”. | |
| | 6. Hệ thống kiểm tra thông tin định danh đơn hàng để phòng ngừa trường hợp Seller thao tác bấm tạo trùng đơn. |
| | 7. Hệ thống tự động khởi tạo Mã vận đơn duy nhất cho đơn hàng (Ví dụ: `ELG100293848VN`). |
| | 8. Hệ thống tự động tính toán lại cước phí từ dữ liệu gốc và kiểm tra ngưỡng an toàn tài chính (cước phí và tiền thu hộ COD):<br>− Nếu trong ngưỡng an toàn: Đặt trạng thái đơn hàng là "Mới tạo".<br>− Nếu cước phí hoặc tiền COD cao bất thường: Gắn cờ cảnh báo rủi ro và chuyển trạng thái đơn hàng sang "Chờ xác minh". |
| | 9. Hệ thống tiến hành lưu chính thức toàn bộ thông tin đơn hàng và ghi nhận nhật ký thao tác vào cơ sở dữ liệu. |
| | 10. Hệ thống hiển thị thông báo “Tạo đơn hàng thành công” kèm Mã vận đơn, trạng thái đơn hàng và đường dẫn để in nhãn dán vận đơn lên kiện hàng. |

#### 2. Luồng sự kiện thay thế (Alternate Flow)

| Tình huống / Điều kiện kích hoạt | Xử lý của Hệ thống (System) |
| :--- | :--- |
| **3.1. Dữ liệu nhập thiếu hoặc sai định dạng** (số điện thoại sai định dạng, khối lượng nhỏ hơn hoặc bằng 0, giá trị COD nhỏ hơn 0). | Hệ thống hiển thị thông báo lỗi chi tiết bên dưới từng trường thông tin nhập sai và yêu cầu Seller bổ sung, chỉnh sửa. |
| **4.1. Seller không nhập thông tin kích thước kiện hàng** (Dài × Rộng × Cao). | Hệ thống bỏ qua phần tính khối lượng quy đổi thể tích, sử dụng trực tiếp khối lượng thực tế (đã làm tròn lên bậc 0.5 kg) để tính cước phí vận chuyển. |
| **4.2. Mã giảm giá không hợp lệ, hết hạn hoặc hết lượt sử dụng.** | Hệ thống hiển thị thông báo “Mã khuyến mãi không hợp lệ hoặc đã hết lượt sử dụng”, tự động tính lại cước phí theo giá gốc và yêu cầu Seller xác nhận tiếp tục tạo đơn hoặc nhập mã khác. |
| **4.3. Seller không nhập tiền thu hộ COD hoặc nhập số tiền bằng 0.** | Hệ thống tự động ghi nhận đơn hàng không có thu hộ tiền mặt (COD = 0). |
| **8.1. Tiền thu hộ COD hoặc cước phí vượt ngưỡng an toàn tài chính** của hệ thống. | Hệ thống tạo đơn hàng ở trạng thái “Chờ xác minh”, hiển thị thông báo cho Seller “Đơn hàng đang chờ bộ phận Kế toán/CSKH kiểm tra lại trước khi xử lý” và gửi yêu cầu tra soát nội bộ. |

#### 3. Luồng sự kiện ngoại lệ (Exception Flow)

| Tình huống / Điều kiện kích hoạt | Xử lý của Hệ thống (System) |
| :--- | :--- |
| **3.2. Seller gửi yêu cầu tạo đơn quá nhiều lần liên tục** trong khoảng thời gian ngắn. | Hệ thống tạm thời từ chối xử lý và hiển thị thông báo “Thao tác quá nhanh, vui lòng thử lại sau ít phút”. |
| **5.1. Địa chỉ lấy hàng hoặc địa chỉ giao hàng nằm ngoài khu vực** bưu cục phục vụ. | Hệ thống hiển thị thông báo “Địa chỉ không thuộc phạm vi phục vụ của hệ thống” và kết thúc use case. |
| **6.1. Đơn hàng bị gửi lặp lại** (do trùng đơn từ sàn Thương mại điện tử hoặc do Seller bấm nút gửi nhiều lần). | − Nếu nội dung đơn gửi lại hoàn toàn giống đơn cũ: Hệ thống hiển thị lại ngay thông tin đơn hàng đã tạo thành công trước đó.<br>− Nếu mã đơn trùng nhưng nội dung thông tin khác nhau: Hệ thống thông báo “Mã đơn hàng đã tồn tại trên hệ thống” và từ chối tạo đơn. |
| **8.2. Địa chỉ giao nhận hợp lệ nhưng chưa tìm thấy bưu cục** phụ trách trực tiếp. | Hệ thống tạm thời gán đơn về bưu cục mặc định cấp Tỉnh/Thành, lưu đơn ở trạng thái “Chờ xác minh” để bộ phận Điều phối viên phân bổ thủ công. |
| **9.1. Sự cố mất kết nối cơ sở dữ liệu hoặc lỗi máy chủ** trong lúc đang lưu đơn hàng. | Hệ thống tự động hủy bỏ toàn bộ thao tác lưu dở dang để bảo toàn dữ liệu, hiển thị thông báo “Tạo đơn hàng thất bại. Vui lòng thử lại sau” và kết thúc use case. |
