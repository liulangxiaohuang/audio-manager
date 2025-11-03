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

const router = express.Router();

router.post('/sync', syncAudio);
router.get('/list', getAudioList);
router.get('/folders', getFolderStructure);
router.get('/file/:path', streamAudio);
router.put('/:id', updateAudio);
router.post('/:id/favorite', toggleFavorite);
router.delete('/:id', deleteAudio);
router.get('/favorites', getFavorites);
router.get('/contents', getFolderContents);
router.delete('/cleanup', cleanupDeletedAudio); // 添加清理路由

export default router;