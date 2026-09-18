const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Ticket = require('../../src/models/ticket.model');
const Order = require('../../src/models/order.model');
const User = require('../../src/models/user.model');
const TicketMessage = require('../../src/models/ticketMessage.model');
const TicketAuditLog = require('../../src/models/ticketAuditLog.model');
const { getTicketContext, revealTicketPii } = require('../../src/controllers/ticketContext.controller');
const ticketCore = require('../../src/services/ticketCore.service');

function buildMockOrder(trackingCode, sellerId) {
  return {
    trackingCode,
    sellerId,
    status: 'DELIVERING',
    codAmount: 1500000,
    declaredValue: 2000000,
    shippingFee: 35000,
    actualWeight: 1.5,
    chargeableWeight: 1.5,
    pickupAddress: {
      fullName: 'Shop Thời Trang ABC',
      phone: '0912345671',
      address: '123 Đường Láng',
      ward: 'Láng Thượng',
      district: 'Đống Đa',
      province: 'Hà Nội',
    },
    deliveryAddress: {
      fullName: 'Lê Văn Khách',
      phone: '0987654321',
      address: '456 Hai Bà Trưng',
      ward: 'Phường Tân Định',
      district: 'Quận 1',
      province: 'TP. Hồ Chí Minh',
    },
    receiver: {
      name: 'Lê Văn Khách',
      phone: '0987654321',
      address: '456 Hai Bà Trưng, Phường Tân Định, Quận 1, TP. Hồ Chí Minh',
    },
  };
}

describe('Ticket Context & PII Controller Tests', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
      await mongoose.connect(mongoURI);
    }
  });

  afterAll(async () => {
    // Keep connection
  });

  beforeEach(async () => {
    await Ticket.deleteMany({ ticketCode: /^TK-/ });
    await Order.deleteMany({ trackingCode: /^EXP-TEST-/ });
    await TicketMessage.deleteMany({});
    await TicketAuditLog.deleteMany({});
  });

  it('GET /context returns 360-degree data with masked PII and permissions', async () => {
    const seller = await User.findOneAndUpdate(
      { email: 'seller.context@test.com' },
      {
        fullName: 'Nguyễn Văn Chủ Shop',
        companyName: 'Shop Thời Trang ABC',
        role: 'SELLER',
        phoneNumber: '0912345671',
        phone: '0912345671',
        kycStatus: 'VERIFIED',
        isActive: true,
      },
      { upsert: true, returnDocument: 'after' }
    );

    const csUser = await User.findOneAndUpdate(
      { email: 'cs.context@test.com' },
      {
        fullName: 'Trần Thị CSKH',
        role: 'CS',
        csLevel: 'L2',
        phoneNumber: '0912345672',
        phone: '0912345672',
        isActive: true,
      },
      { upsert: true, returnDocument: 'after' }
    );

    const order = await Order.create(buildMockOrder('EXP-TEST-001', seller._id));

    const { ticket } = await ticketCore.createTicket(
      {
        orderId: order._id,
        trackingCode: order.trackingCode,
        category: 'DELIVERY_DELAY',
        priority: 'P2',
        subject: 'Giao trễ đơn hàng EXP-TEST-001',
        message: 'Khách phàn nàn chưa nhận được hàng',
      },
      seller
    );

    const req = {
      params: { id: ticket._id.toString() },
      user: csUser,
    };

    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
        return res;
      },
      status: () => res,
    };
    const next = jest.fn();

    await getTicketContext(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(responseData).toBeDefined();
    expect(responseData.success).toBe(true);
    expect(responseData.data.ticket.ticketCode).toBe(ticket.ticketCode);
    expect(responseData.data.permissions).toBeDefined();
    expect(responseData.data.permissions.canClaim).toBe(true);
    expect(responseData.data.permissions.canEscalate).toBe(true);
    expect(responseData.data.permissions.maxRefundAmount).toBe(2000000);

    // Verify Masking
    expect(responseData.data.order.receiverPhone).toBe('09****321');
    expect(responseData.data.order.receiverName).toBe('Lê V***');
    expect(responseData.data.order.receiverAddress).toContain('***, Phường Tân Định');
  });

  it('GET /context returns maxRefundAmount = 200000 for CS Level L1 user', async () => {
    const seller = await User.findOneAndUpdate(
      { email: 'seller.l1@test.com' },
      {
        fullName: 'Nguyễn Văn Seller',
        role: 'SELLER',
        phoneNumber: '0912345679',
        phone: '0912345679',
        isActive: true,
      },
      { upsert: true, returnDocument: 'after' }
    );

    const csUserL1 = await User.findOneAndUpdate(
      { email: 'cs.l1@test.com' },
      {
        fullName: 'Trần Văn CS L1',
        role: 'CS',
        csLevel: 'L1',
        phoneNumber: '0912345680',
        phone: '0912345680',
        isActive: true,
      },
      { upsert: true, returnDocument: 'after' }
    );

    const order = await Order.create(buildMockOrder('EXP-TEST-003', seller._id));

    const { ticket } = await ticketCore.createTicket(
      {
        orderId: order._id,
        trackingCode: order.trackingCode,
        category: 'FEE_DISPUTE',
        priority: 'P3',
        subject: 'Khiếu nại cước phí đơn EXP-TEST-003',
        message: 'Khách yêu cầu hoàn cước chênh lệch',
      },
      seller
    );

    const req = {
      params: { id: ticket._id.toString() },
      user: csUserL1,
    };

    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
        return res;
      },
      status: () => res,
    };
    const next = jest.fn();

    await getTicketContext(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(responseData).toBeDefined();
    expect(responseData.success).toBe(true);
    expect(responseData.data.permissions.maxRefundAmount).toBe(200000); // 200_000 VNĐ chuẩn spec
    expect(responseData.data.permissions.canEscalate).toBe(false); // L1 không được escalate
  });

  it('POST /reveal-pii returns raw PII and writes TicketAuditLog', async () => {
    const seller = await User.findOneAndUpdate(
      { email: 'seller.pii@test.com' },
      {
        fullName: 'Nguyễn Văn Chủ Shop 2',
        role: 'SELLER',
        phoneNumber: '0912345673',
        phone: '0912345673',
        isActive: true,
      },
      { upsert: true, returnDocument: 'after' }
    );

    const csUser = await User.findOneAndUpdate(
      { email: 'cs.pii@test.com' },
      {
        fullName: 'Trần Thị CSKH 2',
        role: 'CS',
        csLevel: 'L1',
        phoneNumber: '0912345674',
        phone: '0912345674',
        isActive: true,
      },
      { upsert: true, returnDocument: 'after' }
    );

    const mockOrder2 = buildMockOrder('EXP-TEST-002', seller._id);
    mockOrder2.receiver = {
      name: 'Phạm Hồng Nhung',
      phone: '0901234567',
      address: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    };
    mockOrder2.deliveryAddress.fullName = 'Phạm Hồng Nhung';
    mockOrder2.deliveryAddress.phone = '0901234567';
    mockOrder2.deliveryAddress.address = '12 Nguyễn Huệ';

    const order = await Order.create(mockOrder2);

    const { ticket } = await ticketCore.createTicket(
      {
        orderId: order._id,
        trackingCode: order.trackingCode,
        category: 'DAMAGED_GOODS',
        subject: 'Hàng bị vỡ vỏ hộp',
        message: 'Cần hỗ trợ kiểm tra',
      },
      seller
    );

    const req = {
      params: { id: ticket._id.toString() },
      user: csUser,
      ip: '127.0.0.1',
      headers: { 'user-agent': 'JestTestAgent/1.0' },
    };

    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
        return res;
      },
      status: () => res,
    };
    const next = jest.fn();

    await revealTicketPii(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(responseData).toBeDefined();
    expect(responseData.success).toBe(true);
    expect(responseData.data.phone).toBe('0901234567');
    expect(responseData.data.name).toBe('Phạm Hồng Nhung');
    expect(responseData.data.address).toBe('12 Nguyễn Huệ, Phường Tân Định, Quận 1, TP. Hồ Chí Minh');

    // Verify audit log created
    const log = await TicketAuditLog.findOne({ ticketId: ticket._id, action: 'VIEW_PII' });
    expect(log).toBeDefined();
    expect(log.actorRole).toBe('CS');
  });
});
