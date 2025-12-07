import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIChatRequestDto, AIQuickActionDto, AIResponse } from './dto/ai.dto';
import { PromptTemplates } from './templates/prompt.templates';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly useMock: boolean;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.useMock =
      this.configService.get<string>('AI_USE_MOCK', 'true') === 'true';
    this.apiKey = this.configService.get<string>('AI_API_KEY', '');

    this.logger.log(`AI Service initialized - Mock Mode: ${this.useMock}`);
  }

  /**
   * 处理AI聊天请求
   */
  async chat(dto: AIChatRequestDto): Promise<AIResponse> {
    this.logger.log(`Chat request: ${dto.message}`);

    if (this.useMock) {
      return this.mockChat(dto);
    }

    // TODO: 接入真实的智谱AI或OpenAI
    return this.callRealAI(dto);
  }

  /**
   * 处理快捷操作请求
   */
  async quickAction(dto: AIQuickActionDto): Promise<AIResponse> {
    this.logger.log(`Quick action: ${dto.action}`);

    if (this.useMock) {
      return this.mockQuickAction(dto);
    }

    // TODO: 接入真实的智谱AI或OpenAI
    return this.callRealAIQuickAction(dto);
  }

  /**
   * 流式聊天（SSE）
   */
  async *chatStream(dto: AIChatRequestDto): AsyncGenerator<string> {
    this.logger.log(`Chat stream request: ${dto.message}`);

    if (this.useMock) {
      yield* this.mockChatStream(dto);
    } else {
      // TODO: 接入真实的智谱AI流式API
      yield* this.callRealAIStream(dto);
    }
  }

  /**
   * Mock聊天实现
   */
  private async mockChat(dto: AIChatRequestDto): Promise<AIResponse> {
    // 模拟API延迟
    await this.delay(800);

    // 使用Prompt模板生成响应
    const prompt = PromptTemplates.auto(dto.message, dto.context);
    const response = this.generateMockResponse(dto, prompt);

    return {
      content: response,
      model: 'mock-ai-model',
      usage: {
        promptTokens:
          dto.message.length + JSON.stringify(dto.context || {}).length,
        completionTokens: response.length,
      },
    };
  }

  /**
   * Mock快捷操作实现
   */
  private async mockQuickAction(dto: AIQuickActionDto): Promise<AIResponse> {
    await this.delay(500);

    let prompt = '';
    let response = '';

    switch (dto.action) {
      case 'polish':
        prompt = PromptTemplates.polish(dto.text);
        response = this.mockPolish(dto.text);
        break;

      case 'expand':
        prompt = PromptTemplates.expand(dto.text);
        response = this.mockExpand(dto.text);
        break;

      case 'summarize':
        prompt = PromptTemplates.summarize(dto.text);
        response = this.mockSummarize(dto.text);
        break;

      case 'translate':
        prompt = PromptTemplates.translate(dto.text);
        response = this.mockTranslate(dto.text);
        break;

      case 'continue':
        prompt = PromptTemplates.continue(dto.text);
        response = this.mockContinue(dto.text);
        break;

      default:
        prompt = dto.text;
        response = '不支持的操作类型';
    }

    return {
      content: response,
      model: 'mock-ai-model',
      usage: {
        promptTokens: prompt.length,
        completionTokens: response.length,
      },
    };
  }

  /**
   * Mock流式响应
   */
  private async *mockChatStream(dto: AIChatRequestDto): AsyncGenerator<string> {
    const prompt = PromptTemplates.auto(dto.message, dto.context);
    const fullResponse = this.generateMockResponse(dto, prompt);

    // 模拟逐字输出
    const words = fullResponse.split('');
    for (let i = 0; i < words.length; i++) {
      yield words[i];
      // 随机延迟，模拟真实的流式响应
      await this.delay(20 + Math.random() * 30);
    }
  }

  /**
   * 生成Mock响应内容
   */
  private generateMockResponse(dto: AIChatRequestDto, prompt: string): string {
    const message = dto.message.toLowerCase();

    // 如果Prompt已经包含命令，直接返回
    if (prompt.includes('[AI_COMMAND:')) {
      return prompt;
    }

    // 针对常见请求生成响应
    if (message.includes('润色') || message.includes('polish')) {
      return this.mockPolish(dto.context?.selectedText || dto.message);
    }

    if (message.includes('扩写') || message.includes('expand')) {
      return this.mockExpand(dto.context?.selectedText || dto.message);
    }

    if (
      message.includes('摘要') ||
      message.includes('总结') ||
      message.includes('summarize')
    ) {
      return this.mockSummarize(
        dto.context?.selectedText ||
          dto.context?.documentContent ||
          dto.message,
      );
    }

    if (message.includes('翻译') || message.includes('translate')) {
      return this.mockTranslate(dto.context?.selectedText || dto.message);
    }

    if (
      message.includes('继续') ||
      message.includes('continue') ||
      message.includes('写')
    ) {
      return this.mockContinue(dto.context?.documentContent || dto.message);
    }

    // 默认通用响应
    return `我理解您的需求：${dto.message}\n\n这是一个模拟的AI响应。在实际部署时，这里将返回来自智谱AI或OpenAI的真实响应。\n\n当前上下文信息：\n- 是否有选中文本：${dto.context?.hasSelection ? '是' : '否'}\n- 选中文本长度：${dto.context?.selectedText?.length || 0}字\n- 文档总长度：${dto.context?.documentContent?.length || 0}字`;
  }

  /**
   * Mock润色功能
   */
  private mockPolish(text: string): string {
    const polished = text
      .replace(/。/g, '，')
      .replace(/，([^，]{10,}?)，/g, '。$1，')
      .replace(/的的/g, '的')
      .trim();

    const enhanced = polished.length > 0 ? polished : '已为您优化文本表达。';

    return `✨ 已为您润色文本：\n\n${enhanced}\n\n主要改进：\n- 优化了语句结构\n- 提升了表达的流畅度\n- 使用了更准确的词汇\n\n[AI_COMMAND: replaceSelection, {"text": "${enhanced.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}]`;
  }

  /**
   * Mock扩写功能
   */
  private mockExpand(text: string): string {
    const expanded = `${text}此外，我们可以进一步阐述这一观点。通过深入分析，我们发现这个话题涉及多个层面的考量。从理论角度来看，它为我们提供了新的思考方向；从实践角度而言，它也具有重要的应用价值。`;

    return `📝 已为您扩写内容：\n\n${expanded}\n\n扩写说明：\n- 保留了原文核心内容\n- 增加了细节和解释\n- 丰富了表达层次\n\n[AI_COMMAND: replaceSelection, {"text": "${expanded.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}]`;
  }

  /**
   * Mock摘要功能
   */
  private mockSummarize(text: string): string {
    const sentences = text.split(/[。！？]/).filter((s) => s.trim().length > 0);
    const summary =
      sentences.slice(0, Math.min(2, sentences.length)).join('。') + '。';

    return `📋 内容摘要：\n\n${summary}\n\n这是对原文的简要概括，提取了核心要点。`;
  }

  /**
   * Mock翻译功能
   */
  private mockTranslate(text: string): string {
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);

    let translated: string;
    if (hasChinese) {
      // 简单的中译英模拟
      translated =
        'This is a translated version of the Chinese text. In production, this will be replaced with actual AI translation.';
    } else {
      // 简单的英译中模拟
      translated =
        '这是英文文本的翻译版本。在生产环境中，这将被替换为真实的AI翻译。';
    }

    return `🌐 翻译结果：\n\n${translated}\n\n[AI_COMMAND: replaceSelection, {"text": "${translated.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}]`;
  }

  /**
   * Mock继续写作功能
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private mockContinue(_context: string): string {
    const continuation = `\n\n承接上文，我们继续探讨这个话题。从另一个角度来看，这个问题还涉及到更深层次的思考。\n\n首先，我们需要明确核心概念。其次，要分析具体的应用场景。最后，总结出可行的解决方案。`;

    return `➡️ 已为您续写内容：\n${continuation}\n\n[AI_COMMAND: insertText, {"text": "${continuation.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}]`;
  }

  /**
   * 调用真实的AI API（智谱AI或OpenAI）
   */
  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  private async callRealAI(_dto: AIChatRequestDto): Promise<AIResponse> {
    // TODO: 实现真实的API调用
    this.logger.warn('Real AI API not implemented yet');
    throw new Error('真实AI服务尚未配置，请设置 AI_USE_MOCK=true 使用Mock模式');
  }

  /**
   * 调用真实的AI API快捷操作
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async callRealAIQuickAction(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _dto: AIQuickActionDto,
  ): Promise<AIResponse> {
    // TODO: 实现真实的API调用
    this.logger.warn('Real AI API not implemented yet');
    throw new Error('真实AI服务尚未配置，请设置 AI_USE_MOCK=true 使用Mock模式');
  }

  /**
   * 真实AI流式响应
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async *callRealAIStream(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _dto: AIChatRequestDto,
  ): AsyncGenerator<string> {
    // TODO: 实现真实的流式API调用
    this.logger.warn('Real AI Stream API not implemented yet');
    yield '真实AI流式服务尚未配置';
  }

  /**
   * 工具函数：延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
