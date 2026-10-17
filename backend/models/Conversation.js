const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    documentName: { type: String, default: '' },
    title: { type: String, default: 'Hội thoại mới' },
    messages: [
      {
        role: { type: String, enum: ['user', 'model'], required: true },
        text: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);