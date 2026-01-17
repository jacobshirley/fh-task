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

/**
 * Counts the number of MP3 frames in the given stream.
 *
 * @param stream Input stream of bytes of the MP3 data
 * @returns The number of frames
 */
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

  const isFrameSync = (off: number) =>
    buffer[off] === ByteMap.SYNC_BYTE_1 &&
    (buffer[off + 1] & ByteMap.SYNC_BYTE_2_MASK) === ByteMap.SYNC_BYTE_2_MASK;

  const getBitrateIndex = (offset: number) =>
    (buffer[offset + 2] >> 4) & ByteMap.MASK_0F;
  const getSampleRateIndex = (offset: number) =>
    (buffer[offset + 2] >> 2) & ByteMap.MASK_03;
  const getPadding = (offset: number) =>
    (buffer[offset + 2] >> 1) & ByteMap.MASK_01;

  const getBitrate = (bitrateIndex: number): number | undefined =>
    bitrateTable[bitrateIndex];
  const getSampleRate = (sampleRateIndex: number): number | undefined =>
    sampleRateTable[sampleRateIndex];

  const isXingHeader = (offset: number) =>
    buffer[offset] === ByteMap.X &&
    buffer[offset + 1] === ByteMap.i &&
    buffer[offset + 2] === ByteMap.n &&
    buffer[offset + 3] === ByteMap.g;

  const isInfoHeader = (offset: number) =>
    buffer[offset] === ByteMap.I &&
    buffer[offset + 1] === ByteMap.n &&
    buffer[offset + 2] === ByteMap.f &&
    buffer[offset + 3] === ByteMap.o; // 'Info'

  const isVbriHeader = (offset: number) =>
    buffer[offset] === ByteMap.V &&
    buffer[offset + 1] === ByteMap.B &&
    buffer[offset + 2] === ByteMap.R &&
    buffer[offset + 3] === ByteMap.I; // 'VBRI'

  const isId3Header = (offset: number) =>
    buffer[offset] === ByteMap.I &&
    buffer[offset + 1] === ByteMap.D &&
    buffer[offset + 2] === ByteMap.THREE; // 'ID3'

  const calculateId3Size = (offset: number) =>
    ((buffer[offset + 6] & ByteMap.MASK_7F) << 21) |
    ((buffer[offset + 7] & ByteMap.MASK_7F) << 14) |
    ((buffer[offset + 8] & ByteMap.MASK_7F) << 7) |
    (buffer[offset + 9] & ByteMap.MASK_7F);

  for await (const chunk of stream) {
    // Concatenate the existing buffer with the new chunk
    const newBuffer = new Uint8Array(buffer.length + chunk.length);
    newBuffer.set(buffer);
    newBuffer.set(chunk, buffer.length);
    buffer = newBuffer;

    let offset = 0;

    // Skip ID3 tag at the beginning of the file
    if (!skippedId3 && buffer.length >= 10) {
      if (isId3Header(0)) {
        // 'ID3'
        // Calculate ID3 tag size which is stored as a synchsafe integer
        const id3Size = calculateId3Size(0);
        const totalId3Size = 10 + id3Size;

        if (buffer.length >= totalId3Size) {
          offset = totalId3Size;
          skippedId3 = true;
        }
      } else {
        skippedId3 = true;
      }
    }

    /**
     * A frame is identified by the sync word (11 bits set to 1).
     * The frame header is 4 bytes long and contains information about bitrate,
     * sample rate, padding, etc. We use this information to calculate the frame size
     * and skip to the next frame.
     */
    while (offset + 4 <= buffer.length) {
      // Check for MP3 frame sync (11 bits set to 1)
      if (!isFrameSync(offset)) {
        offset++;
        continue;
      }

      // Extract header information
      const bitrateIndex = getBitrateIndex(offset);
      const sampleRateIndex = getSampleRateIndex(offset);
      const padding = getPadding(offset);

      const bitrate = getBitrate(bitrateIndex);
      const sampleRate = getSampleRate(sampleRateIndex);

      // Skip invalid frames
      if (
        bitrate === undefined ||
        sampleRate === undefined ||
        bitrate === 0 ||
        sampleRate === 0
      ) {
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

        // XING header check (offset + 36 for MPEG1 Layer3)
        if (offset + 40 <= buffer.length) {
          const xingOffset = offset + 36;
          if (isXingHeader(xingOffset)) {
            isMetadataFrame = true;
          }
        }

        // INFO header check (offset + 36)
        if (!isMetadataFrame && offset + 40 <= buffer.length) {
          const infoOffset = offset + 36;
          if (isInfoHeader(infoOffset)) {
            isMetadataFrame = true;
          }
        }

        // VBRI header check (offset + 32)
        if (!isMetadataFrame && offset + 36 <= buffer.length) {
          const vbriOffset = offset + 32;
          if (isVbriHeader(vbriOffset)) {
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
    }

    // Keep any remaining bytes that could be part of the next frame
    buffer = buffer.slice(offset);
  }

  return frameCount;
}
