#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <audio-file>" >&2
  exit 1
fi

FILE_DIR=$(dirname "$1")
FILE_NAME=$(basename "$1")

docker run --rm \
  -v "$FILE_DIR":/data \
  --entrypoint ffprobe \
  linuxserver/ffmpeg \
  -v error \
  -select_streams a:0 \
  -count_packets \
  -show_entries stream=nb_read_packets \
  -of csv=p=0 \
  /data/"$FILE_NAME"