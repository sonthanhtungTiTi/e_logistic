# ĐẶC TẢ USE CASE: UC-07 — CẬP NHẬT ĐƠN HÀNG

---

## BẢNG 1: ĐẶC TẢ KỸ THUẬT VÀ XỬ LÝ SỰ KIỆN (TECHNICAL SPECIFICATION & EVENT LOGIC)

| Thành phần / Luồng | STT / Mã | Actor / Module | Logic kỹ thuật & Xử lý CSDL chi tiết (Node.js + Mongoose/MongoDB) |
| :--- | :--- | :--- | :--- |
| **Mã Use Case** | — | — | **UC-07** |
| **Tên Use Case** | — | — | **Cập nhật đơn hàng** |
| **Mô tả sơ lược** | — | — | Cho phép Seller cập nhật thông tin đơn hàng khi đơn còn ở các trạng thái cho phép (`CREATED`, `READY_TO_PICK`, `PENDING_VERIFICATION`). Hệ thống thực hiện Atomic Conditional Update chống TOCTOU Race Condition, Whitelist phòng chống Mass Assignment, tái sử dụng service tính lại cước phí và ghi log giao dịch atomic bằng Mongoose Session. |
| **Actor chính** | — | — | **Seller (Nhà bán hàng)** |
| **Actor phụ** | — | — | Không |
| **Tiền điều kiện** | — | — | 1. Seller đã đăng nhập thành công (JWT Access Token hợp lệ).<br>2. Đơn hàng thuộc sở hữu của Seller (`seller_id === req.user._id`).<br>3. Trạng thái đơn thuộc danh sách editable: `CREATED`, `READY_TO_PICK`, `PENDING_VERIFICATION`. |
| **Hậu điều kiện** | — | — | Đơn hàng được cập nhật thông tin mới trong MongoDB. Cước phí được tính toán lại nếu có thay đổi trường ảnh hưởng. Ghi log lịch sử `OrderLog` (`actionType: 'INFO_UPDATED'`). |

---

### LUỒNG SỰ KIỆN CHÍNH (MAIN FLOW)

| STT | Actor / Service | Chi tiết xử lý kỹ thuật |
| :---: | :--- | :--- |
| **1** | **Seller** | Chọn chức năng Cập nhật đơn hàng trên Web Portal/API (`PUT /api/orders/:id`). |
| **2-3** | **Hệ thống** | *(Order Controller)*: Tiếp nhận Request, lấy `sellerId` từ JWT Token (`req.user._id`). Nhận `:id` (MongoDB `_id` hoặc `trackingCode`). |
| **4-5** | **Hệ thống** | *(Whitelist & Sanitize)*: Lọc đúng các trường cho phép chỉnh sửa (`deliveryAddress`, `items`, `dimensions`, `actualWeight`, `codAmount`, `goodsValue`, `discountCode`, `deliveryNote`). Chặn tuyệt đối Mass Assignment. |
| **6-8** | **Hệ thống** | *(Pricing & Risk Re-check)*: Đọc thông tin đơn hàng hiện tại. So sánh nếu các trường ảnh hưởng cước (địa chỉ, khối lượng, kích thước, khai giá, mã giảm giá) thay đổi $\rightarrow$ Gọi `calculateOrderFees()` tính lại cước mới và re-evaluate Risk Engine (`evaluateRisk()`). |
| **9** | **Hệ thống** | *(Atomic Conditional Update)*: Thực hiện `findOneAndUpdate({ _id: id, sellerId: req.user._id, status: { $in: EDITABLE_STATUSES } }, { $set: updateData })` trong `session.withTransaction()`. Đảm bảo tính nguyên tử chống Race Condition (TOCTOU). |
| **10-11** | **Hệ thống** | Ghi nhận nhật ký thay đổi `OrderLog`. Commit Transaction thành công. |
| **12** | **Hệ thống** | Trả HTTP 200 OK kèm thông tin đơn hàng đã update, `fee_changed` (true/false), `old_fee` và `new_fee`. |

---

### LUỒNG THAY THẾ (ALTERNATE FLOW)

| Mã | Tình huống / Kích hoạt | Xử lý Kỹ thuật |
| :---: | :--- | :--- |
| **7.1** | Dữ liệu nhập sai định dạng | Joi Validator phát hiện dữ liệu lỗi (SĐT sai, khối lượng $\le 0$, COD $< 0$) $\rightarrow$ Trả HTTP 400 Bad Request. |
| **10.1** | Cập nhật không đổi cước | Các trường sửa đổi không ảnh hưởng cước (chỉ sửa tên người nhận, SĐT, ghi chú) $\rightarrow$ Giữ nguyên cước cũ, trả `fee_changed: false`. |

---

### LUỒNG NGOẠI LỆ (EXCEPTION FLOW)

| Mã | Tình huống / Kích hoạt | Xử lý Kỹ thuật |
| :---: | :--- | :--- |
| **4.1** | Trạng thái không hợp lệ | Đơn hàng đã chuyển sang `PICKING`, `PICKED`, `IN_TRANSIT`, `DELIVERED`, ... $\rightarrow$ Trả HTTP 409 Conflict với message "Đơn hàng đã được xử lý, không thể cập nhật." |
| **4.2** | Truy cập trái phép (IDOR) | Đơn hàng thuộc về Seller khác $\rightarrow$ Trả HTTP 403 Forbidden với message "Bạn không có quyền chỉnh sửa đơn hàng này." |
| **4.3** | Đơn hàng không tồn tại | Không tìm thấy đơn trong DB $\rightarrow$ Trả HTTP 404 Not Found với message "Đơn hàng không tồn tại." |
| **9.1** | Race Condition khi lưu | Trạng thái đơn bị tài xế/kho thay đổi thành `PICKING` trong khoảnh khắc Seller đang lưu $\rightarrow$ Atomic update thất bại (trả null), hệ thống query xác định nguyên nhân và trả HTTP 409 Conflict. |
| **10.2** | Lỗi tính lại cước phí | Không tìm thấy bưu cục hoặc đổi địa chỉ ngoài vùng phục vụ $\rightarrow$ Abort Transaction, trả HTTP 422 Unprocessable Entity kèm "Không thể tính lại phí vận chuyển. Vui lòng thử lại sau." |
| **11.1** | Lỗi CSDL / Máy chủ | Giao dịch DB bị ngắt $\rightarrow$ Abort Transaction, hoàn tác Rollback, trả HTTP 500 Internal Server Error. |

---

## BẢNG 2: BẢNG BÁO CÁO NGHIỆP VỤ (DÀNH CHO BÁO CÁO WORD)

### Đặc tả Use Case: Cập nhật đơn hàng

| Thành phần | Nội dung đặc tả nghiệp vụ |
| :--- | :--- |
| **Tên Use Case** | **Cập nhật đơn hàng** |
| **Mô tả sơ lược** | Use case này cho phép Người bán hàng (Seller) chỉnh sửa thông tin đơn hàng trước khi đơn được nhân viên lấy hàng hoặc chuyển sang các trạng thái không cho phép chỉnh sửa. Hệ thống kiểm tra quyền sở hữu, trạng thái hợp lệ và tính toán lại cước phí nếu có thay đổi. |
| **Actor chính** | Người bán hàng (Seller) |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Người bán hàng đã đăng nhập thành công; đơn hàng tồn tại trên hệ thống, thuộc quyền sở hữu của Seller và đang ở trạng thái "Mới tạo" hoặc "Chờ lấy hàng". |
| **Hậu điều kiện** | Thông tin đơn hàng được cập nhật thành công vào cơ sở dữ liệu, lưu lịch sử thay đổi (Audit Log) và cập nhật lại cước phí vận chuyển (nếu có thông tin thay đổi ảnh hưởng đến cước). |

#### 1. Luồng sự kiện chính (Main Flow)

| Người bán hàng (Seller) | Hệ thống (System) |
| :--- | :--- |
| 1. Chọn chức năng "Cập nhật đơn hàng". | |
| | 2. Hiển thị thông tin chi tiết đơn hàng ở chế độ chỉnh sửa. |
| 3. Chỉnh sửa các thông tin được phép: Thông tin người nhận, số điện thoại, địa chỉ giao hàng, thông tin hàng hóa, khối lượng, kích thước, tiền thu hộ COD, giá trị hàng hóa hoặc ghi chú giao hàng. | |
| 4. Bấm nút "Xác nhận lưu thay đổi". | |
| | 5. Hệ thống kiểm tra tính hợp lệ của dữ liệu vừa nhập (định dạng số điện thoại, các giá trị số không được nhỏ hơn 0). |
| | 6. Hệ thống kiểm tra điều kiện an toàn: Đảm bảo đơn hàng vẫn đang ở trạng thái cho phép chỉnh sửa tại chính xác thời điểm bấm lưu. |
| | 7. Nếu các trường thông tin thay đổi ảnh hưởng đến cước phí (địa chỉ, khối lượng, kích thước, giá trị khai giá), hệ thống tự động tính lại khối lượng tính cước và phí vận chuyển theo bảng giá hiện hành. |
| | 8. Cập nhật dữ liệu mới vào cơ sở dữ liệu và ghi nhận nhật ký thao tác lịch sử thay đổi. |
| | 9. Hiển thị thông báo "Cập nhật đơn hàng thành công" kèm chi tiết cước phí vận chuyển mới (nếu có thay đổi). |

#### 2. Luồng sự kiện thay thế (Alternate Flow)

| Tình huống / Điều kiện kích hoạt | Xử lý của Hệ thống (System) |
| :--- | :--- |
| **7.1. Dữ liệu nhập sai hoặc thiếu** (SĐT sai định dạng, khối lượng nhỏ hơn hoặc bằng 0, COD nhỏ hơn 0). | Hệ thống hiển thị thông báo lỗi chi tiết và yêu cầu Seller chỉnh sửa lại. |
| **10.1. Thông tin cập nhật không ảnh hưởng đến cước phí** (chỉ sửa tên người nhận, SĐT hoặc ghi chú). | Hệ thống cập nhật thông tin và giữ nguyên mức phí vận chuyển ban đầu. |

#### 3. Luồng sự kiện ngoại lệ (Exception Flow)

| Tình huống / Điều kiện kích hoạt | Xử lý của Hệ thống (System) |
| :--- | :--- |
| **4.1. Đơn hàng đã được xác nhận lấy hàng hoặc đang vận chuyển.** | Hệ thống từ chối cho chỉnh sửa và hiển thị thông báo "Đơn hàng đã được xử lý, không thể cập nhật." |
| **4.2. Seller cố tình chỉnh sửa đơn hàng của người bán khác.** | Hệ thống hiển thị thông báo "Bạn không có quyền chỉnh sửa đơn hàng này." và từ chối xử lý. |
| **9.1. Đơn hàng vừa chuyển sang trạng thái lấy hàng trong lúc Seller đang bấm lưu.** | Hệ thống hủy thao tác lưu, hiển thị thông báo "Đơn hàng đã được xử lý, không thể cập nhật." và kết thúc use case. |
| **10.2. Không thể tính lại phí vận chuyển do địa chỉ nằm ngoài phạm vi phục vụ hoặc lỗi bảng giá.** | Hệ thống hủy thao tác cập nhật, khôi phục dữ liệu ban đầu và hiển thị thông báo "Không thể tính lại phí vận chuyển. Vui lòng thử lại sau." |
| **11.1. Sự cố cơ sở dữ liệu hoặc máy chủ trong lúc đang lưu.** | Hệ thống hoàn tác toàn bộ thay đổi và hiển thị thông báo "Cập nhật đơn hàng thất bại. Vui lòng thử lại sau." |
