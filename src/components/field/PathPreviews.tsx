import { toPixel } from '@/lib/field'
import type { PlayerPath } from '@/types/play'

const PATH_COLOR: Record<PlayerPath['type'], string> = {
  primary: '#fbbf24',
  secondary: '#93c5fd',
  clear: '#a3a3a3',
  reset: '#f472b6',
}

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
