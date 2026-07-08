export const FIELD_WIDTH = 100
export const FIELD_HEIGHT = 120
export const ENDZONE_DEPTH = 20

export function toPixel(x: number, y: number) {
  return { px: x * FIELD_WIDTH, py: y * FIELD_HEIGHT }
}
