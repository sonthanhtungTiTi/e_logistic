const Ticket = require('../models/ticket.model');
const ticketCore = require('../services/ticketCore.service');
const AppError = require('../utils/AppError');

// @desc    Seller tạo yêu cầu hỗ trợ / khiếu nại mới
// @route   POST /api/tickets
// @access  Private (Seller)
exports.createTicket = async (req, res, next) => {
  try {
    const { ticket, deduplicated } = await ticketCore.createTicket(req.body, req.user);
    res.status(deduplicated ? 200 : 201).json({
      success: true,
      message: deduplicated
        ? 'Ticket trùng khớp vừa được tạo gần đây, đang hiển thị ticket hiện tại.'
        : 'Tạo ticket khiếu nại thành công! Bộ phận CSKH sẽ sớm phản hồi.',
      deduplicated,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller xem danh sách ticket của mình
// @route   GET /api/tickets
// @access  Private (Seller)
exports.listSellerTickets = async (req, res, next) => {
  try {
    const sellerId = req.sellerId || req.user._id;
    const { status, category, search, page = 1, limit = 20 } = req.query;

    const query = { sellerId };
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (category && category !== 'ALL') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { ticketCode: { $regex: search, $options: 'i' } },
        { trackingCode: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Ticket.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy chi tiết 1 ticket và luồng tin nhắn trao đổi
// @route   GET /api/tickets/:id
// @access  Private (Seller hoặc Staff/Admin)
exports.getTicketDetails = async (req, res, next) => {
  try {
    const isStaff = ['ADMIN', 'ORDER_VENDOR_MANAGER', 'CS', 'CUSTOMER_SERVICE', 'OPERATIONS', 'ACCOUNTANT'].includes(
      req.user.role
    );
    const query = { _id: req.params.id };

    if (!isStaff) {
      const sellerId = req.sellerId || req.user._id;
      query.sellerId = sellerId;
    }

    const ticket = await Ticket.findOne(query)
      .populate('sellerId', 'fullName companyName email phoneNumber')
      .populate('assigneeId', 'fullName email csLevel role');

    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket hoặc bạn không có quyền xem');
    }

    // Filter visibility: INTERNAL messages for sellers
    const messages = await ticketCore.getTicketMessages(ticket._id, req.user);

    const ticketObj = ticket.toObject();
    ticketObj.messages = messages;

    res.status(200).json({
      success: true,
      data: ticketObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Gửi tin nhắn phản hồi vào ticket (Hỗ trợ 2 chiều Seller <-> CSKH)
// @route   POST /api/tickets/:id/messages
// @access  Private (Seller hoặc CSKH/Admin)
exports.addTicketMessage = async (req, res, next) => {
  try {
    const { message, deduplicated } = await ticketCore.addMessage(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Gửi tin nhắn phản hồi thành công',
      deduplicated,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DÀNH CHO CSKH & ADMIN (TICKET MANAGEMENT)
// ==========================================

// @desc    CSKH / Admin nhận xử lý ticket (Atomic Claim)
// @route   POST /api/admin/tickets/:id/claim
// @access  Private (CSKH, Admin)
exports.claimTicket = async (req, res, next) => {
  try {
    const ticket = await ticketCore.claimTicket(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Nhận ticket thành công!',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    CSKH / Admin xem tất cả ticket
// @route   GET /api/admin/tickets
// @access  Private (CSKH, Admin, Order Vendor Manager)
exports.listAdminTickets = async (req, res, next) => {
  try {
    const { status, category, priority, search, assignee, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (category && category !== 'ALL') {
      query.category = category;
    }
    if (priority && priority !== 'ALL') {
      query.priority = priority;
    }
    if (assignee === 'ME') {
      query.assigneeId = req.user._id;
    } else if (assignee === 'UNASSIGNED') {
      query.assigneeId = null;
    } else if (assignee && assignee !== 'ALL') {
      query.assigneeId = assignee;
    }

    if (search) {
      query.$or = [
        { ticketCode: { $regex: search, $options: 'i' } },
        { trackingCode: { $regex: search, $options: 'i' } },
        { orderTrackingCode: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total, countsByStatus] = await Promise.all([
      Ticket.find(query)
        .populate('sellerId', 'fullName companyName email phoneNumber')
        .populate('assigneeId', 'fullName email csLevel')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Ticket.countDocuments(query),
      Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const statusCounts = {};
    countsByStatus.forEach((item) => {
      if (item._id) statusCounts[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
      statusCounts,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    CSKH / Admin cập nhật trạng thái hoặc đóng ticket
// @route   PUT /api/admin/tickets/:id
// @access  Private (CSKH, Admin)
exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { status, resolutionNote, closedReason } = req.body;
    let ticket;

    if (status) {
      ticket = await ticketCore.transitionTicket(req.params.id, status, req.user, {
        resolutionNote,
        closedReason,
      });
    } else {
      ticket = await Ticket.findById(req.params.id);
      if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket');
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái ticket thành công!',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};
