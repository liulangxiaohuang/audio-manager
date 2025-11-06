import express from 'express';
import {
  syncAudio,
  getAudioList,
  getFolderStructure,
  streamAudio,
  updateAudio,
  toggleFavorite,
  deleteAudio,
  getFavorites,
  getFolderContents,
  cleanupDeletedAudio
} from '../controllers/audioController.js';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/sync', adminMiddleware, syncAudio);
router.get('/list', authMiddleware, getAudioList);
router.get('/folders', authMiddleware, getFolderStructure);
router.get('/file/:path', authMiddleware, streamAudio);
router.put('/:id', adminMiddleware, updateAudio);
router.post('/:id/favorite', authMiddleware, toggleFavorite);
router.delete('/:id', adminMiddleware, deleteAudio);
router.get('/favorites', authMiddleware, getFavorites);
router.get('/contents', authMiddleware, getFolderContents);
router.delete('/cleanup', adminMiddleware, cleanupDeletedAudio); // 添加清理路由

export default router;