import mongoose from 'mongoose';

const downloadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  audio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Audio',
    required: true
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 为音频ID创建索引以便快速统计
downloadSchema.index({ audio: 1 });
downloadSchema.index({ createdAt: 1 });

export default mongoose.model('Download', downloadSchema);