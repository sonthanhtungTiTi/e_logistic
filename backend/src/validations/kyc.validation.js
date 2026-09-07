const Joi = require('joi');

const submitKycSchema = Joi.object({
  idType: Joi.string().valid('CCCD', 'CMND', 'PASSPORT').default('CCCD').messages({
    'any.only': 'Loại giấy tờ phải là CCCD, CMND hoặc PASSPORT',
  }),
  idNumber: Joi.string()
    .trim()
    .required()
    .when('idType', {
      is: 'CCCD',
      then: Joi.string().pattern(/^\d{12}$/).messages({
        'string.pattern.base': 'Số CCCD phải bao gồm đúng 12 chữ số',
      }),
    })
    .when('idType', {
      is: 'CMND',
      then: Joi.string().pattern(/^\d{9}$/).messages({
        'string.pattern.base': 'Số CMND phải bao gồm đúng 9 chữ số',
      }),
    })
    .when('idType', {
      is: 'PASSPORT',
      then: Joi.string().pattern(/^[A-Za-z0-9]{8,9}$/).messages({
        'string.pattern.base': 'Số Hộ chiếu phải từ 8 đến 9 ký tự chữ và số',
      }),
    })
    .messages({
      'any.required': 'Vui lòng cung cấp số định danh trên giấy tờ (CCCD/CMND/Hộ chiếu)',
      'string.empty': 'Số giấy tờ không được để trống',
    }),
  idFullName: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Họ và tên trên giấy tờ là bắt buộc',
    'string.empty': 'Họ và tên trên giấy tờ không được để trống',
    'string.min': 'Họ và tên phải có ít nhất 2 ký tự',
    'string.max': 'Họ và tên không được vượt quá 100 ký tự',
  }),
});

const rejectKycSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required().messages({
    'any.required': 'Vui lòng cung cấp lý do từ chối hồ sơ',
    'string.empty': 'Lý do từ chối không được để trống',
    'string.min': 'Lý do từ chối phải có ít nhất 5 ký tự',
    'string.max': 'Lý do từ chối không được vượt quá 500 ký tự',
  }),
});

module.exports = {
  submitKycSchema,
  rejectKycSchema,
};
