export type PaletteColor = { code: string; name: string; hex: string }

export type PaletteFile = {
  palette_id: string
  brand: string
  color_data_status: string
  source: { title: string; url: string; license: string; note: string }
  colors: PaletteColor[]
}

export type Material = PaletteColor & { beads: number; test_status: string }

export type Board = { board_id: string; row: number; column: number; origin: { x: number; y: number }; width: number; height: number }

export type Pattern = {
  width: number
  height: number
  pixels: Uint16Array
  palette: PaletteFile
  selectedIndices: number[]
  materials: Material[]
  boards: Board[]
}
