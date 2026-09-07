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

      let drivers = await User.find(filter)
        .select('fullName email phoneNumber vehicleInfo isWorking rejectionQuota serviceAreas hubId')
        .lean();

      if (drivers.length === 0) {
        drivers = await User.find({ role: { $in: ['DRIVER', 'SHIPPER'] }, isActive: true })
          .select('fullName email phoneNumber vehicleInfo isWorking rejectionQuota serviceAreas hubId')
          .lean();
      }

      // CHUẨN HÓA: Chặng gom hàng tận nhà người bán (First-mile pickup) CHỈ DÙNG XE MÁY (MOTORBIKE)
      // Loại bỏ tài xế xe tải (TRUCK) hoặc tài xế chuyên trách liên kho (LINE_HAUL_DRIVER)
      drivers = drivers.filter(d => {
        const vType = (d.vehicleInfo?.vehicleType || '').toUpperCase();
        const isTruck = vType.includes('TRUCK') || vType.includes('TẢI') || vType.includes('CONTAINER');
        return !isTruck;
      }).map(d => ({
        ...d,
        vehicleInfo: {
          licensePlate: d.vehicleInfo?.licensePlate || 'Chưa cập nhật',
          vehicleType: 'MOTORBIKE',
        },
      }));

      // Đếm số lượng đơn đang phụ trách gom để cân bằng tải (Workload Balancing)
      const driverIds = drivers.map(d => d._id);
      if (driverIds.length > 0) {
        const activeOrderCounts = await Order.aggregate([
          {
            $match: {
              $or: [
                { assignedDriverId: { $in: driverIds } },
                { 'pickupAssignment.driverId': { $in: driverIds } },
              ],
              status: { $in: ['ASSIGNED_TO_PICKUP', 'ASSIGNED_TO_PICKUP_AND_DELIVERY', 'PICKING'] },
            },
          },
          {
            $group: {
              _id: { $ifNull: ['$assignedDriverId', '$pickupAssignment.driverId'] },
              count: { $sum: 1 },
            },
          },
        ]);

        const countMap = {};
        activeOrderCounts.forEach(item => {
          if (item._id) countMap[item._id.toString()] = item.count;
        });

        drivers = drivers.map(d => ({
          ...d,
          activeOrdersCount: countMap[d._id.toString()] || 0,
        }));

        // Sắp xếp ưu tiên: Tài xế ít việc nhất (Workload Balancing) lên đầu
        drivers.sort((a, b) => (a.activeOrdersCount || 0) - (b.activeOrdersCount || 0));
      }

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

      const driver = await User.findOne({ _id: driverId, role: { $in: ['DRIVER', 'SHIPPER'] }, isActive: true });
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

          // TẠM THỜI TẮT NHÁNH DIRECT: Toàn bộ đơn hàng đều gom về kho trước
          // 1 tài xế khi đang chạy ca gom bưu phẩm trong ngõ hẻm không thể kết hợp đi giao cùng lúc
          order.status = 'ASSIGNED_TO_PICKUP';
          order.pickupAssignment = {
            driverId: driver._id,
            assignedBy: req.user._id,
            assignedAt: now,
            status: 'ASSIGNED',
          };
          order.assignedDriverId = driver._id;

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
            // Tạm thời tắt DIRECT: chuyển về ASSIGNED_TO_PICKUP để gom về kho trước
            order.status = 'ASSIGNED_TO_PICKUP';
            order.assignedDriverId = newDriver._id;
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

  /**
   * 4.6 Xem trước phương án phân công tự động (Auto-Assign Batch Preview)
   * POST /api/driver-manager/auto-assign-preview
   * Body: { orderIds?: string[], province?: string, district?: string }
   */
  async autoAssignPreview(req, res) {
    try {
      const { orderIds, province, district } = req.body || {};

      // 1. Lọc đơn hàng hợp lệ ở trạng thái APPROVED
      const filter = { status: 'APPROVED' };
      if (Array.isArray(orderIds) && orderIds.length > 0) {
        filter._id = { $in: orderIds };
      } else {
        if (province) filter['pickupAddress.province'] = new RegExp(province.trim(), 'i');
        if (district) filter['pickupAddress.district'] = new RegExp(district.trim(), 'i');
      }

      const orders = await Order.find(filter)
        .populate('sellerId', 'fullName email phoneNumber')
        .sort({ createdAt: 1 }) // FIFO: Đơn vào trước gán trước
        .lean();

      if (orders.length === 0) {
        return res.json({
          success: true,
          totalOrders: 0,
          assignedCount: 0,
          unassignedCount: 0,
          assignments: [],
          unassigned: [],
          message: 'Không có đơn hàng nào ở trạng thái APPROVED để phân công tự động',
        });
      }

      // 2. Lấy danh sách tài xế xe máy đang hoạt động (CHỈ XE MÁY ĐI GOM TẬN NHÀ SHOP)
      let rawDrivers = await User.find({
        role: { $in: ['DRIVER', 'SHIPPER'] }, // Tuyệt đối không lấy LINE_HAUL_DRIVER (chỉ chạy xe tải liên kho)
        isActive: true,
      })
        .select('fullName email phoneNumber vehicleInfo rejectionQuota serviceAreas isWorking')
        .lean();

      // Loại bỏ bất kỳ tài xế nào có phương tiện là xe tải (TRUCK / XE TẢI)
      const allDrivers = rawDrivers.filter(d => {
        const vType = (d.vehicleInfo?.vehicleType || '').toUpperCase();
        const isTruck = vType.includes('TRUCK') || vType.includes('TẢI') || vType.includes('CONTAINER');
        return !isTruck;
      }).map(d => ({
        ...d,
        vehicleInfo: {
          licensePlate: d.vehicleInfo?.licensePlate || 'Chưa cập nhật',
          vehicleType: 'MOTORBIKE',
        },
      }));

      if (allDrivers.length === 0) {
        return res.json({
          success: true,
          totalOrders: orders.length,
          assignedCount: 0,
          unassignedCount: orders.length,
          assignments: [],
          unassigned: orders.map(o => ({
            orderId: o._id,
            trackingCode: o.trackingCode,
            weight: o.chargeableWeight || 1,
            pickupAddress: o.pickupAddress,
            reason: 'Không có tài xế xe máy nào đang hoạt động trong hệ thống để gom hàng tận nơi',
          })),
        });
      }

      // 3. Tính tải công việc thực tế hiện tại (Active Workload)
      const driverIds = allDrivers.map(d => d._id);
      const activeCounts = await Order.aggregate([
        {
          $match: {
            $or: [
              { assignedDriverId: { $in: driverIds } },
              { 'pickupAssignment.driverId': { $in: driverIds } },
            ],
            status: { $in: ['ASSIGNED_TO_PICKUP', 'ASSIGNED_TO_PICKUP_AND_DELIVERY', 'PICKING'] },
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$assignedDriverId', '$pickupAssignment.driverId'] },
            count: { $sum: 1 },
          },
        },
      ]);

      const activeMap = {};
      activeCounts.forEach(item => {
        if (item._id) activeMap[item._id.toString()] = item.count;
      });

      // Tạo cấu trúc Driver State ảo cho thuật toán Weighted Round-Robin
      const driverPool = allDrivers.map(d => ({
        ...d,
        activeOrdersCount: activeMap[d._id.toString()] || 0,
        virtualOrderCount: activeMap[d._id.toString()] || 0,
        assignedInBatch: 0,
        maxPerShift: 20, // Định mức chuẩn ca gom xe máy: tối đa 15 - 20 đơn/ca
      }));

      const w1 = 0.75; // Trọng số tải đơn
      const w2 = 0.25; // Trọng số quota uy tín

      const assignments = [];
      const unassigned = [];

      // 4. Lặp qua từng đơn hàng trong batch (FIFO)
      for (const order of orders) {
        const orderWeight = Number(order.chargeableWeight || order.totalWeight || 1);
        const orderProv = order.pickupAddress?.province?.trim()?.toLowerCase() || '';
        const orderDist = order.pickupAddress?.district?.trim()?.toLowerCase() || '';

        // TẦNG 0: Giới hạn an toàn của xe máy khi thu gom hàng tận nhà
        // Xe máy chở thùng hàng bưu kiện an toàn tối đa 30kg. Nếu > 30kg, hệ thống cảnh báo Shop chia kiện
        // hoặc mang trực tiếp ra bưu cục; tuyệt đối không điều xe tải cồng kềnh vào ngõ hẻm gom lẻ.
        if (orderWeight > 30) {
          unassigned.push({
            orderId: order._id,
            trackingCode: order.trackingCode,
            weight: orderWeight,
            pickupAddress: order.pickupAddress,
            reason: 'Đơn hàng vượt quá tải trọng an toàn xe máy (>30kg). Cần Shop chia kiện hoặc mang trực tiếp ra bưu cục; hệ thống không điều xe tải vào ngõ gom hàng.',
          });
          continue;
        }

        // Tầng 1: Filter cứng (serviceAreas + shift quota ca gom xe máy)
        const candidates = driverPool.filter(driver => {
          // Check ca gom trần (tối đa 20 đơn/ca)
          if (driver.virtualOrderCount >= driver.maxPerShift) {
            return false;
          }

          // Check serviceAreas
          if (Array.isArray(driver.serviceAreas) && driver.serviceAreas.length > 0) {
            const hasArea = driver.serviceAreas.some(area => {
              const aProv = (area.province || '').trim().toLowerCase();
              const aDist = (area.district || '').trim().toLowerCase();
              const matchProv = !aProv || !orderProv || orderProv.includes(aProv) || aProv.includes(orderProv);
              const matchDist = !aDist || !orderDist || orderDist.includes(aDist) || aDist.includes(orderDist);
              return matchProv && matchDist;
            });
            return hasArea;
          }

          // Nếu tài xế chưa khai báo serviceAreas, cho phép fallback
          return true;
        });

        if (candidates.length === 0) {
          unassigned.push({
            orderId: order._id,
            trackingCode: order.trackingCode,
            weight: orderWeight,
            pickupAddress: order.pickupAddress,
            reason: 'Không có tài xế xe máy phù hợp khu vực hoặc tất cả tài xế xe máy đã đạt ngưỡng tối đa ca gom',
          });
          continue;
        }

        // Tầng 2: Tính điểm Weighted Score cho từng candidate
        let bestCandidate = null;
        let bestScore = -1;

        for (const candidate of candidates) {
          const remainingQuota = candidate.rejectionQuota?.remainingToday ?? 3;
          const maxQuota = candidate.rejectionQuota?.maxPerDay ?? 3;
          const quotaRatio = maxQuota > 0 ? remainingQuota / maxQuota : 1;

          // Score: tải ảo càng thấp thì score càng cao
          const score = (1 / (1 + candidate.virtualOrderCount)) * w1 + quotaRatio * w2;

          if (score > bestScore) {
            bestScore = score;
            bestCandidate = candidate;
          } else if (Math.abs(score - bestScore) < 0.0001) {
            // Tie-break: Quota cao hơn thắng, hoặc _id so sánh
            if ((candidate.rejectionQuota?.remainingToday ?? 0) > (bestCandidate.rejectionQuota?.remainingToday ?? 0)) {
              bestCandidate = candidate;
            } else if (candidate._id.toString() < bestCandidate._id.toString()) {
              bestCandidate = candidate;
            }
          }
        }

        if (bestCandidate) {
          // Gán ảo
          bestCandidate.virtualOrderCount += 1;
          bestCandidate.assignedInBatch += 1;

          assignments.push({
            orderId: order._id,
            trackingCode: order.trackingCode,
            routeType: order.routeType || 'HUB_ROUTED',
            pickupAddress: order.pickupAddress,
            deliveryAddress: order.deliveryAddress,
            chargeableWeight: orderWeight,
            codAmount: order.codAmount || 0,
            suggestedDriverId: bestCandidate._id,
            driverName: bestCandidate.fullName,
            driverPhone: bestCandidate.phoneNumber,
            vehicleInfo: bestCandidate.vehicleInfo,
            score: Number(bestScore.toFixed(3)),
            reason: `🏍️ Xe máy rảnh nhất (${bestCandidate.virtualOrderCount - 1} đơn gom hiện tại) + Quota ${bestCandidate.rejectionQuota?.remainingToday ?? 3}/${bestCandidate.rejectionQuota?.maxPerDay ?? 3}`,
          });
        }
      }

      return res.json({
        success: true,
        totalOrders: orders.length,
        assignedCount: assignments.length,
        unassignedCount: unassigned.length,
        assignments,
        unassigned,
        driversSummary: driverPool.map(d => ({
          driverId: d._id,
          fullName: d.fullName,
          vehicleInfo: d.vehicleInfo,
          activeOrdersCount: d.activeOrdersCount,
          newAssignedInBatch: d.assignedInBatch,
          totalVirtualOrders: d.virtualOrderCount,
        })),
      });
    } catch (error) {
      console.error('[autoAssignPreview Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi xem trước phân công tự động', error: error.message });
    }
  },

  /**
   * 4.7 Xác nhận lưu phân công tự động vào DB (Auto-Assign Commit)
   * POST /api/driver-manager/auto-assign-commit
   * Body: { assignments: [{ orderId: String, driverId: String }] }
   */
  async autoAssignCommit(req, res) {
    try {
      const { assignments } = req.body || {};
      if (!Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({ message: 'Danh sách assignments không hợp lệ' });
      }

      let successCount = 0;
      const failedOrders = [];
      const now = new Date();

      for (const item of assignments) {
        const { orderId, driverId } = item;
        if (!orderId || !driverId) continue;

        try {
          const driver = await User.findOne({
            _id: driverId,
            role: { $in: ['DRIVER', 'SHIPPER'] },
            isActive: true,
          });
          if (!driver) {
            failedOrders.push({ orderId, reason: 'Tài xế không tồn tại hoặc không hoạt động' });
            continue;
          }

          // Atomic check: chỉ gán nếu đơn vẫn ở trạng thái APPROVED
          const order = await Order.findOne({ _id: orderId, status: 'APPROVED' });
          if (!order) {
            failedOrders.push({ orderId, reason: 'Đơn hàng không còn ở trạng thái APPROVED' });
            continue;
          }

          const preStatus = order.status;
          // TẠM THỜI TẮT NHÁNH DIRECT: 100% gom hàng về kho bưu cục trước
          order.status = 'ASSIGNED_TO_PICKUP';
          order.pickupAssignment = {
            driverId: driver._id,
            assignedBy: req.user._id,
            assignedAt: now,
            status: 'ASSIGNED',
          };
          order.assignedDriverId = driver._id;

          await order.save();

          try {
            await OrderLog.create({
              orderId: order._id,
              actionBy: req.user._id,
              preStatus,
              postStatus: order.status,
              actionType: 'STATUS_UPDATED',
              trackingCode: order.trackingCode,
              note: `Auto-Assign: Phân tài xế gom hàng ${driver.fullName} (${driver.phoneNumber})`,
            });
          } catch (logErr) {
            console.error('[OrderLog Error]:', logErr.message);
          }

          ioSingleton.emitOrderUpdate(order.sellerId, order);
          successCount++;
        } catch (err) {
          failedOrders.push({ orderId, reason: err.message });
        }
      }

      return res.json({
        success: true,
        message: `Đã phân công thành công ${successCount}/${assignments.length} đơn hàng`,
        successCount,
        failedOrders,
      });
    } catch (error) {
      console.error('[autoAssignCommit Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi xác nhận phân công tự động', error: error.message });
    }
  },
};

module.exports = driverManagerController;
