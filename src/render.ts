import type { Pattern } from './types'
import { colorAt } from './engine'

export function renderPattern(pattern: Pattern, scale = 12, range?: { x: number; y: number; width: number; height: number }): HTMLCanvasElement {
  const area = range ?? { x: 0, y: 0, width: pattern.width, height: pattern.height }
  const canvas = document.createElement('canvas')
  canvas.width = area.width * scale; canvas.height = area.height * scale
  const context = canvas.getContext('2d')!
  for (let y = 0; y < area.height; y++) for (let x = 0; x < area.width; x++) {
    context.fillStyle = colorAt(pattern, (area.y + y) * pattern.width + area.x + x).hex
    context.fillRect(x * scale, y * scale, scale, scale)
  }
  return canvas
}

export function renderBoard(pattern: Pattern, board: Pattern['boards'][number], cell = 18): HTMLCanvasElement {
  const header = 44, side = 34
  const canvas = document.createElement('canvas')
  canvas.width = side + board.width * cell + 4; canvas.height = header + board.height * cell + 4
  const context = canvas.getContext('2d')!
  context.fillStyle = '#fffdf8'; context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#16324f'; context.font = 'bold 13px sans-serif'; context.fillText(`底板 ${board.board_id} ｜起点 (${board.origin.x}, ${board.origin.y})`, 6, 17)
  context.font = '10px sans-serif'; context.fillStyle = '#4b5563'
  for (let x = 0; x < board.width; x++) if (x === 0 || (board.origin.x + x) % 5 === 0) context.fillText(String(board.origin.x + x), side + x * cell + 2, 34)
  for (let y = 0; y < board.height; y++) if (y === 0 || (board.origin.y + y) % 5 === 0) context.fillText(String(board.origin.y + y), 2, header + y * cell + 12)
  for (let y = 0; y < board.height; y++) for (let x = 0; x < board.width; x++) {
    const item = colorAt(pattern, (board.origin.y - 1 + y) * pattern.width + board.origin.x - 1 + x)
    const px = side + x * cell, py = header + y * cell
    context.fillStyle = item.hex; context.fillRect(px, py, cell, cell)
    context.strokeStyle = '#475569'; context.strokeRect(px, py, cell, cell)
    if (cell >= 18) { context.fillStyle = '#111827'; context.font = '8px sans-serif'; context.fillText(item.code, px + 2, py + cell / 2 + 3) }
  }
  return canvas
}
