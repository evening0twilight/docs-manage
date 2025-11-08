import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiPropertyOptional({ description: '评论内容', example: '修改后的评论内容' })
  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: '评论内容不能超过2000字符' })
  content?: string;
}
