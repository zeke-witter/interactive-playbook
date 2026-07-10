export const FIELD_WIDTH = 100
export const FIELD_HEIGHT = 120
export const ENDZONE_DEPTH = 20

// For 'endzone' set plays: crop the view to 2/3 endzone (top) + 1/3 open field
// (bottom), with the own/lower endzone cropped out entirely.
export const ENDZONE_VIEW_DEPTH = 40
export const ENDZONE_VIEW_HEIGHT = 60

export function toPixel(x: number, y: number) {
  return { px: x * FIELD_WIDTH, py: y * FIELD_HEIGHT }
}
