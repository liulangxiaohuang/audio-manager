import express from 'express';
import statsController from '../controllers/statsController.js';
import { adminMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// 获取统计信息
router.get('/', adminMiddleware, statsController.getStats);
router.get('/format-distribution', adminMiddleware, statsController.getFormatDistribution);
router.get('/duration-distribution', adminMiddleware, statsController.getDurationDistribution);
router.get('/user-registration-trend', adminMiddleware, statsController.getUserRegistrationTrend);
router.get('/tag-stats', adminMiddleware, statsController.getTagStats);
router.get('/recent-audios', adminMiddleware, statsController.getRecentAudios);

export default router;