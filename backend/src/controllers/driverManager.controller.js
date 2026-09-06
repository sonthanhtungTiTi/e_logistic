const Order = require('../models/order.model');
const User = require('../models/user.model');
const OrderLog = require('../models/orderLog.model');
const ioSingleton = require('../lib/ioSingleton');

/**
 * Helper build bộ lọc khu vực phụ trách cho DRIVER_MANAGER
 */
function applyServiceAreasFilter(user, filter, addressPrefix = 'pickupAddress') {
  if (user.role === 'DRIVER_MANAGER' && Array.isArray(user.serviceAreas) && user.serviceAreas.length > 0) {
    const areaOrConditions = user.serviceAreas.map(area => ({
      [`${addressPrefix}.province`]: new RegExp(area.province.trim(), 'i'),
      [`${addressPrefix}.district`]: new RegExp(area.district.trim(), 'i'),
    }));
    if (filter.$or) {
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: areaOrConditions });
    } else {
      filter.$or = areaOrConditions;
    }
  }
}

const driverManagerController = {
  /**
   * 4.3 Xem danh sách đơn chờ phân tài xế gom hàng (Pickup)
   * GET /api/driver-manager/pending-pickup-assignment
   */
  async getPendingPickupAssignments(req, res) {
    try {
      const { province, district, search, page = 1, limit = 20 } = req.query;

      const filter = { status: 'APPROVED' };

      applyServiceAreasFilter(req.user, filter, 'pickupAddress');

      if (province) filter['pickupAddress.province'] = new RegExp(province.trim(), 'i');
      if (district) filter['pickupAddress.district'] = new RegExp(district.trim(), 'i');

      if (search) {
        const reg = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const searchConditions = [
          { trackingCode: reg },
          { 'pickupAddress.fullName': reg },
          { 'pickupAddress.phone': reg },
        ];
        if (filter.$or) {
          filter.$and = filter.$and || [];
          filter.$and.push({ $or: searchConditions });
        } else {
          filter.$or = searchConditions;
        }
      }

      const skip = (Number(page) - 1) * Number(limit);
      const orders = await Order.find(filter)
        .populate('sellerId', 'fullName email phoneNumber companyName')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Order.countDocuments(filter);

      return res.json({
        orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('[getPendingPickupAssignments Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách chờ phân tài xế lấy hàng', error: error.message });
    }
  },

  /**
   * 4.3 Xem danh sách đơn chờ phân tài xế giao hàng (Delivery)
   * GET /api/driver-manager/pending-delivery-assignment
   */
  async getPendingDeliveryAssignments(req, res) {
    try {
      const { province, district, search, page = 1, limit = 20 } = req.query;

      const filter = { status: 'PENDING_DELIVERY_ASSIGNMENT' };

      applyServiceAreasFilter(req.user, filter, 'deliveryAddress');

      if (province) filter['deliveryAddress.province'] = new RegExp(province.trim(), 'i');
      if (district) filter['deliveryAddress.district'] = new RegExp(district.trim(), 'i');

      if (search) {
        const reg = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const searchConditions = [
          { trackingCode: reg },
          { 'deliveryAddress.fullName': reg },
          { 'deliveryAddress.phone': reg },
        ];
        if (filter.$or) {
          filter.$and = filter.$and || [];
          filter.$and.push({ $or: searchConditions });
        } else {
          filter.$or = searchConditions;
        }
      }

      const skip = (Number(page) - 1) * Number(limit);
      const orders = await Order.find(filter)
        .populate('sellerId', 'fullName email phoneNumber companyName')
        .sort({ updatedAt: 1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Order.countDocuments(filter);

      return res.json({
        orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('[getPendingDeliveryAssignments Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách chờ phân tài xế giao hàng', error: error.message });
    }
  },

  /**
   * 4.3 Tìm danh sách tài xế theo khu vực
   * GET /api/driver-manager/drivers-by-area?province=&district=
   */
  async getDriversByArea(req, res) {
    try {
      const { province, district } = req.query;
      const filter = { role: 'DRIVER', isActive: true };

      if (province || district) {
        filter['serviceAreas'] = {
          $elemMatch: {
            ...(province ? { province: new RegExp(province.trim(), 'i') } : {}),
            ...(district ? { district: new RegExp(district.trim(), 'i') } : {}),
          },
        };
      }

      const drivers = await User.find(filter)
        .select('fullName email phoneNumber vehicleInfo isWorking rejectionQuota serviceAreas hubId')
        .lean();

      return res.json({ drivers });
    } catch (error) {
      console.error('[getDriversByArea Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách tài xế', error: error.message });
    }
  },

  /**
   * 4.3 Phân tài xế chặng gom hàng (Pickup)
   * POST /api/driver-manager/assign-pickup
   * Body: { orderIds: [...], driverId: String }
   */
  async assignPickup(req, res) {
    try {
      const { orderIds, driverId } = req.body;

      if (!Array.isArray(orderIds) || orderIds.length === 0 || !driverId) {
        return res.status(400).json({ message: 'Thiếu orderIds hoặc driverId' });
      }

      const driver = await User.findOne({ _id: driverId, role: 'DRIVER', isActive: true });
      if (!driver) {
        return res.status(404).json({ message: 'Tài xế không tồn tại hoặc không hoạt động' });
      }

      let successCount = 0;
      const skippedOrders = [];
      const assignedOrders = [];

      for (const orderId of orderIds) {
        try {
          const order = await Order.findById(orderId);
          if (!order) {
            skippedOrders.push({ orderId, reason: 'Không tìm thấy đơn hàng' });
            continue;
          }

          if (order.status !== 'APPROVED') {
            skippedOrders.push({
              orderId,
              trackingCode: order.trackingCode,
              reason: `Đơn hàng ở trạng thái "${order.status}", không thể phân tài xế gom hàng (Cần ở trạng thái APPROVED)`,
            });
            continue;
          }

          const preStatus = order.status;
          const now = new Date();

          if (order.routeType === 'DIRECT') {
            // Đơn giao thẳng (cùng khu vực) -> Phân 1 tài xế cho cả gom lẫn giao
            order.status = 'ASSIGNED_TO_PICKUP_AND_DELIVERY';
            order.pickupAssignment = {
              driverId: driver._id,
              assignedBy: req.user._id,
              assignedAt: now,
              status: 'ASSIGNED',
            };
            order.deliveryAssignment = {
              driverId: driver._id,
              assignedBy: req.user._id,
              assignedAt: now,
              status: 'ASSIGNED',
            };
            order.assignedDriverId = driver._id;
            order.assignedShipperId = driver._id;
          } else {
            // Đơn liên kho -> Phân tài xế gom hàng
            order.status = 'ASSIGNED_TO_PICKUP';
            order.pickupAssignment = {
              driverId: driver._id,
              assignedBy: req.user._id,
              assignedAt: now,
              status: 'ASSIGNED',
            };
            order.assignedDriverId = driver._id;
            order.assignedShipperId = driver._id;
          }

          await order.save();

          // Ghi Log Audit
          try {
            await OrderLog.create({
              orderId: order._id,
              actionBy: req.user._id,
              preStatus,
              postStatus: order.status,
              actionType: 'STATUS_UPDATED',
              trackingCode: order.trackingCode,
              note: `Driver Manager phân tài xế gom hàng: ${driver.fullName} (${driver.phoneNumber})`,
            });
          } catch (logErr) {
            console.error('[OrderLog Error]:', logErr.message);
          }

          ioSingleton.emitOrderUpdate(order.sellerId, order);
          assignedOrders.push(order);
          successCount++;
        } catch (err) {
          skippedOrders.push({ orderId, reason: err.message });
        }
      }

      return res.json({
        message: `Đã phân tài xế gom hàng cho ${successCount}/${orderIds.length} đơn hàng.`,
        successCount,
        skippedCount: skippedOrders.length,
        skippedOrders,
        assignedOrders,
      });
    } catch (error) {
      console.error('[assignPickup Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi phân tài xế gom hàng', error: error.message });
    }
  },

  /**
   * 4.3 Phân tài xế chặng giao hàng (Delivery)
   * POST /api/driver-manager/assign-delivery
   * Body: { orderIds: [...], driverId: String }
   */
  async assignDelivery(req, res) {
    try {
      const { orderIds, driverId } = req.body;

      if (!Array.isArray(orderIds) || orderIds.length === 0 || !driverId) {
        return res.status(400).json({ message: 'Thiếu orderIds hoặc driverId' });
      }

      const driver = await User.findOne({ _id: driverId, role: 'DRIVER', isActive: true });
      if (!driver) {
        return res.status(404).json({ message: 'Tài xế không tồn tại hoặc không hoạt động' });
      }

      let successCount = 0;
      const skippedOrders = [];
      const assignedOrders = [];

      for (const orderId of orderIds) {
        try {
          const order = await Order.findById(orderId);
          if (!order) {
            skippedOrders.push({ orderId, reason: 'Không tìm thấy đơn hàng' });
            continue;
          }

          const validStatuses = ['PENDING_DELIVERY_ASSIGNMENT', 'INBOUND_DEST_HUB', 'APPROVED'];
          if (!validStatuses.includes(order.status)) {
            skippedOrders.push({
              orderId,
              trackingCode: order.trackingCode,
              reason: `Đơn hàng ở trạng thái "${order.status}", không hợp lệ để phân tài xế giao hàng`,
            });
            continue;
          }

          const preStatus = order.status;
          const now = new Date();

          order.status = 'ASSIGNED_TO_DELIVERY';
          order.deliveryAssignment = {
            driverId: driver._id,
            assignedBy: req.user._id,
            assignedAt: now,
            status: 'ASSIGNED',
          };
          order.assignedDriverId = driver._id;
          order.assignedShipperId = driver._id;

          await order.save();

          try {
            await OrderLog.create({
              orderId: order._id,
              actionBy: req.user._id,
              preStatus,
              postStatus: 'ASSIGNED_TO_DELIVERY',
              actionType: 'STATUS_UPDATED',
              trackingCode: order.trackingCode,
              note: `Driver Manager phân tài xế giao hàng: ${driver.fullName} (${driver.phoneNumber})`,
            });
          } catch (logErr) {
            console.error('[OrderLog Error]:', logErr.message);
          }

          ioSingleton.emitOrderUpdate(order.sellerId, order);
          assignedOrders.push(order);
          successCount++;
        } catch (err) {
          skippedOrders.push({ orderId, reason: err.message });
        }
      }

      return res.json({
        message: `Đã phân tài xế giao hàng cho ${successCount}/${orderIds.length} đơn hàng.`,
        successCount,
        skippedCount: skippedOrders.length,
        skippedOrders,
        assignedOrders,
      });
    } catch (error) {
      console.error('[assignDelivery Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi phân tài xế giao hàng', error: error.message });
    }
  },

  /**
   * 4.4 Driver Manager — Duyệt/Xử lý Yêu cầu Từ chối của Tài xế
   * POST /api/driver-manager/review-rejection
   * Body: { orderId, assignmentType: 'PICKUP'|'DELIVERY', decision: 'DENY'|'APPROVE', newDriverId? }
   */
  async reviewRejection(req, res) {
    try {
      const { orderId, assignmentType = 'PICKUP', decision, newDriverId } = req.body;

      if (!orderId || !['DENY', 'APPROVE'].includes(decision)) {
        return res.status(400).json({ message: 'Thông tin request không hợp lệ (cần orderId, decision = DENY hoặc APPROVE)' });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      }

      const isPickup = assignmentType === 'PICKUP';
      const targetAssignment = isPickup ? order.pickupAssignment : order.deliveryAssignment;

      if (!targetAssignment || targetAssignment.status !== 'REJECT_REQUESTED') {
        return res.status(400).json({
          message: `Đơn hàng không có yêu cầu từ chối chặng ${assignmentType} ở trạng thái chờ duyệt.`,
        });
      }

      const preStatus = order.status;
      const now = new Date();

      if (decision === 'DENY') {
        // TỪ CHỐI yêu cầu xin hủy -> Bắt tài xế cũ làm tiếp
        targetAssignment.status = 'ASSIGNED';
        await order.save();

        try {
          await OrderLog.create({
            orderId: order._id,
            actionBy: req.user._id,
            preStatus,
            postStatus: order.status,
            actionType: 'STATUS_UPDATED',
            trackingCode: order.trackingCode,
            note: `Driver Manager từ chối yêu cầu hủy chặng ${assignmentType} của tài xế (Bắt buộc giữ đơn).`,
          });
        } catch (logErr) {
          console.error('[OrderLog Error]:', logErr.message);
        }

        ioSingleton.emitOrderUpdate(order.sellerId, order);
        return res.json({
          message: 'Đã từ chối yêu cầu hủy đơn của tài xế. Giữ nguyên tài xế phụ trách.',
          order,
        });
      } else {
        // CHẤP THUẬN yêu cầu xin hủy
        targetAssignment.status = 'REJECTED_CONFIRMED';

        if (newDriverId) {
          const newDriver = await User.findOne({ _id: newDriverId, role: 'DRIVER', isActive: true });
          if (!newDriver) {
            return res.status(404).json({ message: 'Tài xế mới không tồn tại hoặc không hoạt động' });
          }

          if (isPickup) {
            order.pickupAssignment = {
              driverId: newDriver._id,
              assignedBy: req.user._id,
              assignedAt: now,
              status: 'ASSIGNED',
            };
            if (order.routeType === 'DIRECT') {
              order.status = 'ASSIGNED_TO_PICKUP_AND_DELIVERY';
              order.deliveryAssignment = {
                driverId: newDriver._id,
                assignedBy: req.user._id,
                assignedAt: now,
                status: 'ASSIGNED',
              };
            } else {
              order.status = 'ASSIGNED_TO_PICKUP';
            }
          } else {
            order.deliveryAssignment = {
              driverId: newDriver._id,
              assignedBy: req.user._id,
              assignedAt: now,
              status: 'ASSIGNED',
            };
            order.status = 'ASSIGNED_TO_DELIVERY';
          }
          order.assignedDriverId = newDriver._id;
          order.assignedShipperId = newDriver._id;
        } else {
          // Chưa có tài xế mới -> Trả đơn về trạng thái chờ phân
          if (isPickup) {
            order.status = 'APPROVED';
            order.assignedDriverId = null;
            order.assignedShipperId = null;
          } else {
            order.status = 'PENDING_DELIVERY_ASSIGNMENT';
            order.assignedDriverId = null;
            order.assignedShipperId = null;
          }
        }

        await order.save();

        try {
          await OrderLog.create({
            orderId: order._id,
            actionBy: req.user._id,
            preStatus,
            postStatus: order.status,
            actionType: 'STATUS_UPDATED',
            trackingCode: order.trackingCode,
            note: `Driver Manager chấp thuận từ chối đơn chặng ${assignmentType}.${newDriverId ? ' Đã gán tài xế mới.' : ' Đơn lùi về chờ phân công.'}`,
          });
        } catch (logErr) {
          console.error('[OrderLog Error]:', logErr.message);
        }

        ioSingleton.emitOrderUpdate(order.sellerId, order);
        return res.json({
          message: 'Đã chấp thuận yêu cầu từ chối của tài xế.',
          order,
        });
      }
    } catch (error) {
      console.error('[reviewRejection Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi duyệt yêu cầu từ chối', error: error.message });
    }
  },

  /**
   * 4.5 Lấy danh sách tài xế đã dùng hết quota từ chối trong ngày
   * GET /api/driver-manager/drivers-quota-exhausted
   */
  async getExhaustedQuotaDrivers(req, res) {
    try {
      const drivers = await User.find({
        role: 'DRIVER',
        'rejectionQuota.remainingToday': { $lte: 0 },
      })
        .select('fullName email phoneNumber rejectionQuota serviceAreas isWorking')
        .lean();

      return res.json({
        total: drivers.length,
        drivers,
      });
    } catch (error) {
      console.error('[getExhaustedQuotaDrivers Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách tài xế hết quota', error: error.message });
    }
  },
};

module.exports = driverManagerController;
