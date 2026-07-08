import { PlayerToken } from './PlayerToken'
import type { PlayerState, Position } from '@/types/play'

type PlayerTokensProps = {
  players: PlayerState[]
  selectedPosition: Position
  playCategory: 'offense' | 'defense'
}

export function PlayerTokens({ players, selectedPosition, playCategory }: PlayerTokensProps) {
  return (
    <g>
      {players.map((player, i) => {
        const dimmed = player.isDefense ? playCategory === 'offense' : playCategory === 'defense'
        return (
          <PlayerToken
            key={`${player.id}-${player.isDefense ? 'd' : 'o'}-${i}`}
            player={player}
            isYou={!player.isDefense && player.id === selectedPosition}
            dimmed={dimmed}
          />
        )
      })}
    </g>
  )
}
