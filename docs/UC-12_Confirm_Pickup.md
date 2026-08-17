# ĐẶC TẢ USE CASE TINH CHỈNH: XÁC NHẬN LẤY HÀNG THEO PHIÊN (UC-12 BATCH PICKUP CONFIRMATION)

## 1. Thông Tin Tổng Quan
- **Tên use case:** Xác nhận lấy hàng theo Phiên (Batch Pickup Confirmation)
- **Mã use case:** UC-12
- **Module:** First-Mile Pickup Management (Thu gom & Bàn giao)
- **Mô tả sơ lược:** Cho phép Nhân viên Thu gom (Shipper / Driver), khi đến địa chỉ của một Seller, thực hiện mở phiên gom hàng, quét mã liên tục hàng loạt kiện hàng, kiểm tra trọng lượng/kích thước thực tế (nếu có), hiển thị bảng tổng hợp số lượng và chốt xác nhận toàn bộ lô hàng bằng MỘT chữ ký điện tử duy nhất của Seller (sinh Biên bản bàn giao điện tử ePOH cho cả phiên).
- **Actor chính:** Người thu gom (Shipper / First-Mile Driver)
- **Actor phụ:** Nhà bán hàng (Seller / Người gửi hàng)

---

## 2. Điều Kiện Hệ Thống

- **Tiền điều kiện (Pre-conditions):**
  1. Shipper đã đăng nhập thành công vào Mobile App và đang trong ca/tuyến thu gom được gán (`assignedDriverId`).
  2. Hệ thống đã nhóm (group) các đơn hàng theo từng điểm lấy (Seller/Pickup Address).
  3. Các đơn hàng đang ở trạng thái hợp lệ (`READY_TO_PICK`, `PICKING`). Đơn ở trạng thái `CREATED` chưa sẵn sàng lấy hàng.

- **Hậu điều kiện (Post-conditions):**
  1. **Trạng thái đơn hàng:** Toàn bộ các đơn hàng quét thành công trong phiên chuyển sang trạng thái `PICKED_UP`.
  2. **Xử lý đơn chưa lấy:** Các đơn Shop chưa chuẩn bị kịp được tách riêng, cập nhật trạng thái thống nhất `PENDING_PICKUP_RESCHEDULE` và đẩy về ca gom sau.
  3. **Biên bản Bàn giao Điện tử (ePOH):** Khởi tạo 01 bản ghi `PickupConfirmation` chứa chữ ký chung (`signatureImageUrl`), danh sách `orderIds`, `failedOrderIds`, `totalSurchargeAmount`, tọa độ GPS, thời gian xác nhận và `clientOfflineId` bảo đảm tính Idempotency.
  4. **Thông báo & Tracking:** Gửi thông báo xác nhận thành công tới Email/App của Seller và cập nhật Timeline theo dõi cho Buyer.

---

## 3. Luồng Sự Kiện (Flow of Events)

### 3.1 Luồng Sự Kiện Chính (Main Flow)

| Bước | Người thu gom / Seller | Hệ thống (App & Backend) |
| :---: | :--- | :--- |
| **1** | Shipper đến địa chỉ Seller, chọn Shop/Điểm lấy hàng trên App. | Hiển thị thông tin Shop và danh sách toàn bộ các đơn hàng cần lấy tại điểm này (Ví dụ: Tổng 10 đơn). |
| **2** | Shipper nhấn "Bắt đầu gom hàng" để mở Phiên thu gom (Pickup Session). | Kích hoạt chế độ Quét liên tục (Continuous Scanning Mode) trên camera/súng quét. |
| **3** | Shipper lần lượt quét mã QR/Barcode trên từng kiện hàng. | Đối chiếu mã quét với danh sách đơn của Shop. Phát âm thanh "Bíp" thành công, kiểm tra chống quét trùng, đánh dấu xanh kiện hàng đã quét, nhảy số đếm (VD: Đã quét 8/10). |
| **4** | Shipper xác nhận cân nặng/kích thước của kiện (nếu có yêu cầu kiểm tra lại). | Ghi nhận kích thước/cân nặng, tính cước quy đổi $\max\left(\text{Thực tế}, \frac{D \times R \times C}{5000}\right)$ và ghi nhận phụ thu chước (`surchargeFee`) cho riêng kiện đó (nếu có). |
| **5** | Sau khi quét hết các kiện hàng thực tế tại quầy, Shipper nhấn "Hoàn tất quét & Chốt bàn giao". | Hiển thị Màn hình Tổng hợp Phiên gom (Summary): (1) Số đơn bàn giao thành công (VD: 8 đơn), (2) Số đơn thiếu/chưa bàn giao (VD: 2 đơn), (3) Tổng tiền phụ thu phát sinh (`totalSurchargeAmount`). |
| **6** | Shipper đưa màn hình Tổng hợp cho Seller kiểm tra đối chiếu. | Hiển thị khung ký tên điện tử trên App và **Khóa phiên (Session Locking)** - không cho phép sửa đổi danh sách kiện hàng khi đã vào màn hình ký. |
| **7** | Seller ký 01 lần duy nhất lên màn hình xác nhận tổng số lượng kiện hàng thực tế đã bàn giao. | Tiếp nhận chữ ký, cho phép Shipper nhấn "Xác nhận hoàn tất". |
| **8** | Shipper bấm "Xác nhận bàn giao lô hàng". | (1) Thu thập tọa độ GPS hiện trường và Server Timestamp.<br>(2) Khởi tạo 01 bản ghi `PickupConfirmation` (ePOH) liên kết với toàn bộ `order_ids` đã quét.<br>(3) Thực thi Database Transaction cập nhật hàng loạt các đơn đã quét sang trạng thái `PICKED_UP`. Các đơn chưa sẵn sàng được chuyển `PENDING_PICKUP_RESCHEDULE`.<br>(4) Ghi Audit Log cho từng đơn hàng.<br>(5) Gửi thông báo/biên bản điện tử tới Email/App của Seller và cập nhật Timeline. |
| **9** | Shipper rời khỏi điểm lấy và di chuyển đến Shop tiếp theo. | Cập nhật tuyến lộ trình: Đánh dấu hoàn thành điểm lấy hiện tại, chỉ đường tới điểm lấy tiếp theo. |

---

### 3.2 Luồng Sự Kiện Thay Thế (Alternate Flows)

- **3.2.1 Quét trùng mã kiện hàng trong cùng phiên (Duplicate Scan Protection):**
  - **Sự kiện:** Shipper quét lại một kiện hàng đã có trong danh sách đã quét của phiên gom hiện tại.
  - **Xử lý:** App phát âm thanh cảnh báo "Boop" và hiển thị toast: `"Mã vận đơn [ELG...] đã có trong lô gom hiện tại!"`. Không cộng dồn số đếm.

- **5.1 Quét QR/Barcode không đọc được (Mã mờ/rách):**
  - **5.1.1:** Cho phép Shipper nhập tay mã vận đơn trên màn hình quét liên tục, hệ thống kiểm tra đối chiếu và thêm vào danh sách đã gom tương tự quét camera.

- **7.1 Tranh chấp phụ thu cước (Disputed Surcharge Handling):**
  - **7.1.1:** Seller đồng ý bàn giao số lượng kiện hàng nhưng không đồng ý với khoản phụ thu lệch cân của 1 số kiện.
  - **7.1.2:** Shipper chọn "Tách đơn tranh chấp": Các đơn hợp lệ không tranh chấp vẫn được ký bàn giao và chuyển `PICKED_UP`. Đơn có tranh chấp phụ thu được chuyển trạng thái `SURCHARGE_DISPUTED` và đẩy về bộ phận CSKH xử lý, không hủy toàn bộ phiên.

- **8.1 Phát hiện chênh lệch trọng lượng/thể tích ở 1 hoặc nhiều kiện:**
  - **8.1.1:** Khi quét đến kiện bị lệch cân/kích thước, Shipper chụp ảnh kiện hàng đó (`parcelPhotoUrl`), nhập kích thước thực. Hệ thống tính phụ thu cho đơn đó và hiển thị chi tiết phụ thu trên bảng tổng hợp ở Bước 5.

- **8.2 Shop chỉ bàn giao một phần số đơn (Partial Batch Pickup):**
  - **8.2.1:** Shipper quét được 8/10 đơn. 2 đơn còn lại Shop báo chưa đóng xong.
  - **8.2.2:** Tại Bước 5, hệ thống hiển thị 2 đơn chưa quét. Shipper chọn lý do: `"Shop hẹn lấy ca sau / Chưa chuẩn bị xong"`.
  - **8.2.3:** Khi chốt ký tên: 8 đơn đã quét được chuyển `PICKED_UP`; 2 đơn còn lại được tách ra, cập nhật trạng thái thống nhất `PENDING_PICKUP_RESCHEDULE` (`failedOrderIds`) và đẩy về ca gom sau.

---

### 3.3 Luồng Sự Kiện Ngoại Lệ (Exception Flows)

- **3.1 Quét nhầm kiện của Shop khác hoặc đơn sai thông tin:**
  - **Xử lý:** Khi quét mã không nằm trong danh sách gán của Shop hiện tại, App rung cảnh báo, phát âm thanh lỗi và hiển thị popup: `"Kiện hàng [Mã] không thuộc Shop này hoặc không thuộc ca thu gom hiện tại!"`. Không ghi nhận kiện này.

- **7.2 Seller từ chối ký bàn giao toàn bộ (Cancelled Session Audit):**
  - **7.2.1:** Seller không đồng ý bàn giao. Shipper chọn "Hủy phiên gom - Seller từ chối ký" kèm lý do.
  - **7.2.2:** Hệ thống Rollback toàn bộ trạng thái các đơn đã quét, đồng thời tạo một bản ghi Audit Log lưu lại vết phiên thu gom thất bại (`status: CANCELLED`) để quản lý đối soát tần suất di chuyển của Shipper.

- **8.3 Mất kết nối mạng khi chốt lô hàng (Offline Queue & Idempotency):**
  - **8.3.1:** App đóng gói toàn bộ dữ liệu của cả Phiên (`sessionId`, `clientOfflineId`, `scannedOrderIds`, `signatureImageUrl`, `gpsLocation`) lưu vào SQLite/IndexedDB nội bộ trên máy Shipper.
  - **8.3.2:** Server thiết lập `unique index` trên `clientOfflineId` ở bảng `PickupConfirmation`. Khi Worker đồng bộ lại khi có mạng, nếu trùng `clientOfflineId`, Server trả về kết quả thành công cũ mà không tạo bản ghi ePOH trùng lặp.

- **8.5 Mất tín hiệu định vị GPS (GPS Missing Online Flow):**
  - **8.5.1:** Nếu thiết bị mất tín hiệu GPS nhưng vẫn có kết nối Internet, hệ thống ghi nhận `isGpsMissing = true` trong object `gpsLocation`, lấy Server Timestamp làm mốc thời gian đối soát chính xác và cho phép chốt phiên bình thường.

- **8.6 Đơn hàng bị Hủy/Gán lại giữa lúc đang quét (Dynamic Eviction UX):**
  - **8.6.1:** Trong lúc Shipper đang quét lô 5 đơn, có 1 đơn ở Server bị Seller hủy (`CANCELLED`) hoặc gán lại (`REASSIGNED`).
  - **8.6.2:** Khi chốt lô, hệ thống không bắt Rollback cả 5 đơn (gây ức chế cho Shipper phải quét lại từ đầu). Hệ thống tự động tách/loại bỏ (Evict) đơn bị hủy ra khỏi lô, thông báo chi tiết mã đơn bị loại, và cho phép chốt ePOH thành công cho các đơn hợp lệ còn lại.

---

## 4. Cấu Trúc Cơ Sở Dữ Liệu ePOH Entity (`PickupConfirmation`)

```json
{
  "_id": "POH_20260817_HCM01_0099",
  "sessionId": "SES_UUID_8888",
  "driverId": "DRV_01",
  "sellerId": "SHOP_MYPHAM_XINH",
  "pickupAddress": "123 Đường Số 7, Phường An Phú, TP. Thủ Đức",
  "scannedOrderCount": 8,
  "failedOrderCount": 2,
  "orderIds": [
    "ELG-VN-0001",
    "ELG-VN-0002",
    "ELG-VN-0003",
    "ELG-VN-0004",
    "ELG-VN-0005",
    "ELG-VN-0006",
    "ELG-VN-0007",
    "ELG-VN-0008"
  ],
  "failedOrderIds": [
    "ELG-VN-0009",
    "ELG-VN-0010"
  ],
  "totalSurchargeAmount": 35000,
  "surcharges": [
    {
      "orderId": "ELG-VN-0003",
      "surchargeAmount": 35000,
      "reason": "WEIGHT_DISCREPANCY",
      "parcelPhotoUrl": "https://s3.e-logistic.vn/proofs/parcel_elg0003.jpg"
    }
  ],
  "signatureImageUrl": "https://s3.e-logistic.vn/signatures/sig_shopmypham_20260817.png",
  "gpsLocation": {
    "lat": 10.7981,
    "lng": 106.7456,
    "isGpsMissing": false
  },
  "clientOfflineId": "OFFLINE_BATCH_999",
  "confirmedAt": "2026-08-17T13:45:00.000Z",
  "status": "COMPLETED"
}
```

---

## 5. Tổng Hợp Kịch Bản Kiểm Thử Tự Động (Test Case Matrix)
Xem chi tiết bộ 23 kịch bản kiểm thử (TC_UC12_01 đến TC_UC12_23) tại [`docs/TC-12_TestCases_Confirm_Pickup.md`](file:///e:/DH_/Khoa_luan_k18/E-Logistic/e_logistic/docs/TC-12_TestCases_Confirm_Pickup.md).
