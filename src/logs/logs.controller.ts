import { Controller, Get, Query } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('logs')
export class LogsController {
  @Get('app')
  async getAppLogs(@Query('lines') lines: string = '50') {
    try {
      const { stdout } = await execAsync(
        `docker-compose logs --tail=${lines} app`,
      );
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

  @Get('mysql')
  async getMySQLLogs(@Query('lines') lines: string = '20') {
    try {
      const { stdout } = await execAsync(
        `docker-compose logs --tail=${lines} mysql`,
      );
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

  @Get('all')
  async getAllLogs(@Query('lines') lines: string = '30') {
    try {
      const { stdout } = await execAsync(`docker-compose logs --tail=${lines}`);
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

  @Get('status')
  async getSystemStatus() {
    try {
      const [containers, processes] = await Promise.all([
        execAsync('docker-compose ps'),
        execAsync('ps aux | grep node'),
      ]);

      return {
        success: true,
        containers: containers.stdout,
        processes: processes.stdout,
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
