import {
  Controller,
  Post,
  Body,
  Sse,
  MessageEvent,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AiService } from './ai.service';
import { AIChatRequestDto, AIQuickActionDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';

@Controller('api/ai')
@UseGuards(JwtAuthGuard) // 需要登录才能使用AI功能
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * POST /api/ai/chat
   * AI聊天接口（非流式）
   */
  @Post('chat')
  async chat(@Body() dto: AIChatRequestDto) {
    this.logger.log(
      `Chat request from user, message: ${dto.message.substring(0, 50)}...`,
    );
    return await this.aiService.chat(dto);
  }

  /**
   * POST /api/ai/chat-stream
   * AI聊天接口（流式 SSE）
   */
  @Post('chat-stream')
  @Sse()
  chatStream(@Body() dto: AIChatRequestDto): Observable<MessageEvent> {
    this.logger.log(
      `Chat stream request from user, message: ${dto.message.substring(0, 50)}...`,
    );

    return new Observable((subscriber) => {
      void (async () => {
        try {
          for await (const chunk of this.aiService.chatStream(dto)) {
            subscriber.next({
              data: JSON.stringify({ chunk }),
            } as MessageEvent);
          }

          // 发送完成标记
          subscriber.next({
            data: JSON.stringify({ done: true }),
          } as MessageEvent);

          subscriber.complete();
        } catch (error) {
          this.logger.error(`Chat stream error: ${error.message}`, error.stack);
          subscriber.next({
            data: JSON.stringify({ error: error.message }),
          } as MessageEvent);
          subscriber.error(error);
        }
      })();
    });
  }

  /**
   * POST /api/ai/quick-action
   * 快捷操作接口
   */
  @Post('quick-action')
  async quickAction(@Body() dto: AIQuickActionDto) {
    this.logger.log(`Quick action request: ${dto.action}`);
    return await this.aiService.quickAction(dto);
  }

  /**
   * GET /api/ai/health
   * 健康检查接口
   */
  @Post('health')
  health() {
    return {
      status: 'ok',
      service: 'AI Assistant',
      timestamp: new Date().toISOString(),
    };
  }
}
