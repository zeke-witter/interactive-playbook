'use client'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState, ThrowArc as ThrowArcData } from '@/types/play'

type ThrowArcProps = {
  throwArc: ThrowArcData | undefined
  players: PlayerState[]
  onComplete?: () => void
}

export function ThrowArc({ throwArc, players, onComplete }: ThrowArcProps) {
  if (!throwArc) return null

  const from = players.find((p) => p.id === throwArc.from && !p.isDefense)
  const to = players.find((p) => p.id === throwArc.to && !p.isDefense)
  if (!from || !to) return null

  const start = toPixel(from.x, from.y)
  const end = toPixel(to.x, to.y)

  return (
    <motion.circle
      r={1.4}
      fill="white"
      initial={{ cx: start.px, cy: start.py }}
      animate={{ cx: end.px, cy: end.py }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      onAnimationComplete={onComplete}
    />
  )
}
