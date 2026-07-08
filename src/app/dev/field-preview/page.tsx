import { FieldBackground } from '@/components/field/FieldBackground'
import { PlayerToken } from '@/components/field/PlayerToken'
import { ForceIndicator } from '@/components/field/ForceIndicator'
import { PathPreviews } from '@/components/field/PathPreviews'
import { FIELD_WIDTH, FIELD_HEIGHT } from '@/lib/field'
import type { PlayerState, PlayerPath } from '@/types/play'

const SAMPLE_PLAYERS: PlayerState[] = [
  { id: 'H1', x: 0.5, y: 0.65, hasDisc: true },
  { id: 'C3', x: 0.15, y: 0.35 },
  { id: 'C3', x: 0.18, y: 0.4, isDefense: true },
]

const SAMPLE_PATHS: PlayerPath[] = [
  { playerId: 'C3' as const, points: [{ x: 0.15, y: 0.35 }, { x: 0.4, y: 0.5 }], type: 'primary' as const },
]

export default function FieldPreviewPage() {
  return (
    <div className="p-8 bg-gray-900 min-h-screen flex items-center justify-center">
      <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} width={400} height={480} className="border border-white">
        <FieldBackground />
        <ForceIndicator force="forehand" />
        <PathPreviews paths={SAMPLE_PATHS} />
        {SAMPLE_PLAYERS.map((p, i) => (
          <PlayerToken key={i} player={p} isYou={p.id === 'H1'} dimmed={!!p.isDefense} />
        ))}
      </svg>
    </div>
  )
}
