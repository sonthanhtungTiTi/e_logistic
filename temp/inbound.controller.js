const { singleInboundSchema, batchInboundSchema } = require('../validations/inbound.validation');
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
        code: 'VALIDATION_ERROR'
      });
    }

    const trackingCode = value.tracking_code || value.trackingCode;
    const condition = value.package_condition || value.condition || 'INTACT';

    const result = await processInboundSingle({
      trackingCode,
      operator: req.user, // Tuyệt đối lấy từ JWT Middleware
      condition,
      note: value.note
    });

    return res.status(200).json({
      success: true,
      message: 'Nhập kho thành công',
      data: result
    });
  } catch (err) {
    return res.status(err.status || err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lỗi hệ thống khi quét nhập kho',
      code: err.code || 'INBOUND_ERROR'
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
        code: 'VALIDATION_ERROR'
      });
    }

    const trackingCodes = value.tracking_codes || value.trackingCodes || [];
    const condition = value.package_condition || value.condition || 'INTACT';

    const results = {
      total: trackingCodes.length,
      success_count: 0,
      failed_count: 0,
      success_items: [],
      failed_items: []
    };

    // Xử lý song song bằng Promise.allSettled
    const scanPromises = trackingCodes.map(code =>
      processInboundSingle({
        trackingCode: code,
        operator: req.user,
        condition
      })
    );

    const settledResults = await Promise.allSettled(scanPromises);

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
          code: outcome.reason.code || 'FAILED'
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: `Đã xử lý ${results.total} kiện: ${results.success_count} thành công, ${results.failed_count} thất bại`,
      data: results
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xử lý lô nhập kho',
      code: 'SERVER_ERROR'
    });
  }
};
