const ByteMap = {
  // ID3 signature bytes
  I: 0x49,
  D: 0x44,
  THREE: 0x33,

  // Frame sync bytes
  SYNC_BYTE_1: 0xff,
  SYNC_BYTE_2_MASK: 0xe0,

  // Bit masks
  MASK_7F: 0x7f,
  MASK_0F: 0x0f,
  MASK_03: 0x03,
  MASK_01: 0x01,

  // XING header bytes
  X: 0x58,
  i: 0x69,
  n: 0x6e,
  g: 0x67,

  // INFO header bytes (reuses I, n)
  f: 0x66,
  o: 0x6f,

  // VBRI header bytes
  V: 0x56,
  B: 0x42,
  R: 0x52,
  // I already defined above
} as const;

export async function countMp3Frames(
  stream: AsyncIterable<Uint8Array>,
): Promise<number> {
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
      if (
        buffer[0] === ByteMap.I &&
        buffer[1] === ByteMap.D &&
        buffer[2] === ByteMap.THREE
      ) {
        // 'ID3'
        const id3Size =
          ((buffer[6] & ByteMap.MASK_7F) << 21) |
          ((buffer[7] & ByteMap.MASK_7F) << 14) |
          ((buffer[8] & ByteMap.MASK_7F) << 7) |
          (buffer[9] & ByteMap.MASK_7F);
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
      if (
        buffer[offset] === ByteMap.SYNC_BYTE_1 &&
        (buffer[offset + 1] & ByteMap.SYNC_BYTE_2_MASK) ===
          ByteMap.SYNC_BYTE_2_MASK
      ) {
        // Extract header information
        const bitrateIndex = (buffer[offset + 2] >> 4) & ByteMap.MASK_0F;
        const sampleRateIndex = (buffer[offset + 2] >> 2) & ByteMap.MASK_03;
        const padding = (buffer[offset + 2] >> 1) & ByteMap.MASK_01;

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
          // Check for XING/INFO/VBRI metadata frames (VBR headers)
          let isMetadataFrame = false;

          // XING/INFO header check (offset + 36 for MPEG1 Layer3)
          if (offset + 40 <= buffer.length) {
            const xingOffset = offset + 36;
            if (
              (buffer[xingOffset] === ByteMap.X &&
                buffer[xingOffset + 1] === ByteMap.i &&
                buffer[xingOffset + 2] === ByteMap.n &&
                buffer[xingOffset + 3] === ByteMap.g) || // 'Xing'
              (buffer[xingOffset] === ByteMap.I &&
                buffer[xingOffset + 1] === ByteMap.n &&
                buffer[xingOffset + 2] === ByteMap.f &&
                buffer[xingOffset + 3] === ByteMap.o) // 'Info'
            ) {
              isMetadataFrame = true;
            }
          }

          // VBRI header check (offset + 36)
          if (!isMetadataFrame && offset + 40 <= buffer.length) {
            const vbriOffset = offset + 36;
            if (
              buffer[vbriOffset] === ByteMap.V &&
              buffer[vbriOffset + 1] === ByteMap.B &&
              buffer[vbriOffset + 2] === ByteMap.R &&
              buffer[vbriOffset + 3] === ByteMap.I // 'VBRI'
            ) {
              isMetadataFrame = true;
            }
          }

          if (!isMetadataFrame) {
            frameCount++;
          }
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

  return frameCount;
}
