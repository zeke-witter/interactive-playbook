'use client'
import { ModeIcon } from './ModeIcon'
import type { DesignerMode } from '@/types/designer'

const MODES: DesignerMode[] = ['position', 'path', 'throw']
const MODE_LABELS: Record<DesignerMode, string> = { position: 'Position', path: 'Draw\nPath', throw: 'Mark\nThrow' }

export function ToolRail({ mode, onSelect }: { mode: DesignerMode; onSelect: (m: DesignerMode) => void }) {
  return (
    <div className="w-16 flex-none flex flex-col items-center gap-3 py-4 border-r border-border bg-surface">
      {MODES.map((m) => {
        const active = mode === m
        return (
          <button
            key={m}
            onClick={() => onSelect(m)}
            className={`w-11 h-11 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors ${
              active
                ? 'bg-accent text-accent-foreground'
                : 'bg-transparent text-text-muted hover:bg-surface-raised hover:text-text'
            }`}
          >
            <ModeIcon mode={m} className="w-5 h-5" />
            <span className="text-[10.5px] leading-none text-center whitespace-pre-line">{MODE_LABELS[m]}</span>
          </button>
        )
      })}
    </div>
  )
}
