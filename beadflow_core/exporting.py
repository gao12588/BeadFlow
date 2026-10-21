"""Consistent JSON, PNG, PDF and ZIP export."""
from __future__ import annotations

import json
import math
import zipfile
from collections import Counter
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from .models import Pattern
from .palette import Palette
from .rendering import render_chart, render_preview, render_tiles


def material_list(pattern: Pattern) -> list[dict]:
    palette = Palette.mard_221()
    counts = Counter(pattern.grid.ravel().tolist())
    return [{"code": palette.colors[index].code, "name": palette.colors[index].name, "hex": palette.colors[index].hex, "beads": int(counts[index]), "test_status": palette.colors[index].status} for index in sorted(counts, key=lambda value: palette.colors[value].code)]


def manifest(pattern: Pattern, board_size: int = 29) -> dict:
    materials = material_list(pattern)
    boards = [{"board_id": f"R{row + 1}-C{col + 1}", "row": row + 1, "column": col + 1, "origin": {"x": col * board_size + 1, "y": row * board_size + 1}, "width": min(board_size, pattern.width - col * board_size), "height": min(board_size, pattern.height - row * board_size)} for row in range(math.ceil(pattern.height / board_size)) for col in range(math.ceil(pattern.width / board_size))]
    return {"schema_version": 1, "source": pattern.source_name, "local_processing": True, "palette": {"id": pattern.palette_id, "data_status": pattern.palette_status, "source": Palette.mard_221().metadata["source"]}, "grid": {"width": pattern.width, "height": pattern.height, "total_beads": pattern.total_beads, "fit": pattern.fit}, "materials": materials, "material_total": sum(item["beads"] for item in materials), "boards": boards}


def _pdf(path: Path, pattern: Pattern, tile_paths: list[Path], materials: list[dict]) -> None:
    pdf = canvas.Canvas(str(path), pagesize=A4)
    page_width, page_height = A4
    pdf.setTitle("BeadFlow pattern")
    pdf.setFont("Helvetica-Bold", 17); pdf.drawString(36, page_height - 42, "BEADFLOW — MARD reference pattern")
    pdf.setFont("Helvetica", 9); pdf.drawString(36, page_height - 59, f"{pattern.width} × {pattern.height} cells | {pattern.total_beads} beads | {len(materials)} colours")
    pdf.drawString(36, page_height - 74, "Palette RGB is a screen reference; verify each MARD code against physical stock before production.")
    preview = render_preview(pattern, 8); preview_path = path.with_suffix(".preview.png"); preview.save(preview_path)
    scale = min((page_width - 72) / preview.width, (page_height - 130) / preview.height)
    pdf.drawImage(str(preview_path), (page_width - preview.width * scale) / 2, 75, width=preview.width * scale, height=preview.height * scale)
    preview_path.unlink(missing_ok=True); pdf.showPage()
    for tile in tile_paths:
        from PIL import Image
        image = Image.open(tile)
        scale = min((page_width - 36) / image.width, (page_height - 36) / image.height)
        pdf.drawImage(str(tile), (page_width - image.width * scale) / 2, (page_height - image.height * scale) / 2, width=image.width * scale, height=image.height * scale)
        pdf.showPage()
    pdf.setFont("Helvetica-Bold", 15); pdf.drawString(36, page_height - 42, "Materials")
    pdf.setFont("Helvetica", 9); y = page_height - 70
    for item in materials:
        if y < 45:
            pdf.showPage(); pdf.setFont("Helvetica", 9); y = page_height - 45
        pdf.drawString(42, y, f"{item['code']:>4}   {item['hex']}   {item['beads']:>5} beads   [{item['test_status']}]" ); y -= 16
    pdf.save()


def export_bundle(pattern: Pattern, output_dir: str | Path, board_size: int = 29) -> Path:
    output = Path(output_dir); output.mkdir(parents=True, exist_ok=True)
    preview = output / "01_pixel_preview.png"; render_preview(pattern).save(preview)
    overview = output / "02_grid_overview.png"; render_chart(pattern, title=f"BeadFlow overview | {pattern.width}×{pattern.height}", cell=max(12, min(25, 1300 // max(pattern.width, pattern.height)))).save(overview)
    tiles = render_tiles(pattern, output / "boards", board_size)
    data = manifest(pattern, board_size)
    json_path = output / "03_materials_and_boards.json"; json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    pdf_path = output / "04_printable_pattern.pdf"; _pdf(pdf_path, pattern, tiles, data["materials"])
    zip_path = output / "beadflow_pattern.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for file in output.rglob("*"):
            if file.is_file() and file != zip_path:
                archive.write(file, file.relative_to(output))
    return zip_path
