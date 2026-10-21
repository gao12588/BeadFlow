import type { Material, Pattern } from './types'
import { colorAt, labDistance, rgbToLab } from './engine'

const dark = (hex: string) => (parseInt(hex.slice(1, 3), 16) * 299 + parseInt(hex.slice(3, 5), 16) * 587 + parseInt(hex.slice(5, 7), 16) * 114) / 1000 < 142
const fitText = (context: CanvasRenderingContext2D, text: string, max: number) => {
  if (context.measureText(text).width <= max) return text
  let result = text
  while (result.length > 1 && context.measureText(`${result}…`).width > max) result = result.slice(0, -1)
  return `${result}…`
}

export function renderPattern(pattern: Pattern, scale = 12, range?: { x: number; y: number; width: number; height: number }): HTMLCanvasElement {
  const area = range ?? { x: 0, y: 0, width: pattern.width, height: pattern.height }
  const canvas = document.createElement('canvas'); canvas.width = area.width * scale; canvas.height = area.height * scale
  const context = canvas.getContext('2d')!
  for (let y = 0; y < area.height; y++) for (let x = 0; x < area.width; x++) { context.fillStyle = colorAt(pattern, (area.y + y) * pattern.width + area.x + x).hex; context.fillRect(x * scale, y * scale, scale, scale) }
  return canvas
}

export function renderConstructionChart(pattern: Pattern, title: string, cell = 30, range?: { x: number; y: number; width: number; height: number }): HTMLCanvasElement {
  const area = range ?? { x: 0, y: 0, width: pattern.width, height: pattern.height }, side = 48, header = 86, footer = 36
  const canvas = document.createElement('canvas'); canvas.width = side + area.width * cell + 6; canvas.height = header + area.height * cell + footer
  const context = canvas.getContext('2d')!
  context.fillStyle = '#fffdf8'; context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#172033'; context.font = '700 24px sans-serif'; context.fillText(fitText(context, title, canvas.width - 24), 14, 30)
  context.font = '12px sans-serif'; context.fillStyle = '#475569'; context.fillText(`MARD 参考色 · 2.6mm mini 拼豆 · ${pattern.width} × ${pattern.height} 格 · ${pattern.materials.length} 色 · 每格 1 颗`, 14, 52); context.fillText(`横纵坐标从 1 开始；深色轮廓：${pattern.outlineCode}；每 10 格加粗辅助线`, 14, 70)
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = `600 ${Math.max(9, Math.min(13, cell * .38))}px sans-serif`
  for (let x = 0; x < area.width; x++) context.fillText(String(area.x + x + 1), side + x * cell + cell / 2, header - 15)
  for (let y = 0; y < area.height; y++) context.fillText(String(area.y + y + 1), side / 2, header + y * cell + cell / 2)
  for (let y = 0; y < area.height; y++) for (let x = 0; x < area.width; x++) {
    const item = colorAt(pattern, (area.y + y) * pattern.width + area.x + x), px = side + x * cell, py = header + y * cell
    context.fillStyle = item.hex; context.fillRect(px, py, cell, cell); context.fillStyle = dark(item.hex) ? '#ffffff' : '#111827'; context.font = `700 ${Math.max(7, Math.min(11, cell * .32))}px sans-serif`; context.fillText(item.code, px + cell / 2, py + cell / 2)
  }
  context.strokeStyle = '#64748b'; context.lineWidth = .7
  for (let x = 0; x <= area.width; x++) { const px = side + x * cell; context.beginPath(); context.moveTo(px, header); context.lineTo(px, header + area.height * cell); context.stroke() }
  for (let y = 0; y <= area.height; y++) { const py = header + y * cell; context.beginPath(); context.moveTo(side, py); context.lineTo(side + area.width * cell, py); context.stroke() }
  context.strokeStyle = '#172033'; context.lineWidth = 2.3
  for (let x = 0; x <= area.width; x++) if ((area.x + x) % 10 === 0 || x === area.width) { const px = side + x * cell; context.beginPath(); context.moveTo(px, header); context.lineTo(px, header + area.height * cell); context.stroke() }
  for (let y = 0; y <= area.height; y++) if ((area.y + y) % 10 === 0 || y === area.height) { const py = header + y * cell; context.beginPath(); context.moveTo(side, py); context.lineTo(side + area.width * cell, py); context.stroke() }
  context.textAlign = 'left'; context.textBaseline = 'alphabetic'; context.font = '11px sans-serif'; context.fillStyle = '#475569'; context.fillText('屏幕色仅供参考；制作前请用 MARD 实物色卡核验。', 14, canvas.height - 13)
  return canvas
}

export function similarPairs(materials: Material[]) {
  const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] as [number, number, number]
  const pairs: { left: Material; right: Material; distance: number }[] = []
  for (let left = 0; left < materials.length; left++) for (let right = left + 1; right < materials.length; right++) pairs.push({ left: materials[left], right: materials[right], distance: labDistance(rgbToLab(...rgb(materials[left].hex)), rgbToLab(...rgb(materials[right].hex))) })
  return pairs.sort((a, b) => a.distance - b.distance).slice(0, 3)
}

export function renderMaterialSheet(pattern: Pattern, title: string): HTMLCanvasElement {
  const row = 38, top = 154, width = 1320, footer = 152, height = top + (pattern.materials.length + 1) * row + footer
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d')!, columns = [38, 110, 250, 700, 890, 1100]
  context.fillStyle = '#fffdf8'; context.fillRect(0, 0, width, height); context.fillStyle = '#172033'; context.font = '700 30px sans-serif'; context.fillText(`${title}｜色卡与用量统计`, 38, 48)
  context.font = '16px sans-serif'; context.fillStyle = '#475569'; context.fillText(`总豆数：${pattern.width * pattern.height} 颗　图纸：${pattern.width} × ${pattern.height} 格　使用颜色：${pattern.materials.length} 种　规格：${pattern.beadSizeMm}mm mini`, 38, 78); context.fillText('采购建议已按每色 +5% 向上取整；色号为 MARD 屏幕参考，状态：待实物核验。', 38, 105)
  context.fillStyle = '#e2e8f0'; context.fillRect(30, 120, 1260, row); context.fillStyle = '#172033'; context.font = '700 15px sans-serif'; ['色块', '色号', '颜色名称', '实际数量', '建议购买数量（+5%）', '核验状态'].forEach((text, index) => context.fillText(text, columns[index], 145))
  context.font = '14px sans-serif'
  pattern.materials.forEach((item, index) => { const y = top + index * row; context.fillStyle = index % 2 ? '#f8fafc' : '#fffdf8'; context.fillRect(30, y, 1260, row); context.fillStyle = item.hex; context.fillRect(columns[0], y + 7, 44, 24); context.strokeStyle = '#334155'; context.strokeRect(columns[0], y + 7, 44, 24); context.fillStyle = '#172033'; context.fillText(item.code, columns[1], y + 24); context.fillText(fitText(context, item.name, 420), columns[2], y + 24); context.fillText(`${item.beads} 颗`, columns[3], y + 24); context.fillText(`${Math.ceil(item.beads * 1.05)} 颗`, columns[4], y + 24); context.fillText('待实物核验', columns[5], y + 24) })
  const recommendationY = top + pattern.materials.length * row + 30, pairs = similarPairs(pattern.materials).map((pair) => `${pair.left.code} / ${pair.right.code}`).join('，') || '无', boardNote = pattern.boards.length > 1 ? `需要分 ${pattern.boards.length} 块 29×29 底板施工，按 R1-C1、R1-C2…顺序拼接。` : '本图可在 1 块 29×29 底板内完成。'
  context.fillStyle = '#172033'; context.font = '700 17px sans-serif'; context.fillText('制作建议', 38, recommendationY); context.font = '14px sans-serif'; context.fillStyle = '#334155';
  ;['从左上角第 1 格开始，按行或按 29×29 分板逐格核对施工图。', `屏幕上容易混淆的近似色：${pairs}；请在自然光下以实物 MARD 色卡为准。`, '熨烫：隔烘焙布或薄毛巾短时、均匀移动熨烫；先用余豆做小样，避免过熔。', boardNote].forEach((text, index) => context.fillText(fitText(context, `• ${text}`, 1230), 42, recommendationY + 27 + index * 24))
  return canvas
}

export function renderBoard(pattern: Pattern, board: Pattern['boards'][number], cell = 24): HTMLCanvasElement {
  return renderConstructionChart(pattern, `分板 ${board.board_id}｜起点 (${board.origin.x}, ${board.origin.y})`, cell, { x: board.origin.x - 1, y: board.origin.y - 1, width: board.width, height: board.height })
}
