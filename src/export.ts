import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import { patternManifest } from './engine'
import { renderBoard, renderPattern } from './render'
import type { Pattern } from './types'

const png = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('无法生成 PNG')), 'image/png'))

export async function exportZip(pattern: Pattern): Promise<Blob> {
  const zip = new JSZip()
  const renderedBoards = pattern.boards.map((board) => ({ board, canvas: renderBoard(pattern, board) }))
  zip.file('01_pixel_preview.png', await png(renderPattern(pattern, 14)))
  const overviewScale = Math.max(4, Math.floor(1600 / Math.max(pattern.width, pattern.height)))
  zip.file('02_grid_overview.png', await png(renderPattern(pattern, overviewScale)))
  for (const item of renderedBoards) zip.file(`boards/board_${item.board.board_id.toLowerCase()}.png`, await png(item.canvas))
  zip.file('03_materials_and_boards.json', JSON.stringify(patternManifest(pattern), null, 2))
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  pdf.setFontSize(17); pdf.text('BEADFLOW｜MARD 参考图纸', 38, 44)
  pdf.setFontSize(9); pdf.text(`${pattern.width} × ${pattern.height} 格 ｜ ${pattern.width * pattern.height} 颗 ｜ ${pattern.materials.length} 色`, 38, 62)
  pdf.text('色值为屏幕参考，制作前请对照手头实物色卡。', 38, 76)
  for (const item of renderedBoards) {
    pdf.addPage()
    const boardCanvas = item.canvas
    const scale = Math.min(540 / boardCanvas.width, 730 / boardCanvas.height)
    pdf.addImage(boardCanvas.toDataURL('image/png'), 'PNG', (595 - boardCanvas.width * scale) / 2, 38, boardCanvas.width * scale, boardCanvas.height * scale)
  }
  pdf.addPage(); pdf.setFontSize(16); pdf.text('材料清单', 38, 44); pdf.setFontSize(10)
  let y = 70
  pattern.materials.forEach((item) => { if (y > 790) { pdf.addPage(); y = 45 }; pdf.text(`${item.code}  ${item.hex}  ${item.beads} 颗  [待实物核验]`, 42, y); y += 18 })
  zip.file('04_printable_pattern.pdf', pdf.output('blob'))
  return zip.generateAsync({ type: 'blob' })
}

export function download(blob: Blob, filename: string) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename
  link.click(); URL.revokeObjectURL(link.href)
}
