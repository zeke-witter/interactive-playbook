import { FIELD_WIDTH, FIELD_HEIGHT, ENDZONE_LARGE_DEPTH } from '@/lib/field'

export function FieldBackground({ showEndzone }: { showEndzone: boolean }) {
  return (
    <g>
      <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="#2f7d3c" />
      {showEndzone && (
        <>
          <rect x={0} y={0} width={FIELD_WIDTH} height={ENDZONE_LARGE_DEPTH} fill="#1f5c2a" />
          <line x1={0} y1={ENDZONE_LARGE_DEPTH} x2={FIELD_WIDTH} y2={ENDZONE_LARGE_DEPTH} stroke="white" strokeWidth={0.5} />
          <text x={FIELD_WIDTH / 2} y={ENDZONE_LARGE_DEPTH / 2} fill="white" fontSize={4} textAnchor="middle" opacity={0.6}>
            ENDZONE
          </text>
        </>
      )}
      <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="none" stroke="white" strokeWidth={0.5} />
    </g>
  )
}
