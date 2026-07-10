export const FIELD_WIDTH = 100
export const FIELD_HEIGHT = 120
export const ENDZONE_DEPTH = 20

// For 'endzone' set plays: same full field height as every other play, but
// the endzone band occupies 2/3 of it (no cropping — same available space).
export const ENDZONE_LARGE_DEPTH = 80

export function toPixel(x: number, y: number) {
  return { px: x * FIELD_WIDTH, py: y * FIELD_HEIGHT }
}
