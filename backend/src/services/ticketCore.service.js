const Ticket = require('../models/ticket.model');
const TicketMessage = require('../models/ticketMessage.model');
const Counter = require('../models/counter.model');
const AppError = require('../utils/AppError');
const { TICKET_STATUS, canTransition } = require('../constants/ticketState');

/**
 * Generate unique atomic ticket code: TK-YYYYMMDD-NNNN
 */
async function generateTicketCode() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateKey = `ticket:${yyyy}${mm}${dd}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: dateKey },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, returnDocument: 'after' }
  );

  const seqStr = String(counter.seq).padStart(4, '0');
  return `TK-${yyyy}${mm}${dd}-${seqStr}`;
}

/**
 * Create a new Ticket with anti-duplicate prevention
 */
async function createTicket(payload, actor) {
  const { trackingCode, orderId, category, subCategory, priority, subject, message, body } = payload;
  const initialText = message || body;

  if (!subject || !subject.trim()) {
    throw new AppError(400, 'INVALID_SUBJECT', 'Tiêu đề ticket không được để trống');
  }
  if (!initialText || !initialText.trim()) {
    throw new AppError(400, 'INVALID_MESSAGE', 'Nội dung khiếu nại không được để trống');
  }

  const requesterId = actor._id;
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

  // Anti-duplicate check: Same requester + orderId/trackingCode + category created within 10 mins
  const query = {
    sellerId: requesterId,
    category: category || 'OTHER',
    status: { $ne: TICKET_STATUS.CLOSED },
    createdAt: { $gte: tenMinsAgo },
  };
  if (trackingCode) query.trackingCode = trackingCode.trim().toUpperCase();
  if (orderId) query.orderId = orderId;

  const existingTicket = await Ticket.findOne(query);
  if (existingTicket) {
    return { ticket: existingTicket, deduplicated: true };
  }

  const ticketCode = await generateTicketCode();
  const ticket = await Ticket.create({
    ticketCode,
    sellerId: requesterId,
    requesterId,
    requesterRole: actor.role === 'BUYER' ? 'BUYER' : 'SELLER',
    orderId: orderId || null,
    trackingCode: trackingCode ? trackingCode.trim().toUpperCase() : '',
    orderTrackingCode: trackingCode ? trackingCode.trim().toUpperCase() : '',
    category: category || 'OTHER',
    subCategory: subCategory || '',
    priority: priority || 'P3',
    status: TICKET_STATUS.NEW,
    subject: subject.trim(),
    messages: [
      {
        senderId: actor._id,
        senderName: actor.companyName || actor.fullName || 'Người gửi',
        senderRole: actor.role || 'SELLER',
        visibility: 'PUBLIC',
        message: initialText.trim(),
        createdAt: new Date(),
      },
    ],
  });

  // Extract initial message to TicketMessage collection
  await TicketMessage.create({
    ticketId: ticket._id,
    seq: 1,
    senderId: actor._id,
    senderName: actor.companyName || actor.fullName || 'Người gửi',
    senderRole: actor.role || 'SELLER',
    visibility: 'PUBLIC',
    body: initialText.trim(),
    createdAt: new Date(),
  });

  await Ticket.updateOne({ _id: ticket._id }, { $set: { msgSeq: 1 } });

  return { ticket, deduplicated: false };
}

/**
 * Atomic Claim Ticket (Prevents Race Condition)
 */
async function claimTicket(ticketId, actor) {
  const allowedRoles = ['CS', 'CUSTOMER_SERVICE', 'ADMIN'];
  if (!allowedRoles.includes(actor.role)) {
    throw new AppError(403, 'FORBIDDEN', 'Chỉ nhân viên CSKH mới có quyền nhận ticket');
  }

  // Atomic update: only claim if assigneeId is null or status is NEW/OPEN
  const ticket = await Ticket.findOneAndUpdate(
    {
      _id: ticketId,
      assigneeId: null,
      status: { $in: [TICKET_STATUS.NEW, 'OPEN'] },
    },
    {
      $set: {
        assigneeId: actor._id,
        assignedTo: actor._id,
        assignedAt: new Date(),
        status: TICKET_STATUS.ASSIGNED,
      },
    },
    { new: true }
  ).populate('assigneeId', 'fullName email csLevel');

  if (!ticket) {
    const current = await Ticket.findById(ticketId).populate('assigneeId', 'fullName email');
    if (!current) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket yêu cầu');
    }
    const assigneeName = current.assigneeId ? current.assigneeId.fullName : 'người khác';
    throw new AppError(
      409,
      'TICKET_ALREADY_CLAIMED',
      `Ticket đã được nhân viên ${assigneeName} nhận xử lý`,
      { assignee: current.assigneeId }
    );
  }

  return ticket;
}

/**
 * Add message to ticket with Atomic seq and ClientMsgId deduplication
 */
async function addMessage(ticketId, payload, actor) {
  const { body, message, visibility = 'PUBLIC', attachments = [], clientMsgId = null } = payload;
  const content = (body || message || '').trim();

  if (!content) {
    throw new AppError(400, 'INVALID_MESSAGE', 'Nội dung tin nhắn không được để trống');
  }

  const isStaff = ['ADMIN', 'ORDER_VENDOR_MANAGER', 'CS', 'CUSTOMER_SERVICE', 'OPERATIONS', 'ACCOUNTANT'].includes(
    actor.role
  );

  // Non-staff users CANNOT send INTERNAL messages
  const finalVisibility = isStaff ? visibility : 'PUBLIC';

  // 1. Idempotency Check by clientMsgId
  if (clientMsgId) {
    const existingMsg = await TicketMessage.findOne({ ticketId, clientMsgId });
    if (existingMsg) {
      return { message: existingMsg, deduplicated: true };
    }
  }

  // 2. Fetch ticket & verify status
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket');
  }
  if (ticket.status === TICKET_STATUS.CLOSED) {
    throw new AppError(400, 'TICKET_CLOSED', 'Ticket này đã được đóng, không thể gửi thêm phản hồi');
  }

  // 3. Increment msgSeq atomically on ticket
  const updatedTicket = await Ticket.findByIdAndUpdate(
    ticketId,
    { $inc: { msgSeq: 1 } },
    { new: true }
  );
  const nextSeq = updatedTicket.msgSeq;

  // 4. Create TicketMessage record
  const senderName = isStaff
    ? `${actor.fullName || 'Nhân viên'} (CSKH)`
    : actor.companyName || actor.fullName || 'Khách hàng';

  const ticketMessage = await TicketMessage.create({
    ticketId,
    seq: nextSeq,
    senderId: actor._id,
    senderName,
    senderRole: isStaff ? 'CS' : actor.role || 'SELLER',
    visibility: finalVisibility,
    body: content,
    attachments,
    clientMsgId: clientMsgId || null,
  });

  // Push to embedded messages[] for backward compatibility
  const updateQuery = {
    $push: {
      messages: {
        senderId: actor._id,
        senderName,
        senderRole: isStaff ? 'CS' : actor.role || 'SELLER',
        visibility: finalVisibility,
        message: content,
        createdAt: new Date(),
      },
    },
  };

  // If first public response by Staff -> update sla.firstRespondedAt
  if (isStaff && finalVisibility === 'PUBLIC' && !ticket.sla?.firstRespondedAt) {
    updateQuery.$set = {
      'sla.firstRespondedAt': new Date(),
    };
  }

  // Status auto transition
  if (isStaff && ticket.status === TICKET_STATUS.NEW) {
    updateQuery.$set = {
      ...(updateQuery.$set || {}),
      status: TICKET_STATUS.IN_PROGRESS,
    };
  } else if (!isStaff && ticket.status === TICKET_STATUS.WAITING_USER) {
    updateQuery.$set = {
      ...(updateQuery.$set || {}),
      status: TICKET_STATUS.IN_PROGRESS,
    };
  }

  await Ticket.updateOne({ _id: ticketId }, updateQuery);

  return { message: ticketMessage, deduplicated: false };
}

/**
 * Transition ticket status enforcing State Machine transitions
 */
async function transitionTicket(ticketId, toStatus, actor, meta = {}) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket');
  }

  const check = canTransition(ticket.status, toStatus, actor);
  if (!check.ok) {
    throw new AppError(409, 'TICKET_INVALID_TRANSITION', check.reason);
  }

  const updateFields = {
    status: toStatus,
  };

  if (toStatus === TICKET_STATUS.RESOLVED || toStatus === TICKET_STATUS.CLOSED) {
    updateFields['sla.resolvedAt'] = new Date();
    updateFields.resolvedAt = new Date();
  }
  if (meta.resolutionNote) {
    updateFields.resolutionNote = meta.resolutionNote.trim();
  }
  if (meta.closedReason) {
    updateFields.closedReason = meta.closedReason.trim();
  }

  const updatedTicket = await Ticket.findByIdAndUpdate(
    ticketId,
    { $set: updateFields },
    { new: true }
  );

  return updatedTicket;
}

/**
 * Get ticket messages filtering out INTERNAL messages for Non-Staff users
 */
async function getTicketMessages(ticketId, actor) {
  const isStaff = ['ADMIN', 'ORDER_VENDOR_MANAGER', 'CS', 'CUSTOMER_SERVICE', 'OPERATIONS', 'ACCOUNTANT'].includes(
    actor.role
  );

  const query = { ticketId };
  if (!isStaff) {
    query.visibility = 'PUBLIC'; // BE filters out INTERNAL messages for sellers/buyers
  }

  const messages = await TicketMessage.find(query).sort({ seq: 1 });
  return messages;
}

module.exports = {
  generateTicketCode,
  createTicket,
  claimTicket,
  addMessage,
  transitionTicket,
  getTicketMessages,
};
