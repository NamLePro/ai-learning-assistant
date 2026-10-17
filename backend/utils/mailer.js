const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtpEmail(toEmail, otp, purpose = 'verify') {
  const subject =
    purpose === 'verify'
      ? 'Xác thực tài khoản - AI Learning Assistant'
      : 'Đặt lại mật khẩu - AI Learning Assistant';

  const heading =
    purpose === 'verify' ? 'Xác thực tài khoản của bạn' : 'Yêu cầu đặt lại mật khẩu';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #007AFF;">${heading}</h2>
      <p>Mã xác thực (OTP) của bạn là:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #333; margin: 16px 0;">
        ${otp}
      </div>
      <p>Mã có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">AI Learning Assistant</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"AI Learning Assistant" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    html,
  });
}

module.exports = { sendOtpEmail };