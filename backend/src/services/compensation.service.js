const crypto = require('crypto');
const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const speakeasy = require('speakeasy');
const Compensation = require('../models/compensation.model');
const LedgerEntry = require('../models/ledgerEntry.model');
const Wallet = require('../models/wallet.model');
const User = require('../models/user.model');
const Ticket = require('../models/ticket.model');
const Order = require('../models/order.model');
const CustodyTransferLog = require('../models/custodyTransferLog.model');
const AppError = require('../utils/AppError');
const {
  REFUND_LIMITS,
  L1_DAILY_CAP,
  TWO_FA_THRESHOLD,
  COMPENSATION_STATUS,
} = require('../constants/compensation');
const { transitionTicket } = require('./ticketCore.service');
const { getRedisClient } = require('../config/redis.config');

const SYSTEM_ACTOR = {
  _id: null,
  role: 'SYSTEM',
  fullName: 'Hệ thống tự động',
};

/**
 * Đề xuất bồi thường (Maker)
 */
async function propose(ticketId, payload, actor) {
  const { amount, reason, evidence = [] } = payload;

  // 1. Kiểm tra định dạng số tiền nguyên dương (VND)
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    throw new AppError(400, 'INVALID_AMOUNT', 'Số tiền đền bù phải là số nguyên dương (đơn vị Đồng)');
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    throw new AppError(400, 'INVALID_REASON', 'Lý do bồi thường không được để trống (tối thiểu 5 ký tự)');
  }

  // 2. Tìm Ticket
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket yêu cầu');
  }

  // 3. Chặn nếu ticket đã có bồi thường đang xử lý hoặc đã duyệt
  const existingActiveComp = await Compensation.findOne({
    ticketId: ticket._id,
    state: { $in: [COMPENSATION_STATUS.PROPOSED, COMPENSATION_STATUS.APPROVED, COMPENSATION_STATUS.PAID] },
  });
  if (existingActiveComp) {
    throw new AppError(
      409,
      'COMPENSATION_ALREADY_EXISTS',
      'Ticket này đã có đề xuất bồi thường đang xử lý hoặc đã hoàn tất'
    );
  }

  // 4. Kiểm tra tổng bồi thường của cùng Order không vượt quá giá trị đơn + cước phí
  const orderId = ticket.orderId;
  let order = null;
  if (orderId) {
    order = await Order.findById(orderId);
  } else if (ticket.orderTrackingCode || ticket.trackingCode) {
    order = await Order.findOne({
      trackingCode: (ticket.orderTrackingCode || ticket.trackingCode).trim().toUpperCase(),
    });
  }

  if (order) {
    const aggResult = await Compensation.aggregate([
      {
        $match: {
          orderId: order._id,
          state: { $in: [COMPENSATION_STATUS.APPROVED, COMPENSATION_STATUS.PAID] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const alreadyCompensated = aggResult.length > 0 ? aggResult[0].total : 0;
    const declaredVal = order.declaredValue || order.goodsValue || 0;
    const shippingFeeVal = order.shippingFee || 0;
    const maxAllowed = declaredVal + shippingFeeVal;

    if (alreadyCompensated + amount > maxAllowed) {
      throw new AppError(
        422,
        'COMPENSATION_EXCEEDS_ORDER_VALUE',
        `Tổng số tiền bồi thường (${alreadyCompensated + amount}đ) vượt quá giá trị đơn hàng và cước phí (${maxAllowed}đ). Đã đền bù: ${alreadyCompensated}đ, Giá trị tối đa: ${maxAllowed}đ`,
        { alreadyCompensated, maxAllowed, requestedAmount: amount }
      );
    }
  }

  // 5. Xác định đối tượng nhận tiền (Seller)
  const walletOwnerId = ticket.sellerId || ticket.requesterId || (order ? order.sellerId : null);
  if (!walletOwnerId) {
    throw new AppError(400, 'WALLET_OWNER_NOT_FOUND', 'Không xác định được chủ ví nhận tiền bồi thường');
  }

  // 6. Tính toán Idempotency Key & 2FA requirement
  const timeMinuteWindow = Math.floor(Date.now() / 60000);
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${ticket._id}:${amount}:${actor._id}:${timeMinuteWindow}`)
    .digest('hex');

  const requires2FA = amount > TWO_FA_THRESHOLD;

  // 7. Kiểm tra điều kiện Auto-Approve
  const actorCsLevel = actor.csLevel || 'L1';
  const hasEvidence = Array.isArray(evidence) && evidence.length > 0;
  const withinLevelLimit = amount <= (REFUND_LIMITS[actorCsLevel] || 0);

  let willAutoApprove = withinLevelLimit && hasEvidence;

  if (actorCsLevel === 'L1' && willAutoApprove) {
    // Kiểm tra tổng hạn mức cộng dồn trong ngày theo giờ Việt Nam
    const startOfDayVN = DateTime.now().setZone('Asia/Ho_Chi_Minh').startOf('day').toJSDate();
    const dailyAgg = await Compensation.aggregate([
      {
        $match: {
          proposedBy: actor._id,
          autoApproved: true,
          proposedAt: { $gte: startOfDayVN },
          state: { $in: [COMPENSATION_STATUS.APPROVED, COMPENSATION_STATUS.PAID] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const dailyUsed = dailyAgg.length > 0 ? dailyAgg[0].total : 0;
    if (dailyUsed + amount > L1_DAILY_CAP) {
      willAutoApprove = false; // Vượt hạn mức ngày -> chuyển về PROPOSED chờ Checker duyệt
    }
  }

  // 8. Tạo bản ghi Compensation
  const compensation = await Compensation.create({
    ticketId: ticket._id,
    orderId: order ? order._id : null,
    walletOwnerId,
    amount,
    currency: 'VND',
    reason: reason.trim(),
    evidence: Array.isArray(evidence) ? evidence : [],
    state: COMPENSATION_STATUS.PROPOSED,
    proposedBy: actor._id,
    proposedAt: new Date(),
    requires2FA,
    autoApproved: false,
    idempotencyKey,
  });

  // 9. Thực thi Auto-Approve hoặc Chuyển trạng thái Ticket sang PENDING_REFUND
  if (willAutoApprove) {
    return await approve(compensation._id, SYSTEM_ACTOR, {}, { isAutoApprove: true });
  } else {
    await transitionTicket(ticket._id, 'PENDING_REFUND', actor);
    return compensation;
  }
}

/**
 * Duyệt bồi thường & Ghi nhận Sổ cái Kế toán (Checker / System Auto)
 */
async function approve(compensationId, actor, options = {}, flags = {}) {
  const { twoFactorToken } = options;
  const { isAutoApprove = false } = flags;

  const redis = getRedisClient();
  const lockKey = `lock:comp:${compensationId}`;
  const lockToken = crypto.randomUUID();
  let lockAcquired = false;

  // 1. Phân tán Lock qua Redis (15 giây TTL)
  if (redis && typeof redis.set === 'function') {
    try {
      const lockRes = await redis.set(lockKey, lockToken, 'PX', 15000, 'NX');
      if (!lockRes) {
        throw new AppError(409, 'COMPENSATION_LOCKED', 'Đang có người xử lý đề xuất này');
      }
      lockAcquired = true;
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn('[Compensation Lock Warning]:', err.message);
    }
  }

  try {
    // 2. Tìm đề xuất Compensation
    const compensation = await Compensation.findById(compensationId);
    if (!compensation) {
      throw new AppError(404, 'COMPENSATION_NOT_FOUND', 'Không tìm thấy đề xuất bồi thường');
    }

    if (compensation.state === COMPENSATION_STATUS.PAID || compensation.state === COMPENSATION_STATUS.APPROVED) {
      return compensation; // Idempotent check
    }

    // 3. Phân quyền & Kiểm soát Maker-Checker
    if (!isAutoApprove) {
      const allowedRoles = ['ACCOUNTANT', 'ADMIN'];
      const isLead = actor.csLevel === 'LEAD' && compensation.amount <= REFUND_LIMITS.LEAD;

      if (!allowedRoles.includes(actor.role) && !isLead) {
        throw new AppError(403, 'FORBIDDEN', 'Bạn không có thẩm quyền duyệt mức bồi thường này');
      }

      // MAKER-CHECKER VIOLATION: Người tạo KHÔNG được tự duyệt đề xuất của chính mình
      if (String(actor._id) === String(compensation.proposedBy)) {
        throw new AppError(
          403,
          'MAKER_CHECKER_VIOLATION',
          'Không thể tự duyệt đề xuất bồi thường do chính mình tạo ra (Maker-Checker violation)'
        );
      }

      // Xác thực 2FA đối với các khoản đền bù trên ngưỡng quy định (> 5.000.000 VND)
      if (compensation.requires2FA) {
        if (!twoFactorToken) {
          throw new AppError(401, 'INVALID_2FA_TOKEN', 'Giao dịch bồi thường trên 5.000.000 VNĐ bắt buộc mã xác thực OTP 2FA');
        }

        const userRecord = await User.findById(actor._id).select('+twoFactorSecret');
        if (!userRecord || !userRecord.twoFactorSecret) {
          throw new AppError(401, 'INVALID_2FA_TOKEN', 'Tài khoản chưa kích hoạt 2FA, không thể duyệt bồi thường lớn');
        }

        const verified = speakeasy.totp.verify({
          secret: userRecord.twoFactorSecret,
          encoding: 'base32',
          token: String(twoFactorToken).trim(),
          window: 1,
        });

        if (!verified) {
          throw new AppError(401, 'INVALID_2FA_TOKEN', 'Mã xác thực OTP 2FA không chính xác hoặc đã hết hạn');
        }
      }
    }

    // 4. Mở MongoDB ACID Transaction
    const session = await mongoose.startSession();
    let finalCompensation = null;

    try {
      await session.withTransaction(async () => {
        // a. Re-read compensation trong session
        const compInSession = await Compensation.findById(compensationId).session(session);
        if (!compInSession) {
          throw new AppError(404, 'COMPENSATION_NOT_FOUND', 'Không tìm thấy đề xuất bồi thường');
        }

        if (compInSession.state !== COMPENSATION_STATUS.PROPOSED) {
          finalCompensation = compInSession;
          return;
        }

        // b. Kiểm tra Ví của Seller
        const wallet = await Wallet.findOne({ ownerId: compInSession.walletOwnerId }, null, { session });
        if (!wallet) {
          throw new AppError(422, 'WALLET_NOT_FOUND', 'Seller chưa có ví, không thể ghi nhận đền bù');
        }

        const balanceBefore = wallet.balance;

        // c. Cập nhật Số dư Ví (Atomic Increment)
        const walletUpdateResult = await Wallet.updateOne(
          { _id: wallet._id },
          { $inc: { balance: compInSession.amount } },
          { session }
        );

        if (walletUpdateResult.matchedCount !== 1 || walletUpdateResult.modifiedCount !== 1) {
          throw new Error('Cập nhật số dư ví thất bại hoặc xung đột đồng thời');
        }

        // Đồng bộ cập nhật vào User.walletBalance
        await User.updateOne(
          { _id: compInSession.walletOwnerId },
          { $inc: { walletBalance: compInSession.amount } },
          { session }
        );

        const balanceAfter = balanceBefore + compInSession.amount;

        // d. Tạo Bút toán Sổ cái Kế toán (Append-Only LedgerEntry)
        const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randSeq = Math.floor(100000 + Math.random() * 900000);
        const entryCode = `LED-${ymd}-${randSeq}`;

        let ledgerEntry = null;
        try {
          const [created] = await LedgerEntry.create(
            [
              {
                entryCode,
                type: 'COMPENSATION',
                direction: 'CREDIT',
                amount: compInSession.amount,
                currency: 'VND',
                walletOwnerId: compInSession.walletOwnerId,
                ticketId: compInSession.ticketId,
                orderId: compInSession.orderId,
                compensationId: compInSession._id,
                idempotencyKey: compInSession.idempotencyKey,
                proposedBy: compInSession.proposedBy,
                approvedBy: isAutoApprove ? null : actor._id,
                balanceBefore,
                balanceAfter,
                note: `Bồi thường khiếu nại ticket #${compInSession.ticketId}`,
                createdAt: new Date(),
              },
            ],
            { session }
          );
          ledgerEntry = created;
        } catch (err) {
          if (err.code === 11000) {
            ledgerEntry = await LedgerEntry.findOne({ idempotencyKey: compInSession.idempotencyKey }).session(session);
          } else {
            throw err;
          }
        }

        // e. Tạo Bản ghi Chuỗi Chuyển giao Trách nhiệm Tài chính (Custody Transfer Log)
        await CustodyTransferLog.create(
          [
            {
              orderId: compInSession.orderId,
              transferType: 'FINANCIAL_COMPENSATION_CREDIT',
              fromActor: {
                userId: isAutoApprove ? null : actor._id,
                role: isAutoApprove ? 'SYSTEM' : actor.role || 'ACCOUNTANT',
                name: isAutoApprove ? 'Hệ thống Auto-Approve' : actor.fullName || 'CS Lead/Accountant',
              },
              toActor: {
                userId: compInSession.walletOwnerId,
                role: 'SELLER',
                name: 'Ví Tiền Seller',
              },
              conditionNote: `Ghi nhận bồi thường ${compInSession.amount} VND vào số dư ví Seller`,
              timestamp: new Date(),
            },
          ],
          { session }
        );

        // f. Cập nhật trạng thái Compensation sang PAID
        compInSession.state = COMPENSATION_STATUS.PAID;
        compInSession.approvedBy = isAutoApprove ? null : actor._id;
        compInSession.approvedAt = new Date();
        compInSession.ledgerEntryId = ledgerEntry ? ledgerEntry._id : null;
        if (isAutoApprove) {
          compInSession.autoApproved = true;
        }
        await compInSession.save({ session });

        // g. Chuyển trạng thái Ticket sang RESOLVED trong cùng session
        await transitionTicket(
          compInSession.ticketId,
          'RESOLVED',
          isAutoApprove ? SYSTEM_ACTOR : actor,
          { resolutionNote: `Đã duyệt bồi thường ${compInSession.amount} VND` },
          session
        );

        finalCompensation = compInSession;
      });
    } finally {
      await session.endSession();
    }

    // 5. Sau khi commit thành công: Bắn notification/event ngoài transaction
    return finalCompensation;
  } finally {
    // 6. Giải phóng Redis Lock an toàn
    if (lockAcquired && redis && typeof redis.eval === 'function') {
      try {
        const releaseScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        await redis.eval(releaseScript, 1, lockKey, lockToken);
      } catch (unlockErr) {
        console.warn('[Compensation Unlock Error]:', unlockErr.message);
      }
    }
  }
}

/**
 * Từ chối đề xuất bồi thường
 */
async function reject(compensationId, actor, reason) {
  if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
    throw new AppError(422, 'INVALID_REJECT_REASON', 'Lý do từ chối bồi thường phải từ 10 ký tự trở lên');
  }

  const allowedRoles = ['ACCOUNTANT', 'ADMIN'];
  if (!allowedRoles.includes(actor.role)) {
    throw new AppError(403, 'FORBIDDEN', 'Chỉ Kế toán hoặc Quản trị viên mới có quyền từ chối bồi thường');
  }

  const redis = getRedisClient();
  const lockKey = `lock:comp:${compensationId}`;
  const lockToken = crypto.randomUUID();
  let lockAcquired = false;

  if (redis && typeof redis.set === 'function') {
    try {
      const lockRes = await redis.set(lockKey, lockToken, 'PX', 15000, 'NX');
      if (!lockRes) {
        throw new AppError(409, 'COMPENSATION_LOCKED', 'Đang có người xử lý đề xuất này');
      }
      lockAcquired = true;
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn('[Compensation Lock Warning]:', err.message);
    }
  }

  try {
    const compensation = await Compensation.findById(compensationId);
    if (!compensation) {
      throw new AppError(404, 'COMPENSATION_NOT_FOUND', 'Không tìm thấy đề xuất bồi thường');
    }

    if (compensation.state !== COMPENSATION_STATUS.PROPOSED) {
      throw new AppError(400, 'INVALID_STATE', `Không thể từ chối đề xuất ở trạng thái ${compensation.state}`);
    }

    compensation.state = COMPENSATION_STATUS.REJECTED;
    compensation.rejectReason = reason.trim();
    compensation.approvedBy = actor._id;
    compensation.approvedAt = new Date();
    await compensation.save();

    // Chuyển ticket về IN_PROGRESS để CS tiếp tục xử lý
    await transitionTicket(compensation.ticketId, 'IN_PROGRESS', actor, {
      resolutionNote: `Từ chối đề xuất bồi thường: ${reason.trim()}`,
    });

    return compensation;
  } finally {
    if (lockAcquired && redis && typeof redis.eval === 'function') {
      try {
        const releaseScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        await redis.eval(releaseScript, 1, lockKey, lockToken);
      } catch (unlockErr) {
        console.warn('[Compensation Unlock Error]:', unlockErr.message);
      }
    }
  }
}

module.exports = {
  propose,
  approve,
  reject,
};
