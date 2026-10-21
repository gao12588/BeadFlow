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

export function buildPattern(image: ImageData, width: number, height: number, maxColors: number, palette: PaletteFile): Pattern {
  const source = document.createElement('canvas')
  source.width = image.width; source.height = image.height
  source.getContext('2d')!.putImageData(image, 0, 0)
  const sampled = document.createElement('canvas')
  sampled.width = width; sampled.height = height
  const context = sampled.getContext('2d', { willReadFrequently: true })!
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height)
  const ratio = Math.min(width / image.width, height / image.height)
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
  const selectedIndices = Array.from(frequencies, (count, index) => ({ count, index })).filter(({ count }) => count > 0).sort((a, b) => b.count - a.count || a.index - b.index).slice(0, Math.min(maxColors, palette.colors.length)).map(({ index }) => index)
  const finalPixels = new Uint16Array(closest.length)
  const counts = new Uint32Array(palette.colors.length)
  for (let pixel = 0; pixel < finalPixels.length; pixel++) {
    const lab = rgbToLab(input[pixel * 4], input[pixel * 4 + 1], input[pixel * 4 + 2])
    let best = selectedIndices[0], bestDistance = Infinity
    selectedIndices.forEach((index) => { const distance = labDistance(lab, labs[index]); if (distance < bestDistance) { best = index; bestDistance = distance } })
    finalPixels[pixel] = best; counts[best]++
  }
  const materials: Material[] = selectedIndices.filter((index) => counts[index]).map((index) => ({ ...palette.colors[index], beads: counts[index], test_status: palette.color_data_status })).sort((a, b) => a.code.localeCompare(b.code))
  return { width, height, pixels: finalPixels, palette, selectedIndices, materials, boards: makeBoards(width, height) }
}

export function patternManifest(pattern: Pattern) {
  return { schema_version: 1, local_processing: true, palette: { id: pattern.palette.palette_id, data_status: pattern.palette.color_data_status, source: pattern.palette.source }, grid: { width: pattern.width, height: pattern.height, total_beads: pattern.width * pattern.height }, materials: pattern.materials, material_total: pattern.materials.reduce((total, item) => total + item.beads, 0), boards: pattern.boards }
}

export function colorAt(pattern: Pattern, position: number): PaletteColor { return pattern.palette.colors[pattern.pixels[position]] }
