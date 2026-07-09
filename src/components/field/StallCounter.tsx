'use client'
import { useEffect, useState } from 'react'

export function StallCounter({ startAt, active }: { startAt: number | undefined; active: boolean }) {
  const [count, setCount] = useState(startAt ?? 0)

  useEffect(() => {
    setCount(startAt ?? 0)
    if (!active || startAt === undefined) return

    const interval = setInterval(() => {
      setCount((c) => Math.min(c + 1, 10))
    }, 1000)

    return () => clearInterval(interval)
  }, [startAt, active])

  if (startAt === undefined) return null

  return (
    <text x={50} y={16} fontSize={5} fill="white" textAnchor="middle" fontWeight="bold">
      Stall {count}
    </text>
  )
}
