"""Image decoding and deterministic local resizing."""
from __future__ import annotations

from pathlib import Path
from typing import BinaryIO

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError


def load_and_resize(source: str | Path | BinaryIO, width: int, height: int, fit: str = "pad") -> np.ndarray:
    if width < 1 or height < 1:
        raise ValueError("width and height must be positive")
    if fit not in {"crop", "pad"}:
        raise ValueError("fit must be 'crop' or 'pad'")
    try:
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("The uploaded file is not a readable image.") from exc
    resize = ImageOps.fit if fit == "crop" else ImageOps.pad
    sampled = resize(image, (width, height), method=Image.Resampling.LANCZOS, color="#FFFFFF")
    return np.asarray(sampled, dtype=np.uint8)
