const Order = require('../models/order.model');
const User = require('../models/user.model');
const Geozone = require('../models/geozone.model');
const ioSingleton = require('../lib/ioSingleton');

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

    // 2. Lọc ứng viên theo Hard Constraints và đúng Vai Trò (PICKUP_SHIPPER vs DELIVERY_SHIPPER)
    const targetRoles = taskType === 'PICKUP'
      ? ['PICKUP_SHIPPER', 'LOCAL_SHIPPER', 'SHIPPER']
      : ['DELIVERY_SHIPPER', 'LOCAL_SHIPPER', 'SHIPPER'];

    const query = {
      role: { $in: targetRoles },
      isWorking: true,
      activeGeozoneId: { $in: allowedGeozoneIds },
      _id: { $nin: excludedShipperIds },
    };

    const workingShippers = await User.find(query);

    // Lọc tiếp theo Quota (Toàn Ca) và Sức Chứa (Từng Chuyến / Tải Trọng)
    const orderWeight = Number(order.actualWeight || 1);
    const candidateShippers = workingShippers.filter((s) => {
      const maxPickup = s.pickupQuota?.max || (s.role === 'PICKUP_SHIPPER' ? 80 : 25);
      const currentPickup = s.pickupQuota?.current || 0;
      const maxDelivery = s.deliveryQuota?.max || (s.role === 'DELIVERY_SHIPPER' ? 40 : 35);
      const currentDelivery = s.deliveryQuota?.current || 0;
      const maxWeight = s.maxWeightCapacityKg || (s.role === 'PICKUP_SHIPPER' ? 55 : 45);
      const currentWeight = s.currentWeightKg || 0;

      // a. Kiểm tra Quota toàn ca (Shift Quota)
      if (taskType === 'PICKUP' && currentPickup >= maxPickup) return false;
      if (taskType === 'DELIVERY' && currentDelivery >= maxDelivery) return false;

      // b. Kiểm tra Tải trọng tức thời phương tiện
      if (currentWeight + orderWeight > maxWeight) return false;

      // c. Kiểm tra Sức chứa theo từng chuyến xe máy (Trip Capacity Batch Limit)
      if (s.tripCapacity && s.tripCapacity.maxParcels) {
        const curTripParcels = s.tripCapacity.currentParcels || 0;
        if (curTripParcels >= s.tripCapacity.maxParcels) return false;
        const curTripWeight = s.tripCapacity.currentWeightKg !== undefined ? s.tripCapacity.currentWeightKg : currentWeight;
        if (curTripWeight + orderWeight > (s.tripCapacity.maxWeightKg || maxWeight)) return false;
      }

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

    // 4. Chấm điểm ứng viên (Scoring Engine) & Tính điểm ưu tiên đơn tồn / dồn ca (Aging Priority Boost)
    const agingBonus = this.calculateAgingBonus(order);

    const scoredShippers = candidateShippers.map((shipper) => {
      const isNeighbor = shipper.activeGeozoneId.toString() !== targetGeozoneId.toString();

      // a. Capacity Score (45%)
      const maxQ = taskType === 'PICKUP'
        ? (shipper.pickupQuota?.max || (shipper.role === 'PICKUP_SHIPPER' ? 80 : 25))
        : (shipper.deliveryQuota?.max || (shipper.role === 'DELIVERY_SHIPPER' ? 40 : 35));
      const curQ = taskType === 'PICKUP' ? (shipper.pickupQuota?.current || 0) : (shipper.deliveryQuota?.current || 0);
      const capacityScore = Math.max(0, (1 - curQ / maxQ) * 100);

      // b. Proximity Score (40%)
      const proximityPenalty = isNeighbor ? 25 : 0;
      const estimatedDistanceKm = 1.5; // Giả định khoảng cách trung bình nội phường
      const proximityScore = Math.max(0, 100 - estimatedDistanceKm * 15 - proximityPenalty);

      // c. Reliability / Acceptance Rate Score (15%)
      const acceptanceRateScore = shipper.acceptanceRate || 100;

      // Tổng điểm: Trọng số nội tại Shipper + Thưởng ưu tiên Aging Boost của Đơn hàng
      const baseScore = 0.45 * capacityScore + 0.4 * proximityScore + 0.15 * acceptanceRateScore;
      const totalScore = baseScore + agingBonus;

      return {
        shipper,
        capacityScore,
        proximityScore,
        acceptanceRateScore,
        baseScore,
        agingBonus,
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
      baseScore: bestCandidate.baseScore,
      agingBonus,
      candidateCount: scoredShippers.length,
      isNeighbor: bestCandidate.isNeighbor,
    };
  }

  /**
   * Tính điểm ưu tiên đơn tồn / dồn ca cho một đơn hàng (Aging Priority Boost)
   * - +40 điểm: Đơn tồn CRITICAL hoặc nằm kho >= 24h
   * - +25 điểm: Đơn tồn HIGH, đơn chuyển ca isRolloverOrder, nằm kho >= 12h, hoặc đã từng giao hụt (failureCount > 0)
   * @param {Object} order
   * @returns {number} agingBonus
   */
  calculateAgingBonus(order) {
    if (!order) return 0;
    const referenceTime = order.hubInboundAt || order.createdAt || new Date();
    const dwellMs = Date.now() - new Date(referenceTime).getTime();
    const dwellHours = dwellMs / (1000 * 60 * 60);

    if (order.agingPriority === 'CRITICAL' || dwellHours >= 24) {
      return 40;
    }
    if (
      order.agingPriority === 'HIGH' ||
      order.isRolloverOrder === true ||
      dwellHours >= 12 ||
      (order.deliveryFailureHistory && order.deliveryFailureHistory.length > 0) ||
      (order.rolloverCount && order.rolloverCount > 0)
    ) {
      return 25;
    }
    return 0;
  }

  /**
   * Sắp xếp danh sách hàng đợi đơn theo độ ưu tiên Aging & Dồn ca
   * @param {Array<Object>} orders
   * @returns {Array<Object>}
   */
  prioritizeOrdersQueue(orders) {
    return [...orders].sort((a, b) => {
      const bonusA = this.calculateAgingBonus(a);
      const bonusB = this.calculateAgingBonus(b);
      if (bonusA !== bonusB) {
        return bonusB - bonusA; // Ưu tiên điểm Aging Boost cao hơn xếp trước
      }
      return new Date(a.createdAt) - new Date(b.createdAt); // FIFO theo thời gian tạo
    });
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

  /**
   * Xử lý bù đơn tự động khi một đơn hàng bị hủy giữa chặng (VD: shipper đang gom 25 đơn thì đơn thứ 17 bị hủy)
   * 1. Giảm tải trọng (currentWeightKg) và nhả 1 slot Quota (pickupQuota.current) của Shipper.
   * 2. Quét tìm đơn chờ gom (READY_TO_PICK) phù hợp:
   *    - Vị trí tiện đường (cùng phường/quận hoặc cùng cụm tuyến với đơn bị hủy / khu vực shipper)
   *    - Tải trọng thỏa mãn (currentWeightKg + orderWeight <= maxWeightCapacityKg)
   * 3. Tự động gán đơn bù nếu tìm thấy & phát thông báo realtime.
   *
   * @param {Object} cancelledOrder Đơn hàng bị hủy
   * @param {String|ObjectId} previousShipperId ID của Shipper được gán trước đó
   * @returns {Promise<Object>}
   */
  async compensateCancelledOrder(cancelledOrder, previousShipperId) {
    const shipperId = previousShipperId || cancelledOrder.pickupShipperId || cancelledOrder.currentDriverId || cancelledOrder.currentDriver?.driverId;
    if (!shipperId) {
      return { compensated: false, reason: 'NO_ASSIGNED_SHIPPER' };
    }

    const shipper = await User.findById(shipperId);
    if (!shipper) {
      return { compensated: false, reason: 'SHIPPER_NOT_FOUND' };
    }

    const cancelledWeight = Number(cancelledOrder.actualWeight || cancelledOrder.declaredWeight || 1);

    // 1. Nhả 1 slot Quota và giảm tải trọng
    if (shipper.pickupQuota && shipper.pickupQuota.current > 0) {
      shipper.pickupQuota.current = Math.max(0, shipper.pickupQuota.current - 1);
    }
    shipper.currentWeightKg = Math.max(0, Math.round(((shipper.currentWeightKg || 0) - cancelledWeight) * 100) / 100);
    await shipper.save();

    // 1b. Cập nhật sức chứa chuyến nếu có
    if (shipper.tripCapacity) {
      shipper.tripCapacity.currentParcels = Math.max(0, (shipper.tripCapacity.currentParcels || 0) - 1);
      shipper.tripCapacity.currentWeightKg = Math.max(0, Math.round(((shipper.tripCapacity.currentWeightKg || 0) - cancelledWeight) * 100) / 100);
    }

    // 2. Thông báo realtime cho Shipper về việc đơn bị hủy
    ioSingleton.emitShipperUpdate(shipper._id, 'shipper:order_cancelled', {
      orderId: cancelledOrder._id,
      trackingCode: cancelledOrder.trackingCode,
      reason: cancelledOrder.cancelReason || 'Người mua hoặc hệ thống đã hủy đơn',
      remainingQuota: shipper.pickupQuota,
      currentWeightKg: shipper.currentWeightKg,
      tripCapacity: shipper.tripCapacity,
    });

    // 2b. Kiểm tra nếu Shipper đã tắt ca làm việc (Off-Duty) thì không tự động gán đơn bù mới
    if (shipper.isWorking === false) {
      return {
        compensated: false,
        reason: 'SHIPPER_OFF_DUTY',
        shipper: { id: shipper._id, isWorking: false, pickupQuota: shipper.pickupQuota, currentWeightKg: shipper.currentWeightKg },
      };
    }

    // 3. Quét tìm đơn bù (Replacement Order)
    const maxPickup = shipper.pickupQuota?.max || (shipper.role === 'PICKUP_SHIPPER' ? 80 : 25);
    const curPickup = shipper.pickupQuota?.current || 0;
    const maxWeight = shipper.maxWeightCapacityKg || (shipper.role === 'PICKUP_SHIPPER' ? 55 : 45);
    const curWeight = shipper.currentWeightKg || 0;

    // Nếu shipper đã đầy quota hoặc đầy tải trọng thì không bù thêm
    if (curPickup >= maxPickup || curWeight >= maxWeight) {
      return {
        compensated: false,
        reason: 'SHIPPER_CAPACITY_FULL',
        shipper: { id: shipper._id, pickupQuota: shipper.pickupQuota, currentWeightKg: shipper.currentWeightKg },
      };
    }

    // Tiêu chí tìm đơn bù:
    // a. Trạng thái READY_TO_PICK
    // b. Chưa được gán cho ai (pickupShipperId is null / undefined)
    const targetWard = cancelledOrder.pickupAddress?.ward;
    const targetDistrict = cancelledOrder.pickupAddress?.district || shipper.operatingArea?.district;
    const targetProvince = cancelledOrder.pickupAddress?.province || shipper.operatingArea?.province;

    const query = {
      _id: { $ne: cancelledOrder._id },
      status: 'READY_TO_PICK',
      pickupShipperId: { $in: [null, undefined] },
    };

    if (targetProvince) {
      const provClean = String(targetProvince).replace(/^(Tỉnh|Thành phố|TP\.?)\s+/i, '').trim();
      const provRegex = new RegExp(provClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query['pickupAddress.province'] = provRegex;
    }

    const candidateOrders = await Order.find(query).sort({ createdAt: 1 }).limit(30);

    const targetWardNorm = (targetWard || '').toLowerCase();
    const targetDistNorm = (targetDistrict || '').toLowerCase();

    // Sắp xếp thứ tự ưu tiên: Cùng Phường -> Cùng Quận -> Các đơn khác trong Tỉnh/TP
    const prioritizedCandidates = candidateOrders
      .filter((candidate) => {
        const candidateWeight = Number(candidate.actualWeight || candidate.declaredWeight || 1);
        return curWeight + candidateWeight <= maxWeight;
      })
      .sort((a, b) => {
        const aWard = (a.pickupAddress?.ward || '').toLowerCase();
        const bWard = (b.pickupAddress?.ward || '').toLowerCase();
        const aSameWard = targetWardNorm && (aWard.includes(targetWardNorm) || targetWardNorm.includes(aWard));
        const bSameWard = targetWardNorm && (bWard.includes(targetWardNorm) || targetWardNorm.includes(bWard));
        if (aSameWard && !bSameWard) return -1;
        if (!aSameWard && bSameWard) return 1;

        const aDist = (a.pickupAddress?.district || '').toLowerCase();
        const bDist = (b.pickupAddress?.district || '').toLowerCase();
        const aSameDist = targetDistNorm && (aDist.includes(targetDistNorm) || targetDistNorm.includes(bDist));
        const bSameDist = targetDistNorm && (bDist.includes(targetDistNorm) || targetDistNorm.includes(aDist));
        if (aSameDist && !bSameDist) return -1;
        if (!aSameDist && bSameDist) return 1;

        // Ưu tiên đơn tồn chuyển ca / aging cao hơn trước khi so sánh FIFO
        const aBonus = this.calculateAgingBonus(a);
        const bBonus = this.calculateAgingBonus(b);
        if (aBonus !== bBonus) return bBonus - aBonus;

        return new Date(a.createdAt) - new Date(b.createdAt);
      });

    let replacementOrder = null;

    // 4. Atomic Claim qua findOneAndUpdate: chống Race Condition khi nhiều đơn hủy đồng thời
    for (const candidate of prioritizedCandidates) {
      const candidateWeight = Number(candidate.actualWeight || candidate.declaredWeight || 1);
      if (curWeight + candidateWeight > maxWeight) continue;

      const claimed = await Order.findOneAndUpdate(
        {
          _id: candidate._id,
          status: 'READY_TO_PICK',
          pickupShipperId: { $in: [null, undefined] },
        },
        {
          $set: {
            pickupShipperId: shipper._id,
            currentDriverId: shipper._id,
          },
        },
        { returnDocument: 'after' }
      );

      if (claimed) {
        replacementOrder = claimed;
        break; // Đã claim nguyên tử thành công
      }
      // Nếu bị tranh chấp và claim trả về null, vòng lặp tự động chuyển sang ứng viên tiếp theo
    }

    if (replacementOrder) {
      const repWeight = Number(replacementOrder.actualWeight || replacementOrder.declaredWeight || 1);

      shipper.pickupQuota.current += 1;
      shipper.currentWeightKg = Math.round(((shipper.currentWeightKg || 0) + repWeight) * 100) / 100;
      if (shipper.tripCapacity) {
        shipper.tripCapacity.currentParcels = (shipper.tripCapacity.currentParcels || 0) + 1;
        shipper.tripCapacity.currentWeightKg = Math.round(((shipper.tripCapacity.currentWeightKg || 0) + repWeight) * 100) / 100;
      }
      await shipper.save();

      // Phát thông báo realtime có đơn bù mới
      ioSingleton.emitShipperUpdate(shipper._id, 'shipper:order_compensated', {
        newOrder: replacementOrder,
        replacedOrderId: cancelledOrder._id,
        replacedTrackingCode: cancelledOrder.trackingCode,
        currentQuota: shipper.pickupQuota,
        currentWeightKg: shipper.currentWeightKg,
        tripCapacity: shipper.tripCapacity,
      });
      ioSingleton.emitOrderUpdate(replacementOrder.sellerId, replacementOrder);

      return {
        compensated: true,
        replacementOrder,
        shipper: { id: shipper._id, pickupQuota: shipper.pickupQuota, currentWeightKg: shipper.currentWeightKg },
      };
    }

    return {
      compensated: false,
      reason: 'NO_COMPENSATION_ORDER_AVAILABLE',
      shipper: { id: shipper._id, pickupQuota: shipper.pickupQuota, currentWeightKg: shipper.currentWeightKg },
    };
  }
}

module.exports = new DispatchEngineService();
