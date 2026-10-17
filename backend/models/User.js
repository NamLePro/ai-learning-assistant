const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    // Thông tin cá nhân bổ sung
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Nam', 'Nữ', 'Khác'], default: null },
    phone: { type: String, trim: true },
    studentId: { type: String, trim: true }, // Mã số sinh viên
    major: { type: String, trim: true }, // Ngành học

    // Xác thực email bằng OTP
    isVerified: { type: Boolean, default: false },
    verifyOtp: { type: String, default: null },
    verifyOtpExpires: { type: Date, default: null },

    // Quên mật khẩu (đã có từ trước)
    resetOtp: { type: String, default: null },
    resetOtpExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);