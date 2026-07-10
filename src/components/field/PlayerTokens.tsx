import { PlayerToken } from './PlayerToken'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import type { PlayerState, Position } from '@/types/play'

type PlayerTokensProps = {
  players: PlayerState[]
  selectedPosition: Position
  playCategory: 'offense' | 'defense'
  roster: Record<Position, string>
}

export function PlayerTokens({ players, selectedPosition, playCategory, roster }: PlayerTokensProps) {
  return (
    <g>
      {players.map((player, i) => {
        const dimmed = player.isDefense ? playCategory === 'offense' : playCategory === 'defense'
        const label = dimmed
          ? (player.isDefense ? GENERIC_DEFENDER_LABELS[player.id] : player.id)
          : roster[player.id]

        return (
          <PlayerToken
            key={`${player.id}-${player.isDefense ? 'd' : 'o'}-${i}`}
            player={player}
            isYou={!player.isDefense && player.id === selectedPosition}
            dimmed={dimmed}
            enterIndex={i}
            label={label}
          />
        )
      })}
    </g>
  )
}
