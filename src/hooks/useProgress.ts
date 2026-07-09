'use client'
import { useEffect, useState } from 'react'
import type { Position } from '@/types/play'

const STORAGE_KEY = 'mousetrap-progress'

type ProgressMap = Record<string, Position[]>

function loadProgress(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>({})

  useEffect(() => {
    setProgress(loadProgress())
  }, [])

  function markComplete(playId: string, position: Position) {
    setProgress((prev) => {
      const completed = prev[playId] ?? []
      if (completed.includes(position)) return prev

      const next = { ...prev, [playId]: [...completed, position] }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function isComplete(playId: string, position: Position) {
    return (progress[playId] ?? []).includes(position)
  }

  function completedCount(playId: string) {
    return (progress[playId] ?? []).length
  }

  return { markComplete, isComplete, completedCount }
}
