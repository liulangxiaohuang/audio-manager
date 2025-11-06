import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import audioRoutes from './routes/audio.js';
import authRoutes from './routes/auth.js'
import configRoutes from './routes/config.js';
import favoriteFolderRoutes from './routes/favoriteFolder.js';
import tagRoutes from './routes/tag.js';
import statsRoutes from './routes/stats.js';
import AudioService from './services/AudioService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// 路由
app.use('/api/audio', audioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/favorite-folders', favoriteFolderRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/stats', statsRoutes);

// 初始化
async function initializeApp() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audio-manager');
    console.log('Connected to MongoDB');
    
    await AudioService.initialize();
    console.log('Audio service initialized');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
}

initializeApp();