import { Injectable } from '@nestjs/common';

@Injectable()
export class FileUploadService {
  async countMp3Frames(stream: AsyncIterable<Uint8Array>): Promise<number> {
    let frameCount = 0;
    let buffer = new Uint8Array(0);

    for await (const chunk of stream) {
      // Concatenate the existing buffer with the new chunk
      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      let offset = 0;
      while (offset + 4 <= buffer.length) {
        // Check for MP3 frame sync (11 bits set to 1)
        if (buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
          frameCount++;
          // Move to the next potential frame (assuming minimum frame size of 4 bytes)
          offset += 4;
        } else {
          offset++;
        }
      }

      // Keep any remaining bytes that could be part of the next frame
      buffer = buffer.slice(offset);
    }

    return frameCount;
  }
}
