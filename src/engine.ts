import type { Board, Material, PaletteColor, PaletteFile, Pattern } from './types'

type Lab = [number, number, number]

const hexRgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]

export function rgbToLab(red: number, green: number, blue: number): Lab {
  const convert = (channel: number) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const r = convert(red), g = convert(green), b = convert(blue)
  const x = (r * .4124564 + g * .3575761 + b * .1804375) / .95047
  const y = r * .2126729 + g * .7151522 + b * .072175
  const z = (r * .0193339 + g * .119192 + b * .9503041) / 1.08883
  const f = (value: number) => value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27 * value + 16) / 116
  const fx = f(x), fy = f(y), fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export const labDistance = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

export function makeBoards(width: number, height: number, boardSize = 29): Board[] {
  const boards: Board[] = []
  for (let y = 0; y < height; y += boardSize) for (let x = 0; x < width; x += boardSize) {
    boards.push({ board_id: `R${Math.floor(y / boardSize) + 1}-C${Math.floor(x / boardSize) + 1}`, row: Math.floor(y / boardSize) + 1, column: Math.floor(x / boardSize) + 1, origin: { x: x + 1, y: y + 1 }, width: Math.min(boardSize, width - x), height: Math.min(boardSize, height - y) })
  }
  return boards
}

export function calculateAutoHeight(sourceWidth: number, sourceHeight: number, gridWidth = 50, safeMargin = 3): number {
  const innerWidth = Math.max(1, gridWidth - safeMargin * 2)
  const proportionateInnerHeight = Math.round(innerWidth * sourceHeight / sourceWidth)
  return Math.max(safeMargin * 2 + 1, Math.min(180, proportionateInnerHeight + safeMargin * 2))
}

export function outlineAroundBackground(pixels: Uint16Array, width: number, height: number, background: number, outline: number): Uint16Array {
  const result = new Uint16Array(pixels)
  const at = (x: number, y: number) => pixels[y * width + x]
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (at(x, y) === background) continue
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && at(nx, ny) === background) result[ny * width + nx] = outline
    }
  }
  return result
}

const materialList = (pixels: Uint16Array, palette: PaletteFile): Material[] => {
  const counts = new Uint32Array(palette.colors.length)
  pixels.forEach((index) => counts[index]++)
  return Array.from(counts, (beads, index) => beads ? ({ ...palette.colors[index], beads, test_status: palette.color_data_status }) : null)
    .filter((item): item is Material => item !== null).sort((a, b) => a.code.localeCompare(b.code))
}

export function buildPattern(image: ImageData, width: number, height: number, maxColors: number, palette: PaletteFile, safeMargin = 3): Pattern {
  const margin = Math.max(2, Math.min(5, Math.floor(safeMargin)))
  const allowedColors = Math.max(2, Math.min(16, Math.floor(maxColors)))
  const source = document.createElement('canvas')
  source.width = image.width; source.height = image.height
  source.getContext('2d')!.putImageData(image, 0, 0)
  const sampled = document.createElement('canvas')
  sampled.width = width; sampled.height = height
  const context = sampled.getContext('2d', { willReadFrequently: true })!
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height)
  const innerWidth = Math.max(1, width - margin * 2), innerHeight = Math.max(1, height - margin * 2)
  const ratio = Math.min(innerWidth / image.width, innerHeight / image.height)
  const drawWidth = image.width * ratio, drawHeight = image.height * ratio
  context.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
  const input = context.getImageData(0, 0, width, height).data
  const labs = palette.colors.map((color) => rgbToLab(...hexRgb(color.hex)))
  const closest = new Uint16Array(width * height)
  const frequencies = new Uint32Array(palette.colors.length)
  for (let pixel = 0; pixel < closest.length; pixel++) {
    const lab = rgbToLab(input[pixel * 4], input[pixel * 4 + 1], input[pixel * 4 + 2])
    let best = 0, bestDistance = Infinity
    labs.forEach((candidate, index) => { const distance = labDistance(lab, candidate); if (distance < bestDistance) { best = index; bestDistance = distance } })
    closest[pixel] = best; frequencies[best]++
  }
  const outlineIndex = Math.max(0, palette.colors.findIndex((item) => item.code === 'H7'))
  // Reserve one real MARD dark colour for the construction outline when possible.
  const selectedIndices = Array.from(frequencies, (count, index) => ({ count, index })).filter(({ count }) => count > 0).sort((a, b) => b.count - a.count || a.index - b.index).slice(0, Math.min(allowedColors - 1, palette.colors.length)).map(({ index }) => index)
  if (!selectedIndices.length) selectedIndices.push(0)
  const finalPixels = new Uint16Array(closest.length)
  for (let pixel = 0; pixel < finalPixels.length; pixel++) {
    const lab = rgbToLab(input[pixel * 4], input[pixel * 4 + 1], input[pixel * 4 + 2])
    let best = selectedIndices[0], bestDistance = Infinity
    selectedIndices.forEach((index) => { const distance = labDistance(lab, labs[index]); if (distance < bestDistance) { best = index; bestDistance = distance } })
    finalPixels[pixel] = best
  }
  const edgeSamples = [0, width - 1, (height - 1) * width, height * width - 1]
  const edgeFrequency = new Map<number, number>()
  edgeSamples.forEach((position) => edgeFrequency.set(finalPixels[position], (edgeFrequency.get(finalPixels[position]) ?? 0) + 1))
  const background = [...edgeFrequency.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
  const outlinedPixels = outlineAroundBackground(finalPixels, width, height, background, outlineIndex)
  const materials = materialList(outlinedPixels, palette)
  return { width, height, pixels: outlinedPixels, palette, selectedIndices: materials.map((item) => palette.colors.findIndex((color) => color.code === item.code)), materials, boards: makeBoards(width, height), safeMargin: margin, beadSizeMm: 2.6, outlineCode: palette.colors[outlineIndex].code }
}

export function patternManifest(pattern: Pattern, title = 'BeadFlow 拼豆施工图') {
  return { schema_version: 2, title, local_processing: true, specification: { bead_size_mm: pattern.beadSizeMm, safe_margin_cells: pattern.safeMargin, outline_code: pattern.outlineCode, maximum_colors: 16 }, palette: { id: pattern.palette.palette_id, data_status: pattern.palette.color_data_status, source: pattern.palette.source }, grid: { width: pattern.width, height: pattern.height, total_beads: pattern.width * pattern.height }, materials: pattern.materials, material_total: pattern.materials.reduce((total, item) => total + item.beads, 0), boards: pattern.boards }
}

export function colorAt(pattern: Pattern, position: number): PaletteColor { return pattern.palette.colors[pattern.pixels[position]] }
