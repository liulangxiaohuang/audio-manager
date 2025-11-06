import mongoose from 'mongoose';

const audioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  format: {
    type: String,
    required: true
  },
  folder: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  waveform: {
    type: [Number],
    default: []
  },
  tags: [{
    type: String
  }],
  downloadCount: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 创建索引以便快速搜索
audioSchema.index({ name: 'text', tags: 'text' });
audioSchema.index({ folder: 1 });
audioSchema.index({ downloadCount: -1 }); // 为下载次数创建索引

export default mongoose.model('Audio', audioSchema);