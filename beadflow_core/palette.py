"""Palette loading and perceptual CIE Lab/CIEDE2000 colour matching."""
from __future__ import annotations

import json
from collections import Counter
from importlib.resources import files

import numpy as np

from .models import BeadColor


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    if len(value) != 6:
        raise ValueError(f"invalid hex colour: {value!r}")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))  # type: ignore[return-value]


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """Convert uint8/sRGB data (..., 3) to CIE Lab using D65 white."""
    values = np.asarray(rgb, dtype=np.float64) / 255.0
    linear = np.where(values <= 0.04045, values / 12.92, ((values + 0.055) / 1.055) ** 2.4)
    matrix = np.array([[0.4124564, 0.3575761, 0.1804375],
                       [0.2126729, 0.7151522, 0.0721750],
                       [0.0193339, 0.1191920, 0.9503041]])
    xyz = linear @ matrix.T
    xyz /= np.array([0.95047, 1.0, 1.08883])
    epsilon, kappa = 216 / 24389, 24389 / 27
    f = np.where(xyz > epsilon, np.cbrt(xyz), (kappa * xyz + 16) / 116)
    return np.stack((116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])), axis=-1)


def ciede2000(lab1: np.ndarray, lab2: np.ndarray) -> np.ndarray:
    """Vectorised CIEDE2000 difference, based on Sharma, Wu & Dalal (2005)."""
    l1, a1, b1 = np.moveaxis(np.asarray(lab1, float), -1, 0)
    l2, a2, b2 = np.moveaxis(np.asarray(lab2, float), -1, 0)
    c1, c2 = np.hypot(a1, b1), np.hypot(a2, b2)
    c_bar = (c1 + c2) / 2
    g = 0.5 * (1 - np.sqrt(c_bar ** 7 / (c_bar ** 7 + 25 ** 7)))
    a1p, a2p = (1 + g) * a1, (1 + g) * a2
    c1p, c2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = (np.degrees(np.arctan2(b1, a1p)) + 360) % 360
    h2p = (np.degrees(np.arctan2(b2, a2p)) + 360) % 360
    dl, dc = l2 - l1, c2p - c1p
    dh = h2p - h1p
    dh = np.where(c1p * c2p == 0, 0, np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh)))
    d_h = 2 * np.sqrt(c1p * c2p) * np.sin(np.radians(dh / 2))
    l_bar, cp_bar = (l1 + l2) / 2, (c1p + c2p) / 2
    hp_sum = h1p + h2p
    hp_bar = np.where(c1p * c2p == 0, hp_sum, np.where(np.abs(h1p - h2p) <= 180, hp_sum / 2, np.where(hp_sum < 360, (hp_sum + 360) / 2, (hp_sum - 360) / 2)))
    t = 1 - .17 * np.cos(np.radians(hp_bar - 30)) + .24 * np.cos(np.radians(2 * hp_bar)) + .32 * np.cos(np.radians(3 * hp_bar + 6)) - .20 * np.cos(np.radians(4 * hp_bar - 63))
    delta_theta = 30 * np.exp(-((hp_bar - 275) / 25) ** 2)
    r_c = 2 * np.sqrt(cp_bar ** 7 / (cp_bar ** 7 + 25 ** 7))
    s_l = 1 + .015 * (l_bar - 50) ** 2 / np.sqrt(20 + (l_bar - 50) ** 2)
    s_c, s_h = 1 + .045 * cp_bar, 1 + .015 * cp_bar * t
    r_t = -np.sin(np.radians(2 * delta_theta)) * r_c
    return np.sqrt((dl / s_l) ** 2 + (dc / s_c) ** 2 + (d_h / s_h) ** 2 + r_t * (dc / s_c) * (d_h / s_h))


class Palette:
    def __init__(self, metadata: dict, colors: list[BeadColor]):
        self.metadata, self.colors = metadata, colors
        self.rgb = np.asarray([color.rgb for color in colors], dtype=np.uint8)
        self.lab = rgb_to_lab(self.rgb)

    @classmethod
    def mard_221(cls) -> "Palette":
        return cls.from_json_text(files("beadflow_core.data").joinpath("mard_221_reference.json").read_text(encoding="utf-8"))

    @classmethod
    def from_file(cls, path: str) -> "Palette":
        """Load a versioned palette JSON in the bundled data schema."""
        with open(path, encoding="utf-8") as palette_file:
            return cls.from_json_text(palette_file.read())

    @classmethod
    def from_json_text(cls, text: str) -> "Palette":
        raw = json.loads(text)
        required = {"palette_id", "color_data_status", "source", "colors"}
        if not required <= raw.keys() or not raw["colors"]:
            raise ValueError("palette must contain palette_id, source, status, and non-empty colors")
        colors = [BeadColor(item["code"], item.get("name", item["code"]), item["hex"], hex_to_rgb(item["hex"]), raw["color_data_status"]) for item in raw["colors"]]
        return cls(raw, colors)

    def reduce_for_image(self, image_lab: np.ndarray, max_colors: int) -> np.ndarray:
        if not 1 <= max_colors <= len(self.colors):
            raise ValueError(f"colors must be between 1 and {len(self.colors)}")
        distances = ciede2000(image_lab[..., None, :], self.lab[None, None, :, :])
        nearest = distances.argmin(axis=2)
        chosen = [index for index, _ in Counter(nearest.ravel().tolist()).most_common(max_colors)]
        return np.asarray(chosen, dtype=np.int16)

    def map_image(self, image_rgb: np.ndarray, max_colors: int) -> np.ndarray:
        image_lab = rgb_to_lab(image_rgb)
        selected = self.reduce_for_image(image_lab, max_colors)
        distances = ciede2000(image_lab[..., None, :], self.lab[selected][None, None, :, :])
        return selected[distances.argmin(axis=2)]
