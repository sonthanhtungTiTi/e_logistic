const nodemailer = require('nodemailer');

/**
 * Email & SMS Service — Actor phụ trong UC Quên mật khẩu
 * Tích hợp Nodemailer + Google Gmail App Password để gửi OTP thực tế.
 */

// Hàm khởi tạo transporter gửi email qua Gmail SMTP
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || 'sont48873@gmail.com';
  const rawPass = process.env.SMTP_PASS || 'ltdz imqb gztt qcbl';
  const pass = rawPass.replace(/\s+/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Gửi OTP đặt lại mật khẩu qua Email (Google Gmail SMTP)
 * @param {string} toEmail - Email người nhận
 * @param {string} otp - Mã OTP 6 chữ số
 * @returns {Promise<void>}
 */
const sendPasswordResetEmail = async (toEmail, otp) => {
  try {
    const transporter = createTransporter();
    const fromName = process.env.FROM_NAME || 'E-Logistic Support System';
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'sonthanhtungtiti@gmail.com';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 800; tracking-tight;">E-LOGISTIC PLATFORM</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Smart Supply Chain & Courier System</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 20px;" />
        <div>
          <h3 style="color: #0f172a; font-size: 16px; margin-bottom: 12px;">Yêu cầu Đặt Lại Mật Khẩu (Quên Mật Khẩu)</h3>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Xin chào,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hệ thống nhận được yêu cầu khôi phục mật khẩu cho tài khoản đăng ký với email này. Dưới đây là mã OTP xác thực của bạn:</p>
          
          <div style="text-align: center; margin: 28px 0;">
            <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #059669; background-color: #ecfdf5; padding: 14px 28px; border-radius: 12px; border: 2px dashed #10b981; display: inline-block;">
              ${otp}
            </span>
          </div>

          <div style="background-color: #f8fafc; padding: 14px; border-radius: 10px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
            <p style="color: #475569; font-size: 12px; margin: 0; line-height: 1.5;">
              • Mã OTP này có hiệu lực trong <strong>10 phút</strong>.<br/>
              • Nếu nhập sai quá 5 lần, yêu cầu này sẽ tự động hủy.<br/>
              • Vui lòng <strong>tuyệt đối không chia sẻ</strong> mã OTP này cho bất kỳ ai khác.
            </p>
          </div>

          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Nếu bạn không yêu cầu đặt lại mật khẩu, xin hãy bỏ qua email này hoặc liên hệ bộ phận hỗ trợ kỹ thuật.</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Trân trọng,<br/><strong>Đội ngũ Kỹ Thuật E-Logistic Platform</strong></p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: `[E-Logistic] Mã OTP Đặt Lại Mật Khẩu: ${otp}`,
      text: `Mã OTP khôi phục mật khẩu E-Logistic của bạn là ${otp}. Hiệu lực 10 phút.`,
      html: htmlContent,
    });

    console.log(`[EMAIL SERVICE SUCCESS] Đã gửi OTP đến ${toEmail} thành công. MessageId: ${info.messageId}`);
  } catch (error) {
    console.error(`[EMAIL SERVICE ERROR] Gửi email OTP đến ${toEmail} thất bại:`, error.message);
    throw error;
  }
};

/**
 * Gửi OTP xác thực Đăng ký tài khoản qua Email (Google Gmail SMTP)
 * @param {string} toEmail - Email người nhận
 * @param {string} otp - Mã OTP 6 chữ số
 * @returns {Promise<void>}
 */
const sendRegistrationOtpEmail = async (toEmail, otp) => {
  try {
    const transporter = createTransporter();
    const fromName = process.env.FROM_NAME || 'E-Logistic Support System';
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'sonthanhtungtiti@gmail.com';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 800;">E-LOGISTIC PLATFORM</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Xác Thực Đăng Ký Tài Khoản Seller</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 20px;" />
        <div>
          <h3 style="color: #0f172a; font-size: 16px; margin-bottom: 12px;">Chào mừng bạn đến với E-Logistic!</h3>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Bạn vừa thực hiện đăng ký tài khoản Seller trên nền tảng E-Logistic. Để hoàn tất đăng ký, vui lòng sử dụng mã xác thực OTP 6 số dưới đây:</p>
          
          <div style="text-align: center; margin: 28px 0;">
            <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #2563eb; background-color: #eff6ff; padding: 14px 28px; border-radius: 12px; border: 2px dashed #3b82f6; display: inline-block;">
              ${otp}
            </span>
          </div>

          <div style="background-color: #f8fafc; padding: 14px; border-radius: 10px; border-left: 4px solid #10b981; margin-bottom: 20px;">
            <p style="color: #475569; font-size: 12px; margin: 0; line-height: 1.5;">
              • Mã xác thực có hiệu lực trong <strong>10 phút</strong>.<br/>
              • Tuyệt đối <strong>không cung cấp mã này</strong> cho bất kỳ ai khác.
            </p>
          </div>
        </div>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Email gửi tự động từ Google Mail Service của E-Logistic System.</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: `[E-Logistic] Mã OTP Xác Thực Đăng Ký Tài Khoản: ${otp}`,
      text: `Mã OTP xác thực đăng ký E-Logistic của bạn là ${otp}. Hiệu lực 10 phút.`,
      html: htmlContent,
    });

    console.log(`[REGISTRATION EMAIL SUCCESS] Đã gửi OTP đến ${toEmail}. MessageId: ${info.messageId}`);
  } catch (error) {
    console.error(`[REGISTRATION EMAIL ERROR] Gửi OTP thất bại đến ${toEmail}:`, error.message);
    throw error;
  }
};

/**
 * Gửi OTP đặt lại mật khẩu qua SMS (Mock / Giả lập)
 * @param {string} phoneNumber - Số điện thoại người nhận
 * @param {string} otp - Mã OTP 6 chữ số
 * @returns {Promise<void>}
 */
const sendPasswordResetSms = async (phoneNumber, otp) => {
  console.log(`[SMS SERVICE - MOCK] Gửi OTP đến ${phoneNumber}: ${otp}`);
  console.log(`[SMS SERVICE] OTP hết hạn sau 10 phút.`);
};

module.exports = { sendPasswordResetEmail, sendRegistrationOtpEmail, sendPasswordResetSms };


