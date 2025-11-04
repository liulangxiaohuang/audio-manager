import mongoose from 'mongoose'
import sha from 'js-sha256';
import readline from 'readline'
import dot from 'dotenv'

// 直接使用与主项目相同的用户模型
import User from './src/models/User.js'

dot.config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class AdminInitializer {
  constructor() {
    this.dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/audio_manager';
  }

  async connectDB() {
    try {
      await mongoose.connect(this.dbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ 成功连接到 MongoDB');
      return true;
    } catch (error) {
      console.error('❌ 连接 MongoDB 失败:', error.message);
      return false;
    }
  }

  async disconnectDB() {
    await mongoose.disconnect();
    console.log('📤 已断开数据库连接');
  }

  async checkExistingAdmin() {
    try {
      const adminCount = await User.countDocuments({ role: 'admin' });
      console.log(`📊 当前系统中有 ${adminCount} 个管理员账户`);
      
      if (adminCount > 0) {
        const admins = await User.find({ role: 'admin' }).select('username email registerTime');
        console.log('📋 现有管理员列表:');
        admins.forEach(admin => {
          console.log(`   - ${admin.username} (${admin.email}) - 注册时间: ${admin.registerTime}`);
        });
      }
      
      return adminCount > 0;
    } catch (error) {
      console.error('❌ 检查现有管理员失败:', error.message);
      return false;
    }
  }

  async createAdminUser(userData) {
    try {
      // 检查用户名和邮箱是否已存在
      const existingUser = await User.findOne({
        $or: [{ username: userData.username }, { email: userData.email }]
      });

      if (existingUser) {
        if (existingUser.username === userData.username) {
          console.log(`❌ 用户名 "${userData.username}" 已存在`);
        }
        if (existingUser.email === userData.email) {
          console.log(`❌ 邮箱 "${userData.email}" 已存在`);
        }
        return false;
      }

      console.log('🔐 模拟前端密码哈希...');
      console.log('原始密码：', userData.password)
      
      // 模拟前端哈希
      const frontendHashedPassword = sha.sha256(userData.password);
      console.log(`   前端哈希结果: ${frontendHashedPassword}`);
      
      // 创建管理员账户
      const adminUser = new User({
        username: userData.username,
        password: frontendHashedPassword, // 使用前端哈希后的密码
        email: userData.email,
        phone: userData.phone || '',
        role: 'admin',
        ext: {
          isInitialAdmin: true,
          initializedBy: 'init-script',
          initializedAt: new Date(),
          hashMethod: 'frontend-bcrypt-10+backend-bcrypt-12'
        }
      });

      // 保存用户（后端会自动再次哈希）
      await adminUser.save();
      
      console.log('✅ 管理员账户创建成功!');
      console.log('📋 账户信息:');
      console.log(`   用户名: ${adminUser.username}`);
      console.log(`   邮箱: ${adminUser.email}`);
      console.log(`   角色: ${adminUser.role}`);
      console.log(`   创建时间: ${adminUser.registerTime}`);
      console.log('⚠️  请务必在登录后修改默认密码!');
      
      // 验证登录流程
      console.log('\n🔍 验证登录流程...');
      
      // 查找用户
      const foundUser = await User.findOne({ username: userData.username }).select('+password');
      
      // 模拟前端哈希（与登录时相同）
      const isValid = await foundUser.comparePassword(frontendHashedPassword);
      
      if (isValid) {
        console.log('✅ 密码验证通过 - 登录流程正常');
      } else {
        console.log('❌ 密码验证失败 - 登录可能有问题');
        console.log('💡 可能的原因:');
        console.log('   - 前后端哈希盐轮数不一致');
        console.log('   - 哈希算法不匹配');
      }
      
      return true;
    } catch (error) {
      console.error('❌ 创建管理员账户失败:', error.message);
      if (error.code === 11000) {
        console.log('💡 提示: 用户名或邮箱已存在');
      }
      return false;
    }
  }

  question(text) {
    return new Promise((resolve) => {
      rl.question(text, resolve);
    });
  }

  async run() {
    console.log('🚀 开始初始化管理员账户...\n');
    console.log('🔐 使用双重bcrypt哈希方案:');
    console.log('   前端: bcrypt(盐轮数=10)');
    console.log('   后端: bcrypt(盐轮数=12)\n');

    // 连接数据库
    const connected = await this.connectDB();
    if (!connected) {
      rl.close();
      return;
    }

    // 检查是否已有管理员
    const hasAdmin = await this.checkExistingAdmin();
    if (hasAdmin) {
      const proceed = await this.question('⚠️  系统中已存在管理员账户，是否继续创建新的管理员？(y/N): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('👋 操作已取消');
        await this.disconnectDB();
        rl.close();
        return;
      }
    }

    // 获取用户输入
    console.log('\n📝 请输入管理员账户信息:');
    
    const username = await this.question('用户名 (默认: admin): ') || 'admin';
    const password = await this.question('密码 (默认: admin123): ') || 'admin123';
    const email = await this.question('邮箱 (默认: admin@example.com): ') || 'admin@example.com';
    const phone = await this.question('联系电话 (可选): ');

    console.log('\n📋 确认创建信息:');
    console.log(`   用户名: ${username}`);
    console.log(`   密码: ${'*'.repeat(password.length)}`);
    console.log(`   邮箱: ${email}`);
    console.log(`   联系电话: ${phone || '未提供'}`);

    const confirm = await this.question('\n✅ 确认创建此管理员账户？(Y/n): ');
    
    if (confirm.toLowerCase() === 'n') {
      console.log('👋 操作已取消');
    } else {
      const success = await this.createAdminUser({
        username,
        password,
        email,
        phone
      });
      
      if (!success) {
        console.log('\n❌ 创建管理员失败，请检查错误信息');
      }
    }

    await this.disconnectDB();
    rl.close();
  }
}

// 自动运行脚本
const initializer = new AdminInitializer();
initializer.run().catch(console.error);