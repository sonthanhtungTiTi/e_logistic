const Order = require('../models/order.model');
const User = require('../models/user.model');
const Geozone = require('../models/geozone.model');
const dispatchEngine = require('../services/dispatchEngine.service');

/**
 * Controller: Quản trị Điều phối Shipper Nội vùng (LAST_MILE_DISPATCHER)
 */
class LocalDispatchController {
  /**
   * Lấy danh sách Geozones cùng số lượng đơn & Shipper
   * GET /api/dispatch/local/geozones
   */
  async getGeozones(req, res, next) {
    try {
      const { hubId } = req.query;
      const query = { isActive: true };
      if (hubId) query.hubId = hubId;

      const geozones = await Geozone.find(query).populate('hubId', 'name code');

      const data = await Promise.all(
        geozones.map(async (zone) => {
          const activeShippers = await User.countDocuments({
            role: 'LOCAL_SHIPPER',
            activeGeozoneId: zone._id,
            isWorking: true,
          });

          const pendingPickups = await Order.countDocuments({
            pickupGeozoneId: zone._id,
            status: 'READY_TO_PICK',
            pickupShipperId: null,
          });

          const pendingDeliveries = await Order.countDocuments({
            deliveryGeozoneId: zone._id,
            status: { $in: ['IN_HUB_DEST', 'OUT_FOR_DELIVERY'] },
            deliveryShipperId: null,
          });

          const escalatedCount = await Order.countDocuments({
            $or: [{ pickupGeozoneId: zone._id }, { deliveryGeozoneId: zone._id }],
            status: 'DISPATCH_ESCALATED',
          });

          return {
            ...zone.toObject(),
            stats: {
              activeShippers,
              pendingPickups,
              pendingDeliveries,
              escalatedCount,
            },
          };
        })
      );

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách Geozone thành công',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Tạo Geozone mới
   * POST /api/dispatch/local/geozones
   */
  async createGeozone(req, res, next) {
    try {
      const { code, name, hubId, province, district, ward, subZones, neighborGeozoneIds } = req.body;

      const zone = await Geozone.create({
        code,
        name,
        hubId,
        province,
        district,
        ward,
        subZones: subZones || [],
        neighborGeozoneIds: neighborGeozoneIds || [],
      });

      return res.status(201).json({
        success: true,
        message: 'Tạo Geozone thành công',
        data: zone,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Xem tổng quan tải trọng Shipper theo Geozone
   * GET /api/dispatch/local/shippers-overview
   */
  async getShippersOverview(req, res, next) {
    try {
      const { geozoneId } = req.query;
      const query = { role: 'LOCAL_SHIPPER' };
      if (geozoneId) query.activeGeozoneId = geozoneId;

      const shippers = await User.find(query)
        .populate('activeGeozoneId', 'name code ward district')
        .populate('hubId', 'name code')
        .select('-password');

      const data = shippers.map((s) => {
        const pMax = s.pickupQuota?.max || 25;
        const pCur = s.pickupQuota?.current || 0;
        const dMax = s.deliveryQuota?.max || 35;
        const dCur = s.deliveryQuota?.current || 0;

        const pickupLoadPercent = Math.round((pCur / pMax) * 100);
        const deliveryLoadPercent = Math.round((dCur / dMax) * 100);

        return {
          id: s._id,
          fullName: s.fullName,
          phoneNumber: s.phoneNumber,
          vehicleInfo: s.vehicleInfo,
          isWorking: s.isWorking,
          activeGeozone: s.activeGeozoneId,
          hub: s.hubId,
          pickupQuota: { max: pMax, current: pCur, percent: pickupLoadPercent },
          deliveryQuota: { max: dMax, current: dCur, percent: deliveryLoadPercent },
          maxWeightCapacityKg: s.maxWeightCapacityKg || 45,
          currentWeightKg: s.currentWeightKg || 0,
          acceptanceRate: s.acceptanceRate || 100,
          dispatchRejectionCount: s.dispatchRejectionCount || 0,
          shiftStartedAt: s.shiftStartedAt,
        };
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách tải trọng Shipper thành công',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách đơn hàng bị tắc nghẽn (Cần can thiệp thủ công / DISPATCH_ESCALATED)
   * GET /api/dispatch/local/escalated-orders
   */
  async getEscalatedOrders(req, res, next) {
    try {
      const orders = await Order.find({ status: 'DISPATCH_ESCALATED' })
        .populate('sellerId', 'fullName phoneNumber companyName')
        .populate('pickupGeozoneId', 'name code')
        .populate('deliveryGeozoneId', 'name code')
        .sort({ updatedAt: -1 });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn cần can thiệp thành công',
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gán đơn thủ công cho một Shipper
   * POST /api/dispatch/local/manual-assign
   */
  async manualAssignOrder(req, res, next) {
    try {
      const { orderId, shipperId, taskType } = req.body;

      const order = await Order.findById(orderId);
      const shipper = await User.findById(shipperId);

      if (!order || !shipper) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng hoặc Shipper' });
      }

      if (taskType === 'PICKUP') {
        order.pickupShipperId = shipper._id;
        order.status = 'READY_TO_PICK';
        order.dispatchRetryCount = 0;
        shipper.pickupQuota = shipper.pickupQuota || { max: 25, current: 0 };
        shipper.pickupQuota.current += 1;
      } else {
        order.deliveryShipperId = shipper._id;
        order.status = 'OUT_FOR_DELIVERY';
        order.dispatchRetryCount = 0;
        shipper.deliveryQuota = shipper.deliveryQuota || { max: 35, current: 0 };
        shipper.deliveryQuota.current += 1;
      }

      await order.save();
      await shipper.save();

      return res.status(200).json({
        success: true,
        message: `Đã gán đơn [${order.trackingCode}] cho Shipper [${shipper.fullName}] thành công`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Tự động điều phối đơn hàng với tuỳ chọn Spillover
   * POST /api/dispatch/local/auto-dispatch
   */
  async triggerAutoDispatch(req, res, next) {
    try {
      const { orderId, taskType, isSpilloverActive } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      const result = await dispatchEngine.findBestShipperForTask(
        order,
        taskType || 'PICKUP',
        Boolean(isSpilloverActive)
      );

      if (!result.success) {
        if (result.shouldEscalate) {
          order.status = 'DISPATCH_ESCALATED';
          order.riskViolationReason = result.reason;
          await order.save();
        }
        return res.status(400).json({
          success: false,
          message: `Không thể điều phối tự động: ${result.reason}`,
          data: result,
        });
      }

      // Gán thành công
      if (taskType === 'PICKUP') {
        order.pickupShipperId = result.shipper._id;
      } else {
        order.deliveryShipperId = result.shipper._id;
      }
      await order.save();

      return res.status(200).json({
        success: true,
        message: `Đã điều phối đơn [${order.trackingCode}] cho Shipper [${result.shipper.fullName}] (Điểm: ${result.score.toFixed(1)})`,
        data: {
          orderId: order._id,
          assignedShipper: result.shipper,
          score: result.score,
          isNeighbor: result.isNeighbor,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LocalDispatchController();
