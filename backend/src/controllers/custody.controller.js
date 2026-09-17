const CustodyTransferLog = require('../models/custodyTransferLog.model');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const OrderTrackingLog = require('../models/orderTrackingLog.model');
const autoApprovalService = require('../services/autoApproval.service');

/**
 * Controller: Chuỗi chuyển giao trách nhiệm & Quét bàn giao (Chain of Custody)
 */
class CustodyController {
  /**
   * Ghi nhận sự kiện chuyển giao trách nhiệm
   * POST /api/custody/transfer
   */
  async recordTransfer(req, res, next) {
    try {
      const {
        trackingCode,
        transferType,
        toActorUserId,
        toActorRole,
        toActorName,
        toActorPhone,
        fromHubId,
        toHubId,
        handoverCode,
        measuredWeightKg,
        measuredMaxDimension,
        actualCod,
        packageCondition,
        conditionNote,
        signatureUrl,
        evidencePhotos,
        gpsLocation,
      } = req.body;

      const order = await Order.findOne({ trackingCode });
      if (!order) {
        return res.status(404).json({ success: false, message: `Không tìm thấy vận đơn [${trackingCode}]` });
      }

      // Kiểm tra phát hiện gian lận/sai lệch dữ liệu sau khi cân đo thực tế
      if (measuredWeightKg || measuredMaxDimension || actualCod) {
        const deviationCheck = autoApprovalService.checkPostApprovalDeviation(order, {
          measuredWeight: measuredWeightKg,
          measuredMaxDimension,
          actualCod,
        });

        if (deviationCheck.isSuspended) {
          order.status = deviationCheck.newStatus;
          order.riskViolationReason = deviationCheck.reason;
          await order.save();
        }
      }

      // Cập nhật trạng thái đơn hàng theo loại chuyển giao
      if (transferType === 'SHIPPER_TO_BUYER' && order.status !== 'SUSPENDED') {
        const preStatus = order.status;
        const now = new Date();
        order.status = 'DELIVERED';
        order.deliveredAt = now;
        order.complaintDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 ngày khiếu nại
        order.podArchivedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);  // 7 ngày bảo lưu thông tin & bằng chứng
        order.deliveryShipperId = req.user?._id || req.user?.id;
        if (actualCod !== undefined && actualCod !== null) {
          order.collectedCodAmount = Number(actualCod);
        }

        const podPhoto = signatureUrl || (evidencePhotos && evidencePhotos[0]) || null;
        order.deliveryProof = {
          photoUrl: podPhoto,
          capturedAt: now,
          gpsLocation: gpsLocation || { lat: 10.776889, lng: 106.700806 },
          handoverType: handoverType || 'DIRECT_CUSTOMER',
          conditionNote: conditionNote || '',
          verifiedBarcode: order.trackingCode,
        };

        if (!order.deliveryTripId && (req.user?._id || req.user?.id)) {
          const todayStr = now.toISOString().slice(0, 10).replace(/-/g, '');
          const shipperSuffix = String(req.user._id || req.user.id).slice(-4).toUpperCase();
          order.deliveryTripId = `DLV-${todayStr}-${shipperSuffix}`;
        }
        await order.save();

        await OrderTrackingLog.create({
          orderId: order._id,
          trackingCode: order.trackingCode,
          eventType: 'DELIVERED',
          title: 'Giao hàng thành công',
          description: `Đơn hàng đã được phát thành công cho người nhận. Thu COD: ${(Number(actualCod) || order.codAmount || 0).toLocaleString('vi-VN')} đ`,
          podImageUrl: podPhoto,
        });

        await OrderLog.create({
          orderId: order._id,
          trackingCode: order.trackingCode,
          preStatus,
          postStatus: 'DELIVERED',
          actionType: 'DELIVERY_SUCCESS',
          actionBy: req.user?._id || req.user?.id,
          note: `Shipper hoàn tất giao hàng (e-POD xác nhận hình ảnh & GPS, hạn khiếu nại: 3 ngày, bảo lưu: 7 ngày)`,
        });
      } else if (transferType === 'SELLER_TO_SHIPPER' && (order.status === 'READY_TO_PICK' || order.status === 'CREATED')) {
        const preStatus = order.status;
        order.status = 'PICKED_UP';
        order.pickupAt = new Date();
        await order.save();

        await OrderTrackingLog.create({
          orderId: order._id,
          trackingCode: order.trackingCode,
          eventType: 'PICKED_UP',
          title: 'Lấy hàng thành công',
          description: 'Shipper đã lấy hàng thành công từ người gửi',
        });

        await OrderLog.create({
          orderId: order._id,
          trackingCode: order.trackingCode,
          preStatus,
          postStatus: 'PICKED_UP',
          actionType: 'PICKED_UP',
          actionBy: req.user?._id || req.user?.id,
          note: 'Shipper xác nhận nhận hàng từ shop (Chain of Custody)',
        });
      }

      // Tạo bản ghi nhật ký pháp lý
      const log = await CustodyTransferLog.create({
        orderId: order._id,
        trackingCode,
        transferType,
        fromActor: {
          userId: req.user?._id || req.user?.id,
          role: req.user?.role || 'UNKNOWN',
          name: req.user?.fullName || 'Nhân viên bàn giao',
          phone: req.user?.phoneNumber || '',
        },
        fromHubId: fromHubId || req.user?.hubId || null,
        toActor: {
          userId: toActorUserId || null,
          role: toActorRole || 'RECIPIENT',
          name: toActorName || 'Người nhận',
          phone: toActorPhone || '',
        },
        toHubId: toHubId || null,
        handoverCode: handoverCode || null,
        measuredWeightKg: measuredWeightKg || order.actualWeight,
        packageCondition: packageCondition || 'INTACT',
        conditionNote: conditionNote || '',
        signatureUrl: signatureUrl || null,
        evidencePhotos: evidencePhotos || [],
        gpsLocation: gpsLocation || null,
        timestamp: new Date(),
      });

      return res.status(201).json({
        success: true,
        message: `Đã ghi nhận chuyển giao trách nhiệm vận đơn [${trackingCode}] thành công`,
        data: {
          transferId: log._id,
          orderStatus: order.status,
          riskViolationReason: order.riskViolationReason,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy lịch sử chuyển giao trách nhiệm của đơn hàng
   * GET /api/custody/history/:trackingCode
   */
  async getCustodyHistory(req, res, next) {
    try {
      const { trackingCode } = req.params;

      const logs = await CustodyTransferLog.find({ trackingCode })
        .populate('fromHubId', 'name code province')
        .populate('toHubId', 'name code province')
        .sort({ timestamp: 1 });

      return res.status(200).json({
        success: true,
        message: 'Lấy lịch sử chuyển giao trách nhiệm thành công',
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CustodyController();
