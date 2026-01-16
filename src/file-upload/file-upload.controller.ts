import { Controller, HttpCode, Post, Req } from '@nestjs/common';
import { FileUploadService } from './file-upload.service.js';
import type { Request } from 'express';

@Controller('file-upload')
export class FileUploadController {
  private readonly fileUploadService: FileUploadService;

  constructor(fileUploadService: FileUploadService) {
    this.fileUploadService = fileUploadService;
  }

  @Post()
  @HttpCode(200)
  async postCountMp3Frames(@Req() req: Request) {
    return this.fileUploadService.countMp3Frames(req);
  }
}
