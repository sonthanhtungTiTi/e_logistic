const Trip = require('../models/trip.model');
const Bag = require('../models/bag.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');

/**
 * Controller: Quản trị Vận tải & Đội xe tải Liên tỉnh (LINE_HAUL_DISPATCHER)
 */
class LinehaulDispatchController {
  /**
   * Lấy danh sách Chuyến xe liên tỉnh
   * GET /api/dispatch/linehaul/trips
   */
  async getTrips(req, res, next) {
    try {
      const { status, originHubId, destinationHubId, page = 1, limit = 20 } = req.query;
      const query = {};
      if (status) query.status = status;
      if (originHubId) query.originHubId = originHubId;
      if (destinationHubId) query.destinationHubId = destinationHubId;

      const total = await Trip.countDocuments(query);
      const trips = await Trip.find(query)
        .populate('originHubId', 'name code province')
        .populate('destinationHubId', 'name code province')
        .populate('driverId', 'fullName phoneNumber vehicleInfo isWorking')
        .populate('createdBy', 'fullName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách Chuyến xe thành công',
        data: trips,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách Bao hàng niêm phong sẵn sàng xếp lên xe
   * GET /api/dispatch/linehaul/sealed-bags
   */
  async getSealedBagsReady(req, res, next) {
    try {
      const { originHubId, destinationHubId } = req.query;
      const query = { status: 'SEALED', tripId: null };
      if (originHubId) query.originHubId = originHubId;
      if (destinationHubId) query.destinationHubId = destinationHubId;

      const bags = await Bag.find(query)
        .populate('originHubId', 'name code')
        .populate('destinationHubId', 'name code')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách bao hàng sẵn sàng thành công',
        data: bags,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách Tài xế xe tải
   * GET /api/dispatch/linehaul/drivers
   */
  async getLinehaulDrivers(req, res, next) {
    try {
      const drivers = await User.find({ role: 'LINE_HAUL_DRIVER', isActive: true })
        .populate('hubId', 'name code')
        .select('-password');

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách tài xế xe tải thành công',
        data: drivers,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Tạo Chuyến xe mới và gom các Bao hàng lên chuyến
   * POST /api/dispatch/linehaul/trips
   */
  async createTrip(req, res, next) {
    try {
      const { tripCode, originHubId, destinationHubId, driverId, bagIds, notes } = req.body;

      if (!tripCode || !originHubId || !destinationHubId) {
        return res.status(400).json({
          success: false,
          message: 'Mã chuyến, Kho xuất phát và Kho đến là bắt buộc',
        });
      }

      // Thu thập tracking codes từ các bao hàng
      let allTrackingCodes = [];
      if (bagIds && bagIds.length > 0) {
        const bags = await Bag.find({ _id: { $in: bagIds } });
        for (const bag of bags) {
          allTrackingCodes.push(...bag.trackingCodes);
        }
      }

      const trip = await Trip.create({
        tripCode: tripCode.toUpperCase(),
        tripType: 'MID_MILE_TRANSFER',
        originHubId,
        destinationHubId,
        driverId: driverId || null,
        plannedTrackingCodes: allTrackingCodes,
        status: driverId ? 'LOCKED_PENDING_DRIVER_CONFIRM' : 'DRAFT',
        lockedAt: driverId ? new Date() : null,
        createdBy: req.user?._id || req.user?.id,
      });

      // Cập nhật tripId cho các bao hàng
      if (bagIds && bagIds.length > 0) {
        await Bag.updateMany(
          { _id: { $in: bagIds } },
          { $set: { tripId: trip._id, status: 'IN_TRANSIT' } }
        );

        // Cập nhật currentTripId cho các Order
        await Order.updateMany(
          { trackingCode: { $in: allTrackingCodes } },
          { $set: { currentTripId: trip._id, status: 'IN_TRANSIT' } }
        );
      }

      return res.status(201).json({
        success: true,
        message: `Đã tạo chuyến xe [${trip.tripCode}] thành công`,
        data: trip,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gán tài xế xe tải cho Chuyến xe
   * POST /api/dispatch/linehaul/trips/:id/assign-driver
   */
  async assignDriverToTrip(req, res, next) {
    try {
      const { id } = req.params;
      const { driverId } = req.body;

      const trip = await Trip.findById(id);
      const driver = await User.findById(driverId);

      if (!trip || !driver) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe hoặc tài xế' });
      }

      trip.driverId = driver._id;
      trip.status = 'LOCKED_PENDING_DRIVER_CONFIRM';
      trip.lockedAt = new Date();
      await trip.save();

      return res.status(200).json({
        success: true,
        message: `Đã gán chuyến [${trip.tripCode}] cho tài xế [${driver.fullName}] và khóa chuyến chờ xác nhận`,
        data: trip,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LinehaulDispatchController();
