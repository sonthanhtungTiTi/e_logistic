# E-LOGISTICS — AI ASSISTANT WORKING GUIDELINES & PROJECT RULES

> **Dành cho tất cả AI Assistants & Agents (Google Antigravity, Gemini CLI, Cursor, Copilot, Windsurf, Claude Code):**  
> Khi bạn mở workspace này trên bất kỳ máy tính nào, bạn **BẮT BUỘC** phải tuân thủ nghiêm ngặt các quy tắc kiến trúc và tiêu chuẩn lập trình được định nghĩa dưới đây.

---

## 📌 1. Nguồn Sự Thật Duy Nhất (Single Source of Truth)

Trước khi phân tích, viết mới hoặc sửa đổi bất kỳ route, controller, service, model, worker, job hay component/page nào, AI **PHẢI** đọc và tuân thủ:

1. 🎯 **Skill File chính thức**: [`.gemini/skills/elogistic-feature-dev/SKILL.md`](file:///.gemini/skills/elogistic-feature-dev/SKILL.md)  
   *(Chứa toàn bộ 42 trạng thái Order, 17 Roles RBAC, các Pattern chống Race Condition, Write-Behind Caching, Anti-Mass Assignment, Anti-IDOR, Route Guard Poka-yoke và Checklist kiểm thử)*
2. 📘 **Tài liệu Kiến trúc Toàn diện**: [`docs/overview.md`](file:///docs/overview.md)  
   *(Phân tích chi tiết 24 Route Groups, 18 Services, 24 Schemas, luồng End-to-End và thuật toán Dijkstra/Haversine)*

---

## 🏗️ 2. Kiến trúc Kỹ thuật Tổng quan

- **Backend Runtime & DB**: Node.js >=18 / Express 5.2.1 + Mongoose 9.9.1 (MongoDB).
- **Caching & Queue Engine**: Redis (ioredis 5.8.0, In-Memory Hot Cache Layer) + RabbitMQ (amqplib 0.10.9, Message Broker với Write-Behind Caching qua `sync.service.js`).
- **Real-time Engine**: Socket.io 4.8.3 (GPS Live Tracking, Live Inventory & Order Timeline push).
- **Dual Frontend (2 App riêng biệt)**:
  - `frontend_web`: Kênh Seller & Tra cứu công khai (React 19 + Vite 8 + TypeScript 6 + TailwindCSS v4).
  - `frontend_admin`: Portal Vận hành kho, Lái xe, Điều phối & CSKH (React 19 + Vite 8 + TypeScript 6 + TailwindCSS v4).

---

## ⚡ 3. 5 Nguyên tắc Lập trình Cốt lõi (Zero Technical Debt)

1. **Suy nghĩ & Kiểm tra trước khi viết code (Read-First)**:
   - Đọc cấu trúc thư mục, model, service, component đã có.
   - Audit `package.json` trước khi thêm thư viện mới.
   - **CẤM tạo trùng lặp** logic, utility, service, type hay component. Luôn tái sử dụng hoặc mở rộng code sẵn có.

2. **Chống Race Condition & Atomic Update**:
   - Mọi thao tác cập nhật `status` Order hoặc thay đổi `quota` PHẢI sử dụng **Atomic Conditional Update** (`status: { $in: ALLOWED_STATUSES }`, `$inc`) trực tiếp trong query Mongoose, không check-rồi-update rời rạc.

3. **Tương thích tầng Write-Behind Caching**:
   - Các API cập nhật trạng thái đơn hàng PHẢI đi qua `sync.service.js` (Redis Hot Layer + RabbitMQ queue) thay vì ghi trực tiếp MongoDB (trừ khi hệ thống rơi vào Mode 3 fallback).
   - Thao tác Ví tiền (`walletBalance`) sử dụng Double-Write: ghi MongoDB trước rồi mới sync Redis.

4. **Bảo mật Anti-Mass Assignment & Anti-IDOR**:
   - Whitelist tất cả payload đầu vào, xóa bỏ các field nhạy cảm (`shippingFee`, `baseFee`, `role`, `status`, `sellerId`, `walletBalance`).
   - Kiểm tra quyền sở hữu (`sellerId === req.user._id` hoặc `isAdmin`).

5. **Targeted Patch Mode & Runtime Verification**:
   - Chỉ sửa đúng các dòng code cần thiết, giữ lượng git diff nhỏ nhất.
   - Chạy kiểm tra TypeScript (`npx tsc --noEmit`) và build test trước khi báo cáo hoàn thành.
