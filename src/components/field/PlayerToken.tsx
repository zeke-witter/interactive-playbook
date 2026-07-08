'use client'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState } from '@/types/play'

type PlayerTokenProps = {
  player: PlayerState
  isYou: boolean
  dimmed: boolean
}

export function PlayerToken({ player, isYou, dimmed }: PlayerTokenProps) {
  const { px, py } = toPixel(player.x, player.y)
  const fill = player.isDefense ? '#dc2626' : '#2563eb'

  return (
    <motion.g animate={{ x: px, y: py, opacity: dimmed ? 0.4 : 1 }} transition={{ duration: 0.6, ease: 'easeInOut' }}>
      <circle r={3.2} fill={fill} />
      {isYou && <circle r={4.2} fill="none" stroke="white" strokeWidth={0.6} />}
      <text y={1} fontSize={2.6} fill="white" textAnchor="middle" fontWeight="bold">
        {player.id}
      </text>
    </motion.g>
  )
}
