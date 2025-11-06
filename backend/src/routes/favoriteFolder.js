import express from 'express';
import {
  getMyFavoriteFolders,
  createFavoriteFolder,
  getFolderAudios
} from '../controllers/audioController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// 获取我的收藏夹
router.get('/', authMiddleware, getMyFavoriteFolders);

// 创建收藏夹
router.post('/', authMiddleware, createFavoriteFolder);

// 获取收藏夹下的音频
router.get('/:folderId/audios', authMiddleware, getFolderAudios);

export default router;