# E-Logistic Frontend Web (Client, Seller & Public Portal)

## 📌 QUY TẮC NGUỒN GỐC THÔNG TIN (SINGLE SOURCE OF TRUTH)
- `src/types/order.types.ts` là **BẢN GỐC DUY NHẤT** định nghĩa kiểu dữ liệu `Order`, `TrackingEvent`, `OrderStatus`.
- Mọi thay đổi về cấu trúc Order **BẮT BUỘC** thực hiện tại `frontend_web/src/types/order.types.ts` trước, sau đó copy thủ công sang `frontend_admin/src/types/dispatch.types.ts` và `warehouse.types.ts`.
- **KHÔNG TỰ Ý SỬA RIÊNG BÊN ADMIN**.
