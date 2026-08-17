const PickupAddress = require('../models/pickupAddress.model');
const Joi = require('joi');
const mongoose = require('mongoose');

// @desc    Lấy danh sách địa chỉ kho của Seller
// @route   GET /api/seller/pickup-addresses
// @access  Private (SELLER)
const getPickupAddresses = async (req, res) => {
  try {
    const sellerId = req.effectiveSellerId || req.user._id;
    const addresses = await PickupAddress.find({ sellerId, isActive: true }).sort({ isDefault: -1, createdAt: -1 });
    res.json(addresses);
  } catch (error) {
    console.error(`[PickupAddress] Lỗi danh sách kho:`, error);
    res.status(500).json({ message: 'Không thể lấy danh sách địa chỉ kho.' });
  }
};

// @desc    Tạo địa chỉ kho mới
// @route   POST /api/seller/pickup-addresses
// @access  Private (SELLER)
const createPickupAddress = async (req, res) => {
  try {
    const schema = Joi.object({
      label: Joi.string().required().messages({ 'any.required': 'Vui lòng nhập tên gợi nhớ kho' }),
      province: Joi.string().required().messages({ 'any.required': 'Vui lòng chọn Tỉnh/Thành' }),
      district: Joi.string().required().messages({ 'any.required': 'Vui lòng chọn Quận/Huyện' }),
      ward: Joi.string().required().messages({ 'any.required': 'Vui lòng chọn Phường/Xã' }),
      addressDetail: Joi.string().required().messages({ 'any.required': 'Vui lòng nhập số nhà / đường' }),
      contactName: Joi.string().allow('', null).optional(),
      contactPhone: Joi.string().allow('', null).optional(),
      latitude: Joi.number().required().messages({ 'any.required': 'Vui lòng chọn vị trí GPS trên bản đồ' }),
      longitude: Joi.number().required().messages({ 'any.required': 'Vui lòng chọn vị trí GPS trên bản đồ' }),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const sellerId = req.effectiveSellerId || req.user._id;
    const count = await PickupAddress.countDocuments({ sellerId, isActive: true });

    const address = await PickupAddress.create({
      sellerId,
      label: req.body.label,
      province: req.body.province,
      district: req.body.district,
      ward: req.body.ward,
      addressDetail: req.body.addressDetail,
      contactName: req.body.contactName || req.user.fullName || '',
      contactPhone: req.body.contactPhone || req.user.phoneNumber || '',
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      isDefault: count === 0, // Địa chỉ đầu tiên tự động làm mặc định
      isActive: true,
    });

    res.status(201).json(address);
  } catch (error) {
    console.error(`[PickupAddress] Lỗi tạo địa chỉ kho:`, error);
    res.status(500).json({ message: 'Không thể tạo địa chỉ kho mới.' });
  }
};

// @desc    Đặt địa chỉ kho mặc định
// @route   PUT /api/seller/pickup-addresses/:id/default
// @access  Private (SELLER)
const setDefaultPickupAddress = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { id } = req.params;
    const sellerId = req.effectiveSellerId || req.user._id;

    const target = await PickupAddress.findOne({ _id: id, sellerId, isActive: true }).session(session);
    if (!target) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Không tìm thấy địa chỉ kho' });
    }

    // Reset default cho các kho khác
    await PickupAddress.updateMany(
      { sellerId, _id: { $ne: id } },
      { isDefault: false },
      { session }
    );

    target.isDefault = true;
    await target.save({ session });

    await session.commitTransaction();
    res.json(target);
  } catch (error) {
    await session.abortTransaction();
    console.error(`[PickupAddress] Lỗi đặt kho mặc định:`, error);
    res.status(500).json({ message: 'Lỗi khi đặt địa chỉ kho mặc định' });
  } finally {
    session.endSession();
  }
};

// @desc    Xóa mềm địa chỉ kho (soft delete)
// @route   DELETE /api/seller/pickup-addresses/:id
// @access  Private (SELLER)
const deletePickupAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.effectiveSellerId || req.user._id;

    const address = await PickupAddress.findOne({ _id: id, sellerId, isActive: true });
    if (!address) return res.status(404).json({ message: 'Không tìm thấy địa chỉ kho' });

    if (address.isDefault) {
      return res.status(400).json({ message: 'Không thể xóa địa chỉ đang là mặc định. Vui lòng đặt kho khác làm mặc định trước.' });
    }

    address.isActive = false;
    await address.save();
    res.json({ message: 'Đã xóa địa chỉ kho thành công' });
  } catch (error) {
    console.error(`[PickupAddress] Lỗi xóa địa chỉ kho:`, error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xóa địa chỉ kho' });
  }
};

module.exports = {
  getPickupAddresses,
  createPickupAddress,
  setDefaultPickupAddress,
  deletePickupAddress,
};
