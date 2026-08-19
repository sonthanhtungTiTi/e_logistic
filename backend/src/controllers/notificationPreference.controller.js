const NotificationPreference = require('../models/notificationPreference.model');
const Joi = require('joi');

// @desc    Lấy cấu hình nhận thông báo của người dùng
// @route   GET /api/notifications/preferences
// @access  Private
const getNotificationPreferences = async (req, res) => {
  try {
    let pref = await NotificationPreference.findOne({ userId: req.user._id });
    if (!pref) {
      pref = await NotificationPreference.create({ userId: req.user._id });
    }
    res.json(pref);
  } catch (error) {
    console.error(`[NotificationPref] Lỗi lấy cấu hình:`, error);
    res.status(500).json({ message: 'Không thể lấy cấu hình thông báo.' });
  }
};

// @desc    Cập nhật từng thuộc tính kênh thông báo
// @route   PUT /api/notifications/preferences
// @access  Private
const updateNotificationPreferences = async (req, res) => {
  try {
    const schema = Joi.object({
      eventType: Joi.string()
        .valid('NEW_ORDER', 'ORDER_FAILED', 'COD_SETTLED', 'COMPLAINT_RECEIVED', 'KYC_STATUS_CHANGED')
        .required(),
      channel: Joi.string().valid('email', 'sms', 'push').required(),
      enabled: Joi.boolean().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { eventType, channel, enabled } = req.body;
    const updateKey = `preferences.${eventType}.${channel}`;

    const pref = await NotificationPreference.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { [updateKey]: enabled } },
      { new: true, upsert: true }
    );

    res.json(pref);
  } catch (error) {
    console.error(`[NotificationPref] Lỗi cập nhật cấu hình:`, error);
    res.status(500).json({ message: 'Lỗi khi cập nhật cấu hình thông báo.' });
  }
};

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
};
