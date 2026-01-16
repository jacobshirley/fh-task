import { Controller, HttpCode, HttpException, Post, Req } from '@nestjs/common';
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
    const contentType = req.get('content-type')?.toLowerCase();

    if (!contentType || !contentType.startsWith('audio/mpeg')) {
      throw new HttpException('Invalid Content-Type. Expected audio/mpeg', 415);
    }

    try {
      return await this.fileUploadService.countMp3Frames(req);
    } catch (error) {
      throw new HttpException('Failed to process MP3 file', 500, {
        cause: error,
      });
    }
  }
}
