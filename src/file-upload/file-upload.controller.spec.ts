import { Test, TestingModule } from '@nestjs/testing';
import { FileUploadController } from './file-upload.controller.js';
import { FileUploadService } from './file-upload.service.js';
import { describe, beforeEach, it, expect } from 'vitest';

describe('FileUploadController', () => {
  let fileUploadController: FileUploadController;

  beforeEach(async () => {
    const fileUpload: TestingModule = await Test.createTestingModule({
      controllers: [FileUploadController],
      providers: [FileUploadService],
    }).compile();

    fileUploadController = fileUpload.get<FileUploadController>(FileUploadController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(fileUploadController.getHello()).toBe('Hello World!');
    });
  });
});
