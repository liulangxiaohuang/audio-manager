import express from 'express';
import {
  addTagToAudio,
  removeTagFromAudio,
  getAudioTags
} from '../controllers/audioController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// 获取音频标签
router.get('/audio/:id', authMiddleware, getAudioTags);

// 添加标签到音频
router.post('/audio/:id', authMiddleware, addTagToAudio);

// 移除音频标签
router.delete('/audio/:id/tag/:tagId', authMiddleware, removeTagFromAudio);

export default router;