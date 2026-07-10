'use client'
import { useState } from 'react'
import { substituteNames } from '@/lib/names'
import type { Quiz, Position } from '@/types/play'

type QuizPanelProps = {
  quiz: Quiz
  onAnswered: (correct: boolean) => void
  roster: Record<Position, string>
}

export function QuizPanel({ quiz, onAnswered, roster }: QuizPanelProps) {
  const [selected, setSelected] = useState<number | null>(null)

  function handleSelect(index: number) {
    if (selected !== null) return
    setSelected(index)
    onAnswered(index === quiz.correctIndex)
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex flex-col gap-2">
      <p className="font-medium text-text">{substituteNames(quiz.question, roster)}</p>
      {quiz.options.map((option, index) => {
        const isSelected = selected === index
        const isCorrect = index === quiz.correctIndex
        const showResult = selected !== null

        return (
          <button
            key={option}
            onClick={() => handleSelect(index)}
            disabled={selected !== null}
            className={`text-left rounded-md border px-3 py-2 text-text ${
              showResult && isCorrect ? 'border-success-border bg-success-bg' :
              showResult && isSelected ? 'border-danger-border bg-danger-bg' :
              'border-border bg-surface-raised'
            }`}
          >
            {substituteNames(option, roster)}
          </button>
        )
      })}
      {selected !== null && <p className="text-sm text-text-muted">{substituteNames(quiz.explanation, roster)}</p>}
    </div>
  )
}
