import statsService from '../services/StatsService.js';

class StatsController {
  // 获取统计信息
  async getStats(req, res) {
    try {
      const stats = await statsService.getStats();
      
      res.json({
        success: true,
        message: '获取统计信息成功',
        data: stats
      });
    } catch (error) {
      console.error('获取统计信息错误:', error);
      res.status(500).json({
        code: 500,
        message: error.message
      });
    }
  }

  async getFormatDistribution(req, res) {
    try {
      const distribution = await statsService.getFormatDistribution();
      res.json({
        code: 200,
        message: '获取格式分布成功',
        data: distribution
      });
    } catch (error) {
      console.error('获取格式分布错误:', error);
      res.status(500).json({
        code: 500,
        message: error.message
      });
    }
  }

  async getDurationDistribution(req, res) {
    try {
      const distribution = await statsService.getDurationDistribution();
      res.json({
        code: 200,
        message: '获取时长分布成功',
        data: distribution
      });
    } catch (error) {
      console.error('获取时长分布错误:', error);
      res.status(500).json({
        code: 500,
        message: error.message
      });
    }
  }

  async getUserRegistrationTrend(req, res) {
    try {
      const { days = 30 } = req.query;
      const trend = await statsService.getUserRegistrationTrend(parseInt(days));
      res.json({
        code: 200,
        message: '获取用户注册趋势成功',
        data: trend
      });
    } catch (error) {
      console.error('获取用户注册趋势错误:', error);
      res.status(500).json({
        code: 500,
        message: error.message
      });
    }
  }

  async getTagStats(req, res) {
    try {
      const tagStats = await statsService.getTagStats();
      res.json({
        code: 200,
        message: '获取标签统计成功',
        data: tagStats
      });
    } catch (error) {
      console.error('获取标签统计错误:', error);
      res.status(500).json({
        code: 500,
        message: error.message
      });
    }
  }

  async getRecentAudios(req, res) {
    try {
      const { limit = 10 } = req.query;
      const recentAudios = await statsService.getRecentAudios(parseInt(limit));
      res.json({
        code: 200,
        message: '获取最近音频成功',
        data: recentAudios
      });
    } catch (error) {
      console.error('获取最近音频错误:', error);
      res.status(500).json({
        code: 500,
        message: error.message
      });
    }
  }
}

export default new StatsController();