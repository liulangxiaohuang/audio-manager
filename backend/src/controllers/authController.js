import User from '../models/User.js';
import jwt from 'jsonwebtoken'
// const jwt = require('jsonwebtoken');

// 用户注册
export const register = async (req, res) => {
  try {
    const { username, password: frontendHashedPassword, email, phone, ext } = req.body;

    console.log(`📝 注册用户: ${username}, 邮箱: ${email}`);

    // 检查用户是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }

    // 创建新用户
    const user = new User({
      username,
      password: frontendHashedPassword,
      email,
      phone,
      ext
    });

    await user.save();

    // 生成 token
    const token = user.generateAuthToken();
    await user.save();

    console.log(`✅ 用户注册成功: ${username}`);

    res.status(201).json({
      success: true,
      message: '用户注册成功',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 用户登录
export const login = async (req, res) => {
  try {
    const { username, password: frontendHashedPassword } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    console.log(`🔑 登录尝试: 用户名=${username}, IP=${clientIP}`);

    // 查找用户
    const user = await User.findOne({ username, isActive: true });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    console.log(`👤 找到用户: ${user.username}, 角色: ${user.role}`);
    console.log('login frontendHashedPassword =>', frontendHashedPassword)

    // 验证密码
    const isPasswordValid = await user.comparePassword(frontendHashedPassword);
    console.log(`🔐 密码验证结果: ${isPasswordValid}`);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 更新登录信息
    user.lastLoginTime = new Date();
    user.loginIP = clientIP;

    // 生成新 token
    const token = user.generateAuthToken();
    await user.save();

    res.json({
      success: true,
      message: '登录成功',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 验证 token
export const verifyToken = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供访问令牌'
      });
    }

    // 验证 JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 查找用户并检查 token 是否过期
    const user = await User.findOne({ 
      _id: decoded.userId, 
      token: token,
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '令牌无效'
      });
    }

    // 检查 token 是否过期
    if (user.isTokenExpired()) {
      return res.status(401).json({
        success: false,
        message: '令牌已过期，请重新登录'
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '令牌无效'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已过期'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 获取当前用户信息
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 用户退出登录
export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user) {
      user.token = null;
      user.tokenExpires = null;
      await user.save();
    }

    res.json({
      success: true,
      message: '退出登录成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 更新用户信息
export const updateProfile = async (req, res) => {
  try {
    const { email, phone, ext } = req.body;
    const updates = {};
    
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (ext) updates.ext = { ...req.user.ext, ...ext };

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: '用户信息更新成功',
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新失败',
      error: error.message
    });
  }
};