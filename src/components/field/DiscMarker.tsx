'use client'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState } from '@/types/play'

export function DiscMarker({ players }: { players: PlayerState[] }) {
  const holder = players.find((p) => p.hasDisc)
  if (!holder) return null

  const { px, py } = toPixel(holder.x, holder.y)
  return (
    <motion.circle
      r={1}
      fill="white"
      stroke="black"
      strokeWidth={0.2}
      animate={{ cx: px + 2.4, cy: py - 2.4 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    />
  )
}
