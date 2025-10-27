import { DataSource } from 'typeorm';
import {
  FileSystemItemEntity,
  ItemType,
  DocumentType,
} from '../src/document/document.entity';
import { UserEntity } from '../src/users/user.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 从命令行参数检测环境（--prod 表示生产环境）
const isProduction = process.argv.includes('--prod');
const envFile = isProduction ? '.env.production' : '.env';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

console.log(`🔧 环境: ${isProduction ? '生产环境(线上)' : '开发环境(本地)'}`);
console.log(`📍 数据库: ${process.env.DB_HOST}\n`);

// 数据库配置（从环境变量读取，或使用默认值）
const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'Seem67wind',
  database: process.env.DB_DATABASE || 'docs-manage',
  entities: [FileSystemItemEntity, UserEntity],
  synchronize: false, // 不自动同步，避免误操作
});

// 随机选择数组元素
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 随机布尔值（概率可调）
function randomBool(probability = 0.5): boolean {
  return Math.random() < probability;
}

// 生成种子数据
async function seedDocuments(count = 10) {
  console.log(`🚀 开始生成 ${count} 条文档数据...\n`);

  try {
    // 初始化数据库连接
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const repo = AppDataSource.getRepository(FileSystemItemEntity);
    const userRepo = AppDataSource.getRepository(UserEntity);

    // 获取所有用户（随机分配创建者）
    const users = await userRepo.find();
    if (users.length === 0) {
      console.error('❌ 错误：users 表为空，请先创建用户');
      process.exit(1);
    }
    console.log(`📌 找到 ${users.length} 个用户\n`);

    // 获取现有的文件夹（用于随机分配 parentId）
    const existingFolders = await repo.find({
      where: { itemType: ItemType.FOLDER, isDeleted: false },
      select: ['id'],
    });
    const folderIds = existingFolders.map((f) => f.id);
    console.log(`📁 找到 ${folderIds.length} 个现有文件夹\n`);

    // 文档名称池
    const docNames = [
      '需求文档',
      '设计方案',
      '技术架构',
      '产品规划',
      '会议纪要',
      '周报总结',
      '项目进度',
      '接口文档',
      '测试报告',
      '用户手册',
      '数据分析',
      '市场调研',
      '竞品分析',
      '功能清单',
      '开发计划',
    ];

    const folderNames = [
      '项目资料',
      '团队文档',
      '产品设计',
      '技术文档',
      '运营资料',
      '客户资料',
      '财务报表',
      '人事档案',
      '市场推广',
      '研发资料',
    ];

    // 生成数据
    const items: Partial<FileSystemItemEntity>[] = [];

    for (let i = 0; i < count; i++) {
      const isFolder = randomBool(0.3); // 30% 文件夹，70% 文档
      // const creator = randomChoice(users); // 随机创建者（暂时不用）
      const parentId =
        folderIds.length > 0 && randomBool(0.7)
          ? randomChoice(folderIds)
          : null; // 70% 概率有父文件夹

      if (isFolder) {
        // 生成文件夹
        items.push({
          name: randomChoice(folderNames) + ` ${Date.now()}-${i}`,
          description: randomBool(0.6) ? '这是一个文件夹的描述信息' : undefined,
          itemType: ItemType.FOLDER,
          documentType: undefined,
          author: undefined,
          content: undefined,
          thumb_url: undefined, // 缩略图为空
          parentId: parentId || undefined,
          sortOrder: 0, // 暂时固定为 0
          // sortOrder: (i + 1) * 10, // 原逻辑：按顺序递增
          creatorId: 1, // 暂时固定为 1
          // creatorId: creator.id, // 原逻辑：随机分配创建者
          visibility: randomChoice(['private', 'shared', 'public']),
          isDeleted: false, // 暂时固定为 false
          // isDeleted: randomBool(0.05), // 原逻辑：5% 概率已删除
        });
      } else {
        // 生成文档
        const docType = randomChoice([
          DocumentType.TEXT,
          DocumentType.IMAGE,
          DocumentType.WORD,
          DocumentType.EXCEL,
          DocumentType.OTHER,
        ]);

        let content = '';

        // 只为 TEXT 类型生成内容
        if (docType === DocumentType.TEXT) {
          content =
            '这是一段示例文本内容，用于测试文档管理系统的功能。可以包含多行文本和格式化内容。';
        }

        items.push({
          name: randomChoice(docNames) + ` ${Date.now()}-${i}`,
          description: randomBool(0.7)
            ? '这是文档的描述信息，说明文档的用途和内容'
            : undefined,
          itemType: ItemType.DOCUMENT,
          documentType: docType,
          author: randomChoice(['张三', '李四', '王五', '赵六', '系统管理员']),
          content: content || undefined,
          thumb_url: undefined, // 缩略图为空
          parentId: parentId || undefined,
          sortOrder: 0, // 暂时固定为 0
          // sortOrder: (i + 1) * 10, // 原逻辑：按顺序递增
          creatorId: 1, // 暂时固定为 1
          // creatorId: creator.id, // 原逻辑：随机分配创建者
          visibility: randomChoice(['private', 'shared', 'public']),
          isDeleted: false, // 暂时固定为 false
          // isDeleted: randomBool(0.05), // 原逻辑：5% 概率已删除
        });
      }
    }

    // 批量插入
    const result = await repo.save(items);
    console.log(`✅ 成功插入 ${result.length} 条数据\n`);

    // 显示插入的数据摘要
    const folders = result.filter((item) => item.itemType === ItemType.FOLDER);
    const documents = result.filter(
      (item) => item.itemType === ItemType.DOCUMENT,
    );

    console.log('📊 数据统计：');
    console.log(`   - 文件夹：${folders.length} 个`);
    console.log(`   - 文档：${documents.length} 个`);
    console.log(
      `   - 已删除：${result.filter((item) => item.isDeleted).length} 个`,
    );
    console.log(
      `   - 根目录项：${result.filter((item) => !item.parentId).length} 个\n`,
    );

    console.log('📝 插入的数据示例：');
    result.slice(0, 3).forEach((item) => {
      console.log(`   - [${item.itemType}] ${item.name} (ID: ${item.id})`);
    });

    console.log('\n🎉 数据生成完成！');
  } catch (error) {
    console.error('❌ 错误：', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n✅ 数据库连接已关闭');
    }
  }
}

// 从命令行参数获取数量，默认 10
const count = parseInt(process.argv[2]) || 10;
seedDocuments(count);
