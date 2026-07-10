'use client'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState } from '@/types/play'

type PlayerTokenProps = {
  player: PlayerState
  isYou: boolean
  dimmed: boolean
  enterIndex: number
}

export function PlayerToken({ player, isYou, dimmed, enterIndex }: PlayerTokenProps) {
  const { px, py } = toPixel(player.x, player.y)
  const fill = player.isDefense ? '#dc2626' : '#2563eb'
  const isFirstMount = useRef(true)

  useEffect(() => {
    isFirstMount.current = false
  }, [])

  const enterDelay = enterIndex * 0.035

  return (
    <motion.g
      initial={{ x: px, y: py, opacity: 0, scale: 0 }}
      animate={{
        x: px,
        y: py,
        opacity: dimmed ? 0.4 : 1,
        scale: isFirstMount.current ? [0, 1.35, 0.85, 1.05, 1] : 1,
      }}
      transition={{
        default: { duration: 0.6, ease: 'easeInOut' },
        scale: isFirstMount.current
          ? { duration: 0.5, times: [0, 0.35, 0.6, 0.8, 1], delay: enterDelay }
          : { duration: 0.3 },
        opacity: { duration: 0.3, delay: isFirstMount.current ? enterDelay : 0 },
      }}
    >
      <circle r={3.2} fill={fill} />
      {isYou && <circle r={4.2} fill="none" stroke="white" strokeWidth={0.6} />}
      <text y={1} fontSize={2.6} fill="white" textAnchor="middle" fontWeight="bold">
        {player.id}
      </text>
    </motion.g>
  )
}
