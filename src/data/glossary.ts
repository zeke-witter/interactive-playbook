export type GlossaryEntry = {
  definition: string
  zone?: { x: number; y: number; width: number; height: number }
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'break side': {
    definition: "The side of the field away from the mark's force — harder for the defense to take away.",
    zone: { x: 0.5, y: 0.1667, width: 0.5, height: 0.6667 },
  },
  'open side': {
    definition: "The side of the field the mark's force is pushing the thrower away from — the easier throw.",
    zone: { x: 0, y: 0.1667, width: 0.5, height: 0.6667 },
  },
  'under': {
    definition: 'A cut toward the thrower, attacking the space in front of the disc.',
  },
  'continuation': {
    definition: 'The next throw in a fast sequence, hit immediately after the previous catch before the defense resets.',
  },
  'rail': {
    definition: 'The lane running along a sideline, where rail cutters set up and clear.',
  },
  'reset': {
    definition: 'A short, low-risk throw back to a handler used to restart the flow of the offense.',
  },
}
