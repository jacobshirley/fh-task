import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { FileUploadModule } from './file-upload/file-upload.module.js';

@Module({
  imports: [FileUploadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
