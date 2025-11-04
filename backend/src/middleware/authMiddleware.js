import User from '../models/User.js';
import jwt from 'jsonwebtoken'

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，未提供令牌'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
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

    req.userId = user._id;
    req.user = user;
    next();
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

export const adminMiddleware = async (req, res, next) => {
  try {
    await authMiddleware(req, res, () => {});
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，需要管理员权限'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

export default { authMiddleware, adminMiddleware };