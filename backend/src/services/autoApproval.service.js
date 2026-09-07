const Order = require('../models/order.model');
const User = require('../models/user.model');

/**
 * Service: Tự động thẩm định đơn hàng (Single-Pass Exclusion Filter)
 */
class AutoApprovalService {
  /**
   * Đánh giá đơn hàng khi vừa tạo hoặc import
   * @param {Object} orderData Dữ liệu đơn hàng
   * @param {String} sellerId ID của Seller
   * @returns {Promise<{autoApproved: boolean, status: string, riskFlags: string[], reason: string|null}>}
   */
  async evaluateOrderApproval(orderData, sellerId) {
    const riskFlags = [];
    const reasons = [];

    // 1. Kiểm tra Seller
    const seller = await User.findById(sellerId);
    if (!seller) {
      return {
        autoApproved: false,
        status: 'PENDING_VERIFICATION',
        riskFlags: ['SELLER_NOT_FOUND'],
        reason: 'Không tìm thấy thông tin tài khoản Seller',
      };
    }

    // 2. Rủi ro Tài chính (COD / Khai giá)
    const codAmount = Number(orderData.codAmount || 0);
    const goodsValue = Number(orderData.goodsValue || 0);

    if (codAmount > 10000000) {
      riskFlags.push('HIGH_COD_VALUE');
      reasons.push(`Tiền thu hộ COD (${codAmount.toLocaleString('vi-VN')} đ) vượt ngưỡng 10.000.000 đ`);
    }

    if (goodsValue > 20000000) {
      riskFlags.push('HIGH_DECLARED_VALUE');
      reasons.push(`Giá trị khai giá hàng hóa (${goodsValue.toLocaleString('vi-VN')} đ) vượt ngưỡng 20.000.000 đ`);
    }

    // 3. Quá tải phương tiện xe máy (Trọng lượng & Kích thước)
    const actualWeight = Number(orderData.actualWeight || 0);
    const volumetricWeight = Number(orderData.volumetricWeight || 0);
    const length = Number(orderData.dimensions?.length || 0);
    const width = Number(orderData.dimensions?.width || 0);
    const height = Number(orderData.dimensions?.height || 0);
    const maxDimension = Math.max(length, width, height);

    if (actualWeight > 20) {
      riskFlags.push('OVERWEIGHT_MOTORCYCLE');
      reasons.push(`Khối lượng thực tế (${actualWeight} kg) vượt ngưỡng tải xe máy (20 kg)`);
    }

    if (volumetricWeight > 25) {
      riskFlags.push('OVERSIZED_VOLUMETRIC');
      reasons.push(`Khối lượng quy đổi thể tích (${volumetricWeight} kg) vượt ngưỡng (25 kg)`);
    }

    if (maxDimension > 80) {
      riskFlags.push('OVERSIZED_DIMENSION');
      reasons.push(`Kích thước cạnh lớn nhất (${maxDimension} cm) vượt chuẩn thùng xe (80 cm)`);
    }

    // 4. Kiểm tra Tần suất tạo đơn (Velocity Check - 60 phút gần nhất)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOrdersCount = await Order.countDocuments({
      sellerId,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentOrdersCount >= 50) {
      riskFlags.push('HIGH_ORDER_VELOCITY');
      reasons.push(`Seller tạo ${recentOrdersCount} đơn trong 60 phút gần nhất (vượt ngưỡng 50 đơn/giờ)`);
    }

    // Kết luận: Nếu có bất kỳ rủi ro nào -> PENDING_VERIFICATION; Nếu không -> READY_TO_PICK
    const autoApproved = riskFlags.length === 0;

    return {
      autoApproved,
      status: autoApproved ? 'READY_TO_PICK' : 'PENDING_VERIFICATION',
      riskFlags,
      reason: autoApproved ? null : reasons.join('; '),
    };
  }

  /**
   * Kiểm tra sai lệch sau khi đã Auto-Pass (Khi Shipper đến lấy hoặc Bưu cục cân lại)
   * @param {Object} order Đơn hàng trong DB
   * @param {Object} measuredData Dữ liệu thực đo { measuredWeight, measuredMaxDimension, actualCod }
   * @returns {{isSuspended: boolean, newStatus: string|null, reason: string|null}}
   */
  checkPostApprovalDeviation(order, measuredData) {
    const reasons = [];

    // 1. Kiểm tra cân nặng thực đo
    if (measuredData.measuredWeight) {
      const weightDiff = measuredData.measuredWeight - order.actualWeight;
      const percentDiff = (weightDiff / order.actualWeight) * 100;

      if (measuredData.measuredWeight > 20) {
        reasons.push(`Khối lượng thực đo (${measuredData.measuredWeight}kg) vượt ngưỡng xe máy`);
      } else if (percentDiff > 15) {
        reasons.push(`Khối lượng thực tế sai lệch +${percentDiff.toFixed(1)}% so với khai báo`);
      }
    }

    // 2. Kiểm tra kích thước
    if (measuredData.measuredMaxDimension && measuredData.measuredMaxDimension > 80) {
      reasons.push(`Kích thước thực tế (${measuredData.measuredMaxDimension}cm) vượt chuẩn xe máy`);
    }

    // 3. Kiểm tra COD thực tế
    if (measuredData.actualCod && measuredData.actualCod !== order.codAmount) {
      reasons.push(`COD thực tế (${measuredData.actualCod}) sai lệch so với khai báo (${order.codAmount})`);
    }

    if (reasons.length > 0) {
      return {
        isSuspended: true,
        newStatus: 'SUSPENDED_RISK_REVIEW',
        reason: reasons.join('; '),
      };
    }

    return {
      isSuspended: false,
      newStatus: null,
      reason: null,
    };
  }
}

module.exports = new AutoApprovalService();
