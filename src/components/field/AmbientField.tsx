'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FieldBackground } from './FieldBackground'
import { FIELD_WIDTH, FIELD_HEIGHT, toPixel } from '@/lib/field'

const MIN_DURATION = 4
const MAX_DURATION = 9
// Keeps tokens off the very edges of the field so they never wander under
// the border stroke.
const MARGIN = 0.08

function randomPoint(): { x: number; y: number } {
  return {
    x: MARGIN + Math.random() * (1 - MARGIN * 2),
    y: MARGIN + Math.random() * (1 - MARGIN * 2),
  }
}

function randomDuration(): number {
  return MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION)
}

type WanderingTokenProps = {
  label: string
  color: string
  initial: { x: number; y: number }
}

// Starts each token at a fixed, deterministic spot (so server and client
// render identically) and only begins wandering to random points after
// mount, on a per-token staggered delay so all 14 don't move in lockstep.
function WanderingToken({ label, color, initial }: WanderingTokenProps) {
  const [target, setTarget] = useState(initial)
  const [duration, setDuration] = useState(randomDuration())
  const startedRef = useRef(false)

  useEffect(() => {
    const delay = Math.random() * 2500
    const timer = setTimeout(() => {
      startedRef.current = true
      setDuration(randomDuration())
      setTarget(randomPoint())
    }, delay)
    return () => clearTimeout(timer)
  }, [])

  const { px, py } = toPixel(target.x, target.y)

  return (
    <motion.g
      initial={{ x: px, y: py }}
      animate={{ x: px, y: py }}
      transition={{ duration, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (!startedRef.current) return
        setDuration(randomDuration())
        setTarget(randomPoint())
      }}
    >
      <circle r={3.2} fill={color} opacity={0.85} />
      <text y={1} fontSize={2.6} fill="white" textAnchor="middle" fontWeight="bold" opacity={0.85}>
        {label}
      </text>
    </motion.g>
  )
}

const OFFENSE_TOKENS: { label: string; initial: { x: number; y: number } }[] = [
  { label: 'H1', initial: { x: 0.18, y: 0.32 } },
  { label: 'H2', initial: { x: 0.32, y: 0.58 } },
  { label: 'H3', initial: { x: 0.48, y: 0.22 } },
  { label: 'C1', initial: { x: 0.58, y: 0.68 } },
  { label: 'C2', initial: { x: 0.72, y: 0.4 } },
  { label: 'C3', initial: { x: 0.85, y: 0.62 } },
  { label: 'C4', initial: { x: 0.52, y: 0.12 } },
]

const DEFENSE_TOKENS: { label: string; initial: { x: number; y: number } }[] = [
  { label: 'D1', initial: { x: 0.22, y: 0.5 } },
  { label: 'D2', initial: { x: 0.38, y: 0.75 } },
  { label: 'D3', initial: { x: 0.52, y: 0.42 } },
  { label: 'D4', initial: { x: 0.66, y: 0.2 } },
  { label: 'D5', initial: { x: 0.8, y: 0.5 } },
  { label: 'D6', initial: { x: 0.42, y: 0.88 } },
  { label: 'D7', initial: { x: 0.62, y: 0.92 } },
]

export function AmbientField() {
  return (
    <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} className="w-full h-full">
      <FieldBackground showEndzone={false} />
      {OFFENSE_TOKENS.map((t) => (
        <WanderingToken key={t.label} label={t.label} color="#2563eb" initial={t.initial} />
      ))}
      {DEFENSE_TOKENS.map((t) => (
        <WanderingToken key={t.label} label={t.label} color="#dc2626" initial={t.initial} />
      ))}
    </svg>
  )
}
