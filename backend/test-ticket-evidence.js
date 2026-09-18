const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./src/app');
const User = require('./src/models/user.model');
const Ticket = require('./src/models/ticket.model');

async function testTicketCreationWithEvidence() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
  await mongoose.connect(mongoURI);

  // 1. Get or create Seller
  let seller = await User.findOne({ role: 'SELLER' });
  if (!seller) {
    seller = await User.create({
      fullName: 'Test Evidence Seller',
      email: `seller.evidence.${Date.now()}@elogistic.vn`,
      role: 'SELLER',
      phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      isActive: true,
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
  const token = jwt.sign({ id: seller._id, role: seller.role }, jwtSecret, { expiresIn: '1h' });

  // 2. Start ephemeral HTTP server on random free port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Server listening on ephemeral port ${port}`);

  // 3. Create a temporary sample image
  const sampleImagePath = path.join(__dirname, 'temp_evidence.jpg');
  fs.writeFileSync(sampleImagePath, Buffer.from('FAKE_IMAGE_DATA_FOR_TESTING_EVIDENCE_ATTACHMENT_STREAM'));

  // 4. Construct multipart FormData using native Blob/FormData
  const formData = new FormData();
  formData.append('trackingCode', `EL-EVD-${Date.now()}`);
  formData.append('category', 'DAMAGED_GOODS');
  formData.append('priority', 'HIGH');
  formData.append('subject', 'Hàng vỡ nát khi nhận - Yêu cầu bồi thường');
  formData.append('content', 'Kiện hàng bị dập nát góc hộp bên trái, sản phẩm bên trong bị biến dạng không dùng được.');
  
  const fileBlob = new Blob([fs.readFileSync(sampleImagePath)], { type: 'image/jpeg' });
  formData.append('evidence', fileBlob, 'damaged_box_evidence.jpg');

  console.log(`--- GỬI REQUEST POST /api/tickets VỚI ẢNH EVIDENCE (MULTIPART/FORM-DATA) ĐẾN PORT ${port} ---`);
  const response = await fetch(`http://127.0.0.1:${port}/api/tickets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const statusCode = response.status;
  const json = await response.json();

  console.log(`HTTP Status: ${statusCode}`);
  console.log('Response Body:', JSON.stringify(json, null, 2));

  // 5. Query MongoDB để kiểm chứng DB thực tế
  const createdTicket = await Ticket.findById(json.data?._id);
  console.log('\n--- DỮ LIỆU TICKET TRONG MONGODB ---');
  console.log(`Ticket Code: ${createdTicket?.ticketCode}`);
  console.log(`Category: ${createdTicket?.category}`);
  console.log(`Attachments Count: ${createdTicket?.attachments?.length}`);
  console.log('Attachments Detail:', JSON.stringify(createdTicket?.attachments, null, 2));

  // Cleanup
  server.close();
  if (fs.existsSync(sampleImagePath)) {
    fs.unlinkSync(sampleImagePath);
  }

  await mongoose.disconnect();
}

testTicketCreationWithEvidence().catch((err) => {
  console.error('Lỗi test ticket evidence:', err);
  process.exit(1);
});
