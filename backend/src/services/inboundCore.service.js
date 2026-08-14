const mongoose = require('mongoose');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const OrderTrackingLog = require('../models/orderTrackingLog.model');

/**
 * Xử lý nhập kho nguyên tử cho 1 đơn hàng (UC-16 Inbound Scan)
 * @param {Object} params
 * @param {String} params.trackingCode Mã vận đơn
 * @param {Object} params.operator Thông tin nhân viên quét từ JWT (id/hubId/role)
 * @param {String} params.condition Tình trạng kiện hàng ('INTACT', 'DAMAGED', 'TORN_SEAL')
 * @param {String} params.note Ghi chú
 */
async function processInboundSingle({ trackingCode, operator, condition = 'INTACT', note = '' }) {
  // 1. TUYỆT ĐỐI KHÔNG LẤY hub_id TỪ CLIENT BODY/PARAMS — Trích xuất từ JWT operator
  const currentHubId = operator?.hubId || operator?.hub_id || operator?.hub;
  if (!currentHubId) {
    throw {
      status: 403,
      message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào',
      code: 'HUB_UNASSIGNED'
    };
  }

  const cleanTrackingCode = (trackingCode || '').toString().trim().toUpperCase();
  if (!cleanTrackingCode) {
    throw { status: 400, message: 'Mã vận đơn không được để trống', code: 'INVALID_TRACKING_CODE' };
  }

  // 2. Tìm đơn hàng trong DB
  const order = await Order.findOne({ trackingCode: cleanTrackingCode });
  if (!order) {
    throw {
      status: 404,
      message: `Mã vận đơn ${cleanTrackingCode} không tồn tại trên hệ thống`,
      code: 'ORDER_NOT_FOUND'
    };
  }

  // 3. Xác định vị trí Hub & Ma trận State Machine
  let nextStatus = null;
  let nextAction = '';

  const hubStr = currentHubId.toString();
  const isOriginHub =
    (order.originHubId && order.originHubId.toString() === hubStr) ||
    (order.pickupHub && order.pickupHub.toString() === hubStr);

  const isDestHub =
    (order.destinationHubId && order.destinationHubId.toString() === hubStr) ||
    (order.deliveryHub && order.deliveryHub.toString() === hubStr);

  // Status Enum Matching Matrix
  const currStatus = order.status;

  if (currStatus === 'PICKED_UP' || currStatus === 'PICKED') {
    if (!isOriginHub) {
      throw {
        status: 400,
        message: `Đơn hàng vừa lấy từ Seller phải được nhập tại Kho gốc. Hub hiện tại (${hubStr}) không phải Kho gốc`,
        code: 'INVALID_STATE_TRANSITION'
      };
    }
    nextStatus = 'IN_HUB_ORIGIN'; // Hoặc 'INBOUND_HUB'
    nextAction = 'SORT_FOR_TRANSIT'; // Gom vào bao tải / Chuẩn bị xuất trung chuyển
  } else if (currStatus === 'IN_TRANSIT') {
    if (isDestHub) {
      nextStatus = 'IN_HUB_DEST'; // Hoặc 'INBOUND_HUB_DEST'
      nextAction = 'WAITING_FOR_DELIVERY'; // Chờ giao chặng cuối
    } else {
      nextStatus = 'IN_SORTING_HUB'; // Hoặc 'SORTING'
      nextAction = 'SORT_FOR_NEXT_HUB'; // Luân chuyển tiếp (Mid-mile / Kho Tổng)
    }
  } else if (currStatus === 'RETURN_IN_TRANSIT' || currStatus === 'RETURNING') {
    if (!isOriginHub) {
      throw {
        status: 400,
        message: `Đơn hàng chuyển hoàn phải được nhập tại Kho gốc. Hub hiện tại (${hubStr}) không phải Kho gốc`,
        code: 'INVALID_STATE_TRANSITION'
      };
    }
    nextStatus = 'RETURNED_TO_HUB_ORIGIN'; // Hoặc 'RETURNED'
    nextAction = 'WAITING_SELLER_RETURN'; // Lưu kệ chờ hoàn trả Seller
  } else {
    throw {
      status: 400,
      message: `Đơn hàng đang ở trạng thái [${currStatus}], không hợp lệ để nhập kho tại Hub này`,
      code: 'INVALID_STATE_TRANSITION'
    };
  }

  // 4. Xử lý trường hợp kiện hàng hư hỏng / rách tem
  const isDamaged = condition === 'DAMAGED' || condition === 'TORN_SEAL';
  const finalStatus = isDamaged ? 'EXCEPTION_INBOUND' : nextStatus;

  // 5. ATOMIC CONDITIONAL UPDATE — Chống Race Condition / Double Scan tuyệt đối
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: order.status // Điều kiện nguyên tử: status DB vẫn khớp với status lúc check
    },
    {
      $set: {
        status: finalStatus,
        currentHubId: currentHubId,
        isFlagged: isDamaged,
        updatedAt: new Date()
      }
    },
    { returnDocument: 'after', runValidators: true }
  );

  if (!updatedOrder) {
    throw {
      status: 409,
      message: `Xung đột dữ liệu: Kiện hàng ${cleanTrackingCode} vừa được quét ở tiến trình khác!`,
      code: 'RACE_CONDITION_CONFLICT'
    };
  }

  // 6. Decoupled Async Audit Log & Notification (Không làm nổ transaction chính)
  setImmediate(async () => {
    try {
      await OrderLog.create({
        orderId: order._id,
        trackingCode: order.trackingCode,
        preStatus: order.status,
        postStatus: finalStatus,
        actionType: 'INBOUND_SCAN',
        actionBy: operator._id || operator.id,
        hubId: currentHubId,
        note: note || `Nhập kho tại Hub ${currentHubId} (${condition})`,
        metadata: { condition, nextAction, isDamaged }
      });

      await OrderTrackingLog.create({
        orderId: order._id,
        trackingCode: order.trackingCode,
        eventType: 'HUB_ARRIVED',
        title: 'Đã nhập kho',
        description: isDamaged
          ? `Kiện hàng bị hư hỏng/rách niêm phong tại kho ${currentHubId}`
          : `Kiện hàng đã nhập kho (${nextAction})`,
        hubId: currentHubId,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error(`[AUDIT_LOG_ERROR] Ghi log nhập kho thất bại cho đơn ${cleanTrackingCode}:`, logErr.message);
    }
  });

  return {
    tracking_code: updatedOrder.trackingCode,
    trackingCode: updatedOrder.trackingCode,
    previous_status: order.status,
    current_status: updatedOrder.status,
    next_action: nextAction,
    is_flagged: isDamaged,
    hub_id: currentHubId
  };
}

module.exports = { processInboundSingle };
