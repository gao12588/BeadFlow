import io
import json
import zipfile
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from beadflow_core.exporting import export_bundle, manifest
from beadflow_core.palette import Palette, ciede2000
from beadflow_core.pipeline import build_pattern


def image_bytes(width=12, height=9):
    image = Image.new("RGB", (width, height))
    image.putdata([(x * 21 % 256, y * 31 % 256, (x + y) * 17 % 256) for y in range(height) for x in range(width)])
    data = io.BytesIO(); data.name = "fixture.png"; image.save(data, "PNG"); data.seek(0)
    return data


def test_pattern_pixel_and_colour_limits():
    pattern = build_pattern(image_bytes(), 12, 9, 4)
    assert pattern.grid.shape == (9, 12)
    assert pattern.total_beads == 108
    assert len(set(pattern.grid.ravel())) <= 4
    assert len(Palette.mard_221().colors) == 221


def test_palette_file_is_configurable(tmp_path):
    source = Path(__file__).parents[1] / "beadflow_core" / "data" / "mard_221_reference.json"
    configured = Palette.from_file(str(source))
    assert configured.metadata["palette_id"] == "mard-221-reference"


def test_delta_e_reference_identity_is_zero():
    sample = np.array([50.0, 2.6772, -79.7751])
    assert ciede2000(sample, sample) == pytest.approx(0.0)


def test_boards_and_materials_are_consistent(tmp_path):
    pattern = build_pattern(image_bytes(35, 31), 35, 31, 6)
    data = manifest(pattern)
    assert data["material_total"] == 35 * 31
    assert len(data["boards"]) == 4
    assert data["boards"][0]["board_id"] == "R1-C1"
    assert data["boards"][-1]["origin"] == {"x": 30, "y": 30}
    assert data["boards"][-1]["width"] == 6
    assert data["boards"][-1]["height"] == 2
    bundle = export_bundle(pattern, tmp_path)
    with zipfile.ZipFile(bundle) as archive:
        names = set(archive.namelist())
        assert {"01_pixel_preview.png", "02_grid_overview.png", "03_materials_and_boards.json", "04_printable_pattern.pdf"} <= names
        exported = json.loads(archive.read("03_materials_and_boards.json"))
    assert exported["material_total"] == pattern.total_beads
    assert sum(item["beads"] for item in exported["materials"]) == pattern.total_beads


def test_bad_image_is_a_clear_error():
    broken = io.BytesIO(b"this is not an image"); broken.name = "broken.jpg"
    with pytest.raises(ValueError, match="not a readable image"):
        build_pattern(broken, 10, 10, 4)
