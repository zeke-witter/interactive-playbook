'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORY_LABELS, SET_LABELS } from '@/lib/playLabels'
import type { Play } from '@/types/play'

type PickerLevel =
  | { view: 'categories' }
  | { view: 'sets'; category: Play['category'] }
  | { view: 'plays'; category: Play['category']; set: Play['set'] }

const ROW_CLASS = 'text-left rounded-md border px-3 py-2 border-border bg-surface text-text hover:bg-surface-raised transition-colors'

// Grouping is computed inline from the passed-in `plays` (mirrors the pure
// helpers in lib/playsRepo). PlayPicker is a client component, so it must not
// import from playsRepo — that module pulls in the server-only Supabase client.
export function PlayPicker({
  plays,
  currentPlay,
  basePath = '/plays',
}: {
  plays: Play[]
  currentPlay?: Play
  basePath?: string
}) {
  const router = useRouter()
  const [level, setLevel] = useState<PickerLevel>(
    currentPlay
      ? { view: 'plays', category: currentPlay.category, set: currentPlay.set }
      : { view: 'categories' }
  )

  const categories = Array.from(new Set(plays.map((p) => p.category)))
  const setsInCategory = (category: Play['category']) =>
    Array.from(new Set(plays.filter((p) => p.category === category).map((p) => p.set)))
  const playsInSet = (category: Play['category'], set: Play['set']) =>
    plays.filter((p) => p.category === category && p.set === set)

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
          categories.map((category) => (
            <button key={category} onClick={() => setLevel({ view: 'sets', category })} className={ROW_CLASS}>
              {CATEGORY_LABELS[category]}
            </button>
          ))}

        {level.view === 'sets' &&
          setsInCategory(level.category).map((set: Play['set']) => (
            <button key={set} onClick={() => setLevel({ view: 'plays', category: level.category, set })} className={ROW_CLASS}>
              {SET_LABELS[set]}
            </button>
          ))}

        {level.view === 'plays' &&
          playsInSet(level.category, level.set).map((play) => (
            <button
              key={play.id}
              onClick={() => router.push(`${basePath}/${play.id}`)}
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
