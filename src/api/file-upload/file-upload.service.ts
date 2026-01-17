import { Injectable } from '@nestjs/common';
import { countMp3Frames } from 'src/core/mp3.js';

@Injectable()
export class FileUploadService {
  async countMp3Frames(stream: AsyncIterable<Uint8Array>): Promise<{
    frameCount: number;
  }> {
    const frameCount = await countMp3Frames(stream);
    return { frameCount };
  }
}
