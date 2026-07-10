import type { Play } from '@/types/play'
import { flood } from './flood'
import { hoStackCenter } from './ho-stack-center'
import { reverse } from './reverse'
import { garlic } from './garlic'
import { box } from './box'
import { zipperBooty } from './zipper-booty'
import { windmill1 } from './windmill-1'
import { windmill2 } from './windmill-2'
import { endzoneCenterFlow } from './endzone-center-flow'
import { endzoneBabyIso } from './endzone-baby-iso'
import { endzoneCookies } from './endzone-cookies'
import { endzoneCookiesAndCream } from './endzone-cookies-and-cream'
import { zoneD232 } from './zone-d-2-3-2'

export const ALL_PLAYS: Play[] = [
  flood,
  hoStackCenter,
  reverse,
  garlic,
  box,
  zipperBooty,
  windmill1,
  windmill2,
  endzoneCenterFlow,
  endzoneBabyIso,
  endzoneCookies,
  endzoneCookiesAndCream,
  zoneD232,
]

export const PLAYS: Record<string, Play> = Object.fromEntries(ALL_PLAYS.map((play) => [play.id, play]))

export const DEFAULT_PLAY_ID = 'flood'

export function categoriesWithPlays(): Play['category'][] {
  return Array.from(new Set(ALL_PLAYS.map((p) => p.category)))
}

export function setsInCategory(category: Play['category']): Play['set'][] {
  return Array.from(new Set(ALL_PLAYS.filter((p) => p.category === category).map((p) => p.set)))
}

export function playsInSet(category: Play['category'], set: Play['set']): Play[] {
  return ALL_PLAYS.filter((p) => p.category === category && p.set === set)
}
