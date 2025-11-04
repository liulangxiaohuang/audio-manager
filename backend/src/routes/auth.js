import express from 'express';
import {
  register,
  login,
  verifyToken,
  getCurrentUser,
  logout,
  updateProfile
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', verifyToken);

// 需要认证的路由
router.get('/me', authMiddleware, getCurrentUser);
router.post('/logout', authMiddleware, logout);
router.put('/profile', authMiddleware, updateProfile);

export default router;