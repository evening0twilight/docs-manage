import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

// AI请求相关的DTO
export class AIChatRequestDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  context?: {
    selectedText?: string;
    cursorPosition?: number;
    documentContent?: string;
    hasSelection?: boolean;
  };
}

export class AIQuickActionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['polish', 'expand', 'summarize', 'translate', 'continue'])
  action: 'polish' | 'expand' | 'summarize' | 'translate' | 'continue';

  @IsString()
  @IsNotEmpty()
  text: string;
}

// AI响应相关的接口
export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface AIStreamChunk {
  chunk?: string;
  done?: boolean;
  error?: string;
}
