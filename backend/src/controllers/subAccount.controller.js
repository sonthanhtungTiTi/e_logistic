const User = require('../models/user.model');
const Joi = require('joi');
const bcrypt = require('bcryptjs');

// @desc    Tạo tài khoản phụ (Sub-Account) cho nhân viên Shop
// @route   POST /api/seller/sub-accounts
// @access  Private (Chỉ Seller chính, sub-account không được tạo)
const createSubAccount = async (req, res) => {
  try {
    // Chặn sub-account không cho tạo sub-account khác
    if (req.user.parentSellerId) {
      return res.status(403).json({ message: 'Tài khoản phụ không có quyền tạo tài khoản nhân viên khác' });
    }

    const schema = Joi.object({
      fullName: Joi.string().required().messages({ 'any.required': 'Vui lòng nhập họ tên nhân viên' }),
      email: Joi.string().email().required().messages({ 'any.required': 'Vui lòng nhập email đăng nhập' }),
      phoneNumber: Joi.string().pattern(/^[0-9]{10,11}$/).required().messages({ 'any.required': 'Vui lòng nhập số điện thoại' }),
      password: Joi.string().min(6).required().messages({ 'string.min': 'Mật khẩu tối thiểu 6 ký tự' }),
      permissions: Joi.array()
        .items(
          Joi.string().valid('VIEW_ORDERS', 'MANAGE_ORDERS', 'VIEW_FINANCE', 'MANAGE_FINANCE', 'MANAGE_PRODUCTS', 'MANAGE_COMPLAINTS')
        )
        .default([]),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { fullName, email, phoneNumber, password, permissions } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existing) {
      return res.status(409).json({ message: 'Email hoặc số điện thoại đã được đăng ký trên hệ thống' });
    }

    const subAccount = await User.create({
      fullName,
      email,
      phoneNumber,
      password,
      role: 'SELLER',
      parentSellerId: req.user._id,
      subAccountPermissions: permissions,
      companyName: req.user.companyName,
      taxCode: req.user.taxCode,
      isActive: true,
    });

    res.status(201).json({
      _id: subAccount._id,
      fullName: subAccount.fullName,
      email: subAccount.email,
      phoneNumber: subAccount.phoneNumber,
      permissions: subAccount.subAccountPermissions,
      parentSellerId: subAccount.parentSellerId,
      createdAt: subAccount.createdAt,
    });
  } catch (error) {
    console.error(`[SubAccount Create Error]:`, error);
    res.status(500).json({ message: 'Không thể tạo tài khoản nhân viên phụ' });
  }
};

// @desc    Lấy danh sách các tài khoản phụ của Shop
// @route   GET /api/seller/sub-accounts
// @access  Private (SELLER chính)
const listSubAccounts = async (req, res) => {
  try {
    const parentId = req.user.parentSellerId || req.user._id;
    const subAccounts = await User.find({ parentSellerId: parentId }).select(
      '-password -refreshToken -twoFactorSecret'
    );
    res.json(subAccounts);
  } catch (error) {
    console.error(`[SubAccount List Error]:`, error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách tài khoản nhân viên phụ' });
  }
};

// @desc    Cập nhật quyền hạn của tài khoản phụ
// @route   PUT /api/seller/sub-accounts/:id/permissions
// @access  Private (SELLER chính)
const updateSubAccountPermissions = async (req, res) => {
  try {
    if (req.user.parentSellerId) {
      return res.status(403).json({ message: 'Tài khoản phụ không được thay đổi phân quyền' });
    }

    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Danh sách quyền hạn phải là mảng hợp lệ' });
    }

    const subAccount = await User.findOne({ _id: id, parentSellerId: req.user._id });
    if (!subAccount) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản nhân viên phụ' });
    }

    subAccount.subAccountPermissions = permissions;
    await subAccount.save();

    res.json({
      _id: subAccount._id,
      fullName: subAccount.fullName,
      permissions: subAccount.subAccountPermissions,
    });
  } catch (error) {
    console.error(`[SubAccount Update Error]:`, error);
    res.status(500).json({ message: 'Không thể cập nhật quyền hạn nhân viên phụ' });
  }
};

// @desc    Khóa hoặc xóa tài khoản phụ
// @route   DELETE /api/seller/sub-accounts/:id
// @access  Private (SELLER chính)
const deleteSubAccount = async (req, res) => {
  try {
    if (req.user.parentSellerId) {
      return res.status(403).json({ message: 'Không có quyền thực hiện thao tác này' });
    }

    const { id } = req.params;
    const subAccount = await User.findOne({ _id: id, parentSellerId: req.user._id });
    if (!subAccount) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản nhân viên phụ' });
    }

    subAccount.isActive = false;
    await subAccount.save();

    res.json({ message: 'Đã vô hiệu hóa tài khoản nhân viên phụ thành công.' });
  } catch (error) {
    console.error(`[SubAccount Delete Error]:`, error);
    res.status(500).json({ message: 'Lỗi khi vô hiệu hóa tài khoản phụ' });
  }
};

module.exports = {
  createSubAccount,
  listSubAccounts,
  updateSubAccountPermissions,
  deleteSubAccount,
};
