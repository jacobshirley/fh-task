#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <audio-file>" >&2
  exit 1
fi

FILE_DIR=$(dirname "$1")
FILE_NAME=$(basename "$1")

docker run --rm \
  -v "$FILE_DIR":/data:ro \
  jlesage/mediainfo \
  mediainfo --Output='Audio;%FrameCount%' \
  /data/"$FILE_NAME"
