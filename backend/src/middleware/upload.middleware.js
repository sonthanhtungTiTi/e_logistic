const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Thư mục lưu trữ an toàn riêng biệt cho KYC (không expose công khai qua express.static)
const KYC_UPLOAD_DIR = path.join(__dirname, '../../uploads/kyc');

if (!fs.existsSync(KYC_UPLOAD_DIR)) {
  fs.mkdirSync(KYC_UPLOAD_DIR, { recursive: true });
}

// Cấu hình lưu trữ tệp tin
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, KYC_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Đổi tên file thành UUID, tuyệt đối không giữ tên file gốc người dùng
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueFilename = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueFilename);
  },
});

// Bộ lọc MIME type thật
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
  const allowedExts = ['.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error('Định dạng tệp không hợp lệ. Hệ thống chỉ chấp nhận ảnh định dạng .jpg, .jpeg hoặc .png');
    error.statusCode = 400;
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const uploadKyc = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn tối đa 5MB / ảnh
  },
  fileFilter,
});

const uploadKycFiles = uploadKyc.fields([
  { name: 'idFrontImage', maxCount: 1 },
  { name: 'idBackImage', maxCount: 1 },
  { name: 'businessLicenseImage', maxCount: 1 },
]);

module.exports = {
  uploadKycFiles,
  KYC_UPLOAD_DIR,
};
