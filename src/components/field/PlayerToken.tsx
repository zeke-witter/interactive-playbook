'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState } from '@/types/play'

type PlayerTokenProps = {
  player: PlayerState
  isYou: boolean
  dimmed: boolean
  enterIndex: number
  label: string
  pathPoints?: { px: number; py: number }[]
}

export function PlayerToken({ player, isYou, dimmed, enterIndex, label, pathPoints }: PlayerTokenProps) {
  const { px, py } = toPixel(player.x, player.y)
  const fill = player.isDefense ? '#dc2626' : '#2563eb'
  const [entering, setEntering] = useState(true)
  const enterDelay = enterIndex * 0.035

  const xTarget = !entering && pathPoints ? pathPoints.map((p) => p.px) : px
  const yTarget = !entering && pathPoints ? pathPoints.map((p) => p.py) : py

  return (
    <motion.g
      initial={{ x: px, y: py, opacity: 0, scale: 0 }}
      animate={{
        x: xTarget,
        y: yTarget,
        opacity: dimmed ? 0.4 : 1,
        scale: entering ? [0, 1.35, 0.85, 1.05, 1] : 1,
      }}
      onAnimationComplete={() => setEntering(false)}
      transition={{
        default: { duration: 0.6, ease: 'easeInOut' },
        scale: entering
          ? { duration: 0.5, times: [0, 0.35, 0.6, 0.8, 1], delay: enterDelay }
          : { duration: 0.3 },
        opacity: { duration: 0.3, delay: entering ? enterDelay : 0 },
      }}
    >
      <circle r={3.2} fill={fill} />
      {isYou && <circle r={4.2} fill="none" stroke="white" strokeWidth={0.6} />}
      <text y={1} fontSize={2.6} fill="white" textAnchor="middle" fontWeight="bold">
        {label}
      </text>
    </motion.g>
  )
}
