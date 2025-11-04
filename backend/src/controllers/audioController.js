import AudioService from '../services/AudioService.js';
import Audio from '../models/Audio.js';
import fs from 'fs';
import path from 'path';

export const syncAudio = async (req, res) => {
  req.setTimeout(20 * 60 * 1000); // 20分钟
  try {
    console.log('Sync request received');
    const result = await AudioService.syncAudioFiles();
    res.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const getAudioList = async (req, res) => {
  try {
    const { folder, search } = req.query;
    let audios;

    if (search) {
      audios = await AudioService.searchAudio(search, folder);
    } else {
      const filter = { isDeleted: false }; // 只返回未删除的音频
      if (folder) {
        filter.folder = folder;
      }
      audios = await Audio.find(filter).sort({ name: 1 });
    }

    res.json(audios);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFolderStructure = async (req, res) => {
  try {
    console.log('Getting folder structure');
    const structure = await AudioService.getFolderStructure();
    res.json(structure);
  } catch (error) {
    console.error('Error getting folder structure:', error);
    res.status(500).json({ message: error.message });
  }
};

export const streamAudio = async (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params.path);
    const fullPath = path.join(AudioService.basePath, relativePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Audio file not found' });
    }

    const stat = fs.statSync(fullPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(fullPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(200, head);
      fs.createReadStream(fullPath).pipe(res);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tags, favoriteFolders } = req.body;

    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (tags !== undefined) updateData.tags = tags;
    if (favoriteFolders !== undefined) updateData.favoriteFolders = favoriteFolders;

    const audio = await Audio.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!audio) {
      return res.status(404).json({ message: 'Audio not found' });
    }

    console.log(`Audio updated: ${audio.name}`);
    res.json(audio);
  } catch (error) {
    console.error('Error updating audio:', error);
    res.status(500).json({ message: error.message });
  }
};

export const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const { favoriteFolder = 'default' } = req.body;

    const audio = await Audio.findById(id);
    if (!audio) {
      return res.status(404).json({ message: 'Audio not found' });
    }

    // 检查是否已经在收藏夹中
    const isInFolder = audio.favoriteFolders.includes(favoriteFolder);
    
    if (isInFolder) {
      // 从收藏夹移除
      audio.favoriteFolders = audio.favoriteFolders.filter(f => f !== favoriteFolder);
      audio.isFavorite = false
    } else {
      // 添加到收藏夹
      audio.favoriteFolders.push(favoriteFolder);
      audio.isFavorite = true
    }

    console.log(audio)

    await audio.save();
    
    console.log(`Audio " ${audio.name} " ${isInFolder ? 'removed from' : 'added to'} favorite folder: ${favoriteFolder}`);
    
    res.json({
      ...audio.toObject(),
      isFavorite: audio.favoriteFolders.length > 0
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteAudio = async (req, res) => {
  try {
    const { id } = req.params;

    // 硬删除 - 直接从数据库中删除记录
    const result = await Audio.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ message: 'Audio not found' });
    }
    
    console.log(`Audio permanently deleted: ${id}`);
    res.json({ 
      success: true,
      message: 'Audio permanently deleted' 
    });
  } catch (error) {
    console.error('Error deleting audio:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getFavorites = async (req, res) => {
  try {
    const { folder } = req.query;
    const filter = { 
      isDeleted: false, // 只返回未删除的收藏
      favoriteFolders: { $exists: true, $ne: [] }
    };

    if (folder && folder !== 'all') {
      filter.favoriteFolders = folder;
    }

    const audios = await Audio.find(filter).sort({ name: 1 });
    res.json(audios);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFolderContents = async (req, res) => {
  try {
    const { path } = req.query;
    console.log(`Getting folder contents for: ${path}`);
    
    // 获取文件夹内容时也要过滤已删除的音频
    const contents = await AudioService.getFolderContents(path || '');
    
    // 过滤掉已删除的音频
    const filteredContents = contents.filter(item => 
      item.type === 'folder' || (item.type === 'audio' && !item.isDeleted)
    );
    
    res.json(filteredContents);
  } catch (error) {
    console.error('Error getting folder contents:', error);
    res.status(500).json({ message: error.message });
  }
};

export const cleanupDeletedAudio = async (req, res) => {
  try {
    // 永久删除所有标记为已删除的音频
    const result = await Audio.deleteMany({ isDeleted: true });
    
    console.log(`Cleaned up ${result.deletedCount} deleted audio files`);
    res.json({ 
      success: true,
      message: `Cleaned up ${result.deletedCount} deleted audio files`
    });
  } catch (error) {
    console.error('Error cleaning up deleted audio:', error);
    res.status(500).json({ message: error.message });
  }
};

export const searchAudio = async (req, res) => {
  try {
    const { query, folder } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    console.log(`Searching for: "${query}" in folder: ${folder || 'all'}`);
    
    let searchFilter = {
      isDeleted: false,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    // 如果指定了文件夹，只在指定文件夹中搜索
    if (folder) {
      searchFilter.folder = folder;
    }

    const results = await Audio.find(searchFilter).sort({ name: 1 });
    console.log(`Search found ${results.length} results`);
    
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: error.message });
  }
};