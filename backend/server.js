require('dotenv').config();
const jwt = require('jsonwebtoken');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Note = require('./models/Note');
const { sendOtpEmail } = require('./utils/mailer');
const Summary = require('./models/Summary');

const Conversation = require('./models/Conversation');
const { summarizeText, chatWithDocument, ocrImage, analyzeProblem } = require('./utils/gemini');

const Document = require('./models/Document');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

// Tạo thư mục uploads nếu chưa có
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Cấu hình multer: lưu file vào thư mục uploads, đặt tên tránh trùng
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Chỉ cho phép PDF, DOCX, TXT (FR-07)
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExt = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ định dạng PDF, DOCX, TXT!'), false);
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // giới hạn 20MB
});

// Hàm trích xuất nội dung text từ file (FR-13)
async function extractTextFromFile(filePath, fileType) {
  try {
    if (fileType === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
      try {
        const result = await parser.getText();
        return (result.text || '').trim();
      } finally {
        await parser.destroy();
      }
    } else if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (fileType === 'txt') {
      return fs.readFileSync(filePath, 'utf8');
    }
    return '';
  } catch (err) {
    console.error('❌ Lỗi trích xuất text:', err.message);
    return '';
  }
}

const app = express();
app.use(express.json({ limit: '30mb' }));
app.use(cors());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Đã kết nối MongoDB thành công!'))
  .catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/auth/register', async (req, res) => {
  console.log('👉 Đã nhận request Đăng ký:', req.body);
  try {
    const {
      fullName,
      fullname,
      email,
      password,
      dateOfBirth,
      gender,
      phone,
      studentId,
      major,
    } = req.body;
    const nameToSave = fullName || fullname;

    if (!nameToSave || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc!' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được sử dụng!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();

    const newUser = new User({
      fullName: nameToSave,
      email,
      password: hashedPassword,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      phone: phone || '',
      studentId: studentId || '',
      major: major || '',
      isVerified: false,
      verifyOtp: otp,
      verifyOtpExpires: Date.now() + 5 * 60 * 1000,
    });
    await newUser.save();

    await sendOtpEmail(email, otp, 'verify');

    console.log(`🎉 Đã tạo tài khoản (chưa xác thực): ${email} | OTP: ${otp}`);
    res.status(201).json({
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để lấy mã xác thực.',
      email,
    });
  } catch (err) {
    console.error('❌ Lỗi backend:', err.message);
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mã OTP!' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại!' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Tài khoản đã được xác thực trước đó!' });
    }

    if (user.verifyOtp !== otp) {
      return res.status(400).json({ message: 'Mã OTP không chính xác!' });
    }

    if (!user.verifyOtpExpires || user.verifyOtpExpires < Date.now()) {
      return res.status(400).json({ message: 'Mã OTP đã hết hạn, vui lòng gửi lại!' });
    }

    user.isVerified = true;
    user.verifyOtp = null;
    user.verifyOtpExpires = null;
    await user.save();

    res.status(200).json({ message: 'Xác thực tài khoản thành công! Vui lòng đăng nhập.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

app.post('/api/auth/resend-verify-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email!' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại!' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Tài khoản đã được xác thực trước đó!' });
    }

    const otp = generateOtp();
    user.verifyOtp = otp;
    user.verifyOtpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendOtpEmail(email, otp, 'verify');

    res.status(200).json({ message: 'Đã gửi lại mã OTP, vui lòng kiểm tra email!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

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

    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Tài khoản chưa xác thực email! Vui lòng nhập mã OTP đã gửi.',
        needVerify: true,
        email: user.email,
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        phone: user.phone,
        studentId: user.studentId,
        major: user.major,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

app.put('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const { fullName, dateOfBirth, gender, phone, studentId, major } = req.body;
    if (!fullName) {
      return res.status(400).json({ message: 'Vui lòng nhập họ tên!' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { fullName, dateOfBirth, gender, phone, studentId, major },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản!' });
    }

    res.status(200).json({
      message: 'Cập nhật thành công!',
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        dateOfBirth: updatedUser.dateOfBirth,
        gender: updatedUser.gender,
        phone: updatedUser.phone,
        studentId: updatedUser.studentId,
        major: updatedUser.major,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

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

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendOtpEmail(email, otp, 'reset');

    res.status(200).json({ message: 'Đã gửi mã OTP! Vui lòng kiểm tra email.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

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

app.get('/api/notes', verifyToken, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json({ notes });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

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

// 8. API Quản lý Tài liệu học tập (FR-06 đến FR-13)

// Tải lên tài liệu (FR-06, FR-07)
// Tải lên tài liệu (FR-06, FR-07, FR-13) - nhận file dạng base64
app.post('/api/documents', verifyToken, async (req, res) => {
  try {
    const { fileName, base64, subject } = req.body;
    if (!fileName || !base64) {
      return res.status(400).json({ message: 'Vui lòng chọn file để tải lên!' });
    }

    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      return res.status(400).json({ message: 'Chỉ hỗ trợ định dạng PDF, DOCX, TXT!' });
    }

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(400).json({ message: 'File quá lớn (tối đa 20MB)!' });
    }

    // Tên lưu trên ổ cứng: bỏ ký tự lạ để an toàn, tên hiển thị vẫn giữ nguyên tiếng Việt
    const safeName = path.basename(fileName).replace(/[^\w.\-]/g, '_');
    const storedFileName = `${Date.now()}-${safeName}`;
    const filePath = path.join(uploadDir, storedFileName);
    fs.writeFileSync(filePath, buffer);

    // Trích xuất nội dung text ngay khi tải lên (FR-13)
    const extractedText = await extractTextFromFile(filePath, ext);

    const newDoc = new Document({
      userId: req.userId,
      originalName: fileName,
      displayName: fileName,
      subject: subject || '',
      fileType: ext,
      fileSize: buffer.length,
      storedFileName,
      extractedText,
    });
    await newDoc.save();

    res.status(201).json({ message: 'Tải lên tài liệu thành công!', document: newDoc });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// Lấy danh sách tài liệu của chính tài khoản (FR-08, FR-09, FR-12)
app.get('/api/documents', verifyToken, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.userId })
    .select('-extractedText')
    .sort({ createdAt: -1 });
    res.status(200).json({ documents });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// Xem chi tiết 1 tài liệu + xem trước nội dung đã trích xuất (FR-09, FR-13)
app.get('/api/documents/:id', verifyToken, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu!' });
    }

    const text = doc.extractedText || '';
    const docObj = doc.toObject();
    delete docObj.extractedText;

    res.status(200).json({
      document: docObj,
      textPreview: text.slice(0, 1500),
      textLength: text.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// Đổi tên tài liệu (FR-10)
app.put('/api/documents/:id', verifyToken, async (req, res) => {
  try {
    const { displayName, subject } = req.body;
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });

    if (!doc) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu!' });
    }

    if (displayName) doc.displayName = displayName;
    if (subject !== undefined) doc.subject = subject;
    await doc.save();

    res.status(200).json({ message: 'Cập nhật tài liệu thành công!', document: doc });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// Xóa tài liệu (FR-11)
app.delete('/api/documents/:id', verifyToken, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });

    if (!doc) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu hoặc bạn không có quyền xóa!' });
    }

    // Xóa file thật trên ổ cứng
    const filePath = path.join(uploadDir, doc.storedFileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Document.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Xóa tài liệu thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// 9. API AI tóm tắt tài liệu (FR-14 đến FR-22)

// Yêu cầu AI tóm tắt tài liệu, CHƯA lưu (FR-14 -> FR-20)
app.post('/api/documents/:id/summarize', verifyToken, async (req, res) => {
  try {
    const { level, mode } = req.body;
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });

    if (!doc) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu!' });
    }
    if (!doc.extractedText || !doc.extractedText.trim()) {
      return res.status(400).json({
        message: 'Tài liệu chưa có nội dung văn bản để tóm tắt (file trống hoặc là ảnh scan)!',
      });
    }

    const result = await summarizeText({ text: doc.extractedText, level, mode });

    res.status(200).json({
      summary: { ...result, documentId: doc._id, documentName: doc.displayName },
    });
  } catch (err) {
    console.error('❌ Lỗi tóm tắt:', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Lỗi máy chủ!' });
  }
});

// Lưu bản tóm tắt (FR-21)
app.post('/api/summaries', verifyToken, async (req, res) => {
  try {
    const { documentId, documentName, level, mode, title, overview, sections } = req.body;
    if (!documentId || !Array.isArray(sections)) {
      return res.status(400).json({ message: 'Dữ liệu bản tóm tắt không hợp lệ!' });
    }

    const doc = await Document.findOne({ _id: documentId, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu!' });
    }

    const newSummary = new Summary({
      userId: req.userId,
      documentId,
      documentName: documentName || doc.displayName,
      level,
      mode,
      title,
      overview,
      sections,
    });
    await newSummary.save();

    res.status(201).json({ message: 'Đã lưu bản tóm tắt!', summary: newSummary });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// Xem lại các bản tóm tắt đã lưu của chính tài khoản (FR-22)
app.get('/api/summaries', verifyToken, async (req, res) => {
  try {
    const summaries = await Summary.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json({ summaries });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// Xóa bản tóm tắt
app.delete('/api/summaries/:id', verifyToken, async (req, res) => {
  try {
    const summary = await Summary.findOne({ _id: req.params.id, userId: req.userId });
    if (!summary) {
      return res.status(404).json({ message: 'Không tìm thấy bản tóm tắt!' });
    }

    await Summary.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Đã xóa bản tóm tắt!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// 10. API AI hỏi đáp dựa trên tài liệu (FR-23 đến FR-30)

// Đặt câu hỏi, chưa lưu gì (FR-23 -> FR-28)
app.post('/api/documents/:id/chat', verifyToken, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập câu hỏi!' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ message: 'Câu hỏi quá dài (tối đa 2000 ký tự)!' });
    }

    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu!' });
    }
    if (!doc.extractedText || !doc.extractedText.trim()) {
      return res.status(400).json({
        message: 'Tài liệu chưa có nội dung văn bản để hỏi đáp (file trống hoặc là ảnh scan)!',
      });
    }

    const safeHistory = Array.isArray(history) ? history.slice(-20) : [];
    const reply = await chatWithDocument({
      text: doc.extractedText,
      history: safeHistory,
      message: message.trim(),
    });

    res.status(200).json({ reply });
  } catch (err) {
    console.error('❌ Lỗi hỏi đáp:', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Lỗi máy chủ!' });
  }
});

// Lưu hội thoại (FR-30)
app.post('/api/conversations', verifyToken, async (req, res) => {
  try {
    const { documentId, documentName, title, messages } = req.body;
    if (!documentId || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'Hội thoại không hợp lệ!' });
    }
    const doc = await Document.findOne({ _id: documentId, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu!' });
    }

    const conv = new Conversation({
      userId: req.userId,
      documentId,
      documentName: documentName || doc.displayName,
      title: title || 'Hội thoại mới',
      messages: messages.map((m) => ({ role: m.role, text: m.text })),
    });
    await conv.save();
    res.status(201).json({ message: 'Đã lưu hội thoại!', conversation: conv });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// Cập nhật hội thoại đã lưu khi chat tiếp
app.put('/api/conversations/:id', verifyToken, async (req, res) => {
  try {
    const { messages } = req.body;
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.userId });
    if (!conv) {
      return res.status(404).json({ message: 'Không tìm thấy hội thoại!' });
    }
    if (Array.isArray(messages)) {
      conv.messages = messages.map((m) => ({ role: m.role, text: m.text }));
    }
    await conv.save();
    res.status(200).json({ message: 'Đã cập nhật hội thoại!', conversation: conv });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// Xem lịch sử hội thoại đã lưu (FR-30)
app.get('/api/conversations', verifyToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.status(200).json({ conversations });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

app.delete('/api/conversations/:id', verifyToken, async (req, res) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.userId });
    if (!conv) {
      return res.status(404).json({ message: 'Không tìm thấy hội thoại!' });
    }
    await Conversation.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Đã xóa hội thoại!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: err.message });
  }
});

// 11. API quét ảnh đề bài (FR-31 đến FR-37)

// Nhận dạng chữ trong ảnh (FR-33, FR-34)
app.post('/api/scan/ocr', verifyToken, async (req, res) => {
  try {
    const { base64, mimeType } = req.body;
    if (!base64) {
      return res.status(400).json({ message: 'Vui lòng chọn ảnh đề bài!' });
    }
    if (base64.length > 14 * 1024 * 1024) {
      return res.status(400).json({ message: 'Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn!' });
    }
    if (mimeType && !/^image\/(jpeg|png|webp|heic|heif)$/.test(mimeType)) {
      return res.status(400).json({ message: 'Chỉ hỗ trợ ảnh JPG, PNG, WEBP, HEIC!' });
    }

    const text = await ocrImage({ base64, mimeType });
    res.status(200).json({ text });
  } catch (err) {
    console.error('❌ Lỗi OCR:', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Lỗi máy chủ!' });
  }
});

// Gửi đề đã nhận dạng cho AI phân tích (FR-37)
app.post('/api/scan/analyze', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Nội dung đề bài đang trống!' });
    }
    const analysis = await analyzeProblem({ text: text.trim() });
    res.status(200).json({ analysis });
  } catch (err) {
    console.error('❌ Lỗi phân tích đề:', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Lỗi máy chủ!' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đang chạy tại port ${PORT}`);
});
