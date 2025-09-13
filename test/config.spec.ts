import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';

describe('Configuration Test', () => {
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  it('should load environment configuration correctly', () => {
    // 测试基本配置
    expect(configService.get('PORT')).toBeDefined();
    expect(configService.get('NODE_ENV')).toBeDefined();

    // 测试数据库配置
    expect(configService.get('DB_HOST')).toBeDefined();
    expect(configService.get('DB_PORT')).toBeDefined();

    // 测试JWT配置
    expect(configService.get('JWT_SECRET')).toBeDefined();
    expect(configService.get('JWT_REFRESH_SECRET')).toBeDefined();

    console.log('Configuration loaded successfully:');
    console.log('- PORT:', configService.get('PORT'));
    console.log('- NODE_ENV:', configService.get('NODE_ENV'));
    console.log('- DB_HOST:', configService.get('DB_HOST'));
    console.log('- JWT_SECRET exists:', !!configService.get('JWT_SECRET'));
    console.log(
      '- JWT_REFRESH_SECRET exists:',
      !!configService.get('JWT_REFRESH_SECRET'),
    );
  });
});
