const User = require('../models/user.model');
const Order = require('../models/order.model');

class ShipperZoneController {
  /**
   * Lấy thông tin hồ sơ & khu vực của Shipper hiện tại
   * GET /api/users/shipper/profile
   */
  async getShipperProfile(req, res, next) {
    try {
      const user = await User.findById(req.user._id || req.user.id).select(
        'fullName email phoneNumber role vehicleInfo isWorking operatingArea zoneChangeRequest hubId kycStatus pickupQuota deliveryQuota maxWeightCapacityKg currentWeightKg shiftStartedAt shiftEndedAt'
      );
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài khoản' });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Shipper cập nhật thông tin cơ bản (SĐT, biển số xe, loại xe, bật/tắt ca)
   * PUT /api/users/shipper/basic-info
   */
  async updateBasicProfile(req, res, next) {
    try {
      const { fullName, phoneNumber, vehicleInfo, isWorking } = req.body;
      const user = await User.findById(req.user._id || req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
      }

      if (fullName) user.fullName = fullName.trim();
      if (phoneNumber) user.phoneNumber = phoneNumber.trim();
      if (vehicleInfo) {
        user.vehicleInfo = {
          licensePlate: vehicleInfo.licensePlate || user.vehicleInfo?.licensePlate || '',
          vehicleType: vehicleInfo.vehicleType || user.vehicleInfo?.vehicleType || 'Xe máy',
        };
      }
      if (typeof isWorking === 'boolean') {
        const wasWorking = user.isWorking;
        user.isWorking = isWorking;

        if (wasWorking && !isWorking) {
          // Shipper TẮT CA: Tự động thu hồi đơn READY_TO_PICK chưa kịp lấy để chuyển ca
          const unpickedOrders = await Order.find({
            status: 'READY_TO_PICK',
            $or: [{ pickupShipperId: user._id }, { currentDriverId: user._id }],
          });

          if (unpickedOrders.length > 0) {
            const unpickedIds = unpickedOrders.map((o) => o._id);
            const unpickedWeight = unpickedOrders.reduce((sum, o) => sum + Number(o.actualWeight || o.declaredWeight || 1), 0);

            await Order.updateMany(
              { _id: { $in: unpickedIds } },
              {
                $set: {
                  pickupShipperId: null,
                  currentDriverId: null,
                  isRolloverOrder: true,
                  rolloverReason: 'SHIFT_ENDED_UNPICKED',
                  agingPriority: 'HIGH',
                },
                $inc: { rolloverCount: 1 },
              }
            );

            if (user.pickupQuota) {
              user.pickupQuota.current = Math.max(0, (user.pickupQuota.current || 0) - unpickedOrders.length);
            }
            if (user.tripCapacity) {
              user.tripCapacity.currentParcels = Math.max(0, (user.tripCapacity.currentParcels || 0) - unpickedOrders.length);
              user.tripCapacity.currentWeightKg = Math.max(0, Math.round(((user.tripCapacity.currentWeightKg || 0) - unpickedWeight) * 100) / 100);
            }
            user.currentWeightKg = Math.max(0, Math.round(((user.currentWeightKg || 0) - unpickedWeight) * 100) / 100);
          }
          user.shiftEndedAt = new Date();
        } else if (!wasWorking && isWorking) {
          user.shiftStartedAt = new Date();
        }
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin cơ bản thành công',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Shipper gửi Yêu Cầu Xin Chuyển Khu Vực Hoạt Động (Cần Admin duyệt)
   * POST /api/users/shipper/request-zone-change
   */
  async requestZoneChange(req, res, next) {
    try {
      const { requestedArea, reason } = req.body;

      if (!requestedArea || !requestedArea.province || !requestedArea.district) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin khu vực mong muốn (Tỉnh/Thành, Quận/Huyện, Phường/Xã)',
        });
      }

      const user = await User.findById(req.user._id || req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
      }

      user.zoneChangeRequest = {
        requestedArea: {
          province: requestedArea.province.trim(),
          district: requestedArea.district.trim(),
          ward: (requestedArea.ward || '').trim(),
          subZone: (requestedArea.subZone || '').trim(),
          detailAddress: (requestedArea.detailAddress || '').trim(),
        },
        reason: (reason || 'Yêu cầu chuyển địa bàn công tác').trim(),
        status: 'PENDING',
        requestedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      };

      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Yêu cầu chuyển khu vực đã được gửi tới Quản trị viên (Admin) phê duyệt',
        data: user.zoneChangeRequest,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin lấy danh sách tất cả yêu cầu xin đổi khu vực của Shipper
   * GET /api/users/zone-change-requests
   */
  async getZoneChangeRequests(req, res, next) {
    try {
      const shippers = await User.find({
        'zoneChangeRequest.status': { $in: ['PENDING', 'APPROVED', 'REJECTED'] },
      })
        .select('fullName email phoneNumber role vehicleInfo operatingArea zoneChangeRequest createdAt')
        .populate('zoneChangeRequest.reviewedBy', 'fullName email role')
        .sort({ 'zoneChangeRequest.requestedAt': -1 });

      return res.status(200).json({
        success: true,
        data: shippers,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin Phê Duyệt yêu cầu đổi khu vực của Shipper
   * POST /api/users/zone-change-requests/:id/approve
   */
  async approveZoneChangeRequest(req, res, next) {
    try {
      const { id } = req.params;
      const mongoose = require('mongoose');
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID Shipper không hợp lệ' });
      }

      const shipper = await User.findById(id);

      if (!shipper) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin Shipper' });
      }

      if (!shipper.zoneChangeRequest || shipper.zoneChangeRequest.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Yêu cầu đổi khu vực không ở trạng thái chờ duyệt' });
      }

      // Cập nhật khu vực hoạt động chính thức
      shipper.operatingArea = {
        province: shipper.zoneChangeRequest.requestedArea?.province || '',
        district: shipper.zoneChangeRequest.requestedArea?.district || '',
        ward: shipper.zoneChangeRequest.requestedArea?.ward || '',
        subZone: shipper.zoneChangeRequest.requestedArea?.subZone || '',
        detailAddress: shipper.zoneChangeRequest.requestedArea?.detailAddress || '',
      };
      shipper.zoneChangeRequest.status = 'APPROVED';
      shipper.zoneChangeRequest.reviewedBy = req.user?._id || req.user?.id || null;
      shipper.zoneChangeRequest.reviewedAt = new Date();

      shipper.markModified('operatingArea');
      shipper.markModified('zoneChangeRequest');

      await shipper.save();

      return res.status(200).json({
        success: true,
        message: `Đã phê duyệt đổi khu vực thành công cho Shipper [${shipper.fullName}]`,
        data: shipper,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin Từ Chối yêu cầu đổi khu vực của Shipper
   * POST /api/users/zone-change-requests/:id/reject
   */
  async rejectZoneChangeRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const mongoose = require('mongoose');
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID Shipper không hợp lệ' });
      }

      const shipper = await User.findById(id);
      if (!shipper) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin Shipper' });
      }

      if (!shipper.zoneChangeRequest || shipper.zoneChangeRequest.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Yêu cầu đổi khu vực không ở trạng thái chờ duyệt' });
      }

      shipper.zoneChangeRequest.status = 'REJECTED';
      shipper.zoneChangeRequest.rejectionReason = reason || 'Không đáp ứng điều kiện điều phối khu vực hiện tại';
      shipper.zoneChangeRequest.reviewedBy = req.user?._id || req.user?.id || null;
      shipper.zoneChangeRequest.reviewedAt = new Date();

      shipper.markModified('zoneChangeRequest');

      await shipper.save();

      return res.status(200).json({
        success: true,
        message: `Đã từ chối yêu cầu đổi khu vực của Shipper [${shipper.fullName}]`,
        data: shipper,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin trực tiếp gán/chỉ định khu vực hoạt động cho Shipper
   * PUT /api/users/:id/assign-zone
   */
  async adminAssignZone(req, res, next) {
    try {
      const { id } = req.params;
      const { operatingArea } = req.body;

      const shipper = await User.findById(id);
      if (!shipper) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin Shipper' });
      }

      shipper.operatingArea = {
        province: operatingArea.province || '',
        district: operatingArea.district || '',
        ward: operatingArea.ward || '',
        subZone: operatingArea.subZone || '',
        detailAddress: operatingArea.detailAddress || '',
      };

      await shipper.save();

      return res.status(200).json({
        success: true,
        message: `Đã cập nhật trực tiếp khu vực hoạt động cho Shipper [${shipper.fullName}]`,
        data: shipper,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ShipperZoneController();
