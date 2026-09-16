require('dotenv').config();
const jwt = require('jsonwebtoken');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Note = require('./models/Note');

const app = express();
app.use(express.json());
app.use(cors());

// 1. Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Đã kết nối MongoDB thành công!'))
  .catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

  // Middleware kiểm tra token hợp lệ
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Bạn chưa đăng nhập!' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
    req.userId = decoded.id;
    next();
  });
}

// 2. API Đăng ký (FR-01)
app.post('/api/auth/register', async (req, res) => {
  console.log('👉 Đã nhận request Đăng ký:', req.body);
  try {
    // Hứng cả fullName và fullname để không lo bị lệch hoa/thường từ Frontend
    const { fullName, fullname, email, password } = req.body;
    const nameToSave = fullName || fullname;

    if (!nameToSave || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin!' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được sử dụng!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ fullName: nameToSave, email, password: hashedPassword });
    await newUser.save();

    console.log('🎉 Lưu MongoDB thành công tài khoản:', email);
    res.status(201).json({ message: 'Đăng ký tài khoản thành công!' });
  } catch (err) {
    console.error('❌ Lỗi backend:', err.message);
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// 3. API Đăng nhập (FR-02)

app.post('/api/auth/login', async (req, res) => {
  console.log('👉 Đã nhận request Đăng nhập:', req.body);
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu!' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu không chính xác!' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Đăng nhập thành công!',
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// 4. API Cập nhật thông tin cá nhân (FR-04)
app.put('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const { fullName } = req.body;
    if (!fullName) {
      return res.status(400).json({ message: 'Vui lòng nhập họ tên!' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { fullName },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản!' });
    }

    res.status(200).json({
      message: 'Cập nhật thành công!',
      user: { id: updatedUser._id, fullName: updatedUser.fullName, email: updatedUser.email },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đang chạy tại port ${PORT}`);
});

// 5. API Quên mật khẩu - Gửi OTP (FR-03)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email!' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email này chưa được đăng ký!' });
    }

    // Sinh mã OTP 6 số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 5 * 60 * 1000; // hết hạn sau 5 phút
    await user.save();

    // TẠM THỜI: in OTP ra terminal thay vì gửi mail thật (dùng để test/demo)
    console.log(`📩 Mã OTP cho ${email}: ${otp} (hết hạn sau 5 phút)`);

    res.status(200).json({ message: 'Đã gửi mã OTP! Vui lòng kiểm tra.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// 6. API Đặt lại mật khẩu bằng OTP (FR-03)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin!' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại!' });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: 'Mã OTP không chính xác!' });
    }

    if (!user.resetOtpExpires || user.resetOtpExpires < Date.now()) {
      return res.status(400).json({ message: 'Mã OTP đã hết hạn, vui lòng thử lại!' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = null;
    user.resetOtpExpires = null;
    await user.save();

    res.status(200).json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// 7. API Quản lý Ghi chú học tập - riêng theo từng tài khoản (FR-05)

// Lấy danh sách ghi chú của CHÍNH tài khoản đang đăng nhập
app.get('/api/notes', verifyToken, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json({ notes });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// Tạo ghi chú mới cho tài khoản đang đăng nhập
app.post('/api/notes', verifyToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Vui lòng nhập tiêu đề!' });
    }

    const newNote = new Note({ userId: req.userId, title, content });
    await newNote.save();

    res.status(201).json({ message: 'Tạo ghi chú thành công!', note: newNote });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// Xóa ghi chú - chỉ xóa được ghi chú của CHÍNH mình
app.delete('/api/notes/:id', verifyToken, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    if (!note) {
      return res.status(404).json({ message: 'Không tìm thấy ghi chú hoặc bạn không có quyền xóa!' });
    }

    await Note.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Xóa ghi chú thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});