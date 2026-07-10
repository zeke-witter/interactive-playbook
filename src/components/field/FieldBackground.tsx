import { FIELD_WIDTH, FIELD_HEIGHT, ENDZONE_DEPTH, ENDZONE_VIEW_HEIGHT, ENDZONE_VIEW_DEPTH } from '@/lib/field'

export function FieldBackground({ showAttackingEndzone, endzoneCrop }: { showAttackingEndzone: boolean; endzoneCrop?: boolean }) {
  if (endzoneCrop) {
    return (
      <g>
        <rect x={0} y={0} width={FIELD_WIDTH} height={ENDZONE_VIEW_HEIGHT} fill="#2f7d3c" />
        <rect x={0} y={0} width={FIELD_WIDTH} height={ENDZONE_VIEW_DEPTH} fill="#1f5c2a" />
        <line x1={0} y1={ENDZONE_VIEW_DEPTH} x2={FIELD_WIDTH} y2={ENDZONE_VIEW_DEPTH} stroke="white" strokeWidth={0.5} />
        <rect x={0} y={0} width={FIELD_WIDTH} height={ENDZONE_VIEW_HEIGHT} fill="none" stroke="white" strokeWidth={0.5} />
        <text x={FIELD_WIDTH / 2} y={ENDZONE_VIEW_DEPTH / 2} fill="white" fontSize={4} textAnchor="middle" opacity={0.6}>
          ENDZONE
        </text>
      </g>
    )
  }

  const fieldTop = ENDZONE_DEPTH
  const fieldBottom = FIELD_HEIGHT - ENDZONE_DEPTH

  return (
    <g>
      <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="#2f7d3c" />
      {showAttackingEndzone && (
        <>
          <rect x={0} y={0} width={FIELD_WIDTH} height={ENDZONE_DEPTH} fill="#1f5c2a" />
          <line x1={0} y1={fieldTop} x2={FIELD_WIDTH} y2={fieldTop} stroke="white" strokeWidth={0.5} />
        </>
      )}
      <rect x={0} y={fieldBottom} width={FIELD_WIDTH} height={ENDZONE_DEPTH} fill="#1f5c2a" />
      <line x1={0} y1={fieldBottom} x2={FIELD_WIDTH} y2={fieldBottom} stroke="white" strokeWidth={0.5} />
      <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="none" stroke="white" strokeWidth={0.5} />
      <text x={FIELD_WIDTH / 2} y={fieldBottom + ENDZONE_DEPTH / 2} fill="white" fontSize={4} textAnchor="middle" opacity={0.6}>
        ENDZONE
      </text>
    </g>
  )
}
