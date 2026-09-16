# Database Migration Guide: Ticket & Customer Service Overhaul

## 📋 Migration 001: `001_ticket_expand.js`

### Mục tiêu
- Mở rộng Mongoose Schema cho `Ticket` để hỗ trợ SLA Engine, Maker-Checker đền bù, và Auto-Priority.
- Tách biệt luồng tin nhắn `messages[]` sang collection độc lập `ticketmessages` (tránh nổ giới hạn 16MB document của MongoDB).
- Giữ nguyên mảng `messages[]` ở `tickets` trong 1 sprint nhằm phục vụ khả năng Rollback.

### 🛡️ 1. Hướng dẫn Sao lưu dữ liệu (Backup) trước khi chạy
Chạy lệnh `mongodump` để snapshot dữ liệu MongoDB trước khi thực hiện migration:
```bash
mongodump --uri="mongodb://127.0.0.1:27017/e_logistic" --out="./backup/pre-cs-migration"
```

### 🚀 2. Lệnh thực thi Migration 001
Migration thiết kế dạng **Idempotent** (chạy nhiều lần an toàn không trùng lặp):
```bash
node backend/scripts/migrations/001_ticket_expand.js
```

### 🔄 3. Lệnh Rollback Migration 001
Trong trường hợp cần hoàn tác dữ liệu:
```bash
node backend/scripts/migrations/rollback_001.js
```
Hoặc khôi phục dữ liệu từ snapshot:
```bash
mongorestore --uri="mongodb://127.0.0.1:27017/e_logistic" ./backup/pre-cs-migration/e_logistic
```

### ✅ 4. Lệnh Kiểm tra Nghiệm thu sau Migration
Chạy script kiểm tra trùng lặp `ticketCode`:
```bash
mongosh e_logistic --eval "db.tickets.aggregate([{\$group:{_id:'\$ticketCode',n:{\$sum:1}}},{\$match:{n:{\$gt:1}}}])"
```
*(Kết quả kỳ vọng: Mảng rỗng `[]`)*
