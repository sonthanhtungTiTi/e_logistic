const mongoose = require('mongoose');
const Ticket = require('../models/ticket.model');
const TicketMessage = require('../models/ticketMessage.model');
const TicketAuditLog = require('../models/ticketAuditLog.model');
const Order = require('../models/order.model');
const User = require('../models/user.model');
require('../models/hub.model'); // Ensure Hub model is registered for populate
const OrderTrackingLog = require('../models/orderTrackingLog.model');
const CustodyTransferLog = require('../models/custodyTransferLog.model');
const { maskPhone, maskAddress, maskName } = require('../utils/piiMask');
const { computeIsVip } = require('../services/ticketPriority.service');
const { getRedisClient } = require('../config/redis.config');
const AppError = require('../utils/AppError');
const { REFUND_LIMITS } = require('../constants/compensation');

function formatOrderAddress(addrObj) {
  if (!addrObj) return '';
  if (typeof addrObj === 'string') return addrObj;
  const parts = [addrObj.address, addrObj.ward, addrObj.district, addrObj.province].filter(Boolean);
  return parts.join(', ');
}

/**
 * GET /api/admin/tickets/:id/context
 * Aggregates complete 360-degree context for CS Workspace in parallel
 */
async function getTicketContext(req, res, next) {
  try {
    const { id } = req.params;
    const actor = req.user;

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const ticketQuery = isMongoId ? { _id: id } : { ticketCode: id.toUpperCase() };

    const ticket = await Ticket.findOne(ticketQuery)
      .populate('assigneeId', 'fullName email csLevel')
      .populate('sellerId', 'fullName companyName email phoneNumber phone kycStatus')
      .populate('requesterId', 'fullName companyName email phoneNumber phone kycStatus');

    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket');
    }

    const requester = ticket.requesterId || ticket.sellerId;
    const requesterId = requester?._id || ticket.sellerId?._id || ticket.sellerId;
    const orderId = ticket.orderId;
    const trackingCode = ticket.trackingCode || ticket.orderTrackingCode;

    const redisClient = getRedisClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Parallel execution for optimal latency (Promise.all)
    const [
      messages,
      rawOrder,
      orderTimeline,
      custodyLog,
      totalOrders30d,
      isVip,
      relatedTickets,
    ] = await Promise.all([
      // 1. Messages query
      TicketMessage.find({ ticketId: ticket._id }).sort({ seq: 1 }).limit(50),

      // 2. Order query
      orderId
        ? Order.findById(orderId).populate('currentHubId originHubId destinationHubId', 'name hubCode address')
        : trackingCode
        ? Order.findOne({ trackingCode }).populate('currentHubId originHubId destinationHubId', 'name hubCode address')
        : Promise.resolve(null),

      // 3. Order Timeline
      orderId || trackingCode
        ? OrderTrackingLog.find({
            $or: [{ orderId }, { trackingCode }],
          })
            .sort({ timestamp: 1, createdAt: 1 })
            .limit(20)
            .catch(() => [])
        : Promise.resolve([]),

      // 4. Custody Transfer Log
      orderId || trackingCode
        ? CustodyTransferLog.find({
            $or: [{ orderId }, { trackingCode }],
          })
            .sort({ timestamp: -1, createdAt: -1 })
            .limit(10)
            .catch(() => [])
        : Promise.resolve([]),

      // 5. Total Orders in 30 days
      requesterId
        ? Order.countDocuments({ sellerId: requesterId, createdAt: { $gte: thirtyDaysAgo } }).catch(() => 0)
        : Promise.resolve(0),

      // 6. VIP Status
      requesterId ? computeIsVip(requesterId, redisClient, Order).catch(() => false) : Promise.resolve(false),

      // 7. Related Tickets
      requesterId
        ? Ticket.find({
            $or: [{ requesterId }, { sellerId: requesterId }],
            _id: { $ne: ticket._id },
          })
            .select('ticketCode status priority category subject createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    // Filter INTERNAL messages for non-staff
    const isStaff = ['CS', 'CUSTOMER_SERVICE', 'ADMIN', 'ACCOUNTANT', 'ORDER_VENDOR_MANAGER', 'OPERATIONS'].includes(
      actor.role
    );
    const visibleMessages = isStaff
      ? messages
      : messages.filter((m) => m.visibility === 'PUBLIC');

    // Mask Order PII
    let maskedOrder = null;
    let proofs = [];

    if (rawOrder) {
      const receiverRawName = rawOrder.deliveryAddress?.fullName || rawOrder.receiver?.name || rawOrder.recipientName || '';
      const receiverRawPhone = rawOrder.deliveryAddress?.phone || rawOrder.receiver?.phone || rawOrder.recipientPhone || '';
      const receiverRawAddr = formatOrderAddress(rawOrder.deliveryAddress) || formatOrderAddress(rawOrder.receiver) || rawOrder.recipientAddress || '';

      maskedOrder = {
        _id: rawOrder._id,
        trackingCode: rawOrder.trackingCode,
        status: rawOrder.status,
        currentHub: rawOrder.currentHubId
          ? {
              _id: rawOrder.currentHubId._id,
              name: rawOrder.currentHubId.name,
              hubCode: rawOrder.currentHubId.hubCode,
            }
          : rawOrder.destinationHubId
          ? {
              _id: rawOrder.destinationHubId._id,
              name: rawOrder.destinationHubId.name,
              hubCode: rawOrder.destinationHubId.hubCode,
            }
          : null,
        codAmount: Number(rawOrder.codAmount || rawOrder.cod || 0),
        declaredValue: Number(rawOrder.declaredValue || 0),
        shippingFee: Number(rawOrder.shippingFee || 0),
        weightKg: Number(rawOrder.chargeableWeight || rawOrder.actualWeight || rawOrder.weight || 0),
        receiverName: maskName(receiverRawName),
        receiverPhone: maskPhone(receiverRawPhone),
        receiverAddress: maskAddress(receiverRawAddr),
        createdAt: rawOrder.createdAt,
      };

      if (rawOrder.podImageUrl) {
        proofs.push({ type: 'POD', url: rawOrder.podImageUrl, label: 'Ảnh giao hàng POD' });
      }
      if (rawOrder.deliveryProof) {
        proofs.push({ type: 'POD', url: rawOrder.deliveryProof, label: 'Bằng chứng giao hàng' });
      }
    }

    // Attachments from ticket
    if (Array.isArray(ticket.attachments)) {
      ticket.attachments.forEach((att) => {
        proofs.push({
          type: 'TICKET_ATTACHMENT',
          url: att.url,
          mime: att.mime,
          label: 'Đính kèm khiếu nại',
        });
      });
    }

    // Requester profile with masked PII
    const requesterRawPhone = requester?.phone || requester?.phoneNumber || '';
    const requesterProfile = {
      _id: requesterId,
      name: requester?.companyName || requester?.fullName || 'Khách hàng',
      phoneMasked: maskPhone(requesterRawPhone),
      email: requester?.email || '',
      totalOrders30d,
      isVip,
      kycStatus: requester?.kycStatus || 'UNVERIFIED',
    };

    // Calculate Permissions based on role & csLevel
    const userCsLevel = actor.csLevel || (actor.role === 'ADMIN' ? 'ADMIN' : 'L1');
    const isAssignee = ticket.assigneeId && (ticket.assigneeId._id?.toString() === actor._id.toString() || ticket.assigneeId.toString() === actor._id.toString());
    const isAdmin = actor.role === 'ADMIN';

    const permissions = {
      canClaim: !ticket.assigneeId && ['NEW', 'OPEN'].includes(ticket.status),
      canResolve: Boolean(isAssignee || isAdmin),
      canProposeRefund: ['CS', 'CUSTOMER_SERVICE', 'ADMIN'].includes(actor.role),
      maxRefundAmount: REFUND_LIMITS[userCsLevel] !== undefined ? REFUND_LIMITS[userCsLevel] : REFUND_LIMITS.L1,
      canRevealPii: ['CS', 'CUSTOMER_SERVICE', 'ADMIN'].includes(actor.role),
      canEscalate: ['CS', 'CUSTOMER_SERVICE', 'ADMIN'].includes(actor.role) && (isAdmin || ['L2', 'LEAD'].includes(userCsLevel)),
    };

    // SLA Countdown
    let remainingMs = null;
    let breached = false;
    if (ticket.sla?.resolutionDueAt) {
      remainingMs = new Date(ticket.sla.resolutionDueAt).getTime() - Date.now();
      breached = ticket.sla.breachedResolution || remainingMs <= 0;
    }

    return res.json({
      success: true,
      data: {
        ticket: {
          _id: ticket._id,
          ticketCode: ticket.ticketCode,
          category: ticket.category,
          subCategory: ticket.subCategory,
          priority: ticket.priority,
          status: ticket.status,
          subject: ticket.subject,
          assignee: ticket.assigneeId,
          lastActivityAt: ticket.lastActivityAt,
          sla: ticket.sla,
          remainingMs,
          breached,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        },
        messages: visibleMessages,
        order: maskedOrder,
        orderTimeline,
        custodyLog,
        proofs,
        requesterProfile,
        relatedTickets,
        permissions,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/tickets/:id/reveal-pii
 * Reveals unmasked recipient PII and logs audit event
 */
async function revealTicketPii(req, res, next) {
  try {
    const { id } = req.params;
    const actor = req.user;

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const ticketQuery = isMongoId ? { _id: id } : { ticketCode: id.toUpperCase() };

    const ticket = await Ticket.findOne(ticketQuery);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket');
    }

    let rawPhone = '';
    let rawName = '';
    let rawAddress = '';

    const order = ticket.orderId
      ? await Order.findById(ticket.orderId)
      : ticket.trackingCode
      ? await Order.findOne({ trackingCode: ticket.trackingCode })
      : null;

    if (order) {
      rawPhone = order.deliveryAddress?.phone || order.receiver?.phone || order.recipientPhone || '';
      rawName = order.deliveryAddress?.fullName || order.receiver?.name || order.recipientName || '';
      rawAddress = formatOrderAddress(order.deliveryAddress) || formatOrderAddress(order.receiver) || order.recipientAddress || '';
    } else {
      const requester = await User.findById(ticket.sellerId);
      if (requester) {
        rawPhone = requester.phone || requester.phoneNumber || '';
        rawName = requester.companyName || requester.fullName || '';
        rawAddress = requester.address || '';
      }
    }

    // Write audit log
    await TicketAuditLog.create({
      ticketId: ticket._id,
      actorId: actor._id,
      actorRole: actor.role,
      action: 'VIEW_PII',
      ip: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      details: {
        trackingCode: ticket.trackingCode,
        accessedFields: ['phone', 'name', 'address'],
      },
    });

    return res.json({
      success: true,
      data: {
        phone: rawPhone,
        name: rawName,
        address: rawAddress,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTicketContext,
  revealTicketPii,
  REFUND_LIMITS,
};
