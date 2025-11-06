import mongoose from 'mongoose';

const userFavoriteFolderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#007bff'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  audioCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 确保每个用户的收藏夹名称唯一
userFavoriteFolderSchema.index({ user: 1, name: 1 }, { unique: true });

// 为用户创建默认收藏夹的静态方法
userFavoriteFolderSchema.statics.createDefaultFolder = async function(userId) {
  const defaultFolder = new this({
    user: userId,
    name: '默认收藏夹',
    description: '系统默认创建的收藏夹',
    isDefault: true,
    color: '#007bff'
  });
  return await defaultFolder.save();
};

export default mongoose.model('UserFavoriteFolder', userFavoriteFolderSchema);