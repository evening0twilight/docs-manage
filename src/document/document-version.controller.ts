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
  UnauthorizedException,
} from '@nestjs/common';
import { DocumentVersionService } from './document-version.service';
import { DocumentVersionCompareService } from './document-version-compare.service';
import { DocumentDailyVersionService } from './document-daily-version.service';
import { DocumentAccessService } from './document-access.service';
import {
  SaveVersionDto,
  QueryVersionDto,
  RestoreVersionDto,
  CleanVersionDto,
  CompareVersionDto,
} from './dto/version.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { AuthRequest } from '../common/types/auth-request';

/**
 * 文档版本管理控制器
 * 路由前缀 documents(全局已有 api 前缀 → /api/documents/...),避免历史上的 /api/api 双前缀
 */
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentVersionController {
  constructor(
    private readonly versionService: DocumentVersionService,
    private readonly compareService: DocumentVersionCompareService,
    private readonly dailyVersionService: DocumentDailyVersionService,
    private readonly accessService: DocumentAccessService,
  ) {}

  /** 从请求中提取并校验 userId */
  private getUserId(req: AuthRequest): number {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('用户身份验证失败');
    }
    return Number(userId);
  }

  /**
   * 保存文档版本
   * POST /api/documents/:documentId/versions
   */
  @Post(':documentId/versions')
  async saveVersion(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() dto: SaveVersionDto,
    @Req() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanWrite(documentId, userId);
    return await this.versionService.saveVersion(documentId, userId, dto);
  }

  /**
   * 获取版本列表
   * GET /api/documents/:documentId/versions
   */
  @Get(':documentId/versions')
  async getVersions(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Query() dto: QueryVersionDto,
    @Req() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);
    return await this.versionService.getVersions(documentId, dto);
  }

  /**
   * 对比两个版本
   * 注意:必须声明在下面 :versionId 动态路由之前,否则 'compare' 会被 :versionId
   * 捕获并被 ParseIntPipe 拒绝(400),导致该接口形同废弃。
   * GET /api/documents/:documentId/versions/compare
   */
  @Get(':documentId/versions/compare')
  async compareVersions(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Query() dto: CompareVersionDto,
    @Req() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);
    return await this.compareService.compareVersions(
      documentId,
      dto.sourceVersionId,
      dto.targetVersionId,
    );
  }

  /**
   * 获取版本详情
   * GET /api/documents/:documentId/versions/:versionId
   */
  @Get(':documentId/versions/:versionId')
  async getVersionDetail(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
    @Req() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);
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
    @Req() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanWrite(documentId, userId);
    return await this.versionService.restoreVersion(documentId, userId, dto);
  }

  /**
   * 清理旧版本
   * POST /api/documents/:documentId/versions/clean
   */
  @Post(':documentId/versions/clean')
  async cleanOldVersions(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Query() dto: CleanVersionDto,
    @Req() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanWrite(documentId, userId);
    return await this.versionService.cleanOldVersions(documentId, dto);
  }

  /**
   * 删除版本
   * DELETE /api/documents/:documentId/versions/:versionId
   */
  @Delete(':documentId/versions/:versionId')
  async deleteVersion(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
    @Req() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanWrite(documentId, userId);
    return await this.versionService.deleteVersion(documentId, versionId);
  }

  /**
   * 手动触发每日版本创建(用于测试)
   * POST /api/documents/versions/trigger-daily
   * 注:已受 JwtAuthGuard 保护;如引入角色体系,建议进一步限制为管理员
   */
  @Post('versions/trigger-daily')
  async triggerDailyVersions() {
    return await this.dailyVersionService.triggerManually();
  }
}
