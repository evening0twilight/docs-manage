import { Controller, Get, Post, Param } from '@nestjs/common';

@Controller('document')
export class DocumentController {
  @Post()
  create(): string {
    return 'This action adds a new document';
  }

  @Get()
  findAll(): string {
    return 'This action returns all document';
  }

  @Get(':id')
  findOne(@Param() params: any): string {
    console.log(params.id);
    return `This action returns a #${params.id} #document`;
  }
}
