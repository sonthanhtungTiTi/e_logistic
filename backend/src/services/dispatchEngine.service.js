const Order = require('../models/order.model');
const User = require('../models/user.model');
const Geozone = require('../models/geozone.model');

/**
 * Dispatch Engine: Thuật toán điều phối phân bổ đơn hàng cho Shipper
 */
class DispatchEngineService {
  /**
   * Tìm Shipper tối ưu nhất cho lệnh Lấy hoặc Giao
   * @param {Object} order Đơn hàng
   * @param {'PICKUP'|'DELIVERY'} taskType Loại lệnh
   * @param {Boolean} isSpilloverActive Có mở rộng vùng lân cận không
   * @param {Array<String>} excludedShipperIds Danh sách Shipper bị loại trừ (đã từ chối trước đó)
   * @returns {Promise<{success: boolean, shipper?: Object, score?: number, shouldEscalate?: boolean, reason?: string}>}
   */
  async findBestShipperForTask(order, taskType, isSpilloverActive = false, excludedShipperIds = []) {
    const targetGeozoneId = taskType === 'PICKUP' ? order.pickupGeozoneId : order.deliveryGeozoneId;

    if (!targetGeozoneId) {
      return {
        success: false,
        shouldEscalate: true,
        reason: `Đơn hàng thiếu thông tin Geozone (${taskType === 'PICKUP' ? 'pickupGeozoneId' : 'deliveryGeozoneId'})`,
      };
    }

    // 1. Xác định danh sách Geozone hợp lệ (Spillover Routing)
    let allowedGeozoneIds = [targetGeozoneId.toString()];

    if (isSpilloverActive) {
      const targetZone = await Geozone.findById(targetGeozoneId);
      if (targetZone && targetZone.neighborGeozoneIds && targetZone.neighborGeozoneIds.length > 0) {
        allowedGeozoneIds = [
          targetGeozoneId.toString(),
          ...targetZone.neighborGeozoneIds.map((id) => id.toString()),
        ];
      }
    }

    // 2. Lọc ứng viên theo Hard Constraints
    const query = {
      role: 'LOCAL_SHIPPER',
      isWorking: true,
      activeGeozoneId: { $in: allowedGeozoneIds },
      isActive: true,
      _id: { $nin: excludedShipperIds },
    };

    const workingShippers = await User.find(query);

    // Lọc tiếp theo Quota và Tải trọng
    const orderWeight = Number(order.actualWeight || 1);
    const candidateShippers = workingShippers.filter((s) => {
      const maxPickup = s.pickupQuota?.max || 25;
      const currentPickup = s.pickupQuota?.current || 0;
      const maxDelivery = s.deliveryQuota?.max || 35;
      const currentDelivery = s.deliveryQuota?.current || 0;
      const maxWeight = s.maxWeightCapacityKg || 45;
      const currentWeight = s.currentWeightKg || 0;

      // Check Quota
      if (taskType === 'PICKUP' && currentPickup >= maxPickup) return false;
      if (taskType === 'DELIVERY' && currentDelivery >= maxDelivery) return false;

      // Check Tải trọng
      if (currentWeight + orderWeight > maxWeight) return false;

      return true;
    });

    // 3. Nếu cạn kiệt Shipper ứng viên -> Escalate ngay lập tức
    if (candidateShippers.length === 0) {
      return {
        success: false,
        shouldEscalate: true,
        reason: 'NO_AVAILABLE_SHIPPER',
        candidateCount: 0,
      };
    }

    // 4. Chấm điểm ứng viên (Scoring Engine)
    const scoredShippers = candidateShippers.map((shipper) => {
      const isNeighbor = shipper.activeGeozoneId.toString() !== targetGeozoneId.toString();

      // a. Capacity Score (45%)
      const maxQ = taskType === 'PICKUP' ? (shipper.pickupQuota?.max || 25) : (shipper.deliveryQuota?.max || 35);
      const curQ = taskType === 'PICKUP' ? (shipper.pickupQuota?.current || 0) : (shipper.deliveryQuota?.current || 0);
      const capacityScore = Math.max(0, (1 - curQ / maxQ) * 100);

      // b. Proximity Score (40%)
      const proximityPenalty = isNeighbor ? 25 : 0;
      const estimatedDistanceKm = 1.5; // Giả định khoảng cách trung bình nội phường
      const proximityScore = Math.max(0, 100 - estimatedDistanceKm * 15 - proximityPenalty);

      // c. Reliability / Acceptance Rate Score (15%)
      const acceptanceRateScore = shipper.acceptanceRate || 100;

      // Tổng điểm
      const totalScore = 0.45 * capacityScore + 0.4 * proximityScore + 0.15 * acceptanceRateScore;

      return {
        shipper,
        capacityScore,
        proximityScore,
        acceptanceRateScore,
        totalScore,
        isNeighbor,
      };
    });

    // Sắp xếp giảm dần theo tổng điểm
    scoredShippers.sort((a, b) => b.totalScore - a.totalScore);
    const bestCandidate = scoredShippers[0];

    return {
      success: true,
      shipper: bestCandidate.shipper,
      score: bestCandidate.totalScore,
      candidateCount: scoredShippers.length,
      isNeighbor: bestCandidate.isNeighbor,
    };
  }

  /**
   * Xử lý khi Shipper từ chối hoặc quá hạn 60s
   * @param {String} orderId ID đơn hàng
   * @param {String} shipperId ID Shipper từ chối
   * @param {'PICKUP'|'DELIVERY'} taskType
   * @returns {Promise<Object>}
   */
  async handleShipperRejection(orderId, shipperId, taskType) {
    const order = await Order.findById(orderId);
    const shipper = await User.findById(shipperId);

    if (!order) throw new Error('Không tìm thấy đơn hàng');

    // Phạt điểm Shipper từ chối
    if (shipper) {
      shipper.dispatchRejectionCount = (shipper.dispatchRejectionCount || 0) + 1;
      const totalDecisions = (shipper.pickupQuota?.current || 0) + (shipper.deliveryQuota?.current || 0) + shipper.dispatchRejectionCount;
      if (totalDecisions > 0) {
        shipper.acceptanceRate = Math.max(10, Math.round(((totalDecisions - shipper.dispatchRejectionCount) / totalDecisions) * 100));
      }
      await shipper.save();
    }

    order.dispatchRetryCount = (order.dispatchRetryCount || 0) + 1;

    // Ngưỡng ngắt vòng lặp: retry >= 3 -> Escalate lên Dispatcher
    if (order.dispatchRetryCount >= 3) {
      order.status = 'DISPATCH_ESCALATED';
      order.riskViolationReason = `Đã thử gán 3 lần nhưng không có Shipper nào nhận lệnh ${taskType}`;
      await order.save();

      return {
        escalated: true,
        orderStatus: order.status,
        retryCount: order.dispatchRetryCount,
        reason: 'MAX_RETRIES_EXCEEDED',
      };
    }

    await order.save();

    // Thử tìm Shipper kế tiếp loại trừ shipper vừa từ chối
    const nextAssignment = await this.findBestShipperForTask(order, taskType, true, [shipperId]);

    if (!nextAssignment.success) {
      order.status = 'DISPATCH_ESCALATED';
      order.riskViolationReason = `Cạn kiệt Shipper ứng viên trong khu vực cho lệnh ${taskType}`;
      await order.save();

      return {
        escalated: true,
        orderStatus: order.status,
        retryCount: order.dispatchRetryCount,
        reason: 'NO_AVAILABLE_SHIPPER',
      };
    }

    // Gán cho Shipper mới
    if (taskType === 'PICKUP') {
      order.pickupShipperId = nextAssignment.shipper._id;
    } else {
      order.deliveryShipperId = nextAssignment.shipper._id;
    }
    await order.save();

    return {
      escalated: false,
      newShipperId: nextAssignment.shipper._id,
      retryCount: order.dispatchRetryCount,
    };
  }
}

module.exports = new DispatchEngineService();
