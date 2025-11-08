import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: '评论内容',
    example: '这里的逻辑有问题，建议修改',
  })
  @IsString()
  @IsNotEmpty({ message: '评论内容不能为空' })
  @MaxLength(2000, { message: '评论内容不能超过2000字符' })
  content: string;

  @ApiPropertyOptional({
    description: '引用的原文',
    example: '这是一段需要讨论的文本',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '引用文本不能超过500字符' })
  quotedText?: string;

  @ApiProperty({ description: '起始位置（字符偏移）', example: 100 })
  @IsInt({ message: '起始位置必须是整数' })
  @Min(0, { message: '起始位置不能为负数' })
  startPos: number;

  @ApiProperty({ description: '结束位置（字符偏移）', example: 150 })
  @IsInt({ message: '结束位置必须是整数' })
  @Min(0, { message: '结束位置不能为负数' })
  endPos: number;

  @ApiPropertyOptional({ description: '父评论ID（用于回复）', example: 1 })
  @IsInt({ message: '父评论ID必须是整数' })
  @IsOptional()
  parentId?: number;
}
