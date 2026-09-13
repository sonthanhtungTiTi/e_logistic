const mongoose = require('mongoose');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const Geozone = require('../models/geozone.model');
const dispatchEngine = require('../services/dispatchEngine.service');
const ioSingleton = require('../lib/ioSingleton');

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
      const { geozoneId, role } = req.query;
      const query = { role: { $in: ['LOCAL_SHIPPER', 'PICKUP_SHIPPER', 'DELIVERY_SHIPPER', 'SHIPPER'] } };
      if (role) query.role = role;
      if (geozoneId) query.activeGeozoneId = geozoneId;

      const shippers = await User.find(query)
        .populate('activeGeozoneId', 'name code ward district')
        .populate('hubId', 'name code')
        .select('-password');

      const data = shippers.map((s) => {
        const pMax = s.pickupQuota?.max || (s.role === 'PICKUP_SHIPPER' ? 80 : 25);
        const pCur = s.pickupQuota?.current || 0;
        const dMax = s.deliveryQuota?.max || (s.role === 'DELIVERY_SHIPPER' ? 40 : 35);
        const dCur = s.deliveryQuota?.current || 0;

        const pickupLoadPercent = Math.round((pCur / pMax) * 100);
        const deliveryLoadPercent = Math.round((dCur / dMax) * 100);

        return {
          id: s._id,
          fullName: s.fullName,
          phoneNumber: s.phoneNumber,
          role: s.role,
          vehicleInfo: s.vehicleInfo,
          isWorking: s.isWorking,
          activeGeozone: s.activeGeozoneId,
          hub: s.hubId,
          pickupQuota: { max: pMax, current: pCur, percent: pickupLoadPercent },
          deliveryQuota: { max: dMax, current: dCur, percent: deliveryLoadPercent },
          tripCapacity: s.tripCapacity || {
            maxParcels: s.role === 'PICKUP_SHIPPER' ? 40 : 25,
            currentParcels: 0,
            maxWeightKg: s.maxWeightCapacityKg || 45,
            currentWeightKg: s.currentWeightKg || 0,
          },
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

      const orderWeight = Number(order.actualWeight || 1);

      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const shipperSuffix = String(shipper?._id || '0000').slice(-4).toUpperCase();

      if (taskType === 'PICKUP') {
        order.pickupShipperId = shipper._id;
        order.currentDriverId = shipper._id;
        order.status = 'READY_TO_PICK';
        order.pickupTripId = order.pickupTripId || `PKT-${todayStr}-${shipperSuffix}`;
        order.dispatchRetryCount = 0;
        const defaultMax = shipper.role === 'PICKUP_SHIPPER' ? 80 : 25;
        shipper.pickupQuota = shipper.pickupQuota || { max: defaultMax, current: 0 };
        shipper.pickupQuota.current += 1;
      } else {
        order.deliveryShipperId = shipper._id;
        order.currentDriverId = shipper._id;
        order.status = 'OUT_FOR_DELIVERY';
        order.deliveryTripId = order.deliveryTripId || `DLV-${todayStr}-${shipperSuffix}`;
        order.dispatchRetryCount = 0;
        const defaultMax = shipper.role === 'DELIVERY_SHIPPER' ? 40 : 35;
        shipper.deliveryQuota = shipper.deliveryQuota || { max: defaultMax, current: 0 };
        shipper.deliveryQuota.current += 1;
      }

      shipper.tripCapacity = shipper.tripCapacity || {
        maxParcels: shipper.role === 'PICKUP_SHIPPER' ? 40 : 25,
        currentParcels: 0,
        maxWeightKg: shipper.maxWeightCapacityKg || 45,
        currentWeightKg: 0,
      };
      shipper.tripCapacity.currentParcels += 1;
      shipper.tripCapacity.currentWeightKg = Math.round(((shipper.tripCapacity.currentWeightKg || 0) + orderWeight) * 100) / 100;
      shipper.currentWeightKg = Math.round(((shipper.currentWeightKg || 0) + orderWeight) * 100) / 100;

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
      const matchedShipper = await User.findById(result.shipper._id);
      const orderWeight = Number(order.actualWeight || 1);

      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const shipperSuffix = String(matchedShipper?._id || '0000').slice(-4).toUpperCase();

      if (taskType === 'PICKUP') {
        order.pickupShipperId = matchedShipper._id;
        order.currentDriverId = matchedShipper._id;
        order.status = 'READY_TO_PICK';
        order.pickupTripId = order.pickupTripId || `PKT-${todayStr}-${shipperSuffix}`;
        const defaultMax = matchedShipper.role === 'PICKUP_SHIPPER' ? 80 : 25;
        matchedShipper.pickupQuota = matchedShipper.pickupQuota || { max: defaultMax, current: 0 };
        matchedShipper.pickupQuota.current += 1;
      } else {
        order.deliveryShipperId = matchedShipper._id;
        order.currentDriverId = matchedShipper._id;
        order.status = 'OUT_FOR_DELIVERY';
        order.deliveryTripId = order.deliveryTripId || `DLV-${todayStr}-${shipperSuffix}`;
        const defaultMax = matchedShipper.role === 'DELIVERY_SHIPPER' ? 40 : 35;
        matchedShipper.deliveryQuota = matchedShipper.deliveryQuota || { max: defaultMax, current: 0 };
        matchedShipper.deliveryQuota.current += 1;
      }

      matchedShipper.tripCapacity = matchedShipper.tripCapacity || {
        maxParcels: matchedShipper.role === 'PICKUP_SHIPPER' ? 40 : 25,
        currentParcels: 0,
        maxWeightKg: matchedShipper.maxWeightCapacityKg || 45,
        currentWeightKg: 0,
      };
      matchedShipper.tripCapacity.currentParcels += 1;
      matchedShipper.tripCapacity.currentWeightKg = Math.round(((matchedShipper.tripCapacity.currentWeightKg || 0) + orderWeight) * 100) / 100;
      matchedShipper.currentWeightKg = Math.round(((matchedShipper.currentWeightKg || 0) + orderWeight) * 100) / 100;
      await matchedShipper.save();
      await order.save();

      // Phát thông báo realtime
      ioSingleton.emitShipperUpdate(matchedShipper._id, 'shipper:task_assigned', {
        orderId: order._id,
        trackingCode: order.trackingCode,
        taskType: taskType || 'PICKUP',
        pickupQuota: matchedShipper.pickupQuota,
        deliveryQuota: matchedShipper.deliveryQuota,
        tripCapacity: matchedShipper.tripCapacity,
        currentWeightKg: matchedShipper.currentWeightKg,
      });
      ioSingleton.emitOrderUpdate(order.sellerId, order);

      return res.status(200).json({
        success: true,
        message: `Đã điều phối đơn [${order.trackingCode}] cho Shipper [${matchedShipper.fullName}] (Điểm: ${result.score.toFixed(1)})`,
        data: {
          orderId: order._id,
          assignedShipper: matchedShipper,
          score: result.score,
          isNeighbor: result.isNeighbor,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Thiết lập hạn mức Quota cao điểm / Mega Sale (Surge Quota: 25 -> 35 -> 40 -> 80 -> 120 đơn)
   * PATCH /api/dispatch/local/surge-quota
   */
  async updateSurgeQuota(req, res, next) {
    try {
      const {
        maxPickupQuota,
        maxDeliveryQuota,
        maxWeightCapacityKg,
        targetRole,
        geozoneId,
        province,
        shipperIds,
        reason,
      } = req.body;

      if (maxPickupQuota === undefined || typeof maxPickupQuota !== 'number' || maxPickupQuota < 10 || maxPickupQuota > 200) {
        return res.status(400).json({
          success: false,
          message: 'Hạn mức lấy hàng (maxPickupQuota) không hợp lệ (phải là số từ 10 đến 200 đơn)',
        });
      }

      if (maxDeliveryQuota !== undefined && (typeof maxDeliveryQuota !== 'number' || maxDeliveryQuota < 10 || maxDeliveryQuota > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Hạn mức giao hàng (maxDeliveryQuota) không hợp lệ (phải là số từ 10 đến 100 đơn)',
        });
      }

      const filter = {};
      if (targetRole) {
        filter.role = targetRole;
      } else {
        filter.role = { $in: ['LOCAL_SHIPPER', 'PICKUP_SHIPPER', 'DELIVERY_SHIPPER', 'SHIPPER', 'DRIVER'] };
      }

      if (Array.isArray(shipperIds) && shipperIds.length > 0) {
        const invalidId = shipperIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
        if (invalidId) {
          return res.status(400).json({
            success: false,
            message: `shipperId không đúng định dạng ObjectId hợp lệ: ${invalidId}`,
          });
        }
        filter._id = { $in: shipperIds };
      } else if (geozoneId) {
        if (!mongoose.Types.ObjectId.isValid(geozoneId)) {
          return res.status(400).json({
            success: false,
            message: 'geozoneId không đúng định dạng ObjectId hợp lệ',
          });
        }
        filter.activeGeozoneId = geozoneId;
      } else if (province) {
        const provClean = String(province).replace(/^(Tỉnh|Thành phố|TP\.?)\s+/i, '').trim();
        const provRegex = new RegExp(provClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter['operatingArea.province'] = provRegex;
      }

      const updateFields = {
        'pickupQuota.max': maxPickupQuota,
      };

      if (maxDeliveryQuota && typeof maxDeliveryQuota === 'number') {
        updateFields['deliveryQuota.max'] = maxDeliveryQuota;
      }

      if (maxWeightCapacityKg && typeof maxWeightCapacityKg === 'number') {
        updateFields.maxWeightCapacityKg = maxWeightCapacityKg;
      } else {
        // Tự động điều chỉnh tỷ lệ tải trọng tương ứng theo Quota nếu không chỉ định rõ:
        // >= 120 đơn -> 75kg, >= 80 đơn -> 65kg, >= 40 đơn -> 55kg, <= 25 đơn -> 45kg tiêu chuẩn
        if (maxPickupQuota >= 120) {
          updateFields.maxWeightCapacityKg = 75;
        } else if (maxPickupQuota >= 80) {
          updateFields.maxWeightCapacityKg = 65;
        } else if (maxPickupQuota >= 40) {
          updateFields.maxWeightCapacityKg = 55;
        } else if (maxPickupQuota <= 25) {
          updateFields.maxWeightCapacityKg = 45;
        }
      }

      const result = await User.updateMany(filter, { $set: updateFields });

      // Phát thông báo realtime cho các shipper được cập nhật
      const updatedShippers = await User.find(filter).select('_id pickupQuota deliveryQuota maxWeightCapacityKg');
      updatedShippers.forEach((s) => {
        ioSingleton.emitShipperUpdate(s._id, 'shipper:quota_updated', {
          pickupQuota: s.pickupQuota,
          deliveryQuota: s.deliveryQuota,
          maxWeightCapacityKg: s.maxWeightCapacityKg,
          reason: reason || 'Điều chỉnh Quota Cao Điểm',
        });
      });

      return res.status(200).json({
        success: true,
        message: `Đã cập nhật Quota Cao Điểm (${maxPickupQuota} đơn) cho ${result.modifiedCount} Shipper`,
        data: {
          modifiedCount: result.modifiedCount,
          maxPickupQuota,
          maxDeliveryQuota: maxDeliveryQuota || null,
          reason: reason || 'Chiến dịch cao điểm Mega Sale',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Bàn giao ca làm việc giữa các ca hoặc cuối ngày (Shift Handover & End Shift)
   * POST /api/dispatch/local/shift-handover
   */
  async handleShiftHandover(req, res, next) {
    try {
      const isPrivileged = ['ADMIN', 'LAST_MILE_DISPATCHER', 'DISPATCHER'].includes(req.user.role);
      const targetShipperId = (isPrivileged && req.body.shipperId) ? req.body.shipperId : req.user._id;

      const shipper = await User.findById(targetShipperId);
      if (!shipper) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy Shipper' });
      }

      const { returnedParcels, note } = req.body;
      let revokedPickupCount = 0;
      let returnedDeliveryCount = 0;
      let withholdingAlert = null;

      // 1. XỬ LÝ ĐƠN GOM (PICKUP): Thu hồi các đơn READY_TO_PICK chưa kịp lấy
      const unpickedOrders = await Order.find({
        status: 'READY_TO_PICK',
        $or: [{ pickupShipperId: shipper._id }, { currentDriverId: shipper._id }],
      });

      if (unpickedOrders.length > 0) {
        revokedPickupCount = unpickedOrders.length;
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

        if (shipper.pickupQuota) {
          shipper.pickupQuota.current = Math.max(0, (shipper.pickupQuota.current || 0) - revokedPickupCount);
        }
        if (shipper.tripCapacity) {
          shipper.tripCapacity.currentParcels = Math.max(0, (shipper.tripCapacity.currentParcels || 0) - revokedPickupCount);
          shipper.tripCapacity.currentWeightKg = Math.max(0, Math.round(((shipper.tripCapacity.currentWeightKg || 0) - unpickedWeight) * 100) / 100);
        }
        shipper.currentWeightKg = Math.max(0, Math.round(((shipper.currentWeightKg || 0) - unpickedWeight) * 100) / 100);
      }

      // 2. XỬ LÝ ĐƠN GIAO (DELIVERY): Bàn giao trả hàng tồn về Hub (IN_HUB_DEST)
      const outForDeliveryOrders = await Order.find({
        status: 'OUT_FOR_DELIVERY',
        $or: [{ deliveryShipperId: shipper._id }, { currentDriverId: shipper._id }],
      });

      if (outForDeliveryOrders.length > 0) {
        let ordersToReturn = outForDeliveryOrders;
        if (Array.isArray(returnedParcels) && returnedParcels.length > 0) {
          const returnedIds = returnedParcels.map((p) => p.orderId?.toString() || p.toString());
          ordersToReturn = outForDeliveryOrders.filter((o) => returnedIds.includes(o._id.toString()));
          
          const unreturnedCount = outForDeliveryOrders.length - ordersToReturn.length;
          if (unreturnedCount > 0) {
            withholdingAlert = {
              type: 'RISK_ALERT_WITHHOLD',
              message: `Cảnh báo: Shipper còn ${unreturnedCount} đơn chưa quét trả kho Hub!`,
              unreturnedCount,
            };
          }
        }

        if (ordersToReturn.length > 0) {
          returnedDeliveryCount = ordersToReturn.length;
          const returnIds = ordersToReturn.map((o) => o._id);
          const returnedWeight = ordersToReturn.reduce((sum, o) => sum + Number(o.actualWeight || o.declaredWeight || 1), 0);

          await Order.updateMany(
            { _id: { $in: returnIds } },
            {
              $set: {
                status: 'IN_HUB_DEST',
                deliveryShipperId: null,
                currentDriverId: null,
                isRolloverOrder: true,
                rolloverReason: 'RETURNED_TO_HUB_AT_SHIFT_END',
                agingPriority: 'HIGH',
              },
              $inc: { rolloverCount: 1 },
              $push: {
                statusHistory: {
                  status: 'IN_HUB_DEST',
                  updatedBy: req.user._id,
                  note: `Bàn giao trả hàng về Hub khi kết thúc ca: ${note || 'Hết ca làm việc'}`,
                  updatedAt: new Date(),
                },
              },
            }
          );

          if (shipper.tripCapacity) {
            shipper.tripCapacity.currentParcels = Math.max(0, (shipper.tripCapacity.currentParcels || 0) - returnedDeliveryCount);
            shipper.tripCapacity.currentWeightKg = Math.max(0, Math.round(((shipper.tripCapacity.currentWeightKg || 0) - returnedWeight) * 100) / 100);
          }
          shipper.currentWeightKg = Math.max(0, Math.round(((shipper.currentWeightKg || 0) - returnedWeight) * 100) / 100);
        }

        if (!withholdingAlert) {
          if (shipper.tripCapacity) {
            shipper.tripCapacity.currentParcels = 0;
            shipper.tripCapacity.currentWeightKg = 0;
          }
          shipper.currentWeightKg = 0;
        }
      }

      // 3. Tắt ca làm việc & Ghi nhận thời gian
      shipper.isWorking = false;
      shipper.shiftEndedAt = new Date();
      await shipper.save();

      // Phát sự kiện realtime
      ioSingleton.emitShipperUpdate(shipper._id, 'shipper:shift_ended', {
        isWorking: false,
        shiftEndedAt: shipper.shiftEndedAt,
        pickupQuota: shipper.pickupQuota,
        deliveryQuota: shipper.deliveryQuota,
        tripCapacity: shipper.tripCapacity,
      });

      return res.status(200).json({
        success: true,
        message: `Bàn giao ca thành công cho Shipper [${shipper.fullName}]`,
        data: {
          shipperId: shipper._id,
          fullName: shipper.fullName,
          isWorking: false,
          shiftEndedAt: shipper.shiftEndedAt,
          revokedPickupCount,
          returnedDeliveryCount,
          withholdingAlert,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Quét dọn đơn tồn ca & qua ngày (Overnight Rollover Sweep / Midnight Reset)
   * POST /api/dispatch/local/overnight-rollover-sweep
   */
  async overnightRolloverSweep(req, res, next) {
    try {
      const { hubId, resetShipperQuotas = true } = req.body;

      // 1. Quét đơn READY_TO_PICK còn tồn dồn qua ca/ngày
      const pickupQuery = {
        status: 'READY_TO_PICK',
      };
      if (hubId) pickupQuery.sourceHubId = hubId;

      const unpickedOrders = await Order.find(pickupQuery);
      let sweptPickups = 0;

      for (const order of unpickedOrders) {
        const dwellMs = Date.now() - new Date(order.createdAt).getTime();
        const dwellHours = dwellMs / (1000 * 60 * 60);

        if (dwellHours >= 8 || order.isRolloverOrder) {
          order.isRolloverOrder = true;
          order.rolloverReason = order.rolloverReason || 'OVERNIGHT_UNPICKED';
          order.agingPriority = dwellHours >= 24 ? 'CRITICAL' : 'HIGH';
          if (order.pickupShipperId) {
            const assignedShipper = await User.findById(order.pickupShipperId);
            if (!assignedShipper || !assignedShipper.isWorking) {
              order.pickupShipperId = null;
              order.currentDriverId = null;
            }
          }
          await order.save();
          sweptPickups++;
        }
      }

      // 2. Quét đơn IN_HUB_DEST tồn đọng tại kho Hub chờ giao
      const deliveryQuery = {
        status: 'IN_HUB_DEST',
      };
      if (hubId) deliveryQuery.destinationHubId = hubId;

      const hubOrders = await Order.find(deliveryQuery);
      let sweptDeliveries = 0;

      for (const order of hubOrders) {
        const refTime = order.hubInboundAt || order.createdAt;
        const dwellMs = Date.now() - new Date(refTime).getTime();
        const dwellHours = dwellMs / (1000 * 60 * 60);

        order.isRolloverOrder = true;
        if (dwellHours >= 24) {
          order.agingPriority = 'CRITICAL';
        } else if (dwellHours >= 12 || (order.deliveryFailureHistory && order.deliveryFailureHistory.length > 0)) {
          order.agingPriority = 'HIGH';
        }
        await order.save();
        sweptDeliveries++;
      }

      // 3. Reset Quota định mức ngày mới cho Shipper
      let resetShippersCount = 0;
      if (resetShipperQuotas) {
        const shipperQuery = {
          role: { $in: ['LOCAL_SHIPPER', 'PICKUP_SHIPPER', 'DELIVERY_SHIPPER', 'SHIPPER'] },
        };
        if (hubId) shipperQuery.hubId = hubId;

        const updateResult = await User.updateMany(shipperQuery, {
          $set: {
            'pickupQuota.current': 0,
            'deliveryQuota.current': 0,
            'tripCapacity.currentParcels': 0,
            'tripCapacity.currentWeightKg': 0,
            currentWeightKg: 0,
          },
        });
        resetShippersCount = updateResult.modifiedCount;
      }

      return res.status(200).json({
        success: true,
        message: `Hoàn tất quét dọn đơn tồn ca & qua ngày: ${sweptPickups} đơn gom, ${sweptDeliveries} đơn giao, reset ${resetShippersCount} shipper.`,
        data: {
          sweptPickups,
          sweptDeliveries,
          resetShippersCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Dispatcher phê duyệt hủy đơn đối với đơn leo thang DISPATCH_ESCALATED
   * POST /api/dispatch/local/escalated-orders/:id/approve-cancel
   */
  async approveCancelEscalatedOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { note, cancelReason } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      if (order.status !== 'DISPATCH_ESCALATED') {
        return res.status(400).json({
          success: false,
          message: `Đơn hàng đang ở trạng thái "${order.status}", không phải DISPATCH_ESCALATED.`,
        });
      }

      const preStatus = order.status;
      order.status = 'CANCELLED';
      order.cancelledBy = req.user._id;
      order.cancelledAt = new Date();
      order.cancelReason = cancelReason || order.riskViolationReason || 'Dispatcher duyệt hủy đơn sau báo cáo của shipper';
      order.cancelNote = note || order.cancelNote || '';
      await order.save();

      try {
        const OrderLog = require('../models/orderLog.model');
        const OrderTrackingLog = require('../models/orderTrackingLog.model');
        await OrderLog.create({
          orderId: order._id,
          actionBy: req.user._id,
          preStatus,
          postStatus: 'CANCELLED',
          actionType: 'CANCELLED',
          trackingCode: order.trackingCode,
          note: `Dispatcher phê duyệt hủy đơn: ${order.cancelReason}`,
        });
        await OrderTrackingLog.create({
          orderId: order._id,
          trackingCode: order.trackingCode,
          eventType: 'CANCELLED',
          title: 'Đơn hàng đã bị hủy',
          description: `Đơn hàng đã được điều phối viên phê duyệt hủy: ${order.cancelReason}`,
          timestamp: new Date(),
        });
      } catch (logErr) {
        console.warn('[LocalDispatch] Log cancel error:', logErr.message);
      }

      ioSingleton.emitOrderUpdate(order.sellerId, order);

      return res.status(200).json({
        success: true,
        message: `Đã phê duyệt hủy đơn hàng [${order.trackingCode}] thành công.`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Dispatcher xử lý cho phép lấy lại / trả về hàng đợi READY_TO_PICK
   * POST /api/dispatch/local/escalated-orders/:id/retry-pickup
   */
  async retryPickupEscalatedOrder(req, res, next) {
    try {
      const { id } = req.params;
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      const preStatus = order.status;
      order.status = 'READY_TO_PICK';
      order.pickupShipperId = null;
      order.currentDriverId = null;
      order.isFlagged = false;
      order.isRolloverOrder = true;
      order.agingPriority = req.body.agingPriority || 'HIGH';
      await order.save();

      ioSingleton.emitOrderUpdate(order.sellerId, order);

      return res.status(200).json({
        success: true,
        message: `Đã chuyển đơn [${order.trackingCode}] về hàng đợi lấy lại (READY_TO_PICK)`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LocalDispatchController();
