const mongoose = require('mongoose');
const Order = require('../models/order.model');
const SystemConfig = require('../models/systemConfig.model');
const {
  REASON_CATEGORY_MAP,
  REASONS_REQUIRE_PHOTO_PROOF,
  REASONS_REQUIRE_CONTACT_CONFIRM,
  VALID_REASON_GROUPS
} = require('../constants/deliveryFailure.constants');
const notificationService = require('./notification.service');
const returnProcessService = require('./returnProcess.service');

// Custom error class để controller dễ phân biệt loại lỗi và trả đúng status code
class DeliveryFailureError extends Error {
  constructor(message, statusCode, extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.extra = extra;
  }
}

async function getConfigValue(key, fallback) {
  const cfg = await SystemConfig.findOne({ key });
  return cfg?.value ?? fallback;
}

/**
 * Xử lý ghi nhận 1 lần báo giao thất bại.
 * Hàm này KHÔNG phụ thuộc req/res, có thể gọi từ controller API thường
 * hoặc từ hàng đợi đồng bộ offline.
 *
 * @param {Object} params
 * @param {String} params.orderId
 * @param {String} params.reasonGroup
 * @param {Number} params.contactAttempts
 * @param {Date}   params.rescheduleRequestedAt
 * @param {String} params.note
 * @param {Array}  params.proofImageUrls
 * @param {Number} params.latitude
 * @param {Number} params.longitude
 * @param {String} params.clientOfflineId
 * @param {String} params.reportedByUserId
 * @returns {Object} { order, triggeredReturnProcess, alreadyProcessed }
 */
async function processDeliveryFailureReport(params) {
  const {
    orderId, reasonGroup, contactAttempts, rescheduleRequestedAt,
    note, proofImageUrls, latitude, longitude, clientOfflineId, reportedByUserId
  } = params;

  // ── Validate input tĩnh (không cần query DB) ──
  if (!VALID_REASON_GROUPS.includes(reasonGroup)) {
    throw new DeliveryFailureError('Nhóm lý do không hợp lệ', 400);
  }

  if (REASONS_REQUIRE_PHOTO_PROOF.includes(reasonGroup) && (!proofImageUrls || proofImageUrls.length === 0)) {
    throw new DeliveryFailureError('Lý do này bắt buộc phải có ảnh minh chứng.', 400);
  }

  if (REASONS_REQUIRE_CONTACT_CONFIRM.includes(reasonGroup) && (!contactAttempts || contactAttempts < 1)) {
    throw new DeliveryFailureError('Vui lòng xác nhận đã liên hệ khách trước khi báo sai địa chỉ.', 400);
  }

  const session = await mongoose.startSession();
  let order, triggeredReturnProcess = false;

  try {
    session.startTransaction();

    order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new DeliveryFailureError('Không tìm thấy đơn hàng', 404);
    }

    // ── Idempotency check — chặn xử lý trùng khi đồng bộ offline (điểm #6) ──
    if (clientOfflineId) {
      const alreadyExists = order.deliveryFailureHistory.some(h => h.clientOfflineId === clientOfflineId);
      if (alreadyExists) {
        await session.abortTransaction();
        return { order, triggeredReturnProcess: false, alreadyProcessed: true };
      }
    }

    // ── Validate trạng thái đơn hiện tại (điểm #2) ──
    if (order.status !== 'DELIVERING') {
      throw new DeliveryFailureError(
        `Đơn hàng đang ở trạng thái "${order.status}", không thể báo giao thất bại.`,
        409
      );
    }

    // ── Chống gian lận báo thất bại liên tục (điểm #3) ──
    const minMinutes = await getConfigValue('MIN_MINUTES_BETWEEN_FAILURE_REPORTS', 30);
    const lastFailure = order.deliveryFailureHistory[order.deliveryFailureHistory.length - 1];
    if (lastFailure) {
      const minutesSinceLastFailure = (Date.now() - new Date(lastFailure.reportedAt).getTime()) / 60000;
      if (minutesSinceLastFailure < minMinutes) {
        throw new DeliveryFailureError(
          `Phải cách lần báo thất bại trước ít nhất ${minMinutes} phút.`,
          429,
          { minutesRemaining: Math.ceil(minMinutes - minutesSinceLastFailure) }
        );
      }
    }

    // ── Ghi nhận bản ghi mới ──
    const failureRecord = {
      reasonGroup,
      failureCategory: REASON_CATEGORY_MAP[reasonGroup],
      contactAttempts: contactAttempts || 0,
      rescheduleRequestedAt: rescheduleRequestedAt || null,
      note: note || '',
      proofImageUrls: proofImageUrls || [],
      gpsLocation: {
        lat: latitude ?? null,
        lng: longitude ?? null,
        isGpsMissing: latitude == null || longitude == null // luồng ngoại lệ 6.1
      },
      reportedBy: reportedByUserId,
      clientOfflineId: clientOfflineId || null,
      reportedAt: new Date()
    };

    order.deliveryFailureHistory.push(failureRecord);
    order.deliveryFailureCount += 1;

    const maxCount = await getConfigValue('MAX_DELIVERY_FAILURE_COUNT', 3);

    if (order.deliveryFailureCount >= maxCount) {
      order.status = 'DELIVERY_FAILED_PENDING_RETURN'; // luồng ngoại lệ 8.2
      triggeredReturnProcess = true;
    } else {
      order.status = 'PENDING_REDELIVERY'; // luồng thay thế 8.1
    }

    await order.save({ session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err; // re-throw để controller xử lý response, giữ nguyên statusCode nếu là DeliveryFailureError
  } finally {
    session.endSession();
  }

  // ── Side effects SAU khi transaction đã commit thành công ──
  // Không await chặn cứng — lỗi gửi thông báo không được làm fail response chính (luồng ngoại lệ 8.1.1)
  if (triggeredReturnProcess) {
    returnProcessService.initiate(order._id).catch(err =>
      console.error(`[ReturnProcess Init Error] Order ${order._id}:`, err)
    );
    if (notificationService && typeof notificationService.sendNotification === 'function') {
      notificationService.sendNotification(order.sellerId, 'DELIVERY_FAILED_FINAL', {
        orderId: order._id, failureCount: order.deliveryFailureCount
      }).catch(err => console.error(`[Notify Seller Final Error]:`, err));
    }
  } else {
    if (notificationService && typeof notificationService.sendNotification === 'function') {
      notificationService.sendNotification(order.buyerId || order.sellerId, 'REDELIVERY_SCHEDULED', {
        orderId: order._id, rescheduleRequestedAt
      }).catch(err => console.error(`[Notify Buyer Error]:`, err));

      // Digest thông báo mỗi lần thất bại cho Seller (điểm #5)
      notificationService.sendNotification(order.sellerId, 'DELIVERY_ATTEMPT_FAILED', {
        orderId: order._id, failureCount: order.deliveryFailureCount, reasonGroup
      }).catch(err => console.error(`[Notify Seller Digest Error]:`, err));
    }
  }

  return { order, triggeredReturnProcess, alreadyProcessed: false };
}

module.exports = { processDeliveryFailureReport, DeliveryFailureError, getConfigValue };
