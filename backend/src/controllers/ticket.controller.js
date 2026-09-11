const Ticket = require('../models/ticket.model');

// Sinh mã ticket ngẫu nhiên duy nhất: TCK-XXXXXX
const generateTicketCode = () => {
  const chars = '0123456789ABCDEF';
  let code = 'TCK-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// @desc    Seller tạo yêu cầu hỗ trợ / khiếu nại mới
// @route   POST /api/tickets
// @access  Private (Seller)
exports.createTicket = async (req, res) => {
  try {
    const sellerId = req.sellerId || req.user._id;
    const { trackingCode, category, priority, subject, content, message } = req.body;

    const initialMessageText = message || content;
    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề ticket là bắt buộc',
      });
    }
    if (!initialMessageText || !initialMessageText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung chi tiết yêu cầu khiếu nại là bắt buộc',
      });
    }

    let ticketCode = generateTicketCode();
    // Đảm bảo không trùng mã
    let existing = await Ticket.findOne({ ticketCode });
    while (existing) {
      ticketCode = generateTicketCode();
      existing = await Ticket.findOne({ ticketCode });
    }

    const ticket = await Ticket.create({
      ticketCode,
      sellerId,
      trackingCode: trackingCode ? trackingCode.trim().toUpperCase() : '',
      category: category || 'OTHER',
      priority: priority || 'NORMAL',
      status: 'OPEN',
      subject: subject.trim(),
      messages: [
        {
          senderId: req.user._id,
          senderName: req.user.companyName || req.user.fullName || 'Nhà Bán Hàng',
          senderRole: 'SELLER',
          message: initialMessageText.trim(),
          createdAt: new Date(),
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Tạo ticket khiếu nại thành công! Bộ phận CSKH sẽ sớm phản hồi.',
      data: ticket,
    });
  } catch (error) {
    console.error('Lỗi createTicket:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo ticket khiếu nại',
      error: error.message,
    });
  }
};

// @desc    Seller xem danh sách ticket của mình
// @route   GET /api/tickets
// @access  Private (Seller)
exports.listSellerTickets = async (req, res) => {
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
    console.error('Lỗi listSellerTickets:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách ticket',
      error: error.message,
    });
  }
};

// @desc    Lấy chi tiết 1 ticket và luồng tin nhắn trao đổi
// @route   GET /api/tickets/:id
// @access  Private (Seller hoặc Staff/Admin)
exports.getTicketDetails = async (req, res) => {
  try {
    const isStaff = ['ADMIN', 'ORDER_VENDOR_MANAGER', 'CS', 'CUSTOMER_SERVICE', 'OPERATIONS'].includes(req.user.role);
    const query = { _id: req.params.id };

    if (!isStaff) {
      const sellerId = req.sellerId || req.user._id;
      query.sellerId = sellerId;
    }

    const ticket = await Ticket.findOne(query)
      .populate('sellerId', 'fullName companyName email phoneNumber')
      .populate('assignedTo', 'fullName email role');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ticket hoặc bạn không có quyền xem',
      });
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('Lỗi getTicketDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy chi tiết ticket',
    });
  }
};

// @desc    Gửi tin nhắn phản hồi vào ticket (Hỗ trợ 2 chiều Seller <-> CSKH)
// @route   POST /api/tickets/:id/messages
// @access  Private (Seller hoặc CSKH/Admin)
exports.addTicketMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung tin nhắn không được để trống',
      });
    }

    const isStaff = ['ADMIN', 'ORDER_VENDOR_MANAGER', 'CS', 'CUSTOMER_SERVICE', 'OPERATIONS'].includes(req.user.role);
    const query = { _id: req.params.id };

    if (!isStaff) {
      const sellerId = req.sellerId || req.user._id;
      query.sellerId = sellerId;
    }

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ticket để gửi phản hồi',
      });
    }

    if (ticket.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'Ticket này đã được đóng, không thể gửi thêm phản hồi',
      });
    }

    const senderRole = isStaff ? (req.user.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER_SERVICE') : 'SELLER';
    const senderName = isStaff
      ? `${req.user.fullName} (CSKH / Admin)`
      : (req.user.companyName || req.user.fullName || 'Nhà Bán Hàng');

    ticket.messages.push({
      senderId: req.user._id,
      senderName,
      senderRole,
      message: message.trim(),
      createdAt: new Date(),
    });

    // Cập nhật trạng thái thông minh theo luồng
    if (isStaff) {
      // CSKH trả lời -> chuyển sang chờ Seller hoặc đang xử lý
      if (ticket.status === 'OPEN') {
        ticket.status = 'IN_PROGRESS';
      }
    } else {
      // Seller trả lời -> nếu đang chờ Seller thì chuyển sang đang xử lý
      if (ticket.status === 'WAITING_SELLER') {
        ticket.status = 'IN_PROGRESS';
      }
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Gửi tin nhắn phản hồi thành công',
      data: ticket,
    });
  } catch (error) {
    console.error('Lỗi addTicketMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể gửi tin nhắn phản hồi',
      error: error.message,
    });
  }
};

// ==========================================
// DÀNH CHO CSKH & ADMIN (TICKET MANAGEMENT)
// ==========================================

// @desc    CSKH / Admin xem tất cả ticket
// @route   GET /api/admin/tickets
// @access  Private (CSKH, Admin, Order Vendor Manager)
exports.listAdminTickets = async (req, res) => {
  try {
    const { status, category, priority, search, page = 1, limit = 20 } = req.query;

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
    if (search) {
      query.$or = [
        { ticketCode: { $regex: search, $options: 'i' } },
        { trackingCode: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total, countsByStatus] = await Promise.all([
      Ticket.find(query)
        .populate('sellerId', 'fullName companyName email phoneNumber')
        .populate('assignedTo', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Ticket.countDocuments(query),
      Ticket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
    ]);

    const statusCounts = {
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_SELLER: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    countsByStatus.forEach((item) => {
      if (statusCounts[item._id] !== undefined) {
        statusCounts[item._id] = item.count;
      }
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
    console.error('Lỗi listAdminTickets:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách ticket của hệ thống',
      error: error.message,
    });
  }
};

// @desc    CSKH / Admin cập nhật trạng thái, phân công hoặc đóng ticket
// @route   PUT /api/admin/tickets/:id
// @access  Private (CSKH, Admin)
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status, priority, assignedTo, resolutionNote } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ticket để cập nhật',
      });
    }

    if (status) {
      ticket.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        ticket.resolvedAt = new Date();
      }
    }
    if (priority) ticket.priority = priority;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null;
    if (resolutionNote !== undefined) ticket.resolutionNote = resolutionNote.trim();

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái ticket thành công!',
      data: ticket,
    });
  } catch (error) {
    console.error('Lỗi updateTicketStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái ticket',
      error: error.message,
    });
  }
};
