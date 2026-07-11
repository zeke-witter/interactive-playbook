import type { Play } from '@/types/play'

export const CATEGORY_LABELS: Record<Play['category'], string> = {
  offense: 'Offense',
  defense: 'Defense',
}

export const SET_LABELS: Record<Play['set'], string> = {
  'ho-stack': 'Ho Stack',
  'vert-stack': 'Vert Stack',
  'zone-o': 'Zone Offense',
  'zone-d': 'Zone Defense',
  'person-d': 'Person Defense',
  endzone: 'Endzone',
}

export const ALL_CATEGORIES: Play['category'][] = ['offense', 'defense']
export const ALL_SETS: Play['set'][] = ['ho-stack', 'vert-stack', 'zone-o', 'zone-d', 'person-d', 'endzone']
