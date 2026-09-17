const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Bag = require('../models/bag.model');
const User = require('../models/user.model');
const Hub = require('../models/hub.model');

// @desc    Tra cứu danh sách đơn hàng tại Hub (Table View)
// @route   GET /api/warehouse/lookup/orders
// @access  Private (WAREHOUSE_MANAGER, ADMIN, HUB_COORDINATOR, OPERATIONS, HUB_STAFF)
exports.getWarehouseOrders = async (req, res) => {
  try {
    const { q, status, zone, page = 1, limit = 15 } = req.query;
    const currentHubId = req.user?.hubId || req.user?.hub_id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'OPERATIONS';

    let query = {};

    if (!isAdmin && currentHubId) {
      query.$or = [
        { currentHubId },
        { 'routing.originHubId': currentHubId },
        { 'routing.destinationHubId': currentHubId },
        { 'currentLocation.hubId': currentHubId },
      ];
    }

    if (q && q.trim()) {
      const cleanQ = q.trim();
      const qRegex = new RegExp(cleanQ, 'i');
      const searchConditions = [
        { trackingCode: qRegex },
        { orderCode: qRegex },
        { 'recipient.phoneNumber': qRegex },
        { 'recipient.name': qRegex },
      ];

      if (mongoose.Types.ObjectId.isValid(cleanQ)) {
        searchConditions.push({ _id: cleanQ });
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (zone && zone !== 'ALL') {
      query['currentLocation.zone'] = zone;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('sellerId', 'fullName email phoneNumber')
        .populate('assignedShipperId', 'fullName phoneNumber')
        .populate('assignedDriverId', 'fullName phoneNumber vehicleInfo')
        .lean(),
      Order.countDocuments(query),
    ]);

    const stats = {
      total,
      atHub: orders.filter((o) => ['AT_HUB', 'IN_STORAGE', 'SORTED'].includes(o.status)).length,
      pendingOutbound: orders.filter((o) => ['READY_FOR_OUTBOUND', 'BAGGED', 'READY_FOR_LINEHAUL'].includes(o.status)).length,
      delivering: orders.filter((o) => ['OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(o.status)).length,
    };

    return res.status(200).json({
      success: true,
      message: 'Tra cứu danh sách đơn hàng thành công',
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      stats,
    });
  } catch (err) {
    console.error('getWarehouseOrders error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi tra cứu đơn hàng kho',
    });
  }
};

// @desc    Tra cứu danh sách bao tải & mã Seal tại Hub (Table View)
// @route   GET /api/warehouse/lookup/bags
// @access  Private (WAREHOUSE_MANAGER, ADMIN, HUB_COORDINATOR, OPERATIONS, HUB_STAFF)
exports.getWarehouseBags = async (req, res) => {
  try {
    const { q, status, page = 1, limit = 15 } = req.query;
    const currentHubId = req.user?.hubId || req.user?.hub_id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'OPERATIONS';

    let query = {};

    if (!isAdmin && currentHubId) {
      query.$or = [{ originHubId: currentHubId }, { destinationHubId: currentHubId }];
    }

    if (q && q.trim()) {
      const cleanQ = q.trim().toUpperCase();
      const searchConditions = [
        { sealCode: new RegExp(cleanQ, 'i') },
        { trackingCodes: cleanQ },
        { notes: new RegExp(cleanQ, 'i') },
      ];

      if (mongoose.Types.ObjectId.isValid(cleanQ)) {
        searchConditions.push({ _id: cleanQ });
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [bags, total] = await Promise.all([
      Bag.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('originHubId', 'code name province')
        .populate('destinationHubId', 'code name province')
        .populate('createdBy', 'fullName email phoneNumber')
        .lean(),
      Bag.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Tra cứu danh sách bao tải thành công',
      data: bags,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('getWarehouseBags error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi tra cứu bao tải kho',
    });
  }
};

// @desc    Lấy danh sách nhân viên kho trực thuộc Hub
// @route   GET /api/warehouse/staff
// @access  Private (WAREHOUSE_MANAGER, ADMIN, HUB_COORDINATOR)
exports.getWarehouseStaff = async (req, res) => {
  try {
    const { q, role } = req.query;
    const currentHubId = req.user?.hubId || req.user?.hub_id;
    const isAdmin = req.user?.role === 'ADMIN';

    let query = {
      role: {
        $in: [
          'INBOUND_STAFF',
          'OUTBOUND_STAFF',
          'WAREHOUSE_STAFF',
          'HUB_STAFF',
          'HUB_COORDINATOR',
          'WAREHOUSE_MANAGER',
        ],
      },
    };

    if (!isAdmin && currentHubId) {
      query.hubId = currentHubId;
    }

    if (role && role !== 'ALL') {
      query.role = role;
    }

    if (q && q.trim()) {
      const qRegex = new RegExp(q.trim(), 'i');
      query.$or = [
        { fullName: qRegex },
        { email: qRegex },
        { phoneNumber: qRegex },
      ];
    }

    const staff = await User.find(query)
      .select('fullName email phoneNumber role isWorking shiftStartedAt shiftEndedAt hubId createdAt avatarUrl')
      .populate('hubId', 'name code province')
      .sort({ role: 1, fullName: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Danh sách nhân viên kho',
      data: staff,
      total: staff.length,
    });
  } catch (err) {
    console.error('getWarehouseStaff error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi lấy danh sách nhân viên kho',
    });
  }
};

// @desc    Điều chuyển vai trò nhân viên kho (VD: Nhập kho <-> Xuất kho)
// @route   PATCH /api/warehouse/staff/:id/role
// @access  Private (WAREHOUSE_MANAGER, ADMIN)
exports.updateStaffRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['INBOUND_STAFF', 'OUTBOUND_STAFF', 'WAREHOUSE_STAFF', 'HUB_STAFF', 'HUB_COORDINATOR'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Vai trò không hợp lệ. Chỉ cho phép: ${allowedRoles.join(', ')}`,
      });
    }

    const staffUser = await User.findById(id);
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    const currentHubId = req.user?.hubId || req.user?.hub_id;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isAdmin && currentHubId && staffUser.hubId && staffUser.hubId.toString() !== currentHubId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có quyền điều chuyển nhân sự trực thuộc Hub của mình',
      });
    }

    staffUser.role = role;
    await staffUser.save();

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật vai trò nhân viên [${staffUser.fullName}] thành [${role}]`,
      data: {
        _id: staffUser._id,
        fullName: staffUser.fullName,
        email: staffUser.email,
        role: staffUser.role,
      },
    });
  } catch (err) {
    console.error('updateStaffRole error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi cập nhật vai trò nhân viên',
    });
  }
};
