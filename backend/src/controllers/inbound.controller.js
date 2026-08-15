const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const Bag = require('../models/bag.model');
const { singleInboundSchema, batchInboundSchema, sealScanSchema, incidentSchema } = require('../validations/inbound.validation');
const { processInboundSingle } = require('../services/inboundCore.service');

/**
 * Controller Quét Nhập Kho Đơn Lẻ (Single Inbound Scan)
 * POST /api/inbound/scan-single
 */
exports.scanSingleInbound = async (req, res) => {
  try {
    const { error, value } = singleInboundSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const trackingCode = value.tracking_code || value.trackingCode;
    const condition = value.package_condition || value.condition || 'INTACT';
    const hubMeasuredWeight = value.hub_measured_weight ?? value.hubMeasuredWeight ?? null;
    const clientOfflineId = value.client_offline_id || value.clientOfflineId || null;

    const result = await processInboundSingle({
      trackingCode,
      operator: req.user,
      condition,
      note: value.note,
      hubMeasuredWeight,
      clientOfflineId,
    });

    return res.status(200).json({
      success: true,
      message: 'Nhập kho thành công',
      data: result,
    });
  } catch (err) {
    return res.status(err.status || err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lỗi hệ thống khi quét nhập kho',
      code: err.code || 'INBOUND_ERROR',
    });
  }
};

/**
 * Controller Quét Nhập Kho Hàng Loạt (Batch Inbound Scan)
 * POST /api/inbound/scan-batch
 */
exports.scanBatchInbound = async (req, res) => {
  try {
    const { error, value } = batchInboundSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const trackingCodes = value.tracking_codes || value.trackingCodes || [];
    const condition = value.package_condition || value.condition || 'INTACT';

    const results = {
      total: trackingCodes.length,
      success_count: 0,
      failed_count: 0,
      success_items: [],
      failed_items: [],
    };

    const settledResults = await Promise.allSettled(
      trackingCodes.map(code =>
        processInboundSingle({ trackingCode: code, operator: req.user, condition })
      )
    );

    settledResults.forEach((outcome, index) => {
      const code = trackingCodes[index];
      if (outcome.status === 'fulfilled') {
        results.success_count++;
        results.success_items.push(outcome.value);
      } else {
        results.failed_count++;
        results.failed_items.push({
          tracking_code: code,
          reason: outcome.reason.message || 'Lỗi không xác định',
          code: outcome.reason.code || 'FAILED',
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: `Đã xử lý ${results.total} kiện: ${results.success_count} thành công, ${results.failed_count} thất bại`,
      data: results,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xử lý lô nhập kho',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Quét nhập kho theo Seal (Bao tải niêm phong)
 * POST /api/inbound/scan-seal
 */
exports.scanSealInbound = async (req, res) => {
  try {
    const { error, value } = sealScanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const sealCode = (value.seal_code || value.sealCode || '').toUpperCase();
    const clientOfflineId = value.client_offline_id || value.clientOfflineId || null;

    const bag = await Bag.findOne({ sealCode });
    if (!bag) {
      return res.status(404).json({
        success: false,
        message: `Mã seal ${sealCode} không tồn tại trong hệ thống`,
        code: 'SEAL_NOT_FOUND',
      });
    }

    if (!bag.trackingCodes || bag.trackingCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Bao tải ${sealCode} không có vận đơn nào`,
        code: 'EMPTY_BAG',
      });
    }

    const results = {
      seal_code: sealCode,
      total: bag.trackingCodes.length,
      success_count: 0,
      failed_count: 0,
      success_items: [],
      failed_items: [],
    };

    const settledResults = await Promise.allSettled(
      bag.trackingCodes.map((code, idx) =>
        processInboundSingle({
          trackingCode: code,
          operator: req.user,
          condition: 'INTACT',
          // Mỗi item trong bag có unique offline id để idempotency
          clientOfflineId: clientOfflineId ? `${clientOfflineId}_${idx}` : null,
        })
      )
    );

    settledResults.forEach((outcome, index) => {
      const code = bag.trackingCodes[index];
      if (outcome.status === 'fulfilled') {
        results.success_count++;
        results.success_items.push(outcome.value);
      } else {
        results.failed_count++;
        results.failed_items.push({
          tracking_code: code,
          reason: outcome.reason.message || 'Lỗi không xác định',
          code: outcome.reason.code || 'FAILED',
        });
      }
    });

    // Cập nhật trạng thái Bag sang ARRIVED nếu tất cả success
    if (results.failed_count === 0) {
      await Bag.updateOne({ _id: bag._id }, { $set: { status: 'ARRIVED', arrivedAt: new Date() } });
      results.bag_status = 'ARRIVED';
    } else {
      results.bag_status = bag.status; // Giữ nguyên
    }

    return res.status(200).json({
      success: true,
      message: `Seal ${sealCode}: ${results.success_count}/${results.total} kiện nhập kho thành công`,
      data: results,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Lỗi khi quét seal nhập kho',
      code: err.code || 'SEAL_INBOUND_ERROR',
    });
  }
};

/**
 * Ghi nhận sự cố / ngoại lệ kiện hàng (Incident Report)
 * POST /api/inbound/incident
 */
exports.reportIncident = async (req, res) => {
  try {
    const { error, value } = incidentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const trackingCode = (value.tracking_code || value.trackingCode || '').toUpperCase();
    const photoUrls = value.photo_urls || value.photoUrls || [];
    const note = value.note || '';

    if (!trackingCode) {
      return res.status(400).json({
        success: false,
        message: 'Mã vận đơn là bắt buộc',
        code: 'VALIDATION_ERROR',
      });
    }

    const order = await Order.findOne({ trackingCode });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Vận đơn ${trackingCode} không tồn tại`,
        code: 'ORDER_NOT_FOUND',
      });
    }

    // Kiểm tra HUB_UNASSIGNED giống inboundCore.service.js
    const currentHubId = req.user?.hubId || req.user?.hub_id;
    if (!currentHubId) {
      return res.status(403).json({
        success: false,
        message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào',
        code: 'HUB_UNASSIGNED',
      });
    }

    // Atomic update sang EXCEPTION_INBOUND
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id },
      { $set: { status: 'EXCEPTION_INBOUND', isFlagged: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    // Async log (không block response)
    setImmediate(async () => {
      try {
        await OrderLog.create({
          orderId: order._id,
          trackingCode: order.trackingCode,
          preStatus: order.status,
          postStatus: 'EXCEPTION_INBOUND',
          actionType: 'EXCEPTION',
          actionBy: req.user._id || req.user.id,
          hubId: currentHubId,
          note: note || 'Báo cáo sự cố kiện hàng',
          metadata: { photoUrls, note, incidentReportedAt: new Date().toISOString() },
        });
      } catch (logErr) {
        console.error('[INCIDENT_LOG_ERROR]', logErr.message);
      }
    });

    // TODO: tích hợp module CSKH thật — hiện tại stub

    return res.status(200).json({
      success: true,
      message: `Đã ghi nhận sự cố kiện hàng ${trackingCode}`,
      data: {
        tracking_code: trackingCode,
        trackingCode,
        previous_status: order.status,
        current_status: 'EXCEPTION_INBOUND',
        is_flagged: true,
        photos_received: photoUrls.length,
      },
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Lỗi khi ghi nhận sự cố',
      code: err.code || 'INCIDENT_ERROR',
    });
  }
};
