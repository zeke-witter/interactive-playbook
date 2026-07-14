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
  if (mode === 'possession') {
    // A frisbee/disc seen at a slight angle — the flattened ellipse shape
    // reads as a disc, distinct from Mark Throw's concentric circles.
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="13" rx="9" ry="4.3" />
        <ellipse cx="12" cy="11.2" rx="4.8" ry="2" />
      </svg>
    )
  }
  if (mode === 'select') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" strokeDasharray="2.5,2" />
        <circle cx="3.5" cy="3.5" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="20.5" cy="20.5" r="1.4" fill="currentColor" stroke="none" />
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
