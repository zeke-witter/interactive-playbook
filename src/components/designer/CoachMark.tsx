'use client'

export function CoachMark({ variant }: { variant: 'desktop' | 'mobile' }) {
  if (variant === 'mobile') {
    return (
      <>
        <div className="absolute top-[54px] left-4 right-4 z-20 rounded-[10px] border border-accent bg-surface-raised px-3 py-2.5 text-center text-xs leading-relaxed text-text pointer-events-none">
          Position is on: drag any player with your finger to set the formation.
        </div>
        <svg className="absolute left-[15%] bottom-[126px] w-10 h-10 -translate-x-1/2 pointer-events-none z-10" viewBox="0 0 40 40">
          <defs>
            <marker id="coachmark-arrow-mobile" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#a3e635" />
            </marker>
          </defs>
          <path d="M20,2 L20,32" fill="none" stroke="#a3e635" strokeWidth="1.5" strokeDasharray="4,4" markerEnd="url(#coachmark-arrow-mobile)" />
        </svg>
      </>
    )
  }
  return (
    <>
      <div className="absolute top-4 left-20 z-20 w-[220px] rounded-[10px] border border-accent bg-surface-raised p-3 text-sm leading-relaxed text-text pointer-events-none">
        Position is on: drag any player to set up your formation. Switch tools on the left when you&apos;re ready to draw or throw.
      </div>
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="coachmark-arrow-desktop" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#a3e635" />
          </marker>
        </defs>
        <path d="M 80 30 C 70 30 62 34 58 38" fill="none" stroke="#a3e635" strokeWidth="1.5" strokeDasharray="4,4" markerEnd="url(#coachmark-arrow-desktop)" />
      </svg>
    </>
  )
}
