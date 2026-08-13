# BÁO CÁO ĐẶC TẢ KỸ THUẬT & NGHIỆP VỤ USE CASE UC-08: HỦY ĐƠN HÀNG

---

## BẢNG 1: TỔNG HỢP LOGIC KỸ THUẬT & XỬ LÝ CSDL CHI TIẾT (NODE.JS + MONGOOSE / MONGODB)

| Thành phần / Luồng | Nội dung Mô tả Kỹ thuật & Logic Xử lý CSDL Chi tiết |
| :--- | :--- |
| **STT / Mã Use Case** | **UC-08** |
| **Tên Use Case** | **Hủy đơn hàng (Single & Bulk Order Cancellation)** |
| **Mô tả sơ lược** | Cho phép Seller/Admin hủy đơn hàng đã tạo khi đơn chưa chuyển sang các trạng thái vận chuyển kho/giao hàng. Hệ thống kiểm tra điều kiện trạng thái nguyên tử (Atomic Status Guard) loại bỏ hoàn toàn TOCTOU Race Condition, cập nhật trạng thái đơn thành `CANCELLED`, lưu lý do hủy, ghi log audit trace nguyên tử và xử lý tác vụ gửi thông báo cho Điều phối viên dưới dạng Background Async Task (Alt 8.1). |
| **Actor chính / Phụ** | **Actor chính**: Seller (Nhà bán hàng), Admin (Quản trị viên hệ thống).<br>**Actor phụ**: Điều phối viên (Dispatcher Service / Event System). |
| **Tiền điều kiện** | 1. Actor đã đăng nhập JWT Access Token hợp lệ (`protect` middleware).<br>2. Đơn hàng thuộc quyền sở hữu của Seller (`sellerId === req.user._id`) hoặc Actor có vai trò `ADMIN`.<br>3. Trạng thái đơn hàng nằm trong danh sách được phép hủy (`CREATED`, `PENDING_VERIFICATION`, `READY_TO_PICK`). |
| **Route & Middleware** | - `DELETE /api/orders/:id/cancel` (Hủy đơn hàng đơn lẻ)<br>- `POST /api/orders/bulk-cancel` (Hủy hàng loạt đơn hàng)<br>- Middleware: `protect`, `authorize('SELLER', 'ADMIN')` |
| **Input Payload Validation** | Sử dụng **Joi Schema** kiểm tra đầu vào:<br>- `reason`: Bắt buộc thuộc Enum `['SELLER_CHANGED_MIND', 'WRONG_INFO', 'OUT_OF_STOCK', 'OTHER']`.<br>- `customReason`: Khi `reason === 'OTHER'`, bắt buộc có ít nhất 5 ký tự (`Joi.string().min(5).required()`).<br>- Lỗi validation trả về `HTTP 400 Bad Request`. |
| **Xử lý Đồng thời & Atomic Guard** | **Loại bỏ triệt để TOCTOU Race Condition**:<br>Sử dụng `findOneAndUpdate` với bộ lọc atomic query:<br>`const atomicFilter = { _id: orderId, ...(isAdmin ? {} : { sellerId }), status: { $in: ['CREATED', 'PENDING_VERIFICATION', 'READY_TO_PICK'] } };`<br>Nếu trạng thái đơn đã nhảy sang `PICKING`, `IN_TRANSIT`..., query trả về `null` và hệ thống trả lỗi `HTTP 409 Conflict` (Lỗi `ORDER_STATUS_LOCKED`). |
| **Mongoose Transaction & Audit Trace** | Tích hợp **Mongoose Session Transaction** (`startTransaction` / `commitTransaction` / `abortTransaction`):<br>1. Cập nhật `status: 'CANCELLED'`, `cancelReason`, `cancelNote`, `cancelledBy`, `cancelledAt` trong `Order`.<br>2. Tạo bản ghi `OrderLog` mới với `actionType: 'CANCELLED'` trong cùng session.<br>Nếu 1 trong 2 bước thất bại, toàn bộ thao tác tự động Rollback. |
| **Xử lý Tác vụ Phụ Async (Alt 8.1 - Dispatcher Notification)** | **Tách biệt khỏi Transaction Mongoose**:<br>Sau khi transaction hủy đơn commit thành công, nếu đơn đã được phân tài xế (`wasRouted: true`), Controller kích hoạt hàm `notifyDispatcherOrderRemoved(cancelledOrder)` dạng Background Non-blocking Promise (`.catch(...)`).<br>Nếu hệ thống tin nhắn/mạng lỗi, exception được ghi log theo dõi nội bộ, đơn hàng vẫn giữ trạng thái `CANCELLED` thành công (Trả về `HTTP 200 OK`). |
| **Hủy Hàng loạt (Bulk Cancel - Alt 3.1)** | Sử dụng `Promise.allSettled` lặp qua mảng `orderIds`. Mọi đơn thất bại (404/403/409) đều ghi nhận lỗi riêng mà không làm sụp đổ các đơn hợp lệ khác trong batch. Trả về kết quả phân rã chi tiết `successCount`, `failedCount` kèm danh sách kết quả từng đơn. |

---

## BẢNG 2: ĐẶC TẢ LUỒNG NGHIỆP VỤ DÀNH CHO BÁO CÁO LUẬN VĂN (WORD FORMAT)

### 1. Thông tin chung
- **Tên Use Case**: Hủy đơn hàng (UC-08)
- **Mục tiêu**: Cho phép Nhà bán hàng (Seller) hoặc Quản trị viên (Admin) thực hiện hủy đơn hàng đã tạo khi hàng chưa được nhân viên kho lấy đi hoặc chuyển sang khâu vận chuyển.
- **Tác nhân chính**: Seller, Admin.
- **Tác nhân phụ**: Điều phối viên / Nhân viên lấy hàng.

### 2. Mô tả Luồng sự kiện chính (Main Flow)
1. **Người dùng** bấm chọn hủy đơn hàng trên giao diện danh sách đơn hàng.
2. **Hệ thống** hiển thị cửa sổ xác nhận hủy đơn và yêu cầu chọn lý do hủy (Đổi ý, Sai thông tin, Hết hàng, Lý do khác).
3. **Người dùng** chọn lý do hủy đơn (nhập ghi chú thêm nếu chọn "Lý do khác") và nhấn nút "Xác nhận hủy".
4. **Hệ thống** kiểm tra điều kiện quyền sở hữu và trạng thái hiện tại của đơn hàng tại thời điểm nhận lệnh.
5. **Hệ thống** cập nhật trạng thái đơn hàng sang **"Đã hủy" (CANCELLED)**, lưu lại thời điểm, lý do hủy và tài khoản thực hiện hủy vào CSDL.
6. **Hệ thống** tự động khởi tạo nhật ký lịch sử đơn hàng (Audit Log).
7. Nếu đơn hàng đã từng được gán cho nhân viên lấy hàng, hệ thống gửi thông báo bất đồng bộ để Điều phối viên cập nhật lại tuyến đường.
8. **Hệ thống** thông báo "Hủy đơn hàng thành công" và cập nhật giao diện người dùng.

### 3. Luồng sự kiện thay thế (Alternate Flows)
- **Alt 6.1 (Nhập lý do tùy chỉnh)**: Người dùng chọn lý do hủy là "Khác", hệ thống bắt buộc người dùng nhập văn bản chi tiết (tối thiểu 5 ký tự) mới cho phép nhấn xác nhận.
- **Alt 3.1 (Hủy nhiều đơn cùng lúc - Bulk Cancel)**: Người dùng tích chọn nhiều đơn hàng và bấm "Hủy danh sách đã chọn". Hệ thống xử lý từng đơn độc lập: những đơn hợp lệ sẽ được chuyển sang trạng thái "Đã hủy", những đơn đã đi lấy hàng hoặc bị khóa sẽ từ chối và thông báo lý do riêng cho từng đơn.

### 4. Luồng sự kiện ngoại lệ (Exception Flows)
- **Ex 4.1 (Không có quyền hoặc không tìm thấy đơn)**: Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu của Seller đang đăng nhập, hệ thống trả về thông báo từ chối truy cập.
- **Ex 4.2 / 7.1 (Xung đột trạng thái - Race Condition)**: Đơn hàng đã được nhân viên lấy hàng quét mã hoặc chuyển trạng thái `PICKING`/`DELIVERED` ngay tại thời điểm bấm xác nhận hủy, hệ thống hủy thao tác và trả lời "Đơn hàng đã được xử lý, không thể hủy. Vui lòng liên hệ CSKH".
- **Ex 8.1 (Lỗi hệ thống thông báo Điều phối viên)**: Nếu dịch vụ gửi thông báo cho Điều phối viên gặp sự cố mạng, đơn hàng vẫn hủy thành công và hệ thống ghi lại nhật ký lỗi để nhân viên rà soát thủ công.
