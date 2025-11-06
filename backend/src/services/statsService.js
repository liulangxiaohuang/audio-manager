import User from '../models/User.js';
import Audio from '../models/Audio.js';
import Favorite from '../models/Favorite.js'; // 新增

class StatsService {
  // 获取统计信息
  async getStats() {
    try {
      // 并行执行所有统计查询以提高性能
      const [
        userCount,
        audioCount,
        folderCount,
        favoriteCount,
        totalDuration
      ] = await Promise.all([
        // 用户总数
        User.countDocuments(),
        
        // 音频总数 (排除已删除的)
        Audio.countDocuments({ isDeleted: false }),
        
        // 文件夹总数 (去重统计)
        Audio.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$folder' } },
          { $count: 'count' }
        ]),
        
        // 收藏总数 - 修改：从 Favorite 表统计
        Favorite.countDocuments(),

        Audio.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: null, total: { $sum: '$duration' } } }
        ])
      ]);

      return {
        userCount,
        audioCount,
        folderCount: folderCount[0]?.count || 0,
        favoriteCount,
        totalDuration: totalDuration[0]?.total || 0
      };
    } catch (error) {
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }

  // 获取音频格式分布
  async getFormatDistribution() {
    try {
      const distribution = await Audio.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$format', count: { $sum: 1 } } },
        { $project: { name: '$_id', value: '$count', _id: 0 } }
      ]);
      return distribution;
    } catch (error) {
      throw new Error(`获取音频格式分布失败: ${error.message}`);
    }
  }

  // 获取音频时长分布
  async getDurationDistribution() {
    try {
      const distribution = await Audio.aggregate([
        { $match: { isDeleted: false } },
        {
          $bucket: {
            groupBy: '$duration',
            boundaries: [0, 60, 180, 300, 600, 1800, 3600],
            default: 'long',
            output: {
              count: { $sum: 1 },
              items: { $push: { name: '$name', duration: '$duration' } }
            }
          }
        },
        {
          $project: {
            range: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id', 0] }, then: '0-1分钟' },
                  { case: { $eq: ['$_id', 60] }, then: '1-3分钟' },
                  { case: { $eq: ['$_id', 180] }, then: '3-5分钟' },
                  { case: { $eq: ['$_id', 300] }, then: '5-10分钟' },
                  { case: { $eq: ['$_id', 600] }, then: '10-30分钟' },
                  { case: { $eq: ['$_id', 1800] }, then: '30-60分钟' }
                ],
                default: '60分钟以上'
              }
            },
            count: 1,
            _id: 0
          }
        }
      ]);
      return distribution;
    } catch (error) {
      throw new Error(`获取音频时长分布失败: ${error.message}`);
    }
  }

  // 获取用户注册趋势
  async getUserRegistrationTrend(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trend = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // 填充缺失的日期
      const dates = [];
      const counts = [];
      const currentDate = new Date(startDate);
      const endDate = new Date();

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const found = trend.find(item => item._id === dateStr);
        dates.push(dateStr);
        counts.push(found ? found.count : 0);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return { dates, counts };
    } catch (error) {
      throw new Error(`获取用户注册趋势失败: ${error.message}`);
    }
  }

  // 获取标签统计
  async getTagStats() {
    try {
      const tagStats = await Audio.aggregate([
        { $match: { isDeleted: false, tags: { $exists: true, $ne: [] } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      return tagStats.map(tag => ({
        name: tag._id,
        value: tag.count
      }));
    } catch (error) {
      throw new Error(`获取标签统计失败: ${error.message}`);
    }
  }

  // 获取最近上传的音频
  async getRecentAudios(limit = 10) {
    try {
      const recentAudios = await Audio.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name format duration folder createdAt isFavorite')
        .lean();

      return recentAudios;
    } catch (error) {
      throw new Error(`获取最近音频失败: ${error.message}`);
    }
  }

  // 获取收藏最多的音频
  async getMostFavoritedAudios(limit = 10) {
    try {
      const mostFavorited = await Favorite.aggregate([
        {
          $group: {
            _id: '$audio',
            favoriteCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'audios',
            localField: '_id',
            foreignField: '_id',
            as: 'audioInfo'
          }
        },
        {
          $unwind: '$audioInfo'
        },
        {
          $match: {
            'audioInfo.isDeleted': false
          }
        },
        {
          $project: {
            _id: '$audioInfo._id',
            name: '$audioInfo.name',
            format: '$audioInfo.format',
            duration: '$audioInfo.duration',
            folder: '$audioInfo.folder',
            url: '$audioInfo.url',
            favoriteCount: 1
          }
        },
        {
          $sort: { favoriteCount: -1 }
        },
        {
          $limit: limit
        }
      ]);

      return mostFavorited;
    } catch (error) {
      throw new Error(`获取收藏最多音频失败: ${error.message}`);
    }
  }

  // 获取下载最多的音频
  async getMostDownloadedAudios(limit = 10) {
    try {
      const mostDownloaded = await Audio.find({ 
        isDeleted: false,
        downloadCount: { $gt: 0 }
      })
      .sort({ downloadCount: -1 })
      .limit(limit)
      .select('name format duration folder downloadCount url')
      .lean();

      return mostDownloaded;
    } catch (error) {
      throw new Error(`获取下载最多音频失败: ${error.message}`);
    }
  }

  // 获取用户的收藏统计
  async getUserFavoriteStats(userId) {
    try {
      const favoriteStats = await Favorite.aggregate([
        {
          $match: { user: mongoose.Types.ObjectId(userId) }
        },
        {
          $group: {
            _id: '$folder',
            count: { $sum: 1 }
          }
        }
      ]);

      return favoriteStats;
    } catch (error) {
      throw new Error(`获取用户收藏统计失败: ${error.message}`);
    }
  }
}

export default new StatsService();