import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
  IsBoolean,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// AI 上下文(嵌套对象);必须用 @ValidateNested + @Type 才能让 ValidationPipe 递归校验,
// 否则 whitelist/forbidNonWhitelisted 不会作用到 context 内部,且长度不受限。
export class AiContextDto {
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  selectedText?: string;

  @IsOptional()
  @IsNumber()
  cursorPosition?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  documentContent?: string;

  @IsOptional()
  @IsBoolean()
  hasSelection?: boolean;
}

// AI请求相关的DTO
export class AIChatRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiContextDto)
  context?: AiContextDto;
}

export class AIQuickActionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['polish', 'expand', 'summarize', 'translate', 'continue'])
  action: 'polish' | 'expand' | 'summarize' | 'translate' | 'continue';

  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
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
