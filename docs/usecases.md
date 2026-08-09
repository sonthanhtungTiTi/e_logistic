### 1\. Danh sách các Quy trình Nghiệp vụ \(Business Processes\)

__Đây là bức tranh cấp cao nhất, thường được dùng để vẽ BPMN\. Hệ thống gồm 9 quy trình chính, chia làm 5 nhóm:__

- __Nhóm 1: Khởi tạo và Xác nhận Sẵn sàng__
	- __Quy trình 1: Đồng bộ và Xử lý Đơn hàng \(Order Syncing\)__
	- __Quy trình 1B: Xác nhận Sẵn sàng Lấy hàng \(Seller Ready Confirmation\)__
- __Nhóm 2: Thu gom và Vận hành Kho bãi__
	- __Quy trình 2: Điều phối và Thu gom hàng hóa \(Pick\-up Process\)__
	- __Quy trình 3: Nhập kho và Phân loại \(Inbound & Sorting\)__
	- __Quy trình 4: Luân chuyển Liên kho \(Mid\-mile\)__
- __Nhóm 3: Giao hàng chặng cuối và AI__
	- __Quy trình 5: Tối ưu Lộ trình Giao hàng \(AI Routing\)__
	- __Quy trình 6: Giao hàng và Theo dõi \(Delivery & Tracking\)__
- __Nhóm 4: Xử lý Ngoại lệ và Tài chính__
	- __Quy trình 7: Xử lý Hàng hoàn \(Reverse Logistics\)__
	- __Quy trình 8: Đối soát COD và Thanh toán \(Gồm 8A: Đối soát Ca và 8B: Đối soát Kỳ\)__
- __Nhóm 5: Hoạch định và Dự báo__
	- __Quy trình 9: Dự báo Nhu cầu Vận hành \(Demand Forecasting\)__

__2\. Danh sách các luồng Use Case cần đặc tả chi tiết__

__Từ 9 quy trình trên, chúng ta "chẻ" ra thành các Use Case \(các luồng tương tác giữa Actor và Hệ thống\) để viết đặc tả dạng bảng \(như bạn vừa làm\)\. Dưới đây là danh sách 12 Use Case cốt lõi cần viết đặc tả:__

1. __UC01: Đồng bộ và Tiếp nhận đơn hàng *\(Bạn đã làm xong\)*__
2. __UC02: Cập nhật trạng thái Sẵn sàng lấy hàng \(Actor: Nhà bán hàng\)ssss__
3. __UC03: Chạy thuật toán VRP và Điều phối tuyến thu gom \(Actor: AI/ML, Điều phối viên\)__
4. __UC04: Tiếp nhận lệnh và Thu gom hàng hóa \(Actor: Người thu gom/giao hàng\)__
5. __UC05: Quét mã nhập kho và Phân loại kiện hàng \(Actor: Nhân viên Kho\)__
6. __UC06: Đóng bao, kẹp seal và Luân chuyển liên kho \(Actor: Điều phối viên Kho Tổng, Người trung chuyển, Nhân viên Kho đích\)__
7. __UC07: Chạy thuật toán VRP và Điều phối tuyến giao hàng chặng cuối \(Actor: AI/ML, Điều phối viên bưu cục\)__
8. __UC08: Nhận lệnh, Giao hàng và Cập nhật GPS Live\-tracking \(Actor: Người thu gom/giao hàng\)__
9. __UC09: Xử lý hàng hoàn trả về kho gốc \(Actor: Người thu gom/giao hàng, Nhà bán hàng\)__
10. __UC10: Chốt ca và Nộp quỹ COD \(Actor: Người thu gom/giao hàng, Kế toán bưu cục\)__
11. __UC11: Tra soát và Đối soát công nợ định kỳ \(Actor: Nhà bán hàng, Hệ thống\)__
12. __UC12: Dự báo và Cảnh báo năng lực vận hành \(Actor: AI/ML, Điều phối viên Kho Tổng, Quản trị viên\)__

__3\. Danh sách các Tính năng cần làm \(System Features\)__

__Để phục vụ được các Use Case trên, đội ngũ Dev cần phát triển các module tính năng sau, chia theo từng nền tảng:__

__A\. Nền tảng Backend \(Core System & API\):__

- __Hệ thống API Gateway nhận đơn và Webhook trả trạng thái \(cho Sàn TMĐT/Nhà bán hàng\)\.__
- __Engine tính cước phí \(dựa trên trọng lượng quy đổi, vùng địa lý\)\.__
- __Module quản lý Master Data \(bản đồ bưu cục, mã vùng, danh sách nhân viên\)\.__
- __Hệ thống Sổ quỹ và Ví điện tử \(quản lý tiền COD thu hộ, công nợ, trừ phí\)\.__

__B\. Module AI/ML \(Thuật toán lõi\):__

- __Thuật toán VRP \(Vehicle Routing Problem\): Tính toán, gom nhóm đơn, vẽ lộ trình ngắn nhất\.__
- __Thuật toán Time\-series Forecasting: Phân tích lịch sử đơn hàng để xuất báo cáo dự báo quá tải\.__

__C\. Ứng dụng Di động \(Mobile App\) dành cho Nhân viên:__

- __Tính năng Quét mã vạch/QR Code \(nhận hàng, nhập kho, giao hàng\)\.__
- __Bản đồ dẫn đường tích hợp lộ trình đã tối ưu\.__
- __Background Location: Liên tục bắn tọa độ GPS nền về server \(Live\-tracking\)\.__
- __Tính năng chụp ảnh bằng chứng giao hàng \(e\-POD\) và ký số\.__
- __Màn hình theo dõi Sổ quỹ COD cá nhân \(để chốt ca\)\.__

__D\. Web Portal / CMS dành cho Nội bộ \(Điều phối, Kế toán, Kho\):__

- __Màn hình Bản đồ Điều phối: Xem danh sách đơn, xem gợi ý lộ trình từ AI, duyệt hoặc sửa tuyến thủ công bằng thao tác kéo thả\.__
- __Quản lý kho bãi: Chức năng tạo mã bao tải, tạo seal, lập biên bản sự cố khi đứt seal\.__
- __Dashboard Kế toán: Đối soát nộp tiền ca \(của tài xế\) và đối soát công nợ kỳ \(cho Seller\)\.__
- __Dashboard Quản trị viên: Xem các báo cáo dự báo, cảnh báo quá tải tại các Hub\.__

__E\. Tiện ích cho Khách hàng \(End\-user/Nhà bán hàng\):__

- __Trang Web/App Tracking: Giao diện cho Người mua nhập mã vận đơn để xem tiến trình và xem Live\-tracking xe đang tới đâu trên bản đồ\.__
- __Cổng thông tin Nhà bán hàng: Nút bấm "Đã chuẩn bị xong hàng", xem báo cáo dòng tiền đối soát COD\.__

__Bạn có muốn tiếp tục viết đặc tả dạng bảng cho UC02: Cập nhật trạng thái Sẵn sàng lấy hàng và UC03: Chạy thuật toán VRP và Điều phối tuyến thu gom không? Mình sẽ chuẩn bị sẵn khung bảng cho 2 luồng này để bạn dễ dàng điền hoặc chỉnh sửa\.__

- 
	- __Note__

# Mình khuyên nên đánh số liên tục

#### Module 1: Quản lý tài khoản

__Mã UC__

__Tên Use Case__

UC01

Đăng nhập

UC02

Đăng xuất

UC03

Quên mật khẩu

UC04

Đổi mật khẩu

UC05

Cập nhật hồ sơ

Quản lý người dùng \(Admin\)

Phân quyền người dùng

#### Module 2: Quản lý đơn hàng

__Mã UC__

__Tên Use Case__

UC06

Tạo đơn hàng

UC07

Cập nhật đơn hàng

UC08

Hủy đơn hàng

UC09

Tra cứu đơn hàng

UC10

Theo dõi đơn hàng

UC11

In mã vận đơn

Đồng bộ đơn hàng

Import đơn hàng

#### Module 3: Quản lý lấy/giao hàng

__Mã UC__

__Tên Use Case__

UC12

Xác nhận lấy hàng

UC13

Xác nhận giao hàng

UC14

Báo giao thất bại

UC15

Xử lý hàng hoàn

Cập nhật vị trí GPS

Xác nhận giao thành công bằng OTP/Chữ ký

#### Module 4: Quản lý kho

__Mã UC__

__UC16 Nhập kho__

__UC17 Xuất kho__

__UC18 Kiểm kê kho__

__Quản lý tồn kho__

__Quét mã QR/Barcode__

#### Module 5: Quản lý điều phối

__Mã UC__

__UC19 Phân công tài xế__

__UC20 Tối ưu tuyến đường__

__UC21 Điều chỉnh tuyến__

#### Module 6: Quản lý tài chính

__Mã UC__

__UC22 Đối soát COD__

__UC23 Thanh toán COD__

__UC24 Quản lý công nợ__

#### Module 7: __Báo cáo__

__Mã UC__

__UC25 Báo cáo doanh thu__

__UC26 Báo cáo vận chuyển__

__UC27 Thống kê hiệu suất__

__Báo cáo COD__

__Báo cáo tài xế__

__Báo cáo SLA__

### Đặt tả usecase:

#### Đặc tả Use Case: Đăng nhập hệ thống:__ __

__Tên use case__

Đăng nhập hệ thống

__Mô tả sơ lược chức năng__

Cho phép người dùng xác thực tài khoản để truy cập hệ thống Logistics theo đúng vai trò được phân quyền\.

__Actor chính__

Người dùng \(Seller, Nhân viên lấy/giao hàng, Nhân viên kho, Điều phối viên, Nhân viên CSKH, Kế toán, Quản trị viên\)

__Actor phụ__

không

__Tiền điều kiện \(Pre\-condition\)__

Người dùng đã có tài khoản hợp lệ\.

__Hậu điều kiện \(Post\-condition\)__

Hệ thống tạo Session/JWT Token, ghi nhận Audit Log và chuyển người dùng đến Dashboard theo đúng quyền\.

__Luồng sự kiện chính \(Main Flow\)__

__Người dùng__

__Hệ thống__

__1\.__ Chọn chức năng __Đăng nhập__\.

__2\.__ Hiển thị màn hình đăng nhập, tên đăng nhập hoặc Email/Số điện thoại và Mật khẩu\.

__3\.__ Nhập Email/Số điện thoại và Mật khẩu\.

__4\.__ Nhấn nút __Đăng nhập__\.

__5\.__ Kiểm tra tính hợp lệ của dữ liệu đầu vào\.

__6\.__ Authentication Service xác thực thông tin đăng nhập\.

__7\.__ Kiểm tra trạng thái tài khoản\.

__8\.__ Tạo Access Token, Refresh Token \(hoặc Session\)\.

__9\.__ Ghi nhận lịch sử đăng nhập \(Audit Log\)\.

__10\.__ Chuyển đến Dashboard theo vai trò được phân quyền\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

__5\.1__ Thiếu Email/Số điện thoại hoặc Mật khẩu, hiển thị thông báo và quay lại bước __3__\.

__6\.1__ Sai Email/Số điện thoại hoặc Mật khẩu, tăng bộ đếm đăng nhập sai, hiển thị thông báo và quay lại bước __3__\.

__6\.2__ Vượt quá số lần đăng nhập sai cho phép, tạm khóa tài khoản và kết thúc Use Case\.

__7\.1__ Tài khoản chưa kích hoạt, hiển thị thông báo và kết thúc Use Case\.

__7\.2__ Tài khoản bị khóa, hiển thị thông báo và kết thúc Use Case\.

__10\.1__ Tài khoản chưa được phân quyền, hiển thị thông báo và kết thúc Use Case\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

__6\.3__ Không thể kết nối cơ sở dữ liệu, hiển thị thông báo lỗi và kết thúc Use Case\.

__8\.1__ Không thể tạo Session/JWT Token do lỗi hệ thống, hiển thị thông báo lỗi và kết thúc Use Case\.

Sơ đồ hoạt động Activity

Sơ đồ trình tự

#### Đặc tả Use Case:__ Đăng xuất hệ thống__

__Tên use case__

Đăng xuất hệ thống

__Mô tả sơ lược chức năng__

Cho phép người dùng kết thúc phiên làm việc và đăng xuất khỏi hệ thống Logistics một cách an toàn\.

__Actor chính__

Người dùng \(Seller, Nhân viên lấy/giao hàng, Nhân viên kho, Điều phối viên, Nhân viên CSKH, Kế toán, Quản trị viên\)

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Người dùng đã đăng nhập và đang có phiên làm việc hợp lệ\.

__Hậu điều kiện \(Post\-condition\)__

Phiên đăng nhập \(Session/JWT Token\) bị hủy, người dùng được chuyển về màn hình Đăng nhập\.

__Luồng sự kiện chính \(Main Flow\)__

__Người dùng__

__Hệ thống__

1\. Chọn chức năng Đăng xuất\.

2\. Tiếp nhận yêu cầu đăng xuất\.

3\. Kiểm tra trạng thái phiên đăng nhập của người dùng\.

4\. Hủy Session/JWT Token của người dùng\.

5\. Ghi nhận lịch sử đăng xuất \(Audit Log\)\.

6\. Chuyển người dùng về màn hình Đăng nhập và kết thúc Use Case\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

3\.1 Phiên đăng nhập đã hết hạn hoặc không còn tồn tại, hệ thống chuyển người dùng về màn hình Đăng nhập và kết thúc Use Case\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

4\.1 Không thể hủy Session/Token phía server do lỗi hệ thống, hệ thống vẫn xóa thông tin phiên phía client và chuyển người dùng về màn hình Đăng nhập; token sẽ tự động hết hiệu lực theo thời gian cấu hình\.

5\.1 Không thể ghi nhận Audit Log do lỗi cơ sở dữ liệu, hệ thống vẫn tiếp tục chuyển người dùng về màn hình Đăng nhập \(đăng xuất vẫn thành công\); lỗi ghi log được ghi nhận vào hệ thống giám sát nội bộ để xử lý sau\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case:__ Quên mật khẩu__

__Tên use case__

Quên mật khẩu

__Mô tả sơ lược chức năng__

Cho phép người dùng đặt lại mật khẩu khi không thể đăng nhập bằng mật khẩu hiện tại, thông qua xác thực Email hoặc Số điện thoại đã đăng ký\.

__Actor chính__

Người dùng

__Actor phụ__

Email/SMS Service

__Tiền điều kiện \(Pre\-condition\)__

Người dùng đã có tài khoản trong hệ thống; Email hoặc Số điện thoại đã được đăng ký và còn hiệu lực sử dụng\.

__Hậu điều kiện \(Post\-condition\)__

Mật khẩu mới được cập nhật thành công vào cơ sở dữ liệu; người dùng có thể đăng nhập bằng mật khẩu mới\.

__Luồng sự kiện chính \(Main Flow\)__

__Người dùng__

__Hệ thống__

1\. Chọn chức năng Quên mật khẩu tại màn hình đăng nhập\.

2\. Hiển thị màn hình nhập Email hoặc Số điện thoại\.

3\. Nhập Email hoặc Số điện thoại đã đăng ký\.

4\. Kiểm tra sự tồn tại của tài khoản tương ứng\.

5\. Gửi mã OTP hoặc liên kết đặt lại mật khẩu đến Email/Số điện thoại của người dùng\.

6\. Nhập mã OTP hoặc truy cập liên kết đặt lại mật khẩu\.

7\. Xác thực mã OTP hoặc liên kết\.

8\. Nhập mật khẩu mới và xác nhận mật khẩu mới\.

9\. Kiểm tra tính hợp lệ của mật khẩu mới \(độ dài, ký tự yêu cầu\.\.\.\)\.

10\. Cập nhật mật khẩu mới vào cơ sở dữ liệu\.

11\. Ghi nhận lịch sử đặt lại mật khẩu \(Audit Log\) và vô hiệu hóa mã OTP/liên kết đã dùng\.

12\. Thông báo đặt lại mật khẩu thành công và chuyển về màn hình Đăng nhập\.

13\. Đăng nhập bằng mật khẩu mới\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

4\.1 Không tìm thấy tài khoản tương ứng, hiển thị thông báo "Tài khoản không tồn tại\." và quay lại bước 3\.

7\.1 Mã OTP không chính xác, hệ thống tăng bộ đếm số lần nhập sai, hiển thị thông báo lỗi và yêu cầu nhập lại\.

7\.2 Mã OTP đã hết hạn, hiển thị thông báo "Mã xác thực đã hết hạn\." và cho phép người dùng yêu cầu gửi lại mã mới \(quay lại bước 5\)\.

9\.1 Mật khẩu mới không đáp ứng chính sách bảo mật, hiển thị thông báo và yêu cầu nhập lại\.

9\.2 Mật khẩu xác nhận không khớp với mật khẩu mới, hiển thị thông báo và yêu cầu nhập lại\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

__Người dùng__

__Hệ thống__

5\.1 Không thể gửi Email/SMS do lỗi dịch vụ, hiển thị thông báo "Không thể gửi mã xác thực\. Vui lòng thử lại sau\." và kết thúc Use Case\.

7\.3 Nhập sai mã OTP vượt quá số lần quy định, hệ thống hủy yêu cầu đặt lại mật khẩu hiện tại, hiển thị thông báo và yêu cầu người dùng thực hiện lại từ bước 1\.

10\.1 Lỗi khi cập nhật mật khẩu vào cơ sở dữ liệu, hiển thị thông báo "Đặt lại mật khẩu thất bại\. Vui lòng thử lại sau\." và kết thúc Use Case\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case:__ Đổi mật khẩu__

__Tên use case__

Đổi mật khẩu

__Mô tả sơ lược chức năng__

Cho phép người dùng đã đăng nhập thay đổi mật khẩu hiện tại nhằm tăng cường bảo mật tài khoản\.

__Actor chính__

Người dùng

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Người dùng đã đăng nhập thành công và đang có phiên làm việc hợp lệ\.

__Hậu điều kiện \(Post\-condition\)__

Mật khẩu mới được cập nhật thành công vào cơ sở dữ liệu; người dùng sử dụng mật khẩu mới cho các lần đăng nhập tiếp theo\.

__Luồng sự kiện chính \(Main Flow\)__

__Người dùng__

__Hệ thống__

1\. Chọn chức năng Đổi mật khẩu\.

2\. Hiển thị màn hình đổi mật khẩu\.

3\. Nhập mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu mới\.

4\. Kiểm tra tính hợp lệ của dữ liệu nhập \(đầy đủ trường, đúng định dạng\)\.

5\. Xác thực mật khẩu hiện tại với dữ liệu đã lưu\.

6\. Kiểm tra mật khẩu mới đáp ứng chính sách bảo mật \(độ dài, ký tự yêu cầu\.\.\.\)\.

7\. Kiểm tra mật khẩu mới không trùng với mật khẩu hiện tại\.

8\. Cập nhật mật khẩu mới vào cơ sở dữ liệu\.

9\. Ghi nhận lịch sử đổi mật khẩu \(Audit Log\) và hủy các phiên đăng nhập khác \(nếu có\)\.

10\. Thông báo đổi mật khẩu thành công\.

11\. Tiếp tục sử dụng hệ thống với mật khẩu mới\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

4\.1 Thiếu trường bắt buộc hoặc sai định dạng, hiển thị thông báo và yêu cầu nhập lại\.

4\.2 Mật khẩu mới và mật khẩu xác nhận không khớp, hiển thị thông báo và yêu cầu nhập lại\.

5\.1 Mật khẩu hiện tại không chính xác, hệ thống tăng bộ đếm số lần nhập sai, hiển thị thông báo và yêu cầu nhập lại\.

6\.1 Mật khẩu mới không đáp ứng chính sách bảo mật, hiển thị thông báo và yêu cầu nhập lại\.

7\.1 Mật khẩu mới trùng với mật khẩu hiện tại, hiển thị thông báo "Mật khẩu mới không được trùng với mật khẩu hiện tại\." và yêu cầu nhập lại\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

5\.2 Nhập sai mật khẩu hiện tại vượt quá số lần quy định, hệ thống tạm khóa chức năng đổi mật khẩu trong thời gian cấu hình, ghi nhận nhật ký bảo mật và kết thúc Use Case\.

8\.1 Không thể cập nhật mật khẩu do lỗi cơ sở dữ liệu hoặc máy chủ, hiển thị thông báo "Đổi mật khẩu thất bại\. Vui lòng thử lại sau\." và kết thúc Use Case\.

#### Đặc tả Use Case: Cập nhật hồ sơ

__Tên use case__

Cập nhật hồ sơ

__Mô tả sơ lược chức năng__

Cho phép người dùng chỉnh sửa và lưu các thông tin cá nhân như họ tên, số điện thoại, địa chỉ, ảnh đại diện và các thông tin liên hệ khác\.

__Actor chính__

Người dùng

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Người dùng đã đăng nhập thành công và đang có phiên làm việc hợp lệ\.

__Hậu điều kiện \(Post\-condition\)__

Thông tin hồ sơ được cập nhật thành công và lưu vào cơ sở dữ liệu\.

__Luồng sự kiện chính \(Main Flow\)__

__Người dùng__

__Hệ thống__

1\. Chọn chức năng Thông tin cá nhân\.

2\. Hiển thị thông tin hồ sơ hiện tại\.

3\. Chỉnh sửa các thông tin cần cập nhật\.

4\. Chọn Lưu\.

5\. Kiểm tra tính hợp lệ của dữ liệu \(định dạng email, số điện thoại, ngày sinh\.\.\.\)\.

6\. Kiểm tra Email/Số điện thoại mới \(nếu có thay đổi\) chưa được sử dụng bởi tài khoản khác\.

7\. Cập nhật thông tin người dùng vào cơ sở dữ liệu\.

8\. Ghi nhận lịch sử thay đổi \(Audit Log\)\.

9\. Thông báo cập nhật hồ sơ thành công\.

10\. Tiếp tục sử dụng hệ thống với thông tin mới\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

3\.1 Chọn Hủy thay vì Lưu\.

3\.1\.1 Không lưu thay đổi, quay về màn hình thông tin cá nhân với dữ liệu ban đầu\.

5\.1 Dữ liệu nhập không hợp lệ \(sai định dạng Email, SĐT, ngày sinh\.\.\.\), hiển thị thông báo và yêu cầu chỉnh sửa\.

6\.1 Email hoặc Số điện thoại đã được sử dụng bởi tài khoản khác, hiển thị thông báo "Thông tin đã được sử dụng\." và yêu cầu nhập lại\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

7\.1 Không thể cập nhật dữ liệu do lỗi cơ sở dữ liệu hoặc máy chủ, hiển thị thông báo "Cập nhật hồ sơ thất bại\. Vui lòng thử lại sau\." và kết thúc Use Case\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case:__ Quản lý người dùng \(Admin\)__

__Tên use case__

Quản lý người dùng \(Admin\)

__Mô tả sơ lược chức năng__

Cho phép Quản trị viên xem danh sách, tạo mới, chỉnh sửa thông tin, khóa/mở khóa, hoặc vô hiệu hóa tài khoản người dùng trong hệ thống\.

__Actor chính__

Quản trị viên

__Actor phụ__

Email/SMS Service

__Tiền điều kiện \(Pre\-condition\)__

Quản trị viên đã đăng nhập thành công và có quyền quản lý người dùng\.

__Hậu điều kiện \(Post\-condition\)__

Thông tin tài khoản người dùng \(tạo mới/chỉnh sửa/khóa/mở khóa/vô hiệu hóa\) được cập nhật thành công vào cơ sở dữ liệu\.

__Luồng sự kiện chính \(Main Flow\)__

__Quản trị viên__

__Hệ thống__

1\. Chọn chức năng Quản lý người dùng\.

2\. Hiển thị danh sách người dùng \(kèm bộ lọc theo vai trò, trạng thái\)\.

3\. Chọn thao tác: Tạo mới / Chỉnh sửa / Khóa / Mở khóa / Vô hiệu hóa tài khoản\. 

4\. Hiển thị biểu mẫu tương ứng với thao tác đã chọn\.

5\. Nhập hoặc chỉnh sửa thông tin \(họ tên, email, SĐT, vai trò, trạng thái\.\.\.\) và xác nhận\.

6\. Kiểm tra tính hợp lệ và đầy đủ của dữ liệu nhập\.

7\. Kiểm tra Email/SĐT không trùng với tài khoản khác \(nếu tạo mới hoặc đổi Email/SĐT\)\.

8\. Cập nhật thông tin tài khoản vào cơ sở dữ liệu\.

9\. Nếu là tạo mới, hệ thống gửi Email/SMS kèm thông tin đăng nhập tạm thời đến người dùng\. 

10\. Ghi nhận lịch sử thao tác \(Audit Log\)\.

11\. Hiển thị thông báo thao tác thành công\.

12\. Xem kết quả và kết thúc chức năng\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

6\.1 Dữ liệu nhập thiếu hoặc sai định dạng, hiển thị thông báo và yêu cầu chỉnh sửa\.

7\.1 Email hoặc SĐT đã tồn tại trong hệ thống, hiển thị thông báo "Thông tin đã được sử dụng\." và yêu cầu nhập lại\.

3\.1 Chọn Khóa tài khoản\.

3\.1\.1 Hệ thống chuyển trạng thái tài khoản sang "Đã khóa"; các phiên đăng nhập hiện tại của người dùng bị hủy ngay lập tức\.

3\.2 Chọn Mở khóa tài khoản\.

3\.2\.1 Hệ thống chuyển trạng thái tài khoản về "Đang hoạt động"\.

3\.3 Chọn Vô hiệu hóa tài khoản\.

3\.3\.1 Hệ thống chuyển trạng thái tài khoản sang "Ngừng hoạt động"; tài khoản không thể đăng nhập nhưng dữ liệu lịch sử vẫn được giữ lại\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

8\.1 Không thể cập nhật dữ liệu do lỗi cơ sở dữ liệu hoặc máy chủ, hiển thị thông báo "Thao tác thất bại\. Vui lòng thử lại sau\." và kết thúc Use Case\.

9\.1 Không thể gửi Email/SMS thông tin đăng nhập, hệ thống vẫn tạo tài khoản thành công và cho phép Quản trị viên gửi lại thông tin thủ công sau\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Phân quyền người dùng

__Tên use case__

Phân quyền người dùng

__Mô tả sơ lược chức năng__

Cho phép Quản trị viên gán hoặc thay đổi vai trò \(role\) và quyền truy cập chức năng cho từng người dùng trong hệ thống, đảm bảo mỗi vai trò chỉ thao tác được trong phạm vi được phép\.

__Actor chính__

Quản trị viên

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Quản trị viên đã đăng nhập thành công và có quyền phân quyền người dùng; tài khoản người dùng cần phân quyền đã tồn tại trong hệ thống\.

__Hậu điều kiện \(Post\-condition\)__

Vai trò và quyền truy cập của người dùng được cập nhật thành công vào cơ sở dữ liệu; các thay đổi có hiệu lực ngay ở lần đăng nhập/thao tác tiếp theo của người dùng\.

__Luồng sự kiện chính \(Main Flow\)__

__Quản trị viên__

__Hệ thống__

1\. Chọn chức năng Phân quyền người dùng\.

2\. Hiển thị danh sách người dùng kèm vai trò hiện tại\.

3\. Chọn người dùng cần phân quyền\.

4\. Hiển thị thông tin chi tiết vai trò và danh sách quyền hiện có của người dùng\.

5\. Chọn vai trò mới hoặc tùy chỉnh danh sách quyền cụ thể \(nếu hệ thống hỗ trợ phân quyền chi tiết theo chức năng\)\.

6\. Kiểm tra tính hợp lệ của lựa chọn \(vai trò tồn tại, không xung đột quyền\)\.

7\. Xác nhận lưu thay đổi\.

8\. Cập nhật vai trò/quyền của người dùng vào cơ sở dữ liệu\.

9\. Ghi nhận lịch sử thay đổi phân quyền \(Audit Log\)\.

10\. Hủy các phiên đăng nhập hiện tại của người dùng để áp dụng quyền mới \(nếu vai trò bị thu hẹp quyền\)\.

11\. Hiển thị thông báo phân quyền thành công\.

12\. Xem kết quả và kết thúc chức năng\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

__Quản trị viên__

__Hệ thống__

6\.1 Vai trò được chọn không còn tồn tại hoặc đã bị vô hiệu hóa, hiển thị thông báo và yêu cầu chọn lại\.

6\.2 Phát hiện Quản trị viên đang cố thu hồi toàn bộ quyền của chính tài khoản mình, hệ thống từ chối thao tác và hiển thị thông báo "Không thể tự thu hồi quyền quản trị của chính mình\."

10\.1 Vai trò mới chỉ mở rộng quyền \(không thu hẹp\), hệ thống không hủy phiên đăng nhập hiện tại; quyền mới được áp dụng ngay trong phiên đang hoạt động\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

8\.1 Không thể cập nhật dữ liệu do lỗi cơ sở dữ liệu hoặc máy chủ, hiển thị thông báo "Phân quyền thất bại\. Vui lòng thử lại sau\." và kết thúc Use Case\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case:__ Tạo đơn hàng__

__Tên use case__

Tạo đơn hàng

__Mô tả sơ lược chức năng__

Cho phép Seller tạo mới đơn hàng vận chuyển bằng cách nhập thông tin người nhận, hàng hóa và dịch vụ vận chuyển\. Hệ thống kiểm tra dữ liệu, xác định tuyến vận chuyển, tính phí, sinh mã vận đơn \(Tracking ID\) và lưu đơn hàng vào cơ sở dữ liệu\.

__Actor chính__

Seller

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Seller đã đăng nhập thành công, tài khoản đang hoạt động và có quyền tạo đơn hàng; thông tin người gửi \(địa chỉ lấy hàng mặc định\) đã được thiết lập trong hồ sơ Seller\.

__Hậu điều kiện \(Post\-condition\)__

Đơn hàng được tạo thành công, được cấp Tracking ID duy nhất, tính phí vận chuyển và lưu vào cơ sở dữ liệu với trạng thái "Mới tạo"\.

__Luồng sự kiện chính \(Main Flow\)__

__Seller__

__Hệ thống__

1\. Chọn chức năng Tạo đơn hàng\.

2\. Hiển thị biểu mẫu tạo đơn hàng\.

3\. Nhập thông tin người nhận, địa chỉ nhận, hàng hóa, khối lượng thực tế, kích thước \(Dài × Rộng × Cao\), dịch vụ vận chuyển, giá trị COD \(nếu có\) và mã khuyến mãi \(nếu có\)\.

4\. Kiểm tra tính đầy đủ và hợp lệ của dữ liệu, các trường bắt buộc\.

5\. Xác định bưu cục lấy hàng, bưu cục giao hàng và tuyến vận chuyển phù hợp\.

6\. Tính Chargeable Weight bằng cách so sánh khối lượng thực tế với khối lượng quy đổi theo công thức \(Dài × Rộng × Cao\) / 5000, chọn giá trị lớn hơn để tính cước\.

7\. Tính phí vận chuyển theo bảng giá hiện hành, áp dụng mã khuyến mãi \(nếu có\) và các dịch vụ cộng thêm\.

8\. Xác nhận tạo đơn hàng\.

9\. Sinh Tracking ID duy nhất và gán trạng thái "Mới tạo" cho đơn hàng\.

10\. Lưu đơn hàng vào cơ sở dữ liệu và ghi nhận nhật ký thao tác \(Audit Log\)\.

11\. Hiển thị thông báo tạo đơn hàng thành công cùng Tracking ID và phí vận chuyển\.

12\. Xem kết quả và kết thúc chức năng\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

__Seller__

__Hệ thống__

4\.1 Dữ liệu nhập thiếu hoặc không hợp lệ, hiển thị thông báo lỗi và yêu cầu Seller bổ sung hoặc chỉnh sửa thông tin\.

6\.1 Không có thông tin kích thước kiện hàng, hệ thống sử dụng khối lượng thực tế để tính phí vận chuyển\.

7\.1 Mã khuyến mãi không hợp lệ hoặc đã hết hạn, hiển thị thông báo và tính phí vận chuyển theo giá gốc \(không áp dụng ưu đãi\)\.

7\.2 Seller không nhập giá trị COD hoặc giá trị COD bằng 0, hệ thống tự động tạo đơn hàng không thu hộ \(Non\-COD\)\.

Sau khi tạo đơn thành công, Seller chọn In mã vận đơn\.

11\.1 Hệ thống chuyển sang chức năng In mã vận đơn \(UC11\)\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

__Seller__

__Hệ thống__

5\.1 Địa chỉ lấy hàng hoặc giao hàng nằm ngoài khu vực phục vụ, hiển thị thông báo "Địa chỉ không thuộc phạm vi phục vụ\." và kết thúc Use Case\.

7\.3 Không thể tính phí vận chuyển do lỗi bảng giá hoặc dịch vụ tính cước, hiển thị thông báo "Không thể tính phí vận chuyển\. Vui lòng thử lại sau\." và kết thúc Use Case\.

9\.1 Không thể sinh Tracking ID hoặc xảy ra trùng mã vận đơn, hệ thống tự động tạo lại mã mới; nếu vẫn thất bại sau số lần thử quy định thì hiển thị thông báo lỗi và kết thúc Use Case\.

10\.1 Không thể lưu dữ liệu do lỗi cơ sở dữ liệu hoặc lỗi máy chủ, hệ thống hoàn tác giao dịch \(Rollback Transaction\), hiển thị thông báo "Tạo đơn hàng thất bại\. Vui lòng thử lại sau\." và kết thúc Use Case\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Cập nhật đơn hàng

__Tên use case__

Cập nhật đơn hàng

__Mô tả sơ lược chức năng__

Cho phép Seller chỉnh sửa thông tin đơn hàng trước khi đơn được lấy hàng hoặc chuyển sang các trạng thái không còn cho phép chỉnh sửa\. Hệ thống kiểm tra quyền cập nhật, trạng thái đơn hàng và tính hợp lệ của dữ liệu trước khi lưu thay đổi\.

__Actor chính__

Seller

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Seller đã đăng nhập; đơn hàng tồn tại trong hệ thống và thuộc quyền sở hữu của Seller; đơn hàng đang ở trạng thái "Mới tạo" hoặc "Chờ lấy hàng" và chưa được nhân viên xác nhận lấy hàng\.

__Hậu điều kiện \(Post\-condition\)__

Thông tin đơn hàng được cập nhật thành công, hệ thống lưu lịch sử thay đổi \(Audit Log\) và cập nhật lại phí vận chuyển \(nếu thông tin thay đổi ảnh hưởng đến cước phí\)\.

__Luồng sự kiện chính \(Main Flow\)__

__Seller__

__Hệ thống__

1\. Chọn chức năng Cập nhật đơn hàng\.

2\. Hiển thị danh sách đơn hàng của Seller\.

3\. Chọn đơn hàng cần cập nhật\.

4\. Kiểm tra trạng thái đơn hàng có cho phép cập nhật hay không\.

5\. Hiển thị thông tin chi tiết của đơn hàng ở chế độ chỉnh sửa\.

6\. Chỉnh sửa các thông tin được phép: người nhận, số điện thoại, địa chỉ giao hàng, thông tin hàng hóa, khối lượng, kích thước, giá trị COD hoặc ghi chú giao hàng\.

7\. Kiểm tra tính hợp lệ của dữ liệu vừa chỉnh sửa\.

8\. Xác nhận lưu thay đổi\.

9\. Kiểm tra lại trạng thái đơn hàng tại thời điểm lưu \(đảm bảo chưa chuyển trạng thái trong lúc Seller đang chỉnh sửa\)\.

10\. Nếu khối lượng, kích thước hoặc địa chỉ thay đổi, hệ thống tính lại Chargeable Weight và phí vận chuyển theo bảng giá hiện hành\.

11\. Cập nhật thông tin đơn hàng vào cơ sở dữ liệu và ghi nhận lịch sử thay đổi \(Audit Log\)\.

12\. Hiển thị thông báo cập nhật đơn hàng thành công cùng phí vận chuyển mới \(nếu có thay đổi\)\.

13\. Xem kết quả và kết thúc chức năng\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

7\.1 Dữ liệu nhập không hợp lệ hoặc thiếu thông tin bắt buộc, hiển thị thông báo lỗi và yêu cầu Seller chỉnh sửa\.

10\.1 Thông tin cập nhật không ảnh hưởng đến khối lượng, kích thước hoặc địa chỉ giao hàng, hệ thống giữ nguyên phí vận chuyển hiện tại\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

4\.1 Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu của Seller, hiển thị thông báo "Đơn hàng không tồn tại\." và kết thúc Use Case\.

4\.2 Đơn hàng đã được xác nhận lấy hàng hoặc đang trong quá trình vận chuyển, hệ thống từ chối cho chỉnh sửa và hiển thị thông báo "Đơn hàng không thể chỉnh sửa ở trạng thái hiện tại\." và kết thúc Use Case\.

9\.1 Đơn hàng vừa chuyển sang trạng thái không còn cho phép cập nhật \(do nhân viên xác nhận lấy hàng trong lúc Seller đang chỉnh sửa\), hệ thống hủy thao tác lưu, hiển thị thông báo "Đơn hàng đã được xử lý, không thể cập nhật\." và kết thúc Use Case\.

10\.1 Không thể tính lại phí vận chuyển do lỗi bảng giá hoặc dịch vụ tính cước, hệ thống hủy thao tác cập nhật, khôi phục dữ liệu ban đầu và hiển thị thông báo lỗi\.

11\.1 Không thể cập nhật dữ liệu do lỗi cơ sở dữ liệu hoặc máy chủ, hệ thống hoàn tác \(Rollback\) và hiển thị thông báo "Cập nhật đơn hàng thất bại\. Vui lòng thử lại sau\." và kết thúc Use Case\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Hủy đơn hàng

Đặc tả Use Case: Hủy đơn hàng

__Tên use case__

Hủy đơn hàng

__Mô tả sơ lược chức năng__

Cho phép Seller hủy đơn hàng đã tạo khi đơn chưa được nhân viên xác nhận lấy hàng hoặc chưa chuyển sang trạng thái không thể hủy\. Hệ thống kiểm tra trạng thái đơn, thực hiện hủy và thông báo cho các bên liên quan\.

__Actor chính__

Seller

__Actor phụ__

Điều phối viên \(nếu đơn đã lên tuyến thu gom\)

__Tiền điều kiện \(Pre\-condition\)__

Seller đã đăng nhập; đơn hàng tồn tại và thuộc quyền sở hữu của Seller; đơn hàng đang ở trạng thái cho phép hủy \("Mới tạo", "Seller đang chuẩn bị", "Chờ thu gom", hoặc "Đã lên tuyến thu gom" nhưng nhân viên chưa quét mã nhận hàng\)\.

__Hậu điều kiện \(Post\-condition\)__

Đơn hàng chuyển sang trạng thái "Đã hủy", được lưu vào cơ sở dữ liệu kèm lý do hủy và ghi nhận Audit Log; nếu đơn đã nằm trong tuyến thu gom, tuyến được cập nhật loại bỏ đơn này\.

__Luồng sự kiện chính \(Main Flow\)__

Seller

Hệ thống

1\. Chọn chức năng Hủy đơn hàng\.

2\. Hiển thị danh sách đơn hàng của Seller \(kèm trạng thái hiện tại\)\.

3\. Chọn đơn hàng cần hủy\.

4\. Kiểm tra trạng thái đơn hàng có cho phép hủy hay không\.

5\. Hiển thị thông tin đơn hàng và yêu cầu chọn lý do hủy\.

6\. Chọn lý do hủy \(hoặc nhập lý do khác\) và xác nhận\.

7\. Kiểm tra lại trạng thái đơn hàng tại thời điểm xác nhận \(đảm bảo chưa chuyển trạng thái trong lúc Seller đang thao tác\)\.

8\. Nếu đơn đã được gán vào tuyến thu gom nhưng chưa lấy hàng, hệ thống gỡ đơn khỏi tuyến và thông báo cho Điều phối viên/Người thu gom\.

9\. Cập nhật trạng thái đơn hàng thành "Đã hủy" kèm lý do hủy\.

10\. Ghi nhận lịch sử hủy đơn \(Audit Log\)\.

11\. Gửi thông báo hủy đơn cho Sàn TMĐT \(nếu đơn đồng bộ từ sàn\) và cho Người mua \(nếu đã có thông tin liên hệ\)\.

12\. Hiển thị thông báo hủy đơn thành công\.

13\. Xem kết quả và kết thúc chức năng\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

6\.1 Seller không chọn lý do hủy trong danh sách gợi ý, hệ thống yêu cầu nhập lý do tùy chỉnh \(bắt buộc tối thiểu một số ký tự\) trước khi cho phép xác nhận\.

3\.1 Chọn hủy nhiều đơn cùng lúc \(bulk cancel\)\.

3\.1\.1 Hệ thống lặp lại kiểm tra bước 4 cho từng đơn; đơn nào không hợp lệ sẽ bị loại khỏi danh sách hủy và hiển thị thông báo riêng, các đơn hợp lệ vẫn được hủy bình thường\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

4\.1 Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu của Seller, hiển thị thông báo "Đơn hàng không tồn tại\." và kết thúc Use Case\.

4\.2 Đơn hàng đã được nhân viên xác nhận lấy hàng hoặc đang trong quá trình vận chuyển/đã giao, hệ thống từ chối hủy và hiển thị thông báo "Đơn hàng không thể hủy ở trạng thái hiện tại\. Vui lòng liên hệ CSKH để được hỗ trợ\." và kết thúc Use Case\.

7\.1 Đơn hàng vừa chuyển sang trạng thái không còn cho phép hủy \(do nhân viên xác nhận lấy hàng trong lúc Seller đang thao tác\), hệ thống hủy thao tác, hiển thị thông báo "Đơn hàng đã được xử lý, không thể hủy\." và kết thúc Use Case\.

8\.1 Không thể gửi thông báo gỡ đơn cho Điều phối viên/Người thu gom do lỗi hệ thống, đơn vẫn được hủy thành công ở bước 9; hệ thống ghi nhận lỗi vào hệ thống giám sát nội bộ để Điều phối viên rà soát tuyến thủ công\.

9\.1 Không thể cập nhật trạng thái do lỗi cơ sở dữ liệu hoặc máy chủ, hệ thống hoàn tác \(Rollback\) và hiển thị thông báo "Hủy đơn hàng thất bại\. Vui lòng thử lại sau\." và kết thúc Use Case\.

11\.1 Không thể gửi thông báo cho Sàn TMĐT/Người mua do lỗi dịch vụ, đơn vẫn được ghi nhận hủy thành công; hệ thống lưu vào hàng đợi để gửi lại \(retry\) sau\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Tra cứu đơn hàng

__Tên use case__

Tra cứu đơn hàng

__Mô tả sơ lược chức năng__

Cho phép Seller tìm kiếm, lọc và xem chi tiết thông tin đơn hàng của mình theo nhiều tiêu chí \(mã vận đơn, trạng thái, khoảng thời gian, người nhận\.\.\.\) để theo dõi tình trạng xử lý\.

__Actor chính__

Seller

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Seller đã đăng nhập thành công và đang có phiên làm việc hợp lệ\.

__Hậu điều kiện \(Post\-condition\)__

Danh sách/chi tiết đơn hàng phù hợp với điều kiện tra cứu được hiển thị cho Seller; không có dữ liệu nào bị thay đổi\.

__Luồng sự kiện chính \(Main Flow\)__

Seller

Hệ thống

1\. Chọn chức năng Tra cứu đơn hàng\.

2\. Hiển thị màn hình tra cứu với các bộ lọc \(mã vận đơn, trạng thái, khoảng thời gian, tên/SĐT người nhận\.\.\.\) và danh sách đơn hàng mặc định \(gần nhất\)\.

3\. Nhập từ khóa hoặc chọn điều kiện lọc, nhấn Tìm kiếm\.

4\. Kiểm tra tính hợp lệ của điều kiện tìm kiếm \(định dạng ngày, mã vận đơn\.\.\.\)\.

5\. Truy vấn cơ sở dữ liệu theo điều kiện, giới hạn phạm vi chỉ các đơn thuộc quyền sở hữu của Seller\.

6\. Hiển thị danh sách kết quả \(mã vận đơn, người nhận, trạng thái, ngày tạo, phí vận chuyển\.\.\.\)\.

7\. Chọn một đơn hàng trong danh sách để xem chi tiết\.

8\. Truy vấn và hiển thị đầy đủ thông tin chi tiết của đơn hàng \(thông tin người nhận, hàng hóa, lịch sử trạng thái, COD\.\.\.\)\.

9\. Xem thông tin và kết thúc chức năng\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

4\.1 Điều kiện tìm kiếm không hợp lệ \(VD: sai định dạng ngày, khoảng thời gian không hợp lệ\), hiển thị thông báo và yêu cầu nhập lại\.

6\.1 Không tìm thấy đơn hàng nào phù hợp với điều kiện, hiển thị thông báo "Không có đơn hàng phù hợp\." và danh sách trống\.

3\.1 Không nhập điều kiện lọc nào, chỉ nhấn Tìm kiếm hoặc vào thẳng màn hình\.

3\.1\.1 Hệ thống hiển thị toàn bộ đơn hàng của Seller theo thứ tự mới nhất, có phân trang\.

6\.2 Chọn sắp xếp lại kết quả \(theo ngày tạo, trạng thái\.\.\.\) hoặc chuyển trang\.

6\.2\.1 Hệ thống truy vấn lại và hiển thị kết quả theo thứ tự/trang mới, không cần nhập lại điều kiện lọc\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

5\.1 Không thể truy vấn dữ liệu do lỗi cơ sở dữ liệu hoặc máy chủ, hiển thị thông báo "Không thể tải danh sách đơn hàng\. Vui lòng thử lại sau\." và kết thúc Use Case\.

8\.1 Đơn hàng được chọn không còn tồn tại hoặc không thuộc quyền sở hữu của Seller \(VD: dữ liệu vừa bị thay đổi\), hiển thị thông báo "Đơn hàng không tồn tại hoặc không thể truy cập\." và quay lại danh sách\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Theo dõi đơn hàng

__Tên use case__

Theo dõi đơn hàng

__Mô tả sơ lược chức năng__

Cho phép Người mua \(không cần đăng nhập\) nhập mã vận đơn để xem tiến trình xử lý đơn hàng theo thời gian thực, bao gồm vị trí GPS trực tiếp \(Live\-tracking\) khi đơn đang trong quá trình giao hàng\.

__Actor chính__

Người mua \(Khách hàng\)

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Người mua có mã vận đơn hợp lệ \(do Seller hoặc Sàn TMĐT cung cấp\); có kết nối Internet\.

__Hậu điều kiện \(Post\-condition\)__

Thông tin tiến trình và vị trí đơn hàng được hiển thị cho Người mua; không có dữ liệu nào bị thay đổi\.

__Luồng sự kiện chính \(Main Flow\)__

Người mua

Hệ thống

1\. Truy cập trang/màn hình Theo dõi đơn hàng\.

2\. Hiển thị ô nhập mã vận đơn\.

3\. Nhập mã vận đơn \(Tracking ID\) và xác nhận\.

4\. Kiểm tra sự tồn tại của mã vận đơn trong hệ thống\.

5\. Truy vấn trạng thái hiện tại và lịch sử xử lý của đơn hàng \(Mới tạo → Đang lấy hàng → Đã lấy hàng → Đang luân chuyển → Đang giao → Giao thành công\.\.\.\)\.

6\. Hiển thị dòng thời gian \(timeline\) các mốc trạng thái kèm thời gian tương ứng\.

7\. Kiểm tra trạng thái đơn hàng hiện tại có đang ở giai đoạn "Đang giao" \(last\-mile\) hay không\.

8\. Nếu đang giao, hiển thị bản đồ với vị trí GPS thời gian thực của Người thu gom/giao hàng và ETA dự kiến\.

9\. Xem thông tin và kết thúc chức năng \(hoặc để màn hình mở để tiếp tục theo dõi Live\-tracking\)\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

4\.1 Mã vận đơn không tồn tại, hiển thị thông báo "Không tìm thấy đơn hàng với mã vận đơn này\." và cho phép nhập lại\.

7\.1 Đơn hàng chưa đến giai đoạn giao hàng \(đang ở Mới tạo/Đang lấy hàng/Đang luân chuyển\), hệ thống chỉ hiển thị timeline trạng thái, không hiển thị bản đồ GPS\.

7\.2 Đơn hàng đã ở trạng thái cuối \(Giao thành công/Đã hoàn trả/Đã hủy\), hệ thống hiển thị timeline đầy đủ kèm trạng thái kết thúc, không hiển thị bản đồ Live\-tracking\.

8\.1 Người mua giữ màn hình mở trong lúc đang giao\.

8\.1\.1 Hệ thống tự động làm mới vị trí GPS và ETA theo chu kỳ \(VD: mỗi 10\-15 giây\) mà không cần Người mua tải lại trang\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

5\.1 Không thể truy vấn dữ liệu do lỗi cơ sở dữ liệu hoặc máy chủ, hiển thị thông báo "Không thể tải thông tin đơn hàng\. Vui lòng thử lại sau\." và kết thúc Use Case\.

8\.2 Mất tín hiệu GPS từ thiết bị của Người thu gom/giao hàng \(App không gửi tọa độ mới trong khoảng thời gian quy định\), hệ thống hiển thị vị trí cập nhật gần nhất kèm nhãn "Vị trí có thể chưa cập nhật" thay vì báo lỗi hoặc hiển thị bản đồ trống\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: In mã vận đơn

__Tên use case__

In mã vận đơn

__Mô tả sơ lược chức năng__

Cho phép Seller xuất/in phiếu vận đơn \(bao gồm mã vạch/QR, thông tin người gửi\-nhận, hàng hóa\) để dán lên kiện hàng, phục vụ cho việc quét mã ở các khâu thu gom, nhập kho và giao hàng\.

__Actor chính__

Seller

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Seller đã đăng nhập; đơn hàng đã được tạo thành công và có mã vận đơn \(Tracking ID\) hợp lệ\.

__Hậu điều kiện \(Post\-condition\)__

File phiếu vận đơn \(PDF/hình ảnh\) được sinh ra và gửi tới thiết bị in hoặc tải về cho Seller; trạng thái "đã in vận đơn" được ghi nhận \(nếu hệ thống có theo dõi số lần in\)\.

__Luồng sự kiện chính \(Main Flow\)__

Seller

Hệ thống

1\. Chọn đơn hàng \(hoặc nhiều đơn\) cần in mã vận đơn\.

2\. Kiểm tra đơn hàng đã có mã vận đơn hợp lệ hay chưa\.

3\. Chọn chức năng In mã vận đơn\.

4\. Hiển thị tùy chọn khổ giấy/mẫu in \(VD: A5, A6, khổ giấy nhiệt\)\.

5\. Chọn khổ giấy/mẫu in và xác nhận\.

6\. Truy xuất thông tin đơn hàng \(người gửi, người nhận, hàng hóa, COD, dịch vụ\.\.\.\) và sinh mã vạch/QR từ Tracking ID\.

7\. Render phiếu vận đơn theo mẫu đã chọn \(file PDF hoặc ảnh\)\.

8\. Ghi nhận lịch sử in vận đơn \(Audit Log: thời điểm in, số lần in\)\.

9\. Trả về file phiếu vận đơn để Seller xem trước, tải về hoặc gửi trực tiếp tới máy in\.

10\. Xem trước, in hoặc tải file và kết thúc chức năng\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

1\.1 Chọn nhiều đơn hàng cùng lúc \(in hàng loạt\)\.

1\.1\.1 Hệ thống gộp toàn bộ đơn hợp lệ vào một file duy nhất \(mỗi đơn một trang\) theo đúng thứ tự đã chọn\.

2\.1 Trong danh sách in hàng loạt, có đơn không hợp lệ \(xem 2\.1 ở Exception Flow\), hệ thống loại đơn đó khỏi file in và hiển thị danh sách đơn bị loại kèm lý do sau khi hoàn tất\.

5\.1 Chọn in lại vận đơn đã in trước đó\.

5\.1\.1 Hệ thống vẫn cho phép in lại bình thường, không giới hạn số lần in, nhưng ghi nhận đầy đủ mỗi lần in vào Audit Log để phục vụ tra soát khi cần\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

2\.1 Đơn hàng chưa có mã vận đơn hoặc không thuộc quyền sở hữu của Seller, hiển thị thông báo "Đơn hàng không hợp lệ để in vận đơn\." và kết thúc \(hoặc loại khỏi danh sách in hàng loạt\)\.

6\.1 Đơn hàng đã bị hủy, hệ thống vẫn cho phép in nhưng gắn watermark "ĐÃ HỦY" lên phiếu để tránh nhầm lẫn khi thao tác thực tế tại kho\.

7\.1 Không thể render file \(lỗi template hoặc lỗi hệ thống\), hiển thị thông báo "Không thể tạo phiếu vận đơn\. Vui lòng thử lại sau\." và kết thúc Use Case\.

9\.1 Không thể kết nối tới máy in \(lỗi driver/thiết bị\), hệ thống vẫn cho phép Seller tải file PDF về để in thủ công sau\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Đồng bộ đơn hàng

__Tên use case__

Đồng bộ đơn hàng

__Mô tả sơ lược chức năng__

Hệ thống tự động tiếp nhận dữ liệu đơn hàng từ Sàn TMĐT thông qua API/Webhook, xác thực tính hợp lệ, sinh mã vận đơn, tính phí vận chuyển và phân bổ đơn về đúng bưu cục lấy hàng phụ trách\.

__Actor chính__

Sàn TMĐT \(hệ thống bên ngoài\)

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Sàn TMĐT đã được cấp API Key/thông tin xác thực hợp lệ để gọi vào hệ thống; kết nối API đang hoạt động bình thường\.

__Hậu điều kiện \(Post\-condition\)__

Đơn hàng được tạo thành công trong hệ thống với trạng thái "Seller đang chuẩn bị", có Mã vận đơn duy nhất, đã tính phí vận chuyển và được phân bổ về đúng bưu cục; kết quả \(Mã vận đơn hoặc lỗi\) được trả về cho Sàn TMĐT\.

__Luồng sự kiện chính \(Main Flow\)__

1\. Gọi API tạo đơn hàng \(kèm thông tin xác thực và dữ liệu đơn hàng: người nhận, địa chỉ, hàng hóa\.\.\.\)\.

2\. Xác thực API Key/quyền truy cập của Sàn TMĐT\.

3\. Kiểm tra tính hợp lệ của dữ liệu đầu vào \(định dạng, số điện thoại, địa chỉ, trường bắt buộc\)\.

4\. Sinh Mã vận đơn \(Tracking ID\) duy nhất\.

5\. Tính Chargeable Weight và phí vận chuyển theo bảng giá hiện hành\.

6\. Lưu đơn hàng vào cơ sở dữ liệu với trạng thái "Mới tạo" \(đảm bảo không mất dữ liệu trước khi xử lý các bước tiếp theo\)\.

7\. Mapping địa chỉ để xác định và phân bổ đơn về bưu cục lấy hàng phụ trách\.

8\. Cập nhật trạng thái đơn hàng thành "Seller đang chuẩn bị"\.

9\. Ghi nhận nhật ký tiếp nhận đơn \(Audit Log\)\.

10\. Trả kết quả thành công \(HTTP 200/201\) kèm Mã vận đơn và phí vận chuyển về cho Sàn TMĐT\.

11\. Nhận kết quả và cập nhật trạng thái đơn hàng tương ứng trên hệ thống Sàn TMĐT\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

3\.1 Dữ liệu đầu vào thiếu trường bắt buộc hoặc sai định dạng, hệ thống trả lỗi \(HTTP 400\) kèm danh sách trường lỗi cụ thể cho Sàn TMĐT và kết thúc Use Case \(không lưu đơn\)\.

7\.1 Địa chỉ không thể mapping tự động về bưu cục cụ thể \(VD: địa chỉ mới, chưa có trong Master Data\), hệ thống tạm gán về bưu cục mặc định theo khu vực gần nhất và đánh dấu đơn cần Điều phối viên xác nhận thủ công lại bưu cục phụ trách\.

1\.1 Gọi lại API với cùng một mã đơn hàng gốc \(Idempotency Key\) đã từng gửi trước đó\.

1\.1\.1 Hệ thống nhận diện đơn trùng, không tạo đơn mới, trả về Mã vận đơn đã sinh trước đó để tránh tạo đơn trùng lặp khi Sàn TMĐT gọi lại do timeout hoặc lỗi mạng\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

2\.1 API Key không hợp lệ hoặc hết hạn, hệ thống trả lỗi xác thực \(HTTP 401/403\) và kết thúc Use Case\.

5\.1 Không thể tính phí vận chuyển do lỗi bảng giá hoặc dịch vụ tính cước, hệ thống trả lỗi \(HTTP 500\) và kết thúc Use Case \(không lưu đơn\)\.

6\.1 Không thể lưu dữ liệu do lỗi cơ sở dữ liệu, hệ thống hoàn tác \(Rollback\), trả lỗi \(HTTP 500\) cho Sàn TMĐT và kết thúc Use Case\.

10\.1 Đơn hàng đã lưu và xử lý thành công trong hệ thống nhưng không thể gửi phản hồi về Sàn TMĐT do lỗi mạng/timeout, hệ thống vẫn giữ nguyên đơn đã tạo \(không rollback\) và đưa vào hàng đợi gửi lại webhook callback; Sàn TMĐT có thể gọi lại bằng Idempotency Key \(xem 1\.1\) để lấy đúng Mã vận đơn đã tạo\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Import đơn hàng

__Tên use case__

Import đơn hàng

__Mô tả sơ lược chức năng__

Cho phép Seller tải lên file \(Excel/CSV\) chứa nhiều đơn hàng cùng lúc theo mẫu quy định, hệ thống kiểm tra hợp lệ từng dòng, tạo đơn hàng hàng loạt và báo cáo kết quả \(thành công/lỗi\) theo từng dòng\.

__Actor chính__

Seller

__Actor phụ__

Không

__Tiền điều kiện \(Pre\-condition\)__

Seller đã đăng nhập; đã tải mẫu file import \(template\) chuẩn từ hệ thống; file chuẩn bị import đúng định dạng và không vượt quá giới hạn số dòng/kích thước cho phép\.

__Hậu điều kiện \(Post\-condition\)__

Các dòng hợp lệ được tạo thành đơn hàng với trạng thái "Mới tạo"/"Seller đang chuẩn bị" và có Mã vận đơn tương ứng; các dòng lỗi không được tạo đơn và được liệt kê kèm lý do cụ thể để Seller sửa lại\.

__Luồng sự kiện chính \(Main Flow\)__

Seller

Hệ thống

1\. Chọn chức năng Import đơn hàng\.

2\. Hiển thị màn hình import kèm link tải mẫu file chuẩn \(template\)\.

3\. Tải file đã điền thông tin đơn hàng lên hệ thống\.

4\. Kiểm tra định dạng file \(đúng phần mở rộng, đúng cấu trúc cột theo template\) và kích thước/số dòng file\.

5\. Đọc dữ liệu từng dòng trong file\.

6\. Với mỗi dòng: kiểm tra tính hợp lệ \(trường bắt buộc, định dạng SĐT/địa chỉ, khối lượng, kích thước\.\.\.\)\.

7\. Hiển thị màn hình xem trước \(preview\) kết quả kiểm tra: số dòng hợp lệ, số dòng lỗi kèm chi tiết lỗi theo từng dòng\.

8\. Xem trước kết quả, xác nhận import các dòng hợp lệ\.

9\. Với từng dòng hợp lệ: tính Chargeable Weight, tính phí vận chuyển, mapping bưu cục lấy hàng phù hợp\.

10\. Sinh Mã vận đơn duy nhất cho từng đơn hàng hợp lệ\.

11\. Lưu toàn bộ các đơn hàng hợp lệ vào cơ sở dữ liệu với trạng thái "Mới tạo"\.

12\. Ghi nhận lịch sử import \(Audit Log\): số dòng thành công, số dòng lỗi, thời điểm import\.

13\. Hiển thị báo cáo kết quả import: tổng số đơn tạo thành công \(kèm danh sách Mã vận đơn\) và danh sách dòng lỗi \(nếu có\) để Seller tải về sửa\.

14\. Xem kết quả, tải file báo cáo lỗi \(nếu có\) và kết thúc chức năng\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

6\.1 Một số dòng có lỗi dữ liệu \(thiếu trường, sai định dạng, địa chỉ ngoài phạm vi phục vụ\.\.\.\), hệ thống không chặn toàn bộ file mà chỉ đánh dấu lỗi ở từng dòng tương ứng, các dòng hợp lệ khác vẫn tiếp tục được xử lý bình thường\.

8\.1 Sau khi xem báo cáo lỗi, Seller sửa lại các dòng lỗi trong file gốc và import lại\.

8\.1\.1 Hệ thống xử lý như một lượt import mới, độc lập với lượt trước; không tự động gộp hay ghi đè lên các đơn đã tạo thành công ở lượt trước\.

8\.2 Seller chọn Hủy tại màn hình xem trước \(bước 8\), không xác nhận import\.

8\.2\.1 Hệ thống không tạo bất kỳ đơn hàng nào, hủy toàn bộ dữ liệu đã đọc và kết thúc Use Case\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

4\.1 File sai định dạng, sai cấu trúc cột so với template, hoặc vượt quá giới hạn số dòng/kích thước cho phép, hiển thị thông báo lỗi tương ứng và yêu cầu Seller tải lại file đúng chuẩn; kết thúc Use Case\.

5\.1 File bị hỏng hoặc không thể đọc được nội dung \(corrupt file\), hiển thị thông báo "Không thể đọc file\. Vui lòng kiểm tra lại file và thử lại\." và kết thúc Use Case\.

6\.2 Toàn bộ các dòng trong file đều không hợp lệ \(0 dòng hợp lệ\), hệ thống không hiển thị nút xác nhận import, chỉ hiển thị báo cáo lỗi toàn bộ để Seller sửa lại và import lại từ đầu\.

9\.1 Không thể tính phí vận chuyển cho một số dòng do lỗi bảng giá hoặc dịch vụ tính cước, các dòng này được chuyển sang trạng thái lỗi trong báo cáo kết quả \(không chặn các dòng còn lại\)\.

11\.1 Không thể lưu một phần hoặc toàn bộ dữ liệu do lỗi cơ sở dữ liệu hoặc máy chủ giữa chừng quá trình import, hệ thống hoàn tác \(Rollback\) toàn bộ lượt import này \(không lưu một phần dở dang\), hiển thị thông báo "Import thất bại\. Vui lòng thử lại sau\." và kết thúc Use Case\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Xác nhận lấy hàng

__Tên use case__

Xác nhận lấy hàng

__Mô tả sơ lược chức năng__

Cho phép Người thu gom/giao hàng, khi đến địa chỉ Seller theo lệnh điều phối, quét mã vận đơn để xác nhận đã nhận hàng thành công hoặc ghi nhận lý do nếu không lấy được hàng\.

__Actor chính__

Người thu gom/giao hàng

__Actor phụ__

Seller \(nhận thông báo\), Sàn TMĐT/Người mua \(nhận thông báo\)

__Tiền điều kiện \(Pre\-condition\)__

Người thu gom/giao hàng đã đăng nhập vào App; đã nhận lệnh thu gom \(tuyến đã được Điều phối viên gán\) và đang có đơn hàng ở trạng thái "Đã lên tuyến thu gom"/"Đang lấy hàng" cần xử lý\.

__Hậu điều kiện \(Post\-condition\)__

Đơn hàng chuyển sang trạng thái "Đã lấy hàng" \(nếu thành công\) hoặc trạng thái xử lý ngoại lệ tương ứng \(nếu thất bại\); hệ thống ghi nhận thời gian, vị trí xác nhận và gửi thông báo cho các bên liên quan\.

__Luồng sự kiện chính \(Main Flow\)__

Người thu gom/giao hàng

Hệ thống

1\. Mở danh sách đơn hàng trong tuyến thu gom trên App\.

2\. Hiển thị danh sách đơn cần lấy hàng theo thứ tự lộ trình đã tối ưu\.

3\. Di chuyển đến địa chỉ Seller, chọn đơn hàng tương ứng\.

4\. Hiển thị thông tin chi tiết đơn hàng \(người gửi, hàng hóa, mã vận đơn\)\.

5\. Quét mã vạch/QR trên kiện hàng \(hoặc trên phiếu vận đơn\)\.

6\. Đối chiếu mã quét được với Mã vận đơn của đơn hàng đang xử lý\.

7\. Kiểm tra khớp đúng đơn hàng\.

8\. Xác nhận số lượng/khối lượng thực tế khớp với thông tin đơn \(nếu có yêu cầu cân/đo lại\)\.

9\. Ghi nhận thời gian và tọa độ GPS tại thời điểm xác nhận\.

10\. Cập nhật trạng thái đơn hàng thành "Đã lấy hàng"\.

11\. Ghi nhận lịch sử xác nhận lấy hàng \(Audit Log\)\.

12\. Gửi thông báo "Đã lấy hàng" cho Sàn TMĐT/Người mua và cập nhật timeline theo dõi đơn hàng\.

13\. Cập nhật danh sách đơn còn lại trong tuyến trên App\.

14\. Tiếp tục di chuyển đến điểm lấy hàng tiếp theo trong tuyến\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

5\.1 Không quét được mã vạch/QR \(mã mờ, rách, thiết bị lỗi camera\)\.

5\.1\.1 Hệ thống cho phép nhập thủ công Mã vận đơn để xác nhận thay thế cho việc quét mã\.

8\.1 Khối lượng/kích thước thực tế chênh lệch so với khai báo ban đầu của Seller\.

8\.1\.1 Hệ thống cho phép nhập lại khối lượng/kích thước thực tế, tính lại phí vận chuyển chênh lệch \(phụ thu\) và ghi nhận vào đơn hàng kèm ảnh chụp minh chứng \(nếu có\)\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

7\.1 Mã quét được không khớp với đơn hàng đang xử lý \(VD: quét nhầm đơn\), hiển thị thông báo "Mã vận đơn không khớp\." và yêu cầu quét/chọn lại đúng đơn\.

15\. Không lấy được hàng \(Seller không có mặt, không đủ hàng, Seller hủy tại chỗ\.\.\.\)\.

15\.1 Nhân viên chọn lý do không lấy được hàng từ danh sách gợi ý hoặc nhập lý do khác, chụp ảnh minh chứng \(nếu cần\)\.

15\.2 Hệ thống ghi nhận lý do, cập nhật trạng thái đơn hàng thành "Lấy hàng thất bại" và gửi thông báo cho Seller\.

15\.3 Hệ thống đưa ra lựa chọn cho Điều phối viên/Seller: Hủy đơn hàng hoặc đưa đơn quay lại hàng đợi để lấy lại vào ca kế tiếp\.

9\.1 Không thể ghi nhận tọa độ GPS do thiết bị mất tín hiệu định vị, hệ thống vẫn cho phép xác nhận lấy hàng thành công dựa trên thời gian hệ thống \(server time\), đánh dấu bản ghi thiếu tọa độ để đối soát sau nếu cần\.

10\.1 Không thể cập nhật trạng thái do lỗi kết nối mạng từ App, hệ thống lưu thao tác xác nhận vào bộ nhớ tạm trên thiết bị \(offline queue\) và tự động đồng bộ lại khi có kết nối; nhân viên vẫn có thể tiếp tục xử lý đơn tiếp theo\.

12\.1 Không thể gửi thông báo cho Sàn TMĐT/Người mua do lỗi dịch vụ, đơn vẫn được cập nhật "Đã lấy hàng" thành công; hệ thống đưa vào hàng đợi để gửi lại thông báo sau\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Báo giao thất bại

__Tên use case__

Báo giao thất bại

__Mô tả sơ lược chức năng__

Cho phép Người thu gom/giao hàng ghi nhận chi tiết lý do khi không thể giao hàng thành công tại điểm giao, bao gồm phân loại nguyên nhân, số lần đã liên hệ khách, minh chứng \(ảnh/ghi chú\), từ đó hệ thống quyết định hẹn giao lại hoặc chuyển sang xử lý hàng hoàn\.

__Actor chính__

Người thu gom/giao hàng

__Actor phụ__

Người mua \(nhận thông báo hẹn lại\), Seller/Sàn TMĐT \(nhận thông báo\), Điều phối viên bưu cục

__Tiền điều kiện \(Pre\-condition\)__

Người thu gom/giao hàng đã đăng nhập vào App; đang xử lý đơn hàng ở trạng thái "Đang giao" và xác định không thể giao thành công tại thời điểm hiện tại\.

__Hậu điều kiện \(Post\-condition\)__

Đơn hàng chuyển sang trạng thái "Chờ giao lại" \(nếu chưa đủ số lần thất bại quy định\) hoặc "Giao thất bại – chờ hoàn" \(nếu đã đủ số lần, kích hoạt Quy trình 7 – Xử lý hàng hoàn\); lý do thất bại được ghi nhận đầy đủ vào lịch sử đơn hàng\.

__Luồng sự kiện chính \(Main Flow\)__

Người thu gom/giao hàng

Hệ thống

1\. Tại màn hình đơn hàng đang giao, chọn "Báo giao thất bại"\.

2\. Hiển thị danh sách nhóm lý do thất bại \(VD: Không liên lạc được khách, Khách từ chối nhận, Sai địa chỉ/không tìm thấy, Khách yêu cầu đổi lịch, Khác\.\.\.\)\.

3\. Chọn nhóm lý do phù hợp\.

4\. Hiển thị các trường bổ sung tương ứng với nhóm lý do đã chọn \(VD: số lần đã gọi khách, thời gian hẹn lại mong muốn\.\.\.\)\.

5\. Nhập thông tin bổ sung, chụp ảnh minh chứng hiện trường \(nếu có\) và xác nhận\.

6\. Ghi nhận thời gian, tọa độ GPS tại thời điểm báo thất bại\.

7\. Tăng bộ đếm số lần giao thất bại lũy kế của đơn hàng\.

8\. Kiểm tra số lần giao thất bại lũy kế so với ngưỡng quy định \(mặc định: 3 lần\)\.

9\. Lưu lý do, minh chứng và số lần thất bại vào lịch sử đơn hàng \(Audit Log\)\.

10\. Xem kết quả xử lý và tiếp tục với đơn hàng tiếp theo trong tuyến\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

8\.1 Chưa đủ số lần thất bại quy định: hệ thống cập nhật trạng thái đơn hàng thành "Chờ giao lại", gửi thông báo hẹn lịch giao lại cho Người mua \(kèm khung giờ dự kiến nếu nhân viên có nhập\), và đưa đơn quay lại hàng đợi để Module AI/ML gộp vào lượt tối ưu tuyến giao kế tiếp \(Quy trình 5\)\.

3\.1 Chọn nhóm lý do "Khách yêu cầu đổi lịch" và khách có cung cấp khung giờ cụ thể muốn giao lại\.

4\.1 Hệ thống cho phép nhập khung giờ hẹn lại theo yêu cầu của khách, ưu tiên đơn này vào đúng khung giờ đó ở lượt tối ưu tuyến kế tiếp \(nếu khả thi\)\.

3\.2 Chọn nhóm lý do "Sai địa chỉ/không tìm thấy"\.

4\.2 Hệ thống yêu cầu nhân viên xác nhận đã thử liên hệ khách để hỏi lại địa chỉ trước khi cho phép hoàn tất báo thất bại, nhằm tránh báo thất bại do chưa cố gắng tìm đúng địa chỉ\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

8\.2 Đã đủ số lần giao thất bại quy định \(mặc định: 3 lần\): hệ thống cập nhật trạng thái đơn hàng thành "Giao thất bại – chờ hoàn", kích hoạt Quy trình 7 \(Xử lý hàng hoàn\) và gửi thông báo cho Sàn TMĐT/Nhà bán hàng ngay lập tức \(không đợi cuối ngày\)\.

6\.1 Không thể ghi nhận tọa độ GPS do thiết bị mất tín hiệu định vị, hệ thống vẫn cho phép ghi nhận báo thất bại dựa trên thời gian hệ thống \(server time\), đánh dấu bản ghi thiếu tọa độ để đối soát sau nếu cần\.

9\.1 Không thể lưu dữ liệu do lỗi kết nối mạng từ App, hệ thống lưu thao tác vào bộ nhớ tạm trên thiết bị \(offline queue\) kèm ảnh minh chứng, tự động đồng bộ lại khi có kết nối; nhân viên vẫn có thể tiếp tục xử lý đơn tiếp theo\.

\(Alternate\) 8\.1\.1 Gửi thông báo hẹn lại cho Người mua thất bại do lỗi dịch vụ, đơn vẫn được cập nhật "Chờ giao lại" thành công; hệ thống đưa vào hàng đợi để gửi lại thông báo sau\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Xử lý hàng hoàn

__Tên use case__

Xử lý hàng hoàn

__Mô tả sơ lược chức năng__

Quản lý luồng vận chuyển ngược \(Reverse Logistics\) khi đơn hàng bị đánh dấu "Giao thất bại – chờ hoàn" sau khi đã đủ số lần giao thất bại quy định, đưa hàng hóa quay trở lại bưu cục gốc và bàn giao lại cho Nhà bán hàng\.

__Actor chính__

Người thu gom/giao hàng

__Actor phụ__

Nhà bán hàng \(xác nhận nhận lại hàng\), Nhân viên Kho \(kho đích và kho gốc\), Người trung chuyển \(nếu hoàn liên tỉnh\), Sàn TMĐT \(nhận thông báo\)

__Tiền điều kiện \(Pre\-condition\)__

Đơn hàng đang ở trạng thái "Giao thất bại – chờ hoàn" \(được kích hoạt từ UC14 – Báo giao thất bại khi đủ số lần quy định\); kiện hàng vẫn đang trong tay Người thu gom/giao hàng hoặc đã về bưu cục đích\.

__Hậu điều kiện \(Post\-condition\)__

Hàng hóa được vận chuyển ngược về đúng bưu cục gốc và bàn giao thành công cho Nhà bán hàng; đơn hàng chuyển sang trạng thái "Đã hoàn trả thành công"; các bên liên quan được thông báo đầy đủ tại từng mốc xử lý\.

__Luồng sự kiện chính \(Main Flow\)__

1\. Hệ thống tự động kích hoạt khi đơn hàng đủ điều kiện hoàn \(từ UC14\)\.

2\. Cập nhật trạng thái đơn hàng thành "Giao thất bại – chờ hoàn"\.

3\. Gửi thông báo ngay lập tức cho Sàn TMĐT/Nhà bán hàng về việc đơn sẽ được hoàn trả\.

4\. Người thu gom/giao hàng mang kiện hàng về nhập lại tại kho của bưu cục đích\.

5\. Nhân viên Kho quét mã kiện hàng, xác nhận tiếp nhận hàng hoàn\.

6\. Hệ thống kiểm tra bưu cục gốc ban đầu của đơn hàng \(lấy từ dữ liệu mapping lúc tạo đơn – Quy trình 1\)\.

7\. Kiểm tra bưu cục đích hiện tại có phải là bưu cục gốc hay không\.

8\. Nếu KHÔNG phải bưu cục gốc: đóng bao, kẹp seal, chuyển hàng cho Người trung chuyển để luân chuyển ngược \(gọi lại Quy trình 4 với tham số hướng = Ngược\)\.

9\. Nếu LÀ bưu cục gốc: đưa kiện hàng vào khu vực chờ Nhà bán hàng đến nhận, cập nhật trạng thái "Đã về kho gốc – chờ Seller nhận"\.

10\. Gửi thông báo cho Nhà bán hàng đến nhận lại hàng tại bưu cục gốc\.

11\. Nhà bán hàng đến bưu cục gốc, quét mã xác nhận nhận lại hàng\.

12\. Đối chiếu mã quét với đơn hàng đang chờ hoàn\.

13\. Cập nhật trạng thái đơn hàng thành "Đã hoàn trả thành công"\.

14\. Ghi nhận lịch sử hoàn trả \(Audit Log\): thời gian nhận lại, người xác nhận\.

15\. Gửi thông báo hoàn tất cho Sàn TMĐT\.

16\. Kết thúc chức năng\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

7\.1 Bưu cục đích hiện tại chính là bưu cục gốc \(đơn nội thành, không cần luân chuyển liên kho\), hệ thống bỏ qua bước 8, chuyển thẳng sang bước 9\.

11\.1 Nhà bán hàng không đến trực tiếp, ủy quyền cho người khác đến nhận thay\.

11\.1\.1 Hệ thống yêu cầu nhập thông tin người nhận thay và mã xác thực bổ sung \(OTP gửi về Seller\) trước khi cho phép quét xác nhận nhận hàng\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

5\.1 Kiện hàng bị hư hỏng/thất lạc trong quá trình giao và hoàn \(không còn nguyên vẹn khi nhập kho\), Nhân viên Kho lập biên bản sự cố, hệ thống tạm dừng luồng hoàn tự động, chuyển đơn sang trạng thái "Hàng hoàn – có sự cố" để CSKH/Điều phối viên xử lý thủ công với Seller \(bồi thường/khiếu nại\)\.

8\.1 Seal bị đứt/rách trong quá trình luân chuyển ngược \(tương tự Quy trình 4\), Nhân viên Kho đích lập biên bản sự cố, tạm dừng quy trình hoàn đối với bao tải này để xử lý ngoại lệ\.

10\.1 Nhà bán hàng không đến nhận hàng sau một khoảng thời gian quy định \(VD: 15 ngày\) kể từ khi hàng về kho gốc, hệ thống gửi nhắc nhở định kỳ; nếu vẫn không nhận, chuyển đơn sang trạng thái "Hàng tồn kho quá hạn" để bưu cục xử lý theo chính sách thanh lý/liên hệ CSKH\.

12\.1 Mã quét không khớp với đơn hàng đang chờ hoàn tại bưu cục, hiển thị thông báo "Mã vận đơn không khớp\." và yêu cầu kiểm tra/quét lại đúng đơn\.

13\.1 Không thể cập nhật trạng thái do lỗi cơ sở dữ liệu hoặc máy chủ, hệ thống hoàn tác \(Rollback\) và hiển thị thông báo lỗi cho Nhân viên Kho; nhân viên vẫn giữ hàng tại khu vực chờ và thử xác nhận lại sau\.

15\.1 Không thể gửi thông báo cho Sàn TMĐT do lỗi dịch vụ, đơn vẫn được ghi nhận hoàn trả thành công; hệ thống đưa vào hàng đợi để gửi lại thông báo sau\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Nhập kho

__Tên use case__

Nhập kho

__Mô tả sơ lược chức năng__

Cho phép Nhân viên Kho quét mã từng kiện hàng khi hàng về đến cửa kho \(từ Người thu gom/giao hàng hoặc từ Người trung chuyển\), đối chiếu mã vùng đích và phân loại hàng vào đúng luồng xử lý tiếp theo \(chờ giao ngay hoặc đóng bao chờ luân chuyển\)\.

__Actor chính__

Nhân viên Kho

__Actor phụ__

Người thu gom/giao hàng hoặc Người trung chuyển \(bàn giao hàng\)

__Tiền điều kiện \(Pre\-condition\)__

Nhân viên Kho đã đăng nhập vào hệ thống/App tại quầy; hàng hóa đã được vận chuyển về đến cửa kho \(từ khâu thu gom \- Quy trình 2, hoặc từ khâu luân chuyển liên kho \- Quy trình 4\) và đang chờ quét nhập kho\.

__Hậu điều kiện \(Post\-condition\)__

Kiện hàng được ghi nhận đã nhập kho, đơn hàng chuyển sang trạng thái "Đã nhập kho gốc – chờ luân chuyển" hoặc "Đã nhập kho đích – chờ giao hàng" tùy theo kết quả đối chiếu mã vùng đích\.

__Luồng sự kiện chính \(Main Flow\)__

Nhân viên Kho

Hệ thống

1\. Nhận bàn giao kiện hàng từ Người thu gom/giao hàng \(hoặc Người trung chuyển\)\.

2\. Hiển thị màn hình quét nhập kho\.

3\. Quét mã vạch/QR trên từng kiện hàng\.

4\. Đối chiếu mã vận đơn quét được với dữ liệu đơn hàng trong hệ thống\.

5\. Kiểm tra đơn hàng có đang ở trạng thái phù hợp để nhập kho hay không \(VD: "Đã lấy hàng", "Đang luân chuyển"\)\.

6\. Truy vấn Master Data để đối chiếu mã vùng đích \(địa chỉ giao hàng\) với mã bưu cục hiện tại\.

7\. Kiểm tra bưu cục hiện tại có phải là bưu cục đích cuối cùng của đơn hàng hay không\.

8a\. Nếu KHÔNG phải đích cuối: đánh dấu kiện hàng cần phân loại vào bao tải theo tỉnh/quận đích tương ứng\.

8b\. Nếu LÀ đích cuối: đánh dấu kiện hàng đưa vào khu vực chờ giao\.

9\. Ghi nhận thời gian, vị trí kho và người thực hiện quét nhập kho\.

10\. Cập nhật trạng thái đơn hàng tương ứng \("Đã nhập kho gốc – chờ luân chuyển" hoặc "Đã nhập kho đích – chờ giao hàng"\)\.

11\. Ghi nhận lịch sử nhập kho \(Audit Log\)\.

12\. Gửi thông báo cập nhật hành trình cho Sàn TMĐT/Người mua\.

13\. Tiếp tục quét kiện hàng tiếp theo\.

14\. Cập nhật số lượng kiện đã quét/còn lại trong lô hàng đang xử lý\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

3\.1 Không quét được mã vạch/QR \(mã mờ, rách, thiết bị lỗi camera\)\.

3\.1\.1 Hệ thống cho phép nhập thủ công Mã vận đơn để xác nhận thay thế cho việc quét mã\.

3\.2 Quét theo lô \(nhiều kiện hàng cùng một chuyến hàng về cùng lúc\)\.

3\.2\.1 Hệ thống cho phép quét liên tục nhiều mã mà không cần xác nhận từng kiện riêng lẻ, hiển thị tổng số kiện đã quét thành công theo thời gian thực\.

6\.1 Không tìm thấy mã vùng đích tương ứng trong Master Data \(địa chỉ mới/chưa cập nhật bản đồ vùng\), hệ thống tạm gán kiện hàng vào luồng "Cần Điều phối viên xác nhận thủ công tuyến đích" thay vì tự động phân loại\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

4\.1 Mã vận đơn quét được không tồn tại trong hệ thống, hiển thị thông báo "Mã vận đơn không hợp lệ\." và yêu cầu kiểm tra lại kiện hàng \(có thể là hàng ngoài hệ thống hoặc mã bị hỏng không đọc đúng\)\.

5\.1 Đơn hàng đang ở trạng thái không phù hợp để nhập kho \(VD: đã "Giao thành công", "Đã hủy"\), hiển thị thông báo "Đơn hàng không hợp lệ để nhập kho ở trạng thái hiện tại\." và yêu cầu Nhân viên Kho tách riêng kiện hàng này để báo cáo Điều phối viên xử lý ngoại lệ\.

4\.2 Kiện hàng quét trùng — đã được nhập kho trước đó \(VD: quét nhầm 2 lần cùng một mã\), hệ thống cảnh báo "Kiện hàng đã được nhập kho trước đó vào \[thời gian\]\." và không tạo thêm bản ghi trùng lặp\.

10\.1 Không thể cập nhật trạng thái do lỗi cơ sở dữ liệu hoặc máy chủ, hệ thống lưu tạm kết quả quét vào hàng đợi cục bộ và tự động đồng bộ lại khi kết nối phục hồi; Nhân viên Kho vẫn có thể tiếp tục quét các kiện tiếp theo\.

12\.1 Không thể gửi thông báo cho Sàn TMĐT/Người mua do lỗi dịch vụ, đơn vẫn được cập nhật nhập kho thành công; hệ thống đưa vào hàng đợi để gửi lại thông báo sau\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Xuất kho

__Tên use case__

Nhập kho

__Mô tả sơ lược chức năng__

Cho phép Nhân viên Kho quét mã từng kiện hàng khi hàng về đến cửa kho \(từ Người thu gom/giao hàng hoặc từ Người trung chuyển\), đối chiếu mã vùng đích và phân loại hàng vào đúng luồng xử lý tiếp theo \(chờ giao ngay hoặc đóng bao chờ luân chuyển\)\.

__Actor chính__

Nhân viên Kho

__Actor phụ__

Người thu gom/giao hàng hoặc Người trung chuyển \(bàn giao hàng\)

__Tiền điều kiện \(Pre\-condition\)__

Nhân viên Kho đã đăng nhập vào hệ thống/App tại quầy; hàng hóa đã được vận chuyển về đến cửa kho \(từ khâu thu gom \- Quy trình 2, hoặc từ khâu luân chuyển liên kho \- Quy trình 4\) và đang chờ quét nhập kho\.

__Hậu điều kiện \(Post\-condition\)__

Kiện hàng được ghi nhận đã nhập kho, đơn hàng chuyển sang trạng thái "Đã nhập kho gốc – chờ luân chuyển" hoặc "Đã nhập kho đích – chờ giao hàng" tùy theo kết quả đối chiếu mã vùng đích\.

__Luồng sự kiện chính \(Main Flow\)__

Nhân viên Kho

Hệ thống

1\. Nhận bàn giao kiện hàng từ Người thu gom/giao hàng \(hoặc Người trung chuyển\)\.

2\. Hiển thị màn hình quét nhập kho\.

3\. Quét mã vạch/QR trên từng kiện hàng\.

4\. Đối chiếu mã vận đơn quét được với dữ liệu đơn hàng trong hệ thống\.

5\. Kiểm tra đơn hàng có đang ở trạng thái phù hợp để nhập kho hay không \(VD: "Đã lấy hàng", "Đang luân chuyển"\)\.

6\. Truy vấn Master Data để đối chiếu mã vùng đích \(địa chỉ giao hàng\) với mã bưu cục hiện tại\.

7\. Kiểm tra bưu cục hiện tại có phải là bưu cục đích cuối cùng của đơn hàng hay không\.

8a\. Nếu KHÔNG phải đích cuối: đánh dấu kiện hàng cần phân loại vào bao tải theo tỉnh/quận đích tương ứng\.

8b\. Nếu LÀ đích cuối: đánh dấu kiện hàng đưa vào khu vực chờ giao\.

9\. Ghi nhận thời gian, vị trí kho và người thực hiện quét nhập kho\.

10\. Cập nhật trạng thái đơn hàng tương ứng \("Đã nhập kho gốc – chờ luân chuyển" hoặc "Đã nhập kho đích – chờ giao hàng"\)\.

11\. Ghi nhận lịch sử nhập kho \(Audit Log\)\.

12\. Gửi thông báo cập nhật hành trình cho Sàn TMĐT/Người mua\.

13\. Tiếp tục quét kiện hàng tiếp theo\.

14\. Cập nhật số lượng kiện đã quét/còn lại trong lô hàng đang xử lý\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

3\.1 Không quét được mã vạch/QR \(mã mờ, rách, thiết bị lỗi camera\)\.

3\.1\.1 Hệ thống cho phép nhập thủ công Mã vận đơn để xác nhận thay thế cho việc quét mã\.

3\.2 Quét theo lô \(nhiều kiện hàng cùng một chuyến hàng về cùng lúc\)\.

3\.2\.1 Hệ thống cho phép quét liên tục nhiều mã mà không cần xác nhận từng kiện riêng lẻ, hiển thị tổng số kiện đã quét thành công theo thời gian thực\.

6\.1 Không tìm thấy mã vùng đích tương ứng trong Master Data \(địa chỉ mới/chưa cập nhật bản đồ vùng\), hệ thống tạm gán kiện hàng vào luồng "Cần Điều phối viên xác nhận thủ công tuyến đích" thay vì tự động phân loại\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

4\.1 Mã vận đơn quét được không tồn tại trong hệ thống, hiển thị thông báo "Mã vận đơn không hợp lệ\." và yêu cầu kiểm tra lại kiện hàng \(có thể là hàng ngoài hệ thống hoặc mã bị hỏng không đọc đúng\)\.

5\.1 Đơn hàng đang ở trạng thái không phù hợp để nhập kho \(VD: đã "Giao thành công", "Đã hủy"\), hiển thị thông báo "Đơn hàng không hợp lệ để nhập kho ở trạng thái hiện tại\." và yêu cầu Nhân viên Kho tách riêng kiện hàng này để báo cáo Điều phối viên xử lý ngoại lệ\.

4\.2 Kiện hàng quét trùng — đã được nhập kho trước đó \(VD: quét nhầm 2 lần cùng một mã\), hệ thống cảnh báo "Kiện hàng đã được nhập kho trước đó vào \[thời gian\]\." và không tạo thêm bản ghi trùng lặp\.

10\.1 Không thể cập nhật trạng thái do lỗi cơ sở dữ liệu hoặc máy chủ, hệ thống lưu tạm kết quả quét vào hàng đợi cục bộ và tự động đồng bộ lại khi kết nối phục hồi; Nhân viên Kho vẫn có thể tiếp tục quét các kiện tiếp theo\.

12\.1 Không thể gửi thông báo cho Sàn TMĐT/Người mua do lỗi dịch vụ, đơn vẫn được cập nhật nhập kho thành công; hệ thống đưa vào hàng đợi để gửi lại thông báo sau\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

#### Đặc tả Use Case: Kiểm kê kho

Đặc tả Use Case: Kiểm kê kho

__Tên use case__

Kiểm kê kho

__Mô tả sơ lược chức năng__

Cho phép Nhân viên Kho \(hoặc Quản lý kho\) đối chiếu số lượng, tình trạng kiện hàng thực tế đang tồn tại trong kho với dữ liệu ghi nhận trên hệ thống, phát hiện chênh lệch \(thất lạc, dư thừa, tồn quá hạn\) để xử lý kịp thời\.

__Actor chính__

Nhân viên Kho

__Actor phụ__

Quản lý kho/Điều phối viên Kho Tổng \(duyệt kết quả kiểm kê, xử lý chênh lệch\)

__Tiền điều kiện \(Pre\-condition\)__

Nhân viên Kho đã đăng nhập vào hệ thống; có quyền thực hiện kiểm kê tại bưu cục/kho đang phụ trách\.

__Hậu điều kiện \(Post\-condition\)__

Danh sách chênh lệch \(nếu có\) giữa tồn kho thực tế và tồn kho hệ thống được ghi nhận; các kiện hàng bị đánh dấu bất thường \(thất lạc/dư thừa/tồn quá hạn\) được chuyển sang quy trình xử lý ngoại lệ tương ứng; báo cáo kiểm kê được lưu lại\.

__Luồng sự kiện chính \(Main Flow\)__

Nhân viên Kho

Hệ thống

1\. Chọn chức năng Kiểm kê kho\.

2\. Hiển thị màn hình chọn phạm vi kiểm kê \(toàn kho, theo khu vực/kệ, theo tỉnh/quận đích, hoặc theo khoảng thời gian nhập kho\)\.

3\. Chọn phạm vi kiểm kê và bắt đầu\.

4\. Truy xuất danh sách toàn bộ kiện hàng đang có trạng thái "tồn kho" \(chờ giao/chờ luân chuyển\) trong phạm vi đã chọn từ cơ sở dữ liệu, làm danh sách đối chiếu \(expected list\)\.

5\. Quét mã vạch/QR lần lượt từng kiện hàng thực tế có mặt trong kho\.

6\. Đối chiếu từng mã quét được với danh sách đối chiếu \(expected list\), đánh dấu "đã kiểm" cho các mã khớp\.

7\. Hoàn tất quét toàn bộ kiện hàng thực tế, chọn Kết thúc kiểm kê\.

8\. So sánh danh sách đã quét với danh sách đối chiếu, xác định: kiện hàng khớp, kiện hàng thiếu \(có trong hệ thống nhưng không quét được\), kiện hàng dư/lạ \(quét được nhưng không có trong danh sách đối chiếu\)\.

9\. Sinh báo cáo kết quả kiểm kê \(số lượng khớp/thiếu/dư, chi tiết từng mã vận đơn\)\.

10\. Hiển thị báo cáo cho Nhân viên Kho xem trước khi gửi duyệt\.

11\. Xác nhận gửi báo cáo kiểm kê cho Quản lý kho/Điều phối viên Kho Tổng\.

12\. Lưu báo cáo kiểm kê vào cơ sở dữ liệu, ghi nhận thời gian, người thực hiện \(Audit Log\)\.

13\. Gửi thông báo báo cáo kiểm kê chờ duyệt cho Quản lý kho/Điều phối viên Kho Tổng\.

14\. Xem kết quả và kết thúc chức năng\.

__Luồng sự kiện thay thế \(Alternate Flow\)__

5\.1 Không quét được mã vạch/QR \(mã mờ, rách, thiết bị lỗi camera\)\.

5\.1\.1 Hệ thống cho phép nhập thủ công Mã vận đơn để xác nhận thay thế cho việc quét mã\.

5\.2 Tạm dừng kiểm kê giữa chừng \(VD: hết ca làm việc\)\.

5\.2\.1 Hệ thống lưu tạm tiến độ đã quét, cho phép tiếp tục kiểm kê từ điểm đã dừng ở phiên làm việc kế tiếp mà không mất dữ liệu đã quét trước đó\.

8\.1 Không phát hiện chênh lệch nào \(toàn bộ khớp\), hệ thống vẫn sinh báo cáo "Kiểm kê khớp 100%" và lưu lại như một mốc xác nhận định kỳ, không cần Quản lý kho xử lý thêm\.

__Luồng sự kiện ngoại lệ \(Exception Flow\)__

8\.2 Phát hiện kiện hàng thiếu \(có trong hệ thống, không quét được thực tế\), hệ thống đánh dấu đơn hàng liên quan là "Nghi thất lạc", tạm khóa không cho các thao tác khác \(giao/luân chuyển\) tác động lên đơn này cho đến khi có kết luận điều tra\.

8\.3 Phát hiện kiện hàng dư/lạ \(quét được nhưng không thuộc danh sách đối chiếu của kho này — VD: hàng bị giao nhầm kho, hoặc đã cập nhật sai trạng thái trước đó\), hệ thống đánh dấu "Hàng lạ – cần xác minh" và không tự động gán vào luồng xử lý nào cho đến khi Quản lý kho xác minh nguồn gốc\.

8\.4 Phát hiện kiện hàng tồn kho vượt quá thời gian quy định \(VD: hàng hoàn không ai đến nhận quá 15 ngày, hoặc hàng chờ giao quá lâu bất thường\), hệ thống liệt kê riêng vào mục "Tồn kho quá hạn" trong báo cáo để Quản lý kho xử lý theo chính sách\.

12\.1 Không thể lưu báo cáo do lỗi cơ sở dữ liệu hoặc máy chủ, hệ thống giữ nguyên dữ liệu đã quét ở bộ nhớ tạm, hiển thị thông báo lỗi và cho phép Nhân viên Kho thử gửi lại báo cáo mà không cần quét lại từ đầu\.

*Sơ đồ hoạt động Activity*

*Sơ đồ trình tự*

