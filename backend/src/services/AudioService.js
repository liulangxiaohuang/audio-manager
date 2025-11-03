import fs from 'fs/promises';
import path from 'path';
import { parseFile } from 'music-metadata';
import Audio from '../models/Audio.js';
import Config from '../models/Config.js';
import ffmpeg from 'fluent-ffmpeg'
import { Writable } from 'stream'

const BAR_COUNT = 1000

class AudioService {
  constructor() {
    this.basePath = null;
  }

  async initialize() {
    const config = await Config.findOne({ key: 'audioBasePath' });
    if (config) {
      this.basePath = config.value;
      console.log(`Audio base path initialized: ${this.basePath}`);
    } else {
      console.log('No audio base path configured yet');
    }
  }

  async setBasePath(basePath) {
    try {
      // 验证路径是否存在
      await fs.access(basePath);
      this.basePath = basePath;
      
      await Config.findOneAndUpdate(
        { key: 'audioBasePath' },
        { key: 'audioBasePath', value: basePath },
        { upsert: true }
      );
      
      console.log(`Audio base path set to: ${basePath}`);
      return true;
    } catch (error) {
      console.error(`Failed to set base path: ${error.message}`);
      throw new Error(`路径无效或无法访问: ${error.message}`);
    }
  }

  async scanDirectory(dirPath = '') {
    if (!this.basePath) {
      throw new Error('Base path not configured');
    }

    const fullPath = path.join(this.basePath, dirPath);
    console.log(`Scanning directory: ${fullPath}`);
    
    try {
      const items = await fs.readdir(fullPath);
      const results = [];
      let audioCount = 0;

      for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const relativePath = path.join(dirPath, item);
        
        try {
          const stat = await fs.stat(itemPath);

          if (stat.isDirectory()) {
            // 对于文件夹，只记录基本信息，不递归扫描
            results.push({
              name: item,
              type: 'folder',
              path: relativePath
            });
            console.log(`Found folder: ${relativePath}`);
          } else if (this.isAudioFile(item)) {
            // 处理音频文件
            const audioInfo = await this.processAudioFile(itemPath, relativePath);
            if (audioInfo && !audioInfo.isDeleted) { // 只添加未删除的音频
              results.push(audioInfo);
              audioCount++;
              console.log(`Found audio: ${audioInfo.name} (${audioInfo.format})`);
            }
          }
        } catch (error) {
          console.error(`Error processing item ${itemPath}:`, error.message);
        }
      }

      console.log(`Scan completed: found ${audioCount} audio files in ${dirPath || 'root'}`);
      return results;
    } catch (error) {
      console.error(`Error scanning directory ${fullPath}:`, error.message);
      throw error;
    }
  }

  isAudioFile(filename) {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'];
    const ext = path.extname(filename).toLowerCase();
    const isAudio = audioExtensions.includes(ext);
    
    if (isAudio) {
      console.log(`Audio file detected: ${filename}`);
    }
    
    return isAudio;
  }

  async processAudioFile(filePath, relativePath) {
    try {
      // 检查文件是否已存在
      const existingAudio = await Audio.findOne({ path: filePath });
      if (existingAudio) {
        console.log(`Audio already exists in database: ${filePath}`);
        return {
          ...existingAudio.toObject(),
          type: 'audio'
        };
      }

      console.log(`Processing new audio file: ${filePath}`);
      
      // 解析音频元数据
      let metadata;
      let duration = 0;
      
      try {
        metadata = await parseFile(filePath);
        duration = metadata.format.duration || 0;
        console.log(`Metadata parsed for: ${path.basename(filePath)}, duration: ${duration}s`);
      } catch (error) {
        console.warn(`Failed to parse metadata for ${filePath}:`, error.message);
        
        // 如果元数据解析失败，尝试使用 ffprobe 获取时长
        try {
          duration = await this.getDurationWithFFprobe(filePath);
          console.log(`Duration obtained via ffprobe for ${path.basename(filePath)}: ${duration}s`);
        } catch (ffError) {
          console.warn(`Failed to get duration via ffprobe for ${filePath}:`, ffError.message);
          
          // 如果 ffprobe 也失败，尝试使用文件大小估算时长
          try {
            duration = await this.estimateDurationFromFileSize(filePath);
            console.log(`Duration estimated from file size for ${path.basename(filePath)}: ${duration}s`);
          } catch (sizeError) {
            console.warn(`Failed to estimate duration from file size for ${filePath}:`, sizeError.message);
            duration = 0;
          }
        }
      }

      // 如果时长仍然为0，记录警告但继续处理
      if (duration === 0) {
        console.warn(`Could not determine duration for ${filePath}, setting to 0`);
      }

      // 生成简化的波形数据
      const waveform = await this.generateWaveform(filePath);

      const audioData = {
        name: path.basename(relativePath, path.extname(relativePath)),
        filename: path.basename(relativePath),
        format: path.extname(relativePath).slice(1).toLowerCase(),
        folder: path.dirname(relativePath) || '/',
        path: filePath,
        url: `/api/audio/file/${encodeURIComponent(relativePath)}`,
        duration: Math.round(duration), // 取整
        waveform,
        tags: [],
        isFavorite: false,
        favoriteFolders: [],
        isDeleted: false
      };

      const audio = new Audio(audioData);
      await audio.save();
      
      console.log(`Audio saved to database: ${audioData.name}, duration: ${audioData.duration}s`);
      return {
        ...audioData,
        _id: audio._id,
        type: 'audio'
      };
    } catch (error) {
      console.error(`Error processing audio file ${filePath}:`, error);
      return null;
    }
  }

  // 新增方法：根据文件大小估算时长
  async estimateDurationFromFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileSizeInBytes = stats.size;
      const fileExtension = path.extname(filePath).toLowerCase();
      
      // 根据不同格式估算时长（这些是粗略估算值）
      const bitrateEstimates = {
        '.mp3': 128000, // 128 kbps
        '.wav': 1411000, // 1411 kbps (CD质量)
        '.flac': 1000000, // 1000 kbps
        '.m4a': 96000, // 96 kbps
        '.aac': 96000, // 96 kbps
        '.ogg': 112000, // 112 kbps
      };
      
      const bitrate = bitrateEstimates[fileExtension] || 128000; // 默认使用 128 kbps
      
      // 时长(秒) = 文件大小(字节) * 8 / 比特率(bps)
      const duration = (fileSizeInBytes * 8) / bitrate;
      
      return Math.max(1, Math.round(duration)); // 确保至少1秒
    } catch (error) {
      throw new Error(`Failed to estimate duration from file size: ${error.message}`);
    }
  }

  // 新增方法：使用 ffprobe 获取音频时长
  // 更新 ffprobe 方法以处理更多情况
  async getDurationWithFFprobe(filePath) {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      
      // 检查 ffprobe 是否可用
      const ffprobeCheck = spawn('which', ['ffprobe']);
      ffprobeCheck.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('ffprobe not found in PATH'));
          return;
        }
        
        // 使用 ffprobe 获取时长
        const ffprobe = spawn('ffprobe', [
          '-v', 'error',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          filePath
        ]);

        let output = '';
        let errorOutput = '';

        ffprobe.stdout.on('data', (data) => {
          output += data.toString();
        });

        ffprobe.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        ffprobe.on('close', (code) => {
          if (code === 0) {
            const duration = parseFloat(output.trim());
            if (!isNaN(duration) && duration > 0) {
              resolve(duration);
            } else {
              reject(new Error('Invalid duration output from ffprobe'));
            }
          } else {
            reject(new Error(`ffprobe failed with code ${code}: ${errorOutput}`));
          }
        });
      });
    });
  }

  // generateRealWaveform
  async generateWaveform(filePath) {
    return new Promise((resolve, reject) => {
      const waveform = [];
      const barCount = BAR_COUNT;
      
      // 使用 ffmpeg 提取音频数据
      const command = ffmpeg(filePath)
        .audioChannels(1) // 单声道
        .audioFrequency(22050) // 采样率
        .format('s16le') // 16位有符号小端序
        .on('error', reject);
      
      const audioData = [];
      const stream = new Writable({
        write(chunk, encoding, callback) {
          // 处理音频数据块
          for (let i = 0; i < chunk.length; i += 2) {
            const sample = chunk.readInt16LE(i);
            audioData.push(Math.abs(sample)); // 取绝对值得到振幅
          }
          callback();
        }
      });
      
      command.pipe(stream).on('finish', () => {
        // 从音频数据生成波形
        if (audioData.length === 0) {
          // 如果提取失败，返回更合理的模拟数据
          resolve(this.generateProgressiveWaveform());
          return;
        }
        
        // 将音频数据分成 barCount 个区间
        const samplesPerBar = Math.floor(audioData.length / barCount);
        
        for (let i = 0; i < barCount; i++) {
          const start = i * samplesPerBar;
          const end = start + samplesPerBar;
          const segment = audioData.slice(start, end);
          
          if (segment.length > 0) {
            // 计算该区间的RMS（均方根）值作为振幅
            const sumSquares = segment.reduce((sum, sample) => sum + sample * sample, 0);
            const rms = Math.sqrt(sumSquares / segment.length);
            
            // 归一化到 0-100 范围
            const maxPossible = 32768; // 16位有符号整数的最大值
            const normalized = (rms / maxPossible) * 100;
            
            waveform.push(normalized);
          } else {
            waveform.push(0);
          }
        }
        
        resolve(waveform);
      });
    });
  }

  // 渐进音效的模拟波形（如果真实提取失败时使用）
  generateProgressiveWaveform() {
    const barCount = BAR_COUNT;
    const waveform = [];
    
    for (let i = 0; i < barCount; i++) {
      // 模拟从小到大的渐进音效
      const progress = i / barCount;
      
      // 基础渐进增长
      let height = progress * 70 + 10;
      
      // 添加一些自然波动（但不是随机的忽高忽低）
      const naturalVariation = Math.sin(progress * Math.PI * 8) * 5;
      height += naturalVariation;
      
      // 确保在合理范围内
      height = Math.max(5, Math.min(95, height));
      
      waveform.push(height);
    }
    
    return waveform;
  }

  async syncAudioFiles() {
    if (!this.basePath) {
      throw new Error('Base path not configured');
    }

    console.log('Starting comprehensive audio sync...');
    const startTime = Date.now();
    
    try {
      // 先清空现有数据（可选，根据需求决定）
      // await Audio.deleteMany({});
      
      // 扫描根目录
      const rootContents = await this.scanDirectory();
      
      // 递归扫描所有子目录
      await this.scanSubdirectories(rootContents);
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      console.log(`Audio sync completed in ${duration.toFixed(2)} seconds`);
      
      return {
        success: true,
        message: `同步完成，耗时 ${duration.toFixed(2)} 秒`,
        fileCount: await Audio.countDocuments({ isDeleted: false })
      };
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  async scanSubdirectories(contents) {
    for (const item of contents) {
      if (item.type === 'folder') {
        try {
          console.log(`Scanning subdirectory: ${item.path}`);
          const subContents = await this.scanDirectory(item.path);
          item.items = subContents;
          
          // 递归扫描子文件夹
          await this.scanSubdirectories(subContents);
        } catch (error) {
          console.error(`Error scanning subdirectory ${item.path}:`, error.message);
        }
      }
    }
  }

  async getFolderContents(folderPath = '') {
    if (!this.basePath) {
      throw new Error('Base path not configured');
    }

    console.log(`Getting contents for folder: ${folderPath}`);
    const contents = await this.scanDirectory(folderPath);
    
    // 过滤掉已删除的音频
    const filteredContents = contents.filter(item => 
      item.type === 'folder' || (item.type === 'audio' && !item.isDeleted)
    );
    
    return filteredContents;
  }

  async getFolderStructure() {
    if (!this.basePath) {
      return [];
    }
    
    console.log('Getting folder structure');
    const contents = await this.scanDirectory();
    
    // 只返回文件夹结构，不包含音频文件
    const folders = contents.filter(item => item.type === 'folder');
    console.log(`Found ${folders.length} top-level folders`);
    
    return folders;
  }

  async searchAudio(query, folder = '') {
    const searchFilter = {
      isDeleted: false,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    if (folder) {
      searchFilter.folder = folder;
    }

    const results = await Audio.find(searchFilter).sort({ name: 1 });
    console.log(`Search for "${query}" in ${folder || 'all'} found ${results.length} results`);
    
    return results;
  }
}

export default new AudioService();