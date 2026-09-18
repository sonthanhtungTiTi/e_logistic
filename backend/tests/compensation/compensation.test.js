const mongoose = require('mongoose');
const http = require('http');
const compensationService = require('../../src/services/compensation.service');
const orderService = require('../../src/services/order.service');
const ticketCore = require('../../src/services/ticketCore.service');
const Compensation = require('../../src/models/compensation.model');
const LedgerEntry = require('../../src/models/ledgerEntry.model');
const Wallet = require('../../src/models/wallet.model');
const User = require('../../src/models/user.model');
const Ticket = require('../../src/models/ticket.model');
const Order = require('../../src/models/order.model');
const CustodyTransferLog = require('../../src/models/custodyTransferLog.model');
const AppError = require('../../src/utils/AppError');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

describe('Phase 4 — Banking-Grade Compensation & Financial Ledger Module', () => {
  let sellerUser, csL1User, csLeadUser, accountantUser, adminUser;
  let sellerWallet;
  let sampleOrder, sampleTicket;
  let server, baseURL;

  const generateAuthToken = (user) => {
    return jwt.sign(
      { id: user._id, role: user.role, csLevel: user.csLevel },
      process.env.JWT_SECRET || 'test_secret_key',
      { expiresIn: '1h' }
    );
  };

  beforeAll((done) => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
    server = app.listen(0, () => {
      const port = server.address().port;
      baseURL = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(async () => {
    // Xoá sạch collections
    await Promise.all([
      Compensation.deleteMany({}),
      LedgerEntry.deleteMany({}, { bypassAppendOnlyCheck: true }),
      Wallet.deleteMany({}),
      User.deleteMany({}),
      Ticket.deleteMany({}),
      Order.deleteMany({}),
      CustodyTransferLog.deleteMany({}),
    ]);

    // Tạo các Users đại diện cho Maker-Checker RBAC
    sellerUser = await User.create({
      fullName: 'Nguyễn Văn Seller',
      email: 'seller@elogistics.test',
      phoneNumber: '0901111111',
      password: 'Password123@',
      role: 'SELLER',
      walletBalance: 0,
    });

    csL1User = await User.create({
      fullName: 'Trần Thị CS L1',
      email: 'csl1@elogistics.test',
      phoneNumber: '0902222222',
      password: 'Password123@',
      role: 'CS',
      csLevel: 'L1',
    });

    csLeadUser = await User.create({
      fullName: 'Lê Văn CS Lead',
      email: 'lead@elogistics.test',
      phoneNumber: '0903333333',
      password: 'Password123@',
      role: 'CS',
      csLevel: 'LEAD',
    });

    accountantUser = await User.create({
      fullName: 'Hoàng Kế Toán',
      email: 'accountant@elogistics.test',
      phoneNumber: '0904444444',
      password: 'Password123@',
      role: 'ACCOUNTANT',
    });

    adminUser = await User.create({
      fullName: 'Võ Admin Tổng',
      email: 'admin@elogistics.test',
      phoneNumber: '0905555555',
      password: 'Password123@',
      role: 'ADMIN',
    });

    // Tạo Wallet cho Seller
    sellerWallet = await Wallet.create({
      ownerId: sellerUser._id,
      balance: 1000000,
      currency: 'VND',
    });

    // Tạo Order mẫu
    sampleOrder = await Order.create({
      trackingCode: 'TEST-ORD-P4-001',
      sellerId: sellerUser._id,
      declaredValue: 5000000,
      goodsValue: 5000000,
      shippingFee: 50000,
      codAmount: 5050000,
      status: 'DELIVERING',
      pickupAddress: { fullName: 'A', phone: '0901', address: 'B', ward: 'W', district: 'D', province: 'P' },
      deliveryAddress: { fullName: 'B', phone: '0902', address: 'C', ward: 'W', district: 'D', province: 'P' },
      items: [{ name: 'Sản phẩm mẫu', quantity: 1, weight: 1 }],
      actualWeight: 1,
      chargeableWeight: 1,
    });

    // Tạo Ticket mẫu
    const createdTicketResult = await ticketCore.createTicket(
      {
        trackingCode: sampleOrder.trackingCode,
        orderId: sampleOrder._id,
        category: 'DAMAGED',
        subject: 'Hàng bị vỡ khi vận chuyển',
        message: 'Khách hàng nhận hàng bị vỡ nát hoàn toàn',
      },
      sellerUser
    );
    sampleTicket = createdTicketResult.ticket;
  });

  // ── TEST 1: 5 Lệnh approve() song song cùng 1 compensationId (Anti-Race Condition & Idempotency) ──
  it('1. 5 lệnh approve() gọi song song (Promise.all) cùng 1 compensationId -> Wallet.balance chỉ +amount đúng 1 lần, LedgerEntry duy nhất 1 bản ghi', async () => {
    // CS tạo đề xuất 500.000 VNĐ
    const comp = await compensationService.propose(
      sampleTicket._id,
      { amount: 500000, reason: 'Hàng hỏng cần đền bù 500k', evidence: [] },
      csL1User
    );

    expect(comp.state).toBe('PROPOSED');

    const initialWallet = await Wallet.findOne({ ownerId: sellerUser._id });
    const initialBalance = initialWallet.balance; // 1.000.000

    // Bắn 5 request approve đồng thời
    const promises = [
      compensationService.approve(comp._id, accountantUser),
      compensationService.approve(comp._id, accountantUser),
      compensationService.approve(comp._id, accountantUser),
      compensationService.approve(comp._id, accountantUser),
      compensationService.approve(comp._id, accountantUser),
    ];

    const results = await Promise.all(promises);

    // Xác nhận kết quả
    const updatedWallet = await Wallet.findOne({ ownerId: sellerUser._id });
    expect(updatedWallet.balance).toBe(initialBalance + 500000); // 1.500.000 đúng 1 lần

    const ledgerCount = await LedgerEntry.countDocuments({ compensationId: comp._id });
    expect(ledgerCount).toBe(1);

    const updatedComp = await Compensation.findById(comp._id);
    expect(updatedComp.state).toBe('PAID');
    expect(String(updatedComp.approvedBy)).toBe(String(accountantUser._id));
  });

  // ── TEST 2: CS L1 propose 3.000.000 không có evidence -> PROPOSED, KHÔNG autoApproved ──
  it('2. CS L1 propose 3.000.000 (không có evidence) -> state phải là PROPOSED, KHÔNG autoApproved', async () => {
    const comp = await compensationService.propose(
      sampleTicket._id,
      { amount: 3000000, reason: 'Bồi thường giá trị đơn 3 triệu', evidence: [] },
      csL1User
    );

    expect(comp.state).toBe('PROPOSED');
    expect(comp.autoApproved).toBe(false);
    expect(comp.approvedBy).toBeNull();

    const updatedTicket = await Ticket.findById(sampleTicket._id);
    expect(updatedTicket.status).toBe('PENDING_REFUND');
  });

  // ── TEST 3: CS L1 propose 150.000 CÓ evidence -> autoApproved = true, state = PAID ──
  it('3. CS L1 propose 150.000 CÓ evidence -> autoApproved = true và duyệt thành công ngay lập tức', async () => {
    const comp = await compensationService.propose(
      sampleTicket._id,
      {
        amount: 150000,
        reason: 'Hàng trầy xước nhẹ đền bù 150k',
        evidence: ['https://cdn.e-logistic.vn/proof/broken_box_01.jpg'],
      },
      csL1User
    );

    expect(comp.state).toBe('PAID');
    expect(comp.autoApproved).toBe(true);
    expect(comp.approvedBy).toBeNull(); // System auto-approved

    const wallet = await Wallet.findOne({ ownerId: sellerUser._id });
    expect(wallet.balance).toBe(1150000);

    const updatedTicket = await Ticket.findById(sampleTicket._id);
    expect(updatedTicket.status).toBe('RESOLVED');
  });

  // ── TEST 4: CS L1 propose 150.000 KHÔNG evidence -> autoApproved = false ──
  it('4. CS L1 propose 150.000 KHÔNG evidence -> autoApproved = false (bắt buộc chờ Checker)', async () => {
    const comp = await compensationService.propose(
      sampleTicket._id,
      {
        amount: 150000,
        reason: 'Khách báo hỏng nhưng chưa gửi ảnh',
        evidence: [],
      },
      csL1User
    );

    expect(comp.state).toBe('PROPOSED');
    expect(comp.autoApproved).toBe(false);

    const wallet = await Wallet.findOne({ ownerId: sellerUser._id });
    expect(wallet.balance).toBe(1000000); // Số dư ví chưa đổi
  });

  // ── TEST 5: CS L1 chạm ngưỡng tích lũy ngày L1_DAILY_CAP (2.000.000) ──
  it('5. CS L1 đã autoApprove 1.900.000 trong ngày, propose thêm 200.000 có evidence -> KHÔNG được autoApprove (vượt L1_DAILY_CAP)', async () => {
    // Tạo giả định các bản ghi autoApproved trước đó trong ngày của CS L1 tổng 1.900.000
    await Compensation.create({
      ticketId: new mongoose.Types.ObjectId(),
      walletOwnerId: sellerUser._id,
      amount: 1900000,
      reason: 'Đền bù trước đó trong ngày',
      evidence: ['https://cdn.test/proof.jpg'],
      state: 'PAID',
      proposedBy: csL1User._id,
      autoApproved: true,
      idempotencyKey: 'test_daily_cap_key_1',
    });

    // Propose thêm 200.000 (1.900.000 + 200.000 = 2.100.000 > 2.000.000)
    const comp = await compensationService.propose(
      sampleTicket._id,
      {
        amount: 200000,
        reason: 'Đề xuất thêm 200k có bằng chứng',
        evidence: ['https://cdn.test/proof2.jpg'],
      },
      csL1User
    );

    expect(comp.state).toBe('PROPOSED');
    expect(comp.autoApproved).toBe(false);
  });

  // ── TEST 6: Maker-Checker Violation ──
  it('6. CS gọi trực tiếp approve() cho đề xuất của chính mình -> 403 MAKER_CHECKER_VIOLATION (test cả CS thường và LEAD)', async () => {
    // Case 1: CS L1 propose 1.000.000 -> tự approve
    const comp1 = await compensationService.propose(
      sampleTicket._id,
      { amount: 1000000, reason: 'Bồi thường 1 triệu', evidence: [] },
      csL1User
    );

    await expect(
      compensationService.approve(comp1._id, csL1User)
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'FORBIDDEN',
    });

    // Case 2: CS Lead propose 4.000.000 -> tự approve
    const ticket2 = (
      await ticketCore.createTicket(
        { orderId: sampleOrder._id, subject: 'Lead Ticket', message: 'Lead test' },
        sellerUser
      )
    ).ticket;

    const comp2 = await compensationService.propose(
      ticket2._id,
      { amount: 4000000, reason: 'Lead đề xuất 4 triệu', evidence: [] },
      csLeadUser
    );

    await expect(
      compensationService.approve(comp2._id, csLeadUser)
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'MAKER_CHECKER_VIOLATION',
    });
  });

  // ── TEST 7: Tổng compensation 2 ticket cùng orderId vượt declaredValue + shippingFee ──
  it('7. Tổng compensation 2 ticket khác nhau CÙNG orderId vượt declaredValue + shippingFee -> đề xuất thứ 2 bị chặn 422', async () => {
    const limitedOrder = await Order.create({
      trackingCode: 'TEST-ORD-LIMIT-001',
      sellerId: sellerUser._id,
      declaredValue: 2000000,
      goodsValue: 2000000,
      shippingFee: 50000,
      codAmount: 2050000,
      status: 'DELIVERING',
      pickupAddress: { fullName: 'A', phone: '0901', address: 'B', ward: 'W', district: 'D', province: 'P' },
      deliveryAddress: { fullName: 'B', phone: '0902', address: 'C', ward: 'W', district: 'D', province: 'P' },
      items: [{ name: 'Sản phẩm mẫu', quantity: 1, weight: 1 }],
      actualWeight: 1,
      chargeableWeight: 1,
    });

    const ticket1 = (
      await ticketCore.createTicket(
        { orderId: limitedOrder._id, trackingCode: limitedOrder.trackingCode, category: 'DAMAGED', subject: 'Khiếu nại 1', message: 'Hàng vỡ 1' },
        sellerUser
      )
    ).ticket;

    // Ticket 1: propose và approve 1.500.000
    const comp1 = await compensationService.propose(
      ticket1._id,
      { amount: 1500000, reason: 'Bồi thường phần 1', evidence: [] },
      csL1User
    );
    await compensationService.approve(comp1._id, accountantUser);

    // Ticket 2 cho cùng order (loại sự cố khác: LOST):
    const ticket2 = (
      await ticketCore.createTicket(
        { orderId: limitedOrder._id, trackingCode: limitedOrder.trackingCode, category: 'LOST', subject: 'Khiếu nại lần 2', message: 'Hàng mất thêm kiện' },
        sellerUser
      )
    ).ticket;

    // Propose thêm 600.000 (1.500.000 + 600.000 = 2.100.000 > 2.050.000)
    await expect(
      compensationService.propose(
        ticket2._id,
        { amount: 600000, reason: 'Bồi thường vượt hạn mức đơn', evidence: [] },
        csL1User
      )
    ).rejects.toMatchObject({
      statusCode: 422,
      errorCode: 'COMPENSATION_EXCEEDS_ORDER_VALUE',
    });
  });

  // ── TEST 8: Bất biến Append-Only của LedgerEntry ──
  it('8. LedgerEntry.updateOne() / deleteOne() -> BẮT BUỘC throw Error (Append-Only Invariant)', async () => {
    const ledger = await LedgerEntry.create({
      entryCode: 'LED-TEST-001',
      type: 'COMPENSATION',
      direction: 'CREDIT',
      amount: 100000,
      walletOwnerId: sellerUser._id,
      idempotencyKey: 'ledger_append_only_test_key',
      balanceBefore: 0,
      balanceAfter: 100000,
    });

    // Thử update
    await expect(
      LedgerEntry.updateOne({ _id: ledger._id }, { $set: { amount: 200000 } })
    ).rejects.toThrow('LedgerEntry is append-only, mutation forbidden');

    // Thử delete
    await expect(
      LedgerEntry.deleteOne({ _id: ledger._id })
    ).rejects.toThrow('LedgerEntry is append-only, mutation forbidden');
  });

  // ── TEST 9: Claim Hold trên đơn hàng và chuyển trạng thái DELIVERED_PENDING_CLAIM ──
  it('9. Đơn có claimHold=true -> transition sang COD_SETTLED ném 409; transition sang DELIVERED_PENDING_CLAIM thành công', async () => {
    // Gán claimHold = true trên đơn hàng
    sampleOrder.claimHold = true;
    sampleOrder.claimHoldSetAt = new Date();
    await sampleOrder.save();

    // 1. Chuyển sang COD_SETTLED khi claimHold=true -> Phải ném 409
    await expect(
      orderService.updateOrderStatus(sellerUser._id, true, sampleOrder._id, 'COD_SETTLED')
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'ORDER_UNDER_CLAIM_HOLD',
    });

    // 2. Chuyển sang DELIVERED khi claimHold=true -> Phải chuyển thành DELIVERED_PENDING_CLAIM
    const updated = await orderService.updateOrderStatus(sellerUser._id, true, sampleOrder._id, 'DELIVERED');
    expect(updated.status).toBe('DELIVERED_PENDING_CLAIM');
  });

  // ── TEST 10: Seller CHƯA có Wallet -> approve() trả 422 WALLET_NOT_FOUND, không tạo LedgerEntry mồ côi ──
  it('10. Seller CHƯA có Wallet -> approve() phải trả 422 WALLET_NOT_FOUND, KHÔNG tạo LedgerEntry mồ côi', async () => {
    // Xoá ví của Seller
    await Wallet.deleteMany({ ownerId: sellerUser._id });

    const comp = await compensationService.propose(
      sampleTicket._id,
      { amount: 500000, reason: 'Bồi thường khi chưa có ví', evidence: [] },
      csL1User
    );

    await expect(
      compensationService.approve(comp._id, accountantUser)
    ).rejects.toMatchObject({
      statusCode: 422,
      errorCode: 'WALLET_NOT_FOUND',
    });

    const ledgerCount = await LedgerEntry.countDocuments({ compensationId: comp._id });
    expect(ledgerCount).toBe(0); // Không tạo LedgerEntry mồ côi
  });

  // ── TEST 11: Transaction Rollback khi có lỗi giữa chừng ──
  it('11. Mô phỏng lỗi throw giữa transaction -> verify Wallet.balance KHÔNG đổi, LedgerEntry KHÔNG được tạo (Rollback chuẩn)', async () => {
    const comp = await compensationService.propose(
      sampleTicket._id,
      { amount: 500000, reason: 'Rollback test', evidence: [] },
      csL1User
    );

    const initialWallet = await Wallet.findOne({ ownerId: sellerUser._id });
    const initialBalance = initialWallet.balance;

    // Spy mock CustodyTransferLog.create để throw lỗi
    const spy = jest.spyOn(CustodyTransferLog, 'create').mockImplementationOnce(() => {
      throw new Error('Mô phỏng lỗi DB/Network trong transaction');
    });

    await expect(
      compensationService.approve(comp._id, accountantUser)
    ).rejects.toThrow('Mô phỏng lỗi DB/Network trong transaction');

    spy.mockRestore();

    // Verify Rollback: Số dư ví không thay đổi, không có ledger entry, trạng thái comp vẫn là PROPOSED
    const afterWallet = await Wallet.findOne({ ownerId: sellerUser._id });
    expect(afterWallet.balance).toBe(initialBalance);

    const ledgerCount = await LedgerEntry.countDocuments({ compensationId: comp._id });
    expect(ledgerCount).toBe(0);

    const compAfter = await Compensation.findById(comp._id);
    expect(compAfter.state).toBe('PROPOSED');
  });

  // ── TEST 12: Gọi route cũ POST /admin/:id/refund PHẢI 410 ENDPOINT_DEPRECATED ──
  it('12. Gọi route cũ POST /api/tickets/admin/:id/refund -> PHẢI trả về 410 ENDPOINT_DEPRECATED, KHÔNG BAO GIỜ trả 200', async () => {
    const adminToken = generateAuthToken(adminUser);

    const res = await fetch(`${baseURL}/api/tickets/admin/${sampleTicket._id}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ amount: 100000 }),
    });

    const body = await res.json();
    expect(res.status).toBe(410);
    expect(body.code).toBe('ENDPOINT_DEPRECATED');
    expect(body.message).toContain('Endpoint này đã ngừng hoạt động');
  });
});
