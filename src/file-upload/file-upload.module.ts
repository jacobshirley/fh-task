import { Module } from '@nestjs/common';
import { FileUploadController } from './file-upload.controller.js';
import { FileUploadService } from './file-upload.service.js';

@Module({
  imports: [],
  controllers: [FileUploadController],
  providers: [FileUploadService],
})
export class FileUploadModule {}
