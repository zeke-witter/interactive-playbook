'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesWithPlays, setsInCategory, playsInSet } from '@/data/plays'
import { useProgress } from '@/hooks/useProgress'
import type { Play } from '@/types/play'

type PickerLevel =
  | { view: 'categories' }
  | { view: 'sets'; category: Play['category'] }
  | { view: 'plays'; category: Play['category']; set: Play['set'] }

const CATEGORY_LABELS: Record<Play['category'], string> = {
  offense: 'Offense',
  defense: 'Defense',
}

const SET_LABELS: Record<Play['set'], string> = {
  'ho-stack': 'Ho Stack',
  'vert-stack': 'Vert Stack',
  'zone-o': 'Zone Offense',
  'zone-d': 'Zone Defense',
  'person-d': 'Person Defense',
  endzone: 'Endzone',
  'pull-play': 'Pull Play',
}

const ROW_CLASS = 'text-left rounded-md border px-3 py-2 border-border bg-surface text-text hover:bg-surface-raised transition-colors'

export function PlayPicker({ currentPlay }: { currentPlay: Play }) {
  const router = useRouter()
  const { completedCount } = useProgress()
  const [level, setLevel] = useState<PickerLevel>({
    view: 'plays',
    category: currentPlay.category,
    set: currentPlay.set,
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 text-xs text-text-muted uppercase tracking-wide">
        <button onClick={() => setLevel({ view: 'categories' })} className="hover:text-accent">
          Plays
        </button>
        {level.view !== 'categories' && (
          <>
            <span>›</span>
            <button onClick={() => setLevel({ view: 'sets', category: level.category })} className="hover:text-accent">
              {CATEGORY_LABELS[level.category]}
            </button>
          </>
        )}
        {level.view === 'plays' && (
          <>
            <span>›</span>
            <span className="text-text">{SET_LABELS[level.set]}</span>
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
                play.id === currentPlay.id
                  ? 'text-left rounded-md border px-3 py-2 border-accent bg-surface-raised text-accent'
                  : ROW_CLASS
              }
            >
              <div>{play.name}</div>
              <div className="text-xs text-text-muted">{completedCount(play.id)}/7 positions learned</div>
            </button>
          ))}
      </div>
    </div>
  )
}
