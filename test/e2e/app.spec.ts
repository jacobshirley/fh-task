import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
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

  afterEach(async () => {
    await app.close();
  });

  describe('/file-upload (POST)', () => {
    it('should handle a single request', () => {
      const stream = fs.readFileSync(
        path.join(import.meta.dirname, 'fixtures/sample.mp3'),
      );
      return request(app.getHttpServer())
        .post('/file-upload')
        .set('Content-Type', 'audio/mpeg')
        .send(stream)
        .expect(200)
        .expect({
          // Manual MP3 frame parsing counts 6089 frames
          // ffprobe with -count_packets reports 6089 (may exclude metadata frame)
          // Run this command to verify with ffprobe or mediainfo:
          // ./scripts/ffmpeg-frames.sh ./test/e2e/fixtures/sample.mp3
          // or
          // ./scripts/mediainfo-frames.sh ./test/e2e/fixtures/sample.mp3
          frameCount: 6089,
        });
    });

    it('should handle 5 concurrent requests (stress test)', async () => {
      const stream = fs.readFileSync(
        path.join(import.meta.dirname, 'fixtures/sample.mp3'),
      );

      const server = app.getHttpServer();

      // Helper function to make request with retry
      const makeRequest = async (retries = 2): Promise<request.Response> => {
        for (let i = 0; i <= retries; i++) {
          try {
            const res = await request(server)
              .post('/file-upload')
              .set('Content-Type', 'audio/mpeg')
              .send(stream);
            return res;
          } catch (error) {
            if (i === retries) throw error;
            // Wait before retry (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
          }
        }
        throw new Error('All retries failed');
      };

      // Fire 5 concurrent requests with retry logic
      const concurrentRequests = 5;
      const requests = Array.from({ length: concurrentRequests }, () =>
        makeRequest().then((res) => {
          expect(res.status).toBe(200);
          expect(res.body).toEqual({ frameCount: 6089 });
          return res;
        }),
      );

      const results = await Promise.all(requests);
      expect(results.length).toBe(concurrentRequests);
    }, 30000);

    it('should return zero frames for invalid/corrupt data', async () => {
      const invalidData = Buffer.from('not a valid mp3 file at all');

      return request(app.getHttpServer())
        .post('/file-upload')
        .set('Content-Type', 'audio/mpeg')
        .send(invalidData)
        .expect(200)
        .expect({
          frameCount: 0,
        });
    });

    it('should handle empty request body', async () => {
      return request(app.getHttpServer())
        .post('/file-upload')
        .set('Content-Type', 'audio/mpeg')
        .send(Buffer.alloc(0))
        .expect(200)
        .expect({
          frameCount: 0,
        });
    });

    it('should reject invalid content-type with 415', async () => {
      return request(app.getHttpServer())
        .post('/file-upload')
        .set('Content-Type', 'application/octet-stream')
        .send(Buffer.from('test data'))
        .expect(415)
        .expect((res) => {
          expect((res.body as { message: string }).message).toContain(
            'Invalid Content-Type',
          );
        });
    });

    it('should reject missing content-type with 415', async () => {
      return request(app.getHttpServer())
        .post('/file-upload')
        .send(Buffer.from('test data'))
        .expect(415)
        .expect((res) => {
          expect((res.body as { message: string }).message).toContain(
            'Invalid Content-Type',
          );
        });
    });
  });
});
