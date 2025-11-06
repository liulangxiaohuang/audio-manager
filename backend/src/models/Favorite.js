import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
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
  folder: {
    type: String,
    default: 'default'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 创建复合索引，确保用户对同一个音频只能收藏一次
favoriteSchema.index({ user: 1, audio: 1 }, { unique: true });

// 为音频ID创建索引以便快速查询
favoriteSchema.index({ audio: 1 });

export default mongoose.model('Favorite', favoriteSchema);