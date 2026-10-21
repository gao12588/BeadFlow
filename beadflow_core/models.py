from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class BeadColor:
    code: str
    name: str
    hex: str
    rgb: tuple[int, int, int]
    status: str


@dataclass
class Pattern:
    width: int
    height: int
    palette_id: str
    palette_status: str
    source_name: str
    fit: str
    grid: Any
    colors: list[BeadColor]

    @property
    def total_beads(self) -> int:
        return self.width * self.height
