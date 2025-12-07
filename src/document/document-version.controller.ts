import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DocumentVersionService } from './document-version.service';
import { DocumentVersionCompareService } from './document-version-compare.service';
import { DocumentDailyVersionService } from './document-daily-version.service';
import {
  SaveVersionDto,
  QueryVersionDto,
  RestoreVersionDto,
  CleanVersionDto,
  CompareVersionDto,
} from './dto/version.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';

/**
 * 文档版本管理控制器
 */
@Controller('api/documents')
@UseGuards(JwtAuthGuard)
export class DocumentVersionController {
  constructor(
    private readonly versionService: DocumentVersionService,
    private readonly compareService: DocumentVersionCompareService,
    private readonly dailyVersionService: DocumentDailyVersionService,
  ) {}

  /**
   * 保存文档版本
   * POST /api/documents/:documentId/versions
   */
  @Post(':documentId/versions')
  async saveVersion(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() dto: SaveVersionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('用户身份验证失败');
    }
    return await this.versionService.saveVersion(
      documentId,
      Number(userId),
      dto,
    );
  }

  /**
   * 获取版本列表
   * GET /api/documents/:documentId/versions
   */
  @Get(':documentId/versions')
  async getVersions(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Query() dto: QueryVersionDto,
  ) {
    return await this.versionService.getVersions(documentId, dto);
  }

  /**
   * 获取版本详情
   * GET /api/documents/:documentId/versions/:versionId
   */
  @Get(':documentId/versions/:versionId')
  async getVersionDetail(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return await this.versionService.getVersionDetail(documentId, versionId);
  }

  /**
   * 恢复到指定版本
   * POST /api/documents/:documentId/restore
   */
  @Post(':documentId/restore')
  async restoreVersion(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() dto: RestoreVersionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('用户身份验证失败');
    }
    return await this.versionService.restoreVersion(
      documentId,
      Number(userId),
      dto,
    );
  }

  /**
   * 清理旧版本
   * POST /api/documents/:documentId/versions/clean
   */
  @Post(':documentId/versions/clean')
  async cleanOldVersions(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Query() dto: CleanVersionDto,
  ) {
    return await this.versionService.cleanOldVersions(documentId, dto);
  }

  /**
   * 对比两个版本
   * GET /api/documents/:documentId/versions/compare
   */
  @Get(':documentId/versions/compare')
  async compareVersions(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Query() dto: CompareVersionDto,
  ) {
    return await this.compareService.compareVersions(
      documentId,
      dto.sourceVersionId,
      dto.targetVersionId,
    );
  }
  /**
   * 删除版本
   * DELETE /api/documents/:documentId/versions/:versionId
   */
  @Delete(':documentId/versions/:versionId')
  async deleteVersion(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return await this.versionService.deleteVersion(documentId, versionId);
  }

  /**
   * 手动触发每日版本创建(用于测试)
   * POST /api/documents/versions/trigger-daily
   */
  @Post('versions/trigger-daily')
  async triggerDailyVersions() {
    return await this.dailyVersionService.triggerManually();
  }
}
}
