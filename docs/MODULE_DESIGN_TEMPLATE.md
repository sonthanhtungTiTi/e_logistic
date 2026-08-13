# MẪU THIẾT KẾ & ĐẶC TẢ SẢN PHẨM CHUẨN CHO CÁC MODULE E-LOGISTIC (TEMPLATE SPECIFICATION)

---

## 📌 QUY TRÌNH CHUẨN KHI TRIỂN KHAI MỘT USE CASE / MODULE

Khi thực hiện bất kỳ Use Case nào từ **Module 2 trở đi**, hệ thống sẽ tuân thủ cấu trúc chuẩn 2 Bảng:
1. **BẢNG 1: ĐẶC TẢ KỸ THUẬT VÀ XỬ LÝ SỰ KIỆN (TECHNICAL SPECIFICATION & EVENT LOGIC)** - Dành cho Lập trình viên, Kiến trúc sư phần mềm (Đầy đủ Main Flow, Alternate Flows, Exception Flows, Code patterns, Data models).
2. **BẢNG 2: BẢNG BÁO CÁO NGHIỆP VỤ (DÀNH CHO BÁO CÁO WORD)** - Dành cho Báo cáo đồ án luận văn, Giảng viên, BA, Product Manager (Văn viết phổ thông, thuần nghiệp vụ, không có từ ngữ kỹ thuật).

---

## 📐 CẤU TRÚC BÁO CÁO MẪU (TEMPLATE FORM)

### BẢNG 1: ĐẶC TẢ KỸ THUẬT VÀ XỬ LÝ SỰ KIỆN

```markdown
# ĐẶC TẢ USE CASE: UC-XX — [TÊN USE CASE]

## BẢNG 1: ĐẶC TẢ KỸ THUẬT VÀ XỬ LÝ SỰ KIỆN
| Thành phần / Luồng | STT / Mã | Actor / Module | Logic kỹ thuật & Xử lý CSDL chi tiết (Node.js + Mongoose/MongoDB) |
| :--- | :--- | :--- | :--- |
| **Mã Use Case** | — | — | **UC-XX** |
| **Tên Use Case** | — | — | **[Tên Use Case]** |
| **Mô tả sơ lược** | — | — | [Mô tả kỹ thuật tóm tắt] |
| **Actor chính** | — | — | [Actor] |
| **Actor phụ** | — | — | [Các service/Actor phụ] |
| **Tiền điều kiện** | — | — | [JWT Access Token, status ACTIVE, Roles, ...] |
| **Hậu điều kiện** | — | — | [Trạng thái CSDL, Event log, Transaction commitment] |

### LUỒNG SỰ KIỆN CHÍNH (MAIN FLOW)
1. Actor gửi request với Payload + Header Idempotency.
2. Express Middleware: Rate Limiter + Whitelist Payload + Joi Validation.
3. Service Layer: Thực hiện Business Logic, tính toán Server-side (Recalculation).
4. Generator: Sinh Unique Identifier (Idempotency / Tracking / Code).
5. Mongoose Session: `session.withTransaction()` ghi đồng thời Model chính + OrderLog/AuditLog.
6. HTTP Response: HTTP 201/200 kèm JSON kết quả và metadata.

### LUỒNG THAY THẾ (ALTERNATE FLOW)
- Validation Error -> HTTP 400 Bad Request
- Flagged Risk / Anomaly -> Chuyển trạng thái `PENDING_VERIFICATION`, bật Cờ cảnh báo
- Special Business Cases -> Xử lý giá trị mặc định / Khuyến mãi / Thay đổi quy trình

### LUỒNG NGOẠI LỆ (EXCEPTION FLOW)
- Rate Limit Exceeded -> HTTP 429 Too Many Requests
- Outside Service Area / Invalid Scope -> HTTP 400 Bad Request
- Duplicate Key (E11000) -> 
  + Match Payload Hash: HTTP 200 OK (Trả về kết quả idempotency trước đó)
  + Differ Payload Hash: HTTP 409 Conflict
- DB / Server Crash -> `session.abortTransaction(); session.endSession();` -> HTTP 500
```

---

### BẢNG 2: BẢNG BÁO CÁO NGHIỆP VỤ (DÀNH CHO BÁO CÁO WORD)

```markdown
## BẢNG 2: BẢNG BÁO CÁO NGHIỆP VỤ (DÀNH CHO BÁO CÁO WORD)
### Đặc tả Use Case: [Tên Use Case]

| Thành phần | Nội dung đặc tả nghiệp vụ |
| :--- | :--- |
| **Tên Use Case** | **[Tên Use Case]** |
| **Mô tả sơ lược** | [Mô tả nghiệp vụ thuần túy không dùng từ kỹ thuật] |
| **Actor chính** | [Tên Actor] |
| **Actor phụ** | Không / [Tên Actor] |
| **Tiền điều kiện** | [Tiền điều kiện nghiệp vụ] |
| **Hậu điều kiện** | [Kết quả đạt được] |

#### 1. Luồng sự kiện chính (Main Flow)
| Người dùng (Actor) | Hệ thống (System) |
| :--- | :--- |
| 1. Chọn chức năng... | |
| | 2. Hệ thống kiểm tra hợp lệ... |
| | 3. Hệ thống tính toán và xử lý... |

#### 2. Luồng sự kiện thay thế (Alternate Flow)
| Tình huống / Điều kiện | Xử lý của Hệ thống |
| :--- | :--- |
| ... | ... |

#### 3. Luồng sự kiện ngoại lệ (Exception Flow)
| Tình huống / Điều kiện | Xử lý của Hệ thống |
| :--- | :--- |
| ... | ... |
```

---

## 🛠️ TIÊU CHUẨN CODE BACKEND KHI TRIỂN KHAI MODULE (ARCHITECTURAL PATTERNS)

1. **Clean Architecture**:
   - `models/*.model.js`: Mongoose Schema với Integer (VND Đồng), Indexing, Validation.
   - `services/*.service.js`: Chứa toàn bộ Business Logic, Risk Engine, Transaction.
   - `controllers/*.controller.js`: Xử lý HTTP Request/Response, Try-Catch Error handling.
   - `routes/*.routes.js`: Middleware protection (`protect`, `authorize`), Rate Limiter, Route definitions.
   - `utils/*.js`: Generators (Id, Code, Hash).

2. **Security & Data Integrity**:
   - **Parameter Tampering Prevention**: Server tính toán lại 100% dữ liệu tài chính/cước phí, không tin dữ liệu client gửi lên.
   - **Idempotency**: Dựa trên MongoDB Unique Index (`E11000`) + SHA-256 `payload_hash`.
   - **Atomicity**: Mongoose Session Transaction (`session.withTransaction()`) ghi đồng thời Entity chính và Log Trace.
   - **Rate Limiting**: `express-rate-limit` chặn spam IP (HTTP 429).
