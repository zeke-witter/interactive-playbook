import type { Play } from '@/types/play'
import { windmill } from './windmill'
import { backZipper } from './back-zipper'
import { reverseFlood } from './reverse-flood'
import { flood } from './flood'
import { garlic } from './garlic'
import { box } from './box'

export const ALL_PLAYS: Play[] = [windmill, backZipper, reverseFlood, flood, garlic, box]

export const PLAYS: Record<string, Play> = Object.fromEntries(ALL_PLAYS.map((play) => [play.id, play]))

export const DEFAULT_PLAY_ID: string | undefined = ALL_PLAYS[0]?.id

export function categoriesWithPlays(): Play['category'][] {
  return Array.from(new Set(ALL_PLAYS.map((p) => p.category)))
}

export function setsInCategory(category: Play['category']): Play['set'][] {
  return Array.from(new Set(ALL_PLAYS.filter((p) => p.category === category).map((p) => p.set)))
}

export function playsInSet(category: Play['category'], set: Play['set']): Play[] {
  return ALL_PLAYS.filter((p) => p.category === category && p.set === set)
}
