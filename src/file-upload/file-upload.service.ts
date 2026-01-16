import { Injectable } from '@nestjs/common';

@Injectable()
export class FileUploadService {
  async countMp3Frames(stream: AsyncIterable<Uint8Array>): Promise<{
    frameCount: number;
  }> {
    let frameCount = 0;
    let buffer = new Uint8Array(0);
    let skippedId3 = false;

    // Bitrate table for MPEG 1 Layer III (MP3) in kbps
    const bitrateTable = [
      0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
    ];
    // Sample rate table for MPEG 1 in Hz
    const sampleRateTable = [44100, 48000, 32000, 0];

    for await (const chunk of stream) {
      // Concatenate the existing buffer with the new chunk
      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      let offset = 0;

      // Skip ID3 tag at the beginning of the file
      if (!skippedId3 && buffer.length >= 10) {
        if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
          // 'ID3'
          const id3Size =
            ((buffer[6] & 0x7f) << 21) |
            ((buffer[7] & 0x7f) << 14) |
            ((buffer[8] & 0x7f) << 7) |
            (buffer[9] & 0x7f);
          const totalId3Size = 10 + id3Size;
          if (buffer.length >= totalId3Size) {
            offset = totalId3Size;
            skippedId3 = true;
          }
        } else {
          skippedId3 = true;
        }
      }

      while (offset + 4 <= buffer.length) {
        // Check for MP3 frame sync (11 bits set to 1)
        if (buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
          // Extract header information
          const bitrateIndex = (buffer[offset + 2] >> 4) & 0x0f;
          const sampleRateIndex = (buffer[offset + 2] >> 2) & 0x03;
          const padding = (buffer[offset + 2] >> 1) & 0x01;

          const bitrate = bitrateTable[bitrateIndex];
          const sampleRate = sampleRateTable[sampleRateIndex];

          // Skip invalid frames
          if (bitrate === 0 || sampleRate === 0) {
            offset++;
            continue;
          }

          // Calculate frame size: (144 * bitrate) / sampleRate + padding
          const frameSize =
            Math.floor((144 * bitrate * 1000) / sampleRate) + padding;

          // Make sure we have the complete frame in buffer
          if (offset + frameSize <= buffer.length) {
            frameCount++;
            offset += frameSize;
          } else {
            // Not enough data for complete frame, keep in buffer
            break;
          }
        } else {
          offset++;
        }
      }

      // Keep any remaining bytes that could be part of the next frame
      buffer = buffer.slice(offset);
    }

    return { frameCount };
  }
}
