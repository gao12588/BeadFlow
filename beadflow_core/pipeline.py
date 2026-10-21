"""The end-to-end local image-to-pattern pipeline."""
from __future__ import annotations

from pathlib import Path
from typing import BinaryIO

from .image_processing import load_and_resize
from .models import Pattern
from .palette import Palette


def build_pattern(source: str | Path | BinaryIO, width: int, height: int, max_colors: int, fit: str = "pad", palette: Palette | None = None) -> Pattern:
    palette = palette or Palette.mard_221()
    pixels = load_and_resize(source, width, height, fit)
    grid = palette.map_image(pixels, max_colors)
    used = sorted(set(grid.ravel().tolist()))
    source_name = Path(getattr(source, "name", source)).name
    return Pattern(width, height, palette.metadata["palette_id"], palette.metadata["color_data_status"], source_name, fit, grid, [palette.colors[index] for index in used])
