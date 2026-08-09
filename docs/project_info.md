# Dự án Hệ thống Quản lý & Tối ưu hóa Chuỗi cung ứng Logistics Thông minh (Smart Logistics System / E-Logistics)

Dự án là một giải pháp quản lý toàn diện quy trình chuỗi cung ứng từ khâu kho bãi, phân phối, vận chuyển cho đến khi hàng hóa tới tay người tiêu dùng. Dự án được định hướng bám sát thực tế bùng nổ của thương mại điện tử (TMĐT) và xu hướng tự động hóa kho vận hiện nay.

## I. Kiến trúc Hệ thống & Công nghệ (Tech Stack)
Hệ thống được thiết kế theo cấp độ doanh nghiệp (Enterprise-grade) với các tiêu chuẩn công nghệ hiện đại:
- **Kiến trúc chính:** Áp dụng mô hình BCE (Boundary - Control - Entity) kết hợp chặt chẽ với thiết kế hướng miền DDD (Domain-Driven Design).
- **Hạ tầng và Backend Core:** Sử dụng Node.js (ExpressJS). Module AI/ML Engine được tách biệt bằng Python.
- **Cơ sở dữ liệu & Bộ đệm:**
  - MongoDB hỗ trợ lưu trữ dữ liệu phi cấu trúc linh hoạt.
  - PostgreSQL kết hợp với extension địa lý PostGIS.
  - Redis làm Cache lưu session, Rate Limiting.
- **Frontend & Mobile App:** React / Next.js kết hợp Tailwind CSS. Flutter cho mobile app của tài xế.

## II. Các Tác nhân chính (Actors) và Nghiệp vụ Use Case
1. **Nhà bán hàng (Seller)**
2. **Người mua (Buyer)**
3. **Hệ thống Sàn TMĐT (System Actor)**
4. **Tài xế (Người thu gom/giao hàng)**
5. **Tài xế trung chuyển (Line-haul)**
6. **Nhân viên Kho**
7. **Điều phối viên Bưu cục**
8. **Điều phối viên Kho Tổng**
9. **Nhân viên CSKH**
10. **Kế toán**
11. **Quản trị viên (Admin)**

## III. Vòng đời Trạng thái Đơn hàng (Order State Machine)
DRAFT -> CREATED -> READY_TO_PICK -> PICKING -> PICKED -> INBOUND_HUB -> SORTING -> BAGGED_SEALED -> IN_TRANSIT -> INBOUND_HUB_DEST -> OUT_FOR_DELIVERY -> DELIVERED / FAILED -> RETURNING / RETURNED

## IV. Bản đồ 9 Quy trình Nghiệp vụ Cốt lõi (BPMN Flows)
- Quy trình 1: Đồng bộ và Xử lý Đơn hàng
- Quy trình 1B: Xác nhận Sẵn sàng Lấy hàng
- Quy trình 2: Điều phối và Thu gom hàng hóa
- Quy trình 3: Nhập kho và Phân loại
- Quy trình 4: Luân chuyển Liên kho
- Quy trình 5: Tối ưu Lộ trình Giao hàng (AI Routing)
- Quy trình 6: Giao hàng và Theo dõi
- Quy trình 7: Xử lý Hàng hoàn
- Quy trình 8: Đối soát COD và Thanh toán
- Quy trình 9: Dự báo Nhu cầu Vận hành
