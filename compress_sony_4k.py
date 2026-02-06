#!/usr/bin/env python3
"""Compress Sony 4K footage for long-term storage on macOS.

Requires ffmpeg installed (e.g., `brew install ffmpeg`).
"""

from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys
from typing import Iterable

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mxf", ".mkv"}


def iter_videos(paths: Iterable[pathlib.Path], recursive: bool) -> Iterable[pathlib.Path]:
    for path in paths:
        if path.is_dir():
            if recursive:
                yield from (p for p in path.rglob("*") if p.suffix.lower() in VIDEO_EXTENSIONS)
            else:
                yield from (p for p in path.iterdir() if p.suffix.lower() in VIDEO_EXTENSIONS)
        elif path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS:
            yield path


def build_command(
    source: pathlib.Path,
    destination: pathlib.Path,
    crf: int,
    preset: str,
    audio_bitrate: str,
    downscale: str | None,
) -> list[str]:
    vf_filters = []
    if downscale:
        vf_filters.append(f"scale={downscale}:flags=lanczos")
    vf = ",".join(vf_filters) if vf_filters else "null"

    return [
        "ffmpeg",
        "-hide_banner",
        "-y",
        "-i",
        str(source),
        "-map_metadata",
        "0",
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx265",
        "-pix_fmt",
        "yuv420p10le",
        "-preset",
        preset,
        "-crf",
        str(crf),
        "-tag:v",
        "hvc1",
        "-vf",
        vf,
        "-c:a",
        "aac",
        "-b:a",
        audio_bitrate,
        "-movflags",
        "+faststart",
        str(destination),
    ]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compress Sony 4K footage to H.265 for long-term storage.",
    )
    parser.add_argument("inputs", nargs="+", type=pathlib.Path, help="Video file or folder")
    parser.add_argument(
        "--output-dir",
        type=pathlib.Path,
        default=pathlib.Path("compressed"),
        help="Directory to write compressed files",
    )
    parser.add_argument("--crf", type=int, default=28, help="H.265 CRF quality (lower = higher quality)")
    parser.add_argument("--preset", default="slow", help="x265 preset (e.g., medium, slow, slower)")
    parser.add_argument(
        "--audio-bitrate",
        default="192k",
        help="Audio bitrate (e.g., 192k)",
    )
    parser.add_argument(
        "--downscale",
        default=None,
        help="Downscale width (e.g., 3840 for 4K, 1920 for 1080p).",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Recurse into subfolders when input is a directory",
    )

    args = parser.parse_args()
    output_dir: pathlib.Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    videos = list(iter_videos(args.inputs, args.recursive))
    if not videos:
        print("No supported video files found.", file=sys.stderr)
        return 1

    for source in videos:
        destination = output_dir / f"{source.stem}_h265.mp4"
        command = build_command(
            source=source,
            destination=destination,
            crf=args.crf,
            preset=args.preset,
            audio_bitrate=args.audio_bitrate,
            downscale=args.downscale,
        )
        print("Running:", " ".join(command))
        try:
            subprocess.run(command, check=True)
        except subprocess.CalledProcessError as exc:
            print(f"Compression failed for {source}: {exc}", file=sys.stderr)
            return exc.returncode

    print(f"Done. Output in {output_dir.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
