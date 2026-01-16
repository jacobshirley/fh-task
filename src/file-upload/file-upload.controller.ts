import { Controller, Post } from '@nestjs/common';
import { FileUploadService } from './file-upload.service.js';

@Controller({
  path: 'file-upload',
})
export class FileUploadController {
  private readonly fileUploadService: FileUploadService;

  constructor(fileUploadService: FileUploadService) {
    this.fileUploadService = fileUploadService;
  }

  @Post()
  async postCountMp3Frames(stream: AsyncIterable<Uint8Array>): Promise<number> {
    return await this.fileUploadService.countMp3Frames(stream);
  }
}
