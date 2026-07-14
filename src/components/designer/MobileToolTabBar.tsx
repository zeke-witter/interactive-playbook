'use client'
import { ModeIcon } from './ModeIcon'
import type { DesignerMode } from '@/types/designer'

const MODES: DesignerMode[] = ['position', 'possession', 'path', 'throw', 'select']
const MODE_LABELS: Record<DesignerMode, string> = { position: 'Position', possession: 'Possession', path: 'Draw Path', throw: 'Mark Throw', select: 'Select' }

export function MobileToolTabBar({ mode, onSelect }: { mode: DesignerMode; onSelect: (m: DesignerMode) => void }) {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-20 h-16 flex items-center justify-around px-2 border-t border-border bg-surface-raised">
      {MODES.map((m) => {
        const active = mode === m
        return (
          <button
            key={m}
            onClick={() => onSelect(m)}
            className="flex flex-col items-center gap-0.5"
          >
            <span
              className={`w-11 h-11 flex items-center justify-center rounded-[10px] transition-colors ${
                active ? 'bg-accent text-accent-foreground' : 'bg-transparent text-text-muted'
              }`}
            >
              <ModeIcon mode={m} className="w-[18px] h-[18px]" />
            </span>
            <span className={`text-[9px] ${active ? 'text-text' : 'text-text-muted'}`}>{MODE_LABELS[m]}</span>
          </button>
        )
      })}
    </div>
  )
}
