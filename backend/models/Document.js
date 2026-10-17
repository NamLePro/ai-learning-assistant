const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true }, // tên file gốc khi upload
    displayName: { type: String, required: true }, // tên hiển thị, có thể đổi (FR-10)
    subject: { type: String, trim: true, default: '' }, // môn học/chủ đề (FR-12)
    fileType: { type: String, required: true }, // pdf, docx, txt
    fileSize: { type: Number, required: true }, // byte
    storedFileName: { type: String, required: true }, // tên file thật lưu trên ổ cứng
    extractedText: { type: String, default: '' }, // nội dung text, dùng cho AI sau này (FR-13)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', DocumentSchema);