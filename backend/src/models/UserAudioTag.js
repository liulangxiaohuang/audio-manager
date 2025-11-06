import mongoose from 'mongoose';

const userAudioTagSchema = new mongoose.Schema({
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
  tag: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 复合索引，确保用户对同一个音频不能重复添加相同标签
userAudioTagSchema.index({ user: 1, audio: 1, tag: 1 }, { unique: true });

// 为用户和标签创建索引
userAudioTagSchema.index({ user: 1, tag: 1 });
userAudioTagSchema.index({ audio: 1 });

export default mongoose.model('UserAudioTag', userAudioTagSchema);