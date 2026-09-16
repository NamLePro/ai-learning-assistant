const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', NoteSchema);