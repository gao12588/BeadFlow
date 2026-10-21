import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import { patternManifest } from './engine'
import { renderBoard, renderConstructionChart, renderMaterialSheet } from './render'
import type { Pattern } from './types'

const png = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('无法生成 PNG')), 'image/png'))

export async function exportZip(pattern: Pattern, title = 'BeadFlow 拼豆施工图'): Promise<Blob> {
  const zip = new JSZip()
  const renderedBoards = pattern.boards.map((board) => ({ board, canvas: renderBoard(pattern, board) }))
  const construction = renderConstructionChart(pattern, title, 30)
  const materials = renderMaterialSheet(pattern, title)
  zip.file('01_construction_chart.png', await png(construction))
  zip.file('02_materials_and_shopping_list.png', await png(materials))
  for (const item of renderedBoards) zip.file(`boards/board_${item.board.board_id.toLowerCase()}.png`, await png(item.canvas))
  zip.file('03_materials_and_boards.json', JSON.stringify(patternManifest(pattern, title), null, 2))
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  pdf.setFontSize(17); pdf.text(title, 38, 44)
  pdf.setFontSize(9); pdf.text(`${pattern.width} × ${pattern.height} 格 ｜ ${pattern.width * pattern.height} 颗 ｜ ${pattern.materials.length} 色 ｜ 2.6mm mini`, 38, 62)
  pdf.text('完整高清主图与色卡统计请使用 ZIP 内 PNG；本 PDF 提供分板施工图。', 38, 76)
  for (const item of renderedBoards) {
    pdf.addPage()
    const boardCanvas = item.canvas
    const scale = Math.min(540 / boardCanvas.width, 730 / boardCanvas.height)
    pdf.addImage(boardCanvas.toDataURL('image/png'), 'PNG', (595 - boardCanvas.width * scale) / 2, 38, boardCanvas.width * scale, boardCanvas.height * scale)
  }
  pdf.addPage()
  const materialScale = Math.min(540 / materials.width, 730 / materials.height)
  pdf.addImage(materials.toDataURL('image/png'), 'PNG', (595 - materials.width * materialScale) / 2, 36, materials.width * materialScale, materials.height * materialScale)
  zip.file('04_printable_pattern.pdf', pdf.output('blob'))
  return zip.generateAsync({ type: 'blob' })
}

export function download(blob: Blob, filename: string) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename
  link.click(); URL.revokeObjectURL(link.href)
}
