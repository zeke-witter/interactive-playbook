import { toPixel } from '@/lib/field'
import { PATH_COLOR } from '@/lib/pathColors'
import type { PlayerPath } from '@/types/play'

export function PathPreviews({ paths }: { paths: PlayerPath[] }) {
  return (
    <g>
      {paths.map((path, i) => {
        const pixelPoints = path.points.map((pt) => {
          const { px, py } = toPixel(pt.x, pt.y)
          return `${px},${py}`
        }).join(' ')

        return (
          <polyline
            key={`${path.playerId}-${i}`}
            points={pixelPoints}
            fill="none"
            stroke={PATH_COLOR[path.type]}
            strokeWidth={0.6}
            strokeDasharray="2,1.5"
          />
        )
      })}
    </g>
  )
}
