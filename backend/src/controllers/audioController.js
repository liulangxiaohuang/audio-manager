import AudioService from '../services/AudioService.js';
import Audio from '../models/Audio.js';
import Favorite from '../models/Favorite.js'; // 新增
import Download from '../models/Download.js'; // 新增
import UserFavoriteFolder from '../models/UserFavoriteFolder.js'; // 新增
import UserAudioTag from '../models/UserAudioTag.js'; // 新增
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
    console.log(10, relativePath)
    console.log(11, fullPath)

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Audio file not found' });
    }

    // 记录下载（如果用户已登录）
    if (req.user && req.user.userId && req.headers['user-action'] === 'Download') {
      console.log(22, req.user)
      try {
        // 此处可以优化：
        // path可以取配置中的basePath + relativePath
        // 因为fullPath固化了系统的文件夹，加入系统目录变更，将会导致数据不可用
        const audio = await Audio.findOne({ path: fullPath });
        console.log(33, audio)
        if (audio) {
          // 增加下载计数
          audio.downloadCount += 1;
          await audio.save();
          
          // 记录下载详情
          const download = new Download({
            user: req.user.userId,
            audio: audio._id,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          await download.save();
          
          console.log(`Download recorded for audio: ${audio.name} by user: ${req.user.userId}`);
        }
      } catch (downloadError) {
        console.error('Error recording download:', downloadError);
        // 不阻断音频流，只记录错误
      }
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
    const { favoriteFolder: folderId } = req.body; // 改为传递收藏夹ID
    const userId = req.user.userId;

    // 检查音频是否存在
    const audio = await Audio.findById(id);
    if (!audio) {
      return res.status(404).json({ message: 'Audio not found' });
    }

    // 检查收藏夹是否存在且属于当前用户
    const folder = await UserFavoriteFolder.findOne({
      _id: folderId,
      user: userId
    });
    if (!folder) {
      return res.status(404).json({ message: 'Favorite folder not found' });
    }

    // 检查是否已经收藏
    const existingFavorite = await Favorite.findOne({
      user: userId,
      audio: id,
      folder: folderId
    });

    if (existingFavorite) {
      // 取消收藏
      await Favorite.findByIdAndDelete(existingFavorite._id);
      
      // 更新收藏夹的音频计数
      folder.audioCount = Math.max(0, folder.audioCount - 1);
      await folder.save();
      
      console.log(`User ${userId} removed audio "${audio.name}" from folder: ${folder.name}`);
      
      res.json({
        isFavorite: false,
        message: '取消收藏成功'
      });
    } else {
      // 添加收藏
      const favorite = new Favorite({
        user: userId,
        audio: id,
        folder: folderId
      });
      await favorite.save();
      
      // 更新收藏夹的音频计数
      folder.audioCount += 1;
      await folder.save();
      
      console.log(`User ${userId} added audio "${audio.name}" to folder: ${folder.name}`);
      
      res.json({
        isFavorite: true,
        message: '收藏成功'
      });
    }
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
    const { folderId } = req.query; // 改为传递收藏夹ID
    const userId = req.user.userId;

    let favoriteFilter = { user: userId };
    
    if (folderId && folderId !== 'all') {
      // 验证收藏夹属于当前用户
      const folder = await UserFavoriteFolder.findOne({
        _id: folderId,
        user: userId
      });
      if (!folder) {
        return res.status(404).json({ message: 'Favorite folder not found' });
      }
      favoriteFilter.folder = folderId;
    }

    // 获取用户的收藏记录，并关联音频和收藏夹信息
    const favorites = await Favorite.find(favoriteFilter)
      .populate('audio')
      .populate('folder', 'name color')
      .sort({ createdAt: -1 });

    // 过滤掉已删除的音频
    const validFavorites = favorites.filter(fav => 
      fav.audio && !fav.audio.isDeleted
    );

    // 转换为音频列表格式
    const audios = validFavorites.map(fav => ({
      ...fav.audio.toObject(),
      isFavorite: true,
      favorite: {
        folder: {
          id: fav.folder?._id,
          name: fav.folder?.name,
          color: fav.folder?.color
        },
        isFavorite: true
      }
    }));

    // 对于音频文件，获取当前用户的标签和收藏状态
    const audioIds = audios.map(item => item._id);
    
    // 并行查询用户的标签和收藏状态
    const [userTags] = await Promise.all([
      // 获取用户标签
      UserAudioTag.find({
        user: userId,
        audio: { $in: audioIds }
      })
    ]);
    
    // 将标签按音频ID分组
    const tagsByAudio = userTags.reduce((acc, tag) => {
      if (!acc[tag.audio]) {
        acc[tag.audio] = [];
      }
      acc[tag.audio].push({
        _id: tag._id,
        tag: tag.tag,
        createdAt: tag.createdAt
      });
      return acc;
    }, {});
    
    // 将用户数据添加到音频对象中
    const contentsWithUserData = audios.map(item => {
      if (item.type === 'audio') {
        const audioId = item._id.toString();
        return {
          // ...item.toObject(),
          ...item,
          tags: tagsByAudio[audioId] || [],
        };
      }
      return item;
    });

    res.json(contentsWithUserData)
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 新增：获取用户的收藏夹列表
export const getMyFavoriteFolders = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const folders = await UserFavoriteFolder.find({ user: userId })
      .sort({ isDefault: -1, order: 1, createdAt: 1 });
    
    res.json(folders);
  } catch (error) {
    console.error('Error getting favorite folders:', error);
    res.status(500).json({ message: error.message });
  }
};

// 新增：创建收藏夹
export const createFavoriteFolder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, color } = req.body;
    
    const folder = new UserFavoriteFolder({
      user: userId,
      name,
      description: description || '',
      color: color || '#007bff'
    });
    
    await folder.save();
    
    res.status(201).json({
      message: '收藏夹创建成功',
      folder
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '收藏夹名称已存在' });
    }
    console.error('Error creating favorite folder:', error);
    res.status(500).json({ message: error.message });
  }
};

// 新增：获取特定收藏夹下的所有音频
export const getFolderAudios = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.userId;
    
    // 验证收藏夹属于当前用户
    const folder = await UserFavoriteFolder.findOne({
      _id: folderId,
      user: userId
    });
    if (!folder) {
      return res.status(404).json({ message: '收藏夹不存在' });
    }
    
    // 获取该收藏夹下的所有收藏记录
    const favorites = await Favorite.find({
      user: userId,
      folder: folderId
    })
    .populate('audio')
    .sort({ createdAt: -1 });
    
    // 过滤掉已删除的音频
    const validFavorites = favorites.filter(fav => 
      fav.audio && !fav.audio.isDeleted
    );
    
    // 转换为音频列表
    const audios = validFavorites.map(fav => ({
      ...fav.audio.toObject(),
      isFavorite: true,
      favorite: {
        folder,
        isFavorite: true
      },
      favoritedAt: fav.createdAt
    }));
    
    res.json({
      folder: {
        id: folder._id,
        name: folder.name,
        description: folder.description,
        color: folder.color,
        audioCount: folder.audioCount
      },
      audios
    });
  } catch (error) {
    console.error('Error getting folder audios:', error);
    res.status(500).json({ message: error.message });
  }
};

// 新增：检查用户是否收藏了某个音频
export const checkFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const favorite = await Favorite.findOne({
      user: userId,
      audio: id
    }).populate('folder', 'name color');

    res.json({
      isFavorite: !!favorite,
      folder: favorite ? {
        id: favorite.folder._id,
        name: favorite.folder.name,
        color: favorite.folder.color
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const getFolderContents = async (req, res) => {
//   try {
//     const { path } = req.query;
//     console.log(`Getting folder contents for: ${path}`);
    
//     // 获取文件夹内容时也要过滤已删除的音频
//     const contents = await AudioService.getFolderContents(path || '');
    
//     // 过滤掉已删除的音频
//     const filteredContents = contents.filter(item => 
//       item.type === 'folder' || (item.type === 'audio' && !item.isDeleted)
//     );
    
//     res.json(filteredContents);
//   } catch (error) {
//     console.error('Error getting folder contents:', error);
//     res.status(500).json({ message: error.message });
//   }
// };
export const getFolderContents = async (req, res) => {
  try {
    const { path } = req.query;
    const userId = req.user.userId; // 获取当前用户ID
    
    console.log(`Getting folder contents for: ${path}`);
    
    // 获取文件夹内容时也要过滤已删除的音频
    const contents = await AudioService.getFolderContents(path || '');
    
    // 过滤掉已删除的音频
    const filteredContents = contents.filter(item => 
      item.type === 'folder' || (item.type === 'audio' && !item.isDeleted)
    );

    // 对于音频文件，获取当前用户的标签和收藏状态
    const audioItems = filteredContents.filter(item => item.type === 'audio');
    const audioIds = audioItems.map(item => item._id);
    
    // 并行查询用户的标签和收藏状态
    const [userTags, userFavorites] = await Promise.all([
      // 获取用户标签
      UserAudioTag.find({
        user: userId,
        audio: { $in: audioIds }
      }),
      // 获取用户收藏
      Favorite.find({
        user: userId,
        audio: { $in: audioIds }
      }).populate('folder', 'name color')
    ]);
    
    // 将标签按音频ID分组
    const tagsByAudio = userTags.reduce((acc, tag) => {
      if (!acc[tag.audio]) {
        acc[tag.audio] = [];
      }
      acc[tag.audio].push({
        _id: tag._id,
        tag: tag.tag,
        createdAt: tag.createdAt
      });
      return acc;
    }, {});
    
    // 将收藏按音频ID分组（一个音频只能在一个收藏夹中）
    const favoriteByAudio = userFavorites.reduce((acc, favorite) => {
      acc[favorite.audio] = {
        isFavorite: true,
        folder: {
          _id: favorite.folder?._id,
          name: favorite.folder?.name,
          color: favorite.folder?.color
        },
        favoritedAt: favorite.createdAt
      };
      return acc;
    }, {});
    
    // 将用户数据添加到音频对象中
    const contentsWithUserData = filteredContents.map(item => {
      if (item.type === 'audio') {
        const audioId = item._id.toString();
        return {
          // ...item.toObject(),
          ...item,
          tags: tagsByAudio[audioId] || [],
          favorite: favoriteByAudio[audioId] || {
            isFavorite: false,
            folder: null
          }
        };
      }
      return item;
    });
    
    res.json(contentsWithUserData);
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

// 新增：添加标签到音频
export const addTagToAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const { tag } = req.body;
    const userId = req.user.userId;
    
    // 检查音频是否存在
    const audio = await Audio.findById(id);
    if (!audio) {
      return res.status(404).json({ message: 'Audio not found' });
    }
    
    const audioTag = new UserAudioTag({
      user: userId,
      audio: id,
      tag: tag.trim()
    });
    
    await audioTag.save();
    
    res.status(201).json({
      message: '标签添加成功',
      tag: audioTag
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '该标签已存在' });
    }
    console.error('Error adding tag:', error);
    res.status(500).json({ message: error.message });
  }
};

// 新增：移除音频标签
export const removeTagFromAudio = async (req, res) => {
  try {
    const { id, tagId } = req.params;
    const userId = req.user.userId;
    
    const result = await UserAudioTag.findOneAndDelete({
      _id: tagId,
      user: userId,
      audio: id
    });
    
    if (!result) {
      return res.status(404).json({ message: '标签不存在' });
    }
    
    res.json({
      message: '标签移除成功'
    });
  } catch (error) {
    console.error('Error removing tag:', error);
    res.status(500).json({ message: error.message });
  }
};

// 新增：获取音频的标签
export const getAudioTags = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const tags = await UserAudioTag.find({
      user: userId,
      audio: id
    }).sort({ createdAt: 1 });
    
    res.json(tags);
  } catch (error) {
    console.error('Error getting audio tags:', error);
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