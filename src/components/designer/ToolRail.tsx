'use client'
import { ModeIcon } from './ModeIcon'
import type { DesignerMode } from '@/types/designer'

const MODES: DesignerMode[] = ['position', 'possession', 'path', 'throw', 'select']
const MODE_LABELS: Record<DesignerMode, string> = { position: 'Position', possession: 'Possession', path: 'Draw\nPath', throw: 'Mark\nThrow', select: 'Select' }

export function ToolRail({ mode, onSelect }: { mode: DesignerMode; onSelect: (m: DesignerMode) => void }) {
  return (
    <div className="w-16 lg:w-20 xl:w-24 flex-none flex flex-col items-center gap-3 lg:gap-4 py-4 border-r border-border bg-surface">
      {MODES.map((m) => {
        const active = mode === m
        return (
          <button
            key={m}
            onClick={() => onSelect(m)}
            className={`w-11 h-11 lg:w-14 lg:h-14 xl:w-16 xl:h-16 flex flex-col items-center justify-center gap-0.5 lg:gap-1 rounded-lg transition-colors ${
              active
                ? 'bg-accent text-accent-foreground'
                : 'bg-transparent text-text-muted hover:bg-surface-raised hover:text-text'
            }`}
          >
            <ModeIcon mode={m} className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7" />
            <span className="text-[10.5px] lg:text-xs leading-none text-center whitespace-pre-line">{MODE_LABELS[m]}</span>
          </button>
        )
      })}
    </div>
  )
}
