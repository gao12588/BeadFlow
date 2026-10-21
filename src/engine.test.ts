import { describe, expect, it } from 'vitest'
import { calculateAutoHeight, labDistance, makeBoards, outlineAroundBackground, patternManifest, rgbToLab } from './engine'
import type { Pattern } from './types'

describe('bead engine', () => {
  it('converts identical colours to zero Lab distance', () => expect(labDistance(rgbToLab(255, 0, 0), rgbToLab(255, 0, 0))).toBe(0))
  it('creates correctly bounded 29×29 boards', () => {
    const boards = makeBoards(35, 31)
    expect(boards).toHaveLength(4); expect(boards[boards.length - 1]).toMatchObject({ board_id: 'R2-C2', origin: { x: 30, y: 30 }, width: 6, height: 2 })
  })
  it('keeps manifest material total equal to grid pixels', () => {
    const pattern = { width: 2, height: 2, pixels: new Uint16Array([0, 0, 0, 0]), selectedIndices: [0], boards: [], palette: { palette_id: 'test', color_data_status: 'pending', source: {}, colors: [] }, materials: [{ code: 'A1', name: 'A1', hex: '#fff', beads: 4, test_status: 'pending' }] } as unknown as Pattern
    expect(patternManifest(pattern).material_total).toBe(patternManifest(pattern).grid.total_beads)
  })
  it('keeps a proportional image inside the requested safety margin', () => {
    expect(calculateAutoHeight(100, 200, 50, 3)).toBe(94)
    expect(calculateAutoHeight(200, 100, 50, 5)).toBe(30)
  })
  it('adds the dark outline only around foreground pixels', () => {
    const outlined = outlineAroundBackground(new Uint16Array([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]), 5, 5, 0, 2)
    expect([...outlined]).toEqual([
      0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 1, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0,
    ])
  })
})
