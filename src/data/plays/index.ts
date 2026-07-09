import type { Play } from '@/types/play'
import { flood } from './flood'
import { hoStackCenter } from './ho-stack-center'
import { reverse } from './reverse'

export const ALL_PLAYS: Play[] = [flood, hoStackCenter, reverse]

export const PLAYS: Record<string, Play> = Object.fromEntries(ALL_PLAYS.map((play) => [play.id, play]))
