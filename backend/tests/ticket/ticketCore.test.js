const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../../src/models/user.model');
const Ticket = require('../../src/models/ticket.model');
const TicketMessage = require('../../src/models/ticketMessage.model');
const ticketCore = require('../../src/services/ticketCore.service');
const { TICKET_STATUS, canTransition } = require('../../src/constants/ticketState');

describe('ticketCore Service Integration Tests', () => {
  let seller;
  let csAgent1;
  let csAgent2;
  let testTicket;

  beforeAll(async () => {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
    await mongoose.connect(mongoURI);

    try {
      await mongoose.connection.db.collection('ticketmessages').dropIndex('ticketId_1_clientMsgId_1');
    } catch (e) {}

    await Ticket.deleteMany({ trackingCode: /^EL-TEST-/ });
    await TicketMessage.deleteMany({});

    seller = await User.findOneAndUpdate(
      { email: 'test.seller@elogistic.vn' },
      { fullName: 'Test Seller', role: 'SELLER', phoneNumber: '0999000001', isActive: true },
      { upsert: true, new: true, returnDocument: 'after' }
    );

    csAgent1 = await User.findOneAndUpdate(
      { email: 'test.cs1@elogistic.vn' },
      { fullName: 'CS Agent 1', role: 'CS', csLevel: 'L1', phoneNumber: '0999000002', isActive: true },
      { upsert: true, new: true, returnDocument: 'after' }
    );

    csAgent2 = await User.findOneAndUpdate(
      { email: 'test.cs2@elogistic.vn' },
      { fullName: 'CS Agent 2', role: 'CS', csLevel: 'L2', phoneNumber: '0999000003', isActive: true },
      { upsert: true, new: true, returnDocument: 'after' }
    );
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Tạo ticketCode thành công dạng TK-YYYYMMDD-NNNN', async () => {
    const { ticket, deduplicated } = await ticketCore.createTicket(
      {
        trackingCode: 'EL-TEST-001',
        category: 'DAMAGED_GOODS',
        priority: 'P2',
        subject: 'Hàng móp vỏ khi vận chuyển',
        message: 'Xin chào, kiện hàng của tôi bị móp vỏ.',
      },
      seller
    );

    testTicket = ticket;
    expect(ticket).toBeDefined();
    expect(ticket.ticketCode).toMatch(/^TK-/);
    expect(deduplicated).toBe(false);
  });

  it('Đã ngăn chặn trùng lặp ticket trong vòng 10 phút', async () => {
    const dupResult = await ticketCore.createTicket(
      {
        trackingCode: 'EL-TEST-001',
        category: 'DAMAGED_GOODS',
        subject: 'Hàng móp vỏ khi vận chuyển',
        message: 'Tạo lại cùng tiêu đề',
      },
      seller
    );

    expect(dupResult.deduplicated).toBe(true);
    expect(dupResult.ticket._id.toString()).toBe(testTicket._id.toString());
  });

  it('Race condition: 50 claim đồng thời -> đúng 1 claim thành công (200), 49 claim bị chặn (409)', async () => {
    const claims = Array.from({ length: 50 }).map((_, i) =>
      ticketCore.claimTicket(testTicket._id, i % 2 === 0 ? csAgent1 : csAgent2).catch((err) => err)
    );

    const results = await Promise.all(claims);
    const successClaims = results.filter((r) => r && r._id);
    const conflictErrors = results.filter((r) => r && r.code === 'TICKET_ALREADY_CLAIMED');

    expect(successClaims.length).toBe(1);
    expect(conflictErrors.length).toBe(49);
  });

  it('Gửi message idempotency với clientMsgId trùng lặp', async () => {
    const clientMsgId = `cmsg_${Date.now()}`;
    const msg1 = await ticketCore.addMessage(
      testTicket._id,
      { body: 'Tin nhắn gửi thử nghiệm', clientMsgId },
      csAgent1
    );
    const msg2 = await ticketCore.addMessage(
      testTicket._id,
      { body: 'Tin nhắn gửi lại thử nghiệm', clientMsgId },
      csAgent1
    );

    expect(msg1.deduplicated).toBe(false);
    expect(msg2.deduplicated).toBe(true);
  });

  it('Seller KHÔNG nhìn thấy tin nhắn INTERNAL', async () => {
    await ticketCore.addMessage(
      testTicket._id,
      { body: 'Ghi chú nội bộ CS', visibility: 'INTERNAL' },
      csAgent1
    );

    const messagesForSeller = await ticketCore.getTicketMessages(testTicket._id, seller);
    const sellerHasInternal = messagesForSeller.some((m) => m.visibility === 'INTERNAL');
    expect(sellerHasInternal).toBe(false);
  });

  it('CS nhìn thấy đầy đủ tin nhắn INTERNAL', async () => {
    const messagesForCS = await ticketCore.getTicketMessages(testTicket._id, csAgent1);
    const csHasInternal = messagesForCS.some((m) => m.visibility === 'INTERNAL');
    expect(csHasInternal).toBe(true);
  });

  it('Chuyển ASSIGNED -> IN_PROGRESS hợp lệ', () => {
    const validCheck = canTransition(TICKET_STATUS.ASSIGNED, TICKET_STATUS.IN_PROGRESS, csAgent1);
    expect(validCheck.ok).toBe(true);
  });

  it('Chuyển trực tiếp ASSIGNED -> RESOLVED bị chặn', () => {
    const invalidCheck = canTransition(TICKET_STATUS.ASSIGNED, TICKET_STATUS.RESOLVED, csAgent1);
    expect(invalidCheck.ok).toBe(false);
  });
});
