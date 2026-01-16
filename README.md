# MP3 Frame Counter API

A NestJS-based REST API that counts audio frames in MP3 files via streaming uploads.

## Features

- **Performant**: Handles MP3 files as streams for memory efficiency
- **Accurate frame counting**: Parses MP3 headers to count frames using MPEG audio layer 3 specification
- **ID3 tag handling**: Automatically skips ID3v2 metadata tags
- **Variable bitrate support**: Correctly calculates frame sizes for different bitrates and sample rates
- **Scaling**: Stress-tested to handle multiple concurrent requests

## Requirements

- Node.js 20+

### Development Tools
- pnpm 10.14.0+
- Docker (for frame verification tool) (optional)

## Installation

```bash
pnpm install
```

## Running the Application

```bash
# Development mode with hot reload
pnpm start:dev

# Production mode
pnpm build
pnpm start:prod
```

The API starts on `http://localhost:3000` by default.

## API Endpoints

### POST /file-upload

Counts the number of frames in an MP3 file.

**Request:**
- Method: `POST`
- Content-Type: `audio/mpeg`
- Body: Raw MP3 file data

**Response:**
```json
{
  "frameCount": 6090
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/file-upload \
  -H "Content-Type: audio/mpeg" \
  --data-binary @sample.mp3
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run e2e tests
pnpm test:e2e

# Generate coverage report
pnpm test:cov
```

## Frame Verification

Verify frame counts using ffprobe:

```bash
./scripts/ffmpeg-frames.sh path/to/file.mp3
```

This script uses Docker to run ffprobe and reports the packet count for comparison.

## Technical Details

### MP3 Frame Structure

The service parses MP3 frames by:
1. Locating frame sync patterns (`0xFF` followed by `0xE0`)
2. Extracting bitrate, sample rate, and padding from the 4-byte header
3. Calculating frame size: `⌊(144 × bitrate) / sampleRate⌋ + padding`
4. Skipping to the next frame and repeating

### Supported Formats

- MPEG 1 Layer III (MP3)
- Bitrates: 32-320 kbps
- Sample rates: 32000, 44100, 48000 Hz
- ID3v2 tags

## Project Structure

```
src/
├── app.module.ts           # Root module
├── file-upload/
│   ├── file-upload.controller.ts  # HTTP endpoint
│   ├── file-upload.service.ts     # Frame counting logic
│   └── file-upload.module.ts      # Feature module
test/
├── e2e/
│   ├── app.spec.ts         # E2E tests
│   └── fixtures/           # Test MP3 files
scripts/
└── ffmpeg-frames.sh        # Frame verification tool
```