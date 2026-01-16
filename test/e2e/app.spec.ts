import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { describe, beforeEach, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/file-upload (POST)', async () => {
    const stream = fs.readFileSync(
      path.join(import.meta.dirname, 'fixtures/sample.mp3'),
    );
    return request(app.getHttpServer())
      .post('/file-upload')
      .set('Content-Type', 'audio/mpeg')
      .send(stream)
      .expect(200)
      .expect({
        // Manual MP3 frame parsing counts 6090 frames
        // ffprobe with -count_packets reports 6089 (may exclude metadata frame)
        // Run this command to verify with ffprobe:
        // ./scripts/ffmpeg-frames.sh ./test/e2e/fixtures/sample.mp3
        frameCount: 6090,
      });
  });
});
