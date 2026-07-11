'use client'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState, ThrowArc } from '@/types/play'

type DiscProps = {
  step: { id: string; players: PlayerState[]; throw?: ThrowArc }
  onThrowComplete?: () => void
}

export function Disc({ step, onThrowComplete }: DiscProps) {
  const holder = step.players.find((p) => p.hasDisc && !p.isDefense)
  if (!holder) return null

  if (step.throw) {
    const from = step.players.find((p) => p.id === step.throw!.from && !p.isDefense)
    const to = step.players.find((p) => p.id === step.throw!.to && !p.isDefense)
    if (from && to) {
      const start = toPixel(from.x, from.y)
      const end = toPixel(to.x, to.y)
      return (
        <motion.circle
          key={step.id}
          r={1.4}
          fill="white"
          initial={{ cx: start.px, cy: start.py }}
          animate={{ cx: end.px, cy: end.py }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          onAnimationComplete={onThrowComplete}
        />
      )
    }
  }

  const { px, py } = toPixel(holder.x, holder.y)
  return <circle r={1} fill="white" stroke="black" strokeWidth={0.2} cx={px + 2.4} cy={py - 2.4} />
}
