import { FIELD_WIDTH, FIELD_HEIGHT, ENDZONE_DEPTH } from '@/lib/field'
import type { Force } from '@/types/play'

export function ForceIndicator({ force }: { force: Force }) {
  if (force === 'none') return null

  const shadeWidth = FIELD_WIDTH / 2
  const shadeX = force === 'forehand' ? 0 : shadeWidth
  const label = force === 'forehand' ? 'Force: Forehand' : 'Force: Backhand'

  return (
    <g>
      <rect x={shadeX} y={ENDZONE_DEPTH} width={shadeWidth} height={FIELD_HEIGHT - 2 * ENDZONE_DEPTH} fill="black" opacity={0.15} />
      <text x={FIELD_WIDTH / 2} y={ENDZONE_DEPTH - 4} fill="white" fontSize={3.5} textAnchor="middle">
        {label}
      </text>
    </g>
  )
}
