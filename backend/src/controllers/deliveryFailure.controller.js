const { processDeliveryFailureReport, DeliveryFailureError } = require('../services/deliveryFailure.service');

exports.reportDeliveryFailure = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      reasonGroup, contactAttempts, rescheduleRequestedAt, note,
      proofImageUrls, latitude, longitude, clientOfflineId
    } = req.body;

    const result = await processDeliveryFailureReport({
      orderId, reasonGroup, contactAttempts, rescheduleRequestedAt,
      note, proofImageUrls, latitude, longitude, clientOfflineId,
      reportedByUserId: req.user._id
    });

    if (result.alreadyProcessed) {
      return res.status(200).json({
        message: 'Thao tác đã được ghi nhận trước đó (bỏ qua trùng lặp).',
        alreadyProcessed: true,
        order: result.order
      });
    }

    res.status(200).json({
      message: result.triggeredReturnProcess
        ? 'Đã đủ số lần giao thất bại, đơn hàng chuyển sang xử lý hoàn hàng.'
        : 'Đã ghi nhận giao thất bại, đơn hàng chuyển sang chờ giao lại.',
      order: result.order
    });
  } catch (err) {
    if (err instanceof DeliveryFailureError) {
      return res.status(err.statusCode).json({ message: err.message, ...err.extra });
    }
    console.error('[reportDeliveryFailure Error]:', err);
    res.status(500).json({ message: 'Lỗi xử lý báo giao thất bại', error: err.message });
  }
};

exports.syncOfflineFailureReports = async (req, res) => {
  const { reports } = req.body; // mảng report đã lưu offline trên thiết bị, mỗi report có sẵn clientOfflineId

  if (!Array.isArray(reports) || reports.length === 0) {
    return res.status(400).json({ message: 'Danh sách đồng bộ trống hoặc không hợp lệ' });
  }

  const results = [];

  // Xử lý TUẦN TỰ (không Promise.all) để tránh nhiều transaction ghi đồng thời lên cùng 1 order
  // gây tranh chấp session MongoDB nếu 1 thiết bị offline lâu có nhiều report dồn lại cho cùng 1 đơn
  for (const report of reports) {
    try {
      const result = await processDeliveryFailureReport({
        ...report,
        reportedByUserId: req.user._id
      });
      results.push({
        clientOfflineId: report.clientOfflineId,
        success: true,
        alreadyProcessed: result.alreadyProcessed || false
      });
    } catch (err) {
      // 1 report lỗi KHÔNG chặn các report khác trong batch — ghi nhận lỗi và tiếp tục
      results.push({
        clientOfflineId: report.clientOfflineId,
        success: false,
        error: err.message
      });
    }
  }

  res.json({
    syncedCount: results.filter(r => r.success).length,
    totalCount: reports.length,
    results
  });
};
