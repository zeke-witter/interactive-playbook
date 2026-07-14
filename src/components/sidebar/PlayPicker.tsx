'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesWithPlays, setsInCategory, playsInSet } from '@/data/plays'
import { CATEGORY_LABELS, SET_LABELS } from '@/lib/playLabels'
import type { Play } from '@/types/play'

type PickerLevel =
  | { view: 'categories' }
  | { view: 'sets'; category: Play['category'] }
  | { view: 'plays'; category: Play['category']; set: Play['set'] }

const ROW_CLASS = 'text-left rounded-md border px-3 py-2 border-border bg-surface text-text hover:bg-surface-raised transition-colors'

export function PlayPicker({ currentPlay }: { currentPlay?: Play }) {
  const router = useRouter()
  const [level, setLevel] = useState<PickerLevel>(
    currentPlay
      ? { view: 'plays', category: currentPlay.category, set: currentPlay.set }
      : { view: 'categories' }
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 text-xs uppercase tracking-wide">
        <button onClick={() => setLevel({ view: 'categories' })} className="text-accent underline underline-offset-2 hover:text-accent-hover">
          Plays
        </button>
        {level.view !== 'categories' && (
          <>
            <span className="text-text-muted">›</span>
            <button onClick={() => setLevel({ view: 'sets', category: level.category })} className="text-accent underline underline-offset-2 hover:text-accent-hover">
              {CATEGORY_LABELS[level.category]}
            </button>
          </>
        )}
        {level.view === 'plays' && (
          <>
            <span className="text-text-muted">›</span>
            <span className="text-text-muted">{SET_LABELS[level.set]}</span>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {level.view === 'categories' &&
          categoriesWithPlays().map((category) => (
            <button key={category} onClick={() => setLevel({ view: 'sets', category })} className={ROW_CLASS}>
              {CATEGORY_LABELS[category]}
            </button>
          ))}

        {level.view === 'sets' &&
          setsInCategory(level.category).map((set) => (
            <button key={set} onClick={() => setLevel({ view: 'plays', category: level.category, set })} className={ROW_CLASS}>
              {SET_LABELS[set]}
            </button>
          ))}

        {level.view === 'plays' &&
          playsInSet(level.category, level.set).map((play) => (
            <button
              key={play.id}
              onClick={() => router.push(`/plays/${play.id}`)}
              className={
                play.id === currentPlay?.id
                  ? 'text-left rounded-md border px-3 py-2 border-accent bg-surface-raised text-accent'
                  : ROW_CLASS
              }
            >
              {play.name}
            </button>
          ))}
      </div>
    </div>
  )
}
