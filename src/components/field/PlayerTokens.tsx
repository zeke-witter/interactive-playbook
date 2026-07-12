import { PlayerToken } from './PlayerToken'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import { toPixel } from '@/lib/field'
import type { PlayerState, PlayerPath, Position } from '@/types/play'

type PlayerTokensProps = {
  players: PlayerState[]
  selectedPosition: Position
  playCategory: 'offense' | 'defense'
  roster: Record<Position, string>
  pathPreviews: PlayerPath[]
  onSelectPosition?: (position: Position) => void
}

export function PlayerTokens({ players, selectedPosition, playCategory, roster, pathPreviews, onSelectPosition }: PlayerTokensProps) {
  return (
    <g>
      {players.map((player, i) => {
        const dimmed = player.isDefense ? playCategory === 'offense' : playCategory === 'defense'
        const label = dimmed
          ? (player.isDefense ? GENERIC_DEFENDER_LABELS[player.id] : player.id)
          : roster[player.id]
        const path = !player.isDefense ? pathPreviews.find((p) => p.playerId === player.id && !p.isDefense) : undefined
        const pathPoints = path?.points.map((pt) => toPixel(pt.x, pt.y))

        return (
          <PlayerToken
            key={`${player.id}-${player.isDefense ? 'd' : 'o'}-${i}`}
            player={player}
            isYou={!player.isDefense && player.id === selectedPosition}
            dimmed={dimmed}
            enterIndex={i}
            label={label}
            pathPoints={pathPoints}
            onClick={!dimmed && onSelectPosition ? () => onSelectPosition(player.id) : undefined}
          />
        )
      })}
    </g>
  )
}
