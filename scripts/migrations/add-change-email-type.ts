import { DataSource } from 'typeorm';

/**
 * 数据库迁移: 添加 change_email 验证码类型
 * 安全执行: 不会删除数据,只修改 enum 定义
 */
export async function addChangeEmailType(
  dataSource: DataSource,
): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();

    console.log('[Migration] 开始检查 email_verification_codes 表...');

    // 检查表是否存在
    const tableExists = await queryRunner.hasTable('email_verification_codes');
    if (!tableExists) {
      console.log('[Migration] 表不存在,跳过迁移');
      return;
    }

    // 检查当前的 enum 值
    const result = await queryRunner.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'email_verification_codes' 
      AND COLUMN_NAME = 'type'
    `);

    const currentType = result[0]?.COLUMN_TYPE || '';
    console.log('[Migration] 当前 type 字段定义:', currentType);

    // 检查是否已经包含 change_email
    if (currentType.includes('change_email')) {
      console.log('[Migration] change_email 类型已存在,无需迁移');
      return;
    }

    // 执行迁移
    console.log('[Migration] 开始添加 change_email 类型...');
    await queryRunner.query(`
      ALTER TABLE email_verification_codes 
      MODIFY COLUMN type enum('register','reset_password','change_email') NOT NULL 
      COMMENT '验证码类型'
    `);

    console.log('[Migration] ✅ 成功添加 change_email 验证码类型');
  } catch (error) {
    console.error('[Migration] ❌ 迁移失败:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}
