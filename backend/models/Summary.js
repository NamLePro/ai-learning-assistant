const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema(
  {
    heading: { type: String, default: '' },
    points: { type: [String], default: [] },
  },
  { _id: false }
);

const SummarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    documentName: { type: String, required: true },
    level: { type: String, enum: ['short', 'medium', 'detailed'], default: 'medium' },
    mode: { type: String, enum: ['overall', 'sections'], default: 'overall' },
    title: { type: String, default: '' },
    overview: { type: String, default: '' },
    sections: { type: [SectionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Summary', SummarySchema);