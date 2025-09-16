import { Controller, Get, Query } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const execAsync = promisify(exec);

@Controller('logs')
export class LogsController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  getLogsHelp() {
    return {
      message: 'Logs API - Available endpoints',
      endpoints: {
        '/api/logs/app': 'Get application logs',
        '/api/logs/mysql': 'Get MySQL logs',
        '/api/logs/all': 'Get all service logs',
        '/api/logs/status': 'Get system status',
        '/api/logs/simple': 'Get simple Node.js process info',
        '/api/logs/test-db': 'Test database connection',
        '/api/logs/db-check': 'Check database tables and connection',
      },
      webInterface: 'Visit /logs.html for web interface',
    };
  }

  @Get('simple')
  async getSimpleLogs() {
    try {
      const { stdout } = await execAsync('ps aux | head -20');
      return {
        success: true,
        logs: stdout,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('app')
  async getAppLogs(@Query('lines') lines: string = '50') {
    try {
      // 尝试多种方式获取应用日志
      const commands = [
        'journalctl -u docs-manage --no-pager -n ' + lines,
        'tail -' + lines + ' /var/log/docs-manage.log',
        'ps aux | grep node',
        'echo "Node.js process info:" && ps aux | grep node && echo "Environment:" && env | grep NODE',
      ];

      let lastError = null;
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd);
          if (stdout.trim()) {
            return {
              success: true,
              logs: stdout,
              command: cmd,
              timestamp: new Date().toISOString(),
            };
          }
        } catch (error: any) {
          lastError = error;
          continue;
        }
      }

      throw lastError || new Error('No logs found');
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        fallback: 'Try /api/logs/simple for basic process info',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('mysql')
  async getMySQLLogs() {
    try {
      // 尝试多种方式获取MySQL相关信息
      const commands = [
        'mysqladmin status',
        'mysql -e "SHOW PROCESSLIST;"',
        'ps aux | grep mysql',
        'netstat -an | grep 3306',
      ];

      let result = '';
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd);
          if (stdout.trim()) {
            result += `=== ${cmd} ===\n${stdout}\n\n`;
          }
        } catch (error: any) {
          result += `=== ${cmd} (Failed) ===\n${error.message}\n\n`;
        }
      }

      return {
        success: true,
        logs: result || 'No MySQL information available',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('all')
  async getAllLogs() {
    try {
      const commands = [
        'ps aux',
        'df -h',
        'free -m',
        'netstat -tulpn',
        'env | grep -E "(NODE|DB|PORT)"',
      ];

      let result = '';
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd);
          result += `=== ${cmd} ===\n${stdout}\n\n`;
        } catch (error: any) {
          result += `=== ${cmd} (Failed) ===\n${error.message}\n\n`;
        }
      }

      return {
        success: true,
        logs: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('status')
  async getSystemStatus() {
    try {
      const commands = [
        'uptime',
        'ps aux | grep -E "(node|mysql)" | grep -v grep',
        'netstat -an | grep LISTEN',
        'df -h /',
        'free -m',
      ];

      let result = '';
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd);
          result += `=== ${cmd} ===\n${stdout}\n\n`;
        } catch (error: any) {
          result += `=== ${cmd} (Failed) ===\n${error.message}\n\n`;
        }
      }

      return {
        success: true,
        status: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('nodejs')
  async getNodeJSLogs() {
    try {
      const commands = [
        'dmesg | tail -50',
        'cat /proc/1/environ | tr "\\0" "\\n"',
        'ls -la /app',
        'ls -la /app/public',
        'pwd && whoami && id',
        'node --version && npm --version',
      ];

      let result = '';
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd);
          result += `=== ${cmd} ===\n${stdout}\n\n`;
        } catch (error: any) {
          result += `=== ${cmd} (Failed) ===\n${error.message}\n\n`;
        }
      }

      return {
        success: true,
        logs: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('test-db')
  async testDatabase() {
    try {
      // 测试数据库连接相关信息
      const commands = [
        'ping -c 2 mysql',
        'nslookup mysql',
        'telnet mysql 3306 < /dev/null',
        'env | grep DB',
      ];

      let result = '';
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd);
          result += `=== ${cmd} ===\n${stdout}\n\n`;
        } catch (error: any) {
          result += `=== ${cmd} (Failed) ===\n${error.message}\n\n`;
        }
      }

      return {
        success: true,
        logs: result,
        message: 'Database connectivity test completed',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('db-check')
  async checkDatabase() {
    try {
      let result = '';
      
      // 1. 检查数据源是否连接
      result += `=== Database Connection Status ===\n`;
      result += `Connected: ${this.dataSource.isInitialized}\n`;
      result += `Database: ${String(this.dataSource.options.database) || 'Unknown'}\n`;
      result += `Type: ${this.dataSource.options.type}\n\n`;
      
      // 2. 尝试执行简单查询
      try {
        const queryResult = await this.dataSource.query('SELECT 1 as test');
        result += `=== Simple Query Test ===\n`;
        result += `Query result: ${JSON.stringify(queryResult)}\n\n`;
      } catch (error: any) {
        result += `=== Simple Query Test (Failed) ===\n`;
        result += `Error: ${error.message}\n\n`;
      }
      
      // 3. 检查表结构
      try {
        const tables = await this.dataSource.query('SHOW TABLES');
        result += `=== Database Tables ===\n`;
        result += `Tables: ${JSON.stringify(tables)}\n\n`;
      } catch (error: any) {
        result += `=== Database Tables (Failed) ===\n`;
        result += `Error: ${error.message}\n\n`;
      }
      
      // 4. 检查 users 表结构
      try {
        const userTableInfo = await this.dataSource.query('DESCRIBE users');
        result += `=== Users Table Structure ===\n`;
        result += `Structure: ${JSON.stringify(userTableInfo, null, 2)}\n\n`;
      } catch (error: any) {
        result += `=== Users Table Structure (Failed) ===\n`;
        result += `Error: ${error.message}\n\n`;
      }

      return {
        success: true,
        logs: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
