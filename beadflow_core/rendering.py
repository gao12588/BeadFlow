"""PNG chart and 29x29-board tile rendering."""
from __future__ import annotations

import math
from pathlib import Path
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from .models import Pattern


def _font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


@lru_cache(maxsize=1)
def _source_palette():
    from .palette import Palette
    return Palette.mard_221()

def _color_lookup(pattern: Pattern) -> dict[int, str]:
    # The grid indexes the source palette. Resolve by MARD code index reconstructed from bundled palette order.
    palette = _source_palette()
    return {index: palette.colors[index].hex for index in set(pattern.grid.ravel().tolist())}


def render_preview(pattern: Pattern, scale: int = 14) -> Image.Image:
    palette = _color_lookup(pattern)
    rgb = np.array([[tuple(int(palette[int(index)][offset:offset + 2], 16) for offset in (1, 3, 5)) for index in row] for row in pattern.grid], dtype=np.uint8)
    return Image.fromarray(rgb).resize((pattern.width * scale, pattern.height * scale), Image.Resampling.NEAREST)


def render_chart(pattern: Pattern, row_offset: int = 0, col_offset: int = 0, title: str | None = None, cell: int = 28) -> Image.Image:
    """Render a grid fragment; all labels are global 1-based coordinates."""
    grid = pattern.grid
    height, width = grid.shape
    left, top = 48, 52
    canvas = Image.new("RGB", (left + width * cell + 14, top + height * cell + 14), "white")
    draw = ImageDraw.Draw(canvas)
    palette = _color_lookup(pattern)
    label_font, title_font = _font(max(9, cell // 3)), _font(15, True)
    draw.text((8, 8), title or f"BeadFlow | {pattern.width}×{pattern.height}", fill="#17233A", font=title_font)
    for y in range(height):
        for x in range(width):
            x0, y0 = left + x * cell, top + y * cell
            draw.rectangle((x0, y0, x0 + cell, y0 + cell), fill=palette[int(grid[y, x])], outline="#384457", width=1)
            if cell >= 26:
                code = _source_palette().colors[int(grid[y, x])].code
                draw.text((x0 + 2, y0 + cell // 3), code, fill="#111827", font=_font(8))
    for x in range(width):
        if x == 0 or (col_offset + x + 1) % 5 == 0:
            draw.text((left + x * cell + 2, top - 20), str(col_offset + x + 1), fill="#111827", font=label_font)
    for y in range(height):
        if y == 0 or (row_offset + y + 1) % 5 == 0:
            draw.text((5, top + y * cell + 4), str(row_offset + y + 1), fill="#111827", font=label_font)
    return canvas


def render_tiles(pattern: Pattern, output_dir: Path, board_size: int = 29) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    tiles: list[Path] = []
    rows, cols = math.ceil(pattern.height / board_size), math.ceil(pattern.width / board_size)
    for board_row in range(rows):
        for board_col in range(cols):
            y0, x0 = board_row * board_size, board_col * board_size
            fragment = Pattern(pattern.width, pattern.height, pattern.palette_id, pattern.palette_status, pattern.source_name, pattern.fit, pattern.grid[y0:y0 + board_size, x0:x0 + board_size], pattern.colors)
            number = board_row * cols + board_col + 1
            image = render_chart(fragment, y0, x0, f"Board R{board_row + 1}-C{board_col + 1} ({number}/{rows * cols})", cell=26)
            path = output_dir / f"board_r{board_row + 1:02d}_c{board_col + 1:02d}.png"
            image.save(path)
            tiles.append(path)
    return tiles
