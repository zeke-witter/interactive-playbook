import type { DesignerMode } from '@/types/designer'

export function ModeIcon({ mode, className }: { mode: DesignerMode; className?: string }) {
  if (mode === 'position') {
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <circle cx="12" cy="12" r="6" fill="currentColor" />
      </svg>
    )
  }
  if (mode === 'path') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="19" x2="16" y2="7" strokeDasharray="3,2.5" strokeLinecap="round" />
        <circle cx="19" cy="4" r="2" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}
