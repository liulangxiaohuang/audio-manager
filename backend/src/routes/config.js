import express from 'express';
import AudioService from '../services/AudioService.js';
import Config from '../models/Config.js';
import fs from 'fs/promises';

const router = express.Router();

router.get('/base-path', async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'audioBasePath' });
    res.json({ basePath: config ? config.value : '' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/base-path', async (req, res) => {
  try {
    const { basePath } = req.body;
    
    // 验证路径是否存在
    try {
      await fs.access(basePath);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: '路径不存在或无法访问' 
      });
    }
    
    await AudioService.setBasePath(basePath);
    res.json({ 
      success: true, 
      message: '基础路径设置成功' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 添加路径测试端点
router.post('/test-path', async (req, res) => {
  try {
    const { basePath } = req.body;
    
    if (!basePath) {
      return res.status(400).json({ 
        success: false, 
        message: '路径不能为空' 
      });
    }
    
    // 验证路径是否存在
    try {
      await fs.access(basePath);
      
      // 检查路径是否是目录
      const stats = await fs.stat(basePath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ 
          success: false, 
          message: '路径不是一个目录' 
        });
      }
      
      res.json({ 
        success: true, 
        message: '路径有效且可访问' 
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: '路径不存在或无法访问' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;