import { Controller, Get, Query } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('logs')
export class LogsController {
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
}
