"""Compatibility CLI entry point for the modular BeadFlow application."""
from __future__ import annotations

import argparse
import json

from beadflow_core.exporting import export_bundle, manifest
from beadflow_core.pipeline import build_pattern


def main() -> None:
    parser = argparse.ArgumentParser(description="BeadFlow: local MARD reference bead-pattern generator")
    parser.add_argument("image")
    parser.add_argument("--out", default="output")
    parser.add_argument("--width", type=int, default=60)
    parser.add_argument("--height", type=int, default=80)
    parser.add_argument("--colors", type=int, default=12)
    parser.add_argument("--fit", choices=["crop", "pad"], default="pad")
    args = parser.parse_args()
    if not 1 <= args.width <= 180 or not 1 <= args.height <= 180:
        parser.error("width and height must be between 1 and 180")
    try:
        pattern = build_pattern(args.image, args.width, args.height, args.colors, args.fit)
        bundle = export_bundle(pattern, args.out)
    except ValueError as exc:
        parser.error(str(exc))
    print(json.dumps({"zip": str(bundle), "manifest": manifest(pattern)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
