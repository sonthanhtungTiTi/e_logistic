/**
 * UC-Bagging: Bag & Seal Packing Core Service
 * Quản lý quy trình Gom bao, Kiểm soát Tuyến đường (Route Guard) & Niêm phong Seal
 */
const mongoose = require('mongoose');
const Bag = require('../models/bag.model');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const Hub = require('../models/hub.model');
const hubRoutingService = require('./hubRouting.service');

/**
 * Mở một bao tải mới (status: OPEN)
 */
async function openBag({ sealCode, destinationHubId, maxCapacity = 30, maxWeightKg = 25, notes = null, operator }) {
  const currentHubId = operator?.hubId || operator?.hub_id;
  if (!currentHubId) {
    throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };
  }

  const cleanSealCode = (sealCode || '').toString().trim().toUpperCase();
  if (!cleanSealCode) {
    throw { status: 400, message: 'Mã Seal không được để trống', code: 'INVALID_SEAL_CODE' };
  }

  const existing = await Bag.findOne({ sealCode: cleanSealCode });
  if (existing) {
    throw { status: 409, message: `Mã Seal [${cleanSealCode}] đã tồn tại trong hệ thống`, code: 'SEAL_ALREADY_EXISTS' };
  }

  const destHub = await Hub.findById(destinationHubId);
  if (!destHub) {
    throw { status: 404, message: 'Bưu cục / Kho đích không tồn tại', code: 'DESTINATION_HUB_NOT_FOUND' };
  }

  const bag = await Bag.create({
    sealCode: cleanSealCode,
    originHubId: currentHubId,
    destinationHubId: destHub._id,
    status: 'OPEN',
    trackingCodes: [],
    totalWeightKg: 0,
    maxCapacity: Number(maxCapacity) || 30,
    maxWeightKg: Number(maxWeightKg) || 25,
    notes: notes || null,
    createdBy: operator._id || operator.id,
  });

  return {
    seal_code: bag.sealCode, sealCode: bag.sealCode,
    origin_hub_id: bag.originHubId, originHubId: bag.originHubId,
    destination_hub_id: bag.destinationHubId, destinationHubId: bag.destinationHubId,
    destination_hub_name: destHub.name, destinationHubName: destHub.name,
    status: bag.status,
    tracking_codes: bag.trackingCodes, trackingCodes: bag.trackingCodes,
    total_items: 0, totalItems: 0,
    total_weight_kg: 0, totalWeightKg: 0,
    max_capacity: bag.maxCapacity, maxCapacity: bag.maxCapacity,
    max_weight_kg: bag.maxWeightKg, maxWeightKg: bag.maxWeightKg,
  };
}

/**
 * Quét thả kiện hàng vào Bao tải (Có kiểm tra Route Guard chống nhầm tuyến)
 */
async function addItemToBag({ sealCode, trackingCode, operator }) {
  const currentHubId = operator?.hubId || operator?.hub_id;
  if (!currentHubId) {
    throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };
  }

  const cleanSealCode = (sealCode || '').toString().trim().toUpperCase();
  const cleanTrackingCode = (trackingCode || '').toString().trim().toUpperCase();

  const bag = await Bag.findOne({ sealCode: cleanSealCode });
  if (!bag) {
    throw { status: 404, message: `Bao tải mã [${cleanSealCode}] không tồn tại`, code: 'BAG_NOT_FOUND' };
  }
  if (bag.status !== 'OPEN') {
    throw { status: 409, message: `Bao tải [${cleanSealCode}] đang ở trạng thái [${bag.status}], không thể thêm hàng`, code: 'BAG_NOT_OPEN' };
  }

  // 1. Kiểm tra sức chứa
  if (bag.trackingCodes.length >= bag.maxCapacity) {
    throw {
      status: 400,
      message: `Bao tải đã đầy định mức tối đa (${bag.maxCapacity} kiện). Vui lòng khóa niêm phong và mở bao mới!`,
      code: 'BAG_CAPACITY_EXCEEDED',
    };
  }

  // 2. Tìm đơn hàng
  const order = await Order.findOne({ trackingCode: cleanTrackingCode });
  if (!order) {
    throw { status: 404, message: `Mã vận đơn [${cleanTrackingCode}] không tồn tại trên hệ thống`, code: 'ORDER_NOT_FOUND' };
  }

  // 3. Kiểm tra đơn hàng có đang nằm trong bao này chưa
  if (bag.trackingCodes.includes(cleanTrackingCode)) {
    throw { status: 400, message: `Kiện hàng [${cleanTrackingCode}] đã được cho vào bao này rồi`, code: 'ALREADY_IN_BAG' };
  }

  // 4. Kiểm tra đơn hàng có đang nằm trong bao khác chưa
  if (order.sealId && order.sealId.toString() !== bag._id.toString()) {
    const otherBag = await Bag.findById(order.sealId);
    if (otherBag && ['OPEN', 'SEALED'].includes(otherBag.status)) {
      throw {
        status: 400,
        message: `Kiện hàng [${cleanTrackingCode}] hiện đang thuộc bao tải khác (${otherBag.sealCode})`,
        code: 'ALREADY_IN_OTHER_BAG',
      };
    }
  }

  // 5. ROUTE GUARD: Kiểm tra lộ trình đơn hàng có khớp với Hub đích của Bao tải không
  const bagDestHub = await Hub.findById(bag.destinationHubId).lean();
  const orderDestHub = order.destinationHubId ? await Hub.findById(order.destinationHubId).lean() : null;
  const orderOrigHub = order.originHubId ? await Hub.findById(order.originHubId).lean() : null;

  let isRouteValid = false;

  if (bagDestHub && orderDestHub) {
    // Trường hợp 1: Trùng đúng Kho đích
    if (bagDestHub._id.toString() === orderDestHub._id.toString()) {
      isRouteValid = true;
    } else {
      // Trường hợp 2: Bao tải chuyển đến Hub nằm trên hướng đi tiếp theo (downstream) của đơn
      const origCode = orderOrigHub ? orderOrigHub.code : 'HUB_HAN_01';
      const destCode = orderDestHub.code;
      const path = hubRoutingService.calculateRoutePath(origCode, destCode);

      // Chỉ kiểm tra các Hub nằm SAU Hub hiện tại trên lộ trình
      const currHub = await Hub.findById(currentHubId).lean();
      const currCode = currHub ? currHub.code : origCode;
      const currIndex = path.indexOf(currCode);
      const downstreamHops = currIndex >= 0 ? path.slice(currIndex + 1) : path;

      if (downstreamHops.includes(bagDestHub.code)) {
        isRouteValid = true;
      }
    }
  } else {
    isRouteValid = true; // Fallback nếu chưa cấu hình Hub
  }

  if (!isRouteValid) {
    throw {
      status: 400,
      message: `🚨 SAI TUYẾN: Kiện hàng [${cleanTrackingCode}] (Đích: ${orderDestHub?.name || 'Khác'}) không thuộc hướng chuyển tới [${bagDestHub?.name || 'Khác'}]!`,
      code: 'WRONG_DESTINATION_ROUTE',
    };
  }

  // 6. Cập nhật Atomic
  const orderWeightKg = +(Number(order.actualWeight) || 0.5).toFixed(2);
  const updatedBag = await Bag.findOneAndUpdate(
    { _id: bag._id, status: 'OPEN' },
    {
      $push: { trackingCodes: cleanTrackingCode },
      $inc: { totalWeightKg: orderWeightKg },
    },
    { returnDocument: 'after' }
  );

  if (!updatedBag) {
    throw { status: 409, message: 'Xung đột dữ liệu khi đóng bao tải', code: 'RACE_CONDITION' };
  }

  // Gán sealId cho Order
  await Order.updateOne({ _id: order._id }, { $set: { sealId: bag._id } });

  // Async Audit Log
  setImmediate(async () => {
    try {
      await OrderLog.create({
        orderId: order._id,
        trackingCode: order.trackingCode,
        preStatus: order.status,
        postStatus: order.status,
        actionType: 'BAG_SEALED',
        actionBy: operator._id || operator.id,
        hubId: currentHubId,
        note: `[Đóng bao] Đã gom vào bao tải ${cleanSealCode} (Đích: ${bagDestHub?.name})`,
        metadata: { sealCode: cleanSealCode, bagId: bag._id },
      });
    } catch (e) {
      console.error('[BAG_LOG_ERROR]', e.message);
    }
  });

  return {
    seal_code: updatedBag.sealCode, sealCode: updatedBag.sealCode,
    added_tracking_code: cleanTrackingCode, addedTrackingCode: cleanTrackingCode,
    total_items: updatedBag.trackingCodes.length, totalItems: updatedBag.trackingCodes.length,
    total_weight_kg: +updatedBag.totalWeightKg.toFixed(2), totalWeightKg: +updatedBag.totalWeightKg.toFixed(2),
    max_capacity: updatedBag.maxCapacity, maxCapacity: updatedBag.maxCapacity,
    is_full: updatedBag.trackingCodes.length >= updatedBag.maxCapacity,
    isFull: updatedBag.trackingCodes.length >= updatedBag.maxCapacity,
    item_info: {
      tracking_code: order.trackingCode,
      weight_kg: orderWeightKg,
      recipient_name: order.deliveryAddress?.fullName || 'Khách nhận',
      recipient_province: order.deliveryAddress?.province || '',
    },
  };
}

/**
 * Xóa một kiện hàng khỏi bao tải đang mở
 */
async function removeItemFromBag({ sealCode, trackingCode, operator }) {
  const currentHubId = operator?.hubId || operator?.hub_id;
  if (!currentHubId) {
    throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };
  }

  const cleanSealCode = (sealCode || '').toString().trim().toUpperCase();
  const cleanTrackingCode = (trackingCode || '').toString().trim().toUpperCase();

  const bag = await Bag.findOne({ sealCode: cleanSealCode, status: 'OPEN' });
  if (!bag) {
    throw { status: 404, message: `Bao tải mở mã [${cleanSealCode}] không tồn tại`, code: 'BAG_NOT_FOUND' };
  }

  if (!bag.trackingCodes.includes(cleanTrackingCode)) {
    throw { status: 404, message: `Kiện hàng [${cleanTrackingCode}] không có trong bao tải [${cleanSealCode}]`, code: 'ITEM_NOT_IN_BAG' };
  }

  const order = await Order.findOne({ trackingCode: cleanTrackingCode });
  const orderWeightKg = order ? +(Number(order.actualWeight) || 0.5).toFixed(2) : 0;

  const updatedBag = await Bag.findOneAndUpdate(
    { _id: bag._id, status: 'OPEN' },
    {
      $pull: { trackingCodes: cleanTrackingCode },
      $inc: { totalWeightKg: -orderWeightKg },
    },
    { returnDocument: 'after' }
  );

  if (order) {
    await Order.updateOne({ _id: order._id }, { $set: { sealId: null } });
  }

  return {
    seal_code: updatedBag.sealCode, sealCode: updatedBag.sealCode,
    removed_tracking_code: cleanTrackingCode, removedTrackingCode: cleanTrackingCode,
    total_items: updatedBag.trackingCodes.length, totalItems: updatedBag.trackingCodes.length,
    total_weight_kg: Math.max(0, +updatedBag.totalWeightKg.toFixed(2)),
  };
}

/**
 * Khóa Niêm Phong Bao Tải (status: SEALED)
 */
async function sealBag({ sealCode, notes = null, operator }) {
  const currentHubId = operator?.hubId || operator?.hub_id;
  if (!currentHubId) {
    throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };
  }

  const cleanSealCode = (sealCode || '').toString().trim().toUpperCase();
  const bag = await Bag.findOne({ sealCode: cleanSealCode });
  if (!bag) {
    throw { status: 404, message: `Bao tải [${cleanSealCode}] không tồn tại`, code: 'BAG_NOT_FOUND' };
  }
  if (bag.status !== 'OPEN') {
    throw { status: 409, message: `Bao tải [${cleanSealCode}] đang ở trạng thái [${bag.status}], không thể niêm phong`, code: 'BAG_NOT_OPEN' };
  }
  if (bag.trackingCodes.length === 0) {
    throw { status: 400, message: 'Không thể niêm phong bao tải rỗng! Vui lòng quét ít nhất 1 kiện hàng.', code: 'EMPTY_BAG' };
  }

  const now = new Date();
  const updatedBag = await Bag.findOneAndUpdate(
    { _id: bag._id, status: 'OPEN' },
    {
      $set: {
        status: 'SEALED',
        sealedAt: now,
        notes: notes || bag.notes,
      },
    },
    { returnDocument: 'after' }
  );

  return {
    seal_code: updatedBag.sealCode, sealCode: updatedBag.sealCode,
    status: updatedBag.status,
    total_items: updatedBag.trackingCodes.length, totalItems: updatedBag.trackingCodes.length,
    total_weight_kg: +updatedBag.totalWeightKg.toFixed(2), totalWeightKg: +updatedBag.totalWeightKg.toFixed(2),
    sealed_at: updatedBag.sealedAt, sealedAt: updatedBag.sealedAt,
    tracking_codes: updatedBag.trackingCodes, trackingCodes: updatedBag.trackingCodes,
  };
}

/**
 * Lấy chi tiết thông tin Bao Tải và danh sách đơn hàng con bên trong
 */
async function getBagDetails({ sealCode }) {
  const cleanSealCode = (sealCode || '').toString().trim().toUpperCase();
  const bag = await Bag.findOne({ sealCode: cleanSealCode })
    .populate('originHubId', 'name code province')
    .populate('destinationHubId', 'name code province')
    .populate('createdBy', 'fullName email')
    .lean();

  if (!bag) {
    throw { status: 404, message: `Bao tải [${cleanSealCode}] không tồn tại`, code: 'BAG_NOT_FOUND' };
  }

  const orders = await Order.find({ trackingCode: { $in: bag.trackingCodes } })
    .select('trackingCode status actualWeight pickupAddress deliveryAddress')
    .lean();

  return {
    ...bag,
    orders,
  };
}

/**
 * Lấy danh sách các Bao Tải trong Hub hiện tại
 */
async function listHubBags({ operator, status = null }) {
  const currentHubId = operator?.hubId || operator?.hub_id;
  if (!currentHubId) {
    throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };
  }

  const query = { originHubId: currentHubId };
  if (status) {
    query.status = status.toUpperCase();
  }

  const bags = await Bag.find(query)
    .populate('destinationHubId', 'name code province')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return bags;
}

module.exports = {
  openBag,
  addItemToBag,
  removeItemFromBag,
  sealBag,
  getBagDetails,
  listHubBags,
};
