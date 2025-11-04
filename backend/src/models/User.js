import mongoose from 'mongoose';
import sha from 'js-sha256';
import jwt from 'jsonwebtoken'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  registerTime: {
    type: Date,
    default: Date.now
  },
  lastLoginTime: {
    type: Date
  },
  loginIP: {
    type: String
  },
  token: {
    type: String
  },
  tokenExpires: {
    type: Date
  },
  ext: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 密码加密中间件 - 对前端已经哈希的密码再次哈希
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = sha.sha256(this.password)
    next();
  } catch (error) {
    next(error);
  }
});

// 比较密码方法 - 比较前端哈希 + 后端哈希的密码
userSchema.methods.comparePassword = async function(candidateFrontendHashedPassword) {
  console.log('model compare pwd =>', candidateFrontendHashedPassword, this.password)

  const pwd = sha.sha256(candidateFrontendHashedPassword)
  
  try {
    // candidateFrontendHashedPassword 是前端已经哈希过的密码
    // this.password 是后端再次哈希后的密码
    return pwd === this.password
  } catch (error) {
    console.error('密码比较错误:', error);
    return false;
  }
};

// 生成 token 方法
userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { 
      userId: this._id,
      username: this.username,
      role: this.role 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { 
      expiresIn: process.env.TOKEN_EXPIRATION_TIME || '7d' 
    }
  );
  
  this.token = token;
  this.tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后过期
  
  return token;
};

// 检查 token 是否过期
userSchema.methods.isTokenExpired = function() {
  if (!this.tokenExpires) return true;
  return Date.now() >= this.tokenExpires.getTime();
};

// 转换为JSON时隐藏敏感信息
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.token;
  delete userObject.tokenExpires;
  return userObject;
};

export default mongoose.model('User', userSchema);