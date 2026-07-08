'use client'
import { useState } from 'react'
import type { Quiz } from '@/types/play'

type QuizPanelProps = {
  quiz: Quiz
  onAnswered: (correct: boolean) => void
}

export function QuizPanel({ quiz, onAnswered }: QuizPanelProps) {
  const [selected, setSelected] = useState<number | null>(null)

  function handleSelect(index: number) {
    if (selected !== null) return
    setSelected(index)
    onAnswered(index === quiz.correctIndex)
  }

  return (
    <div className="rounded border border-gray-200 p-3 flex flex-col gap-2">
      <p className="font-medium">{quiz.question}</p>
      {quiz.options.map((option, index) => {
        const isSelected = selected === index
        const isCorrect = index === quiz.correctIndex
        const showResult = selected !== null

        return (
          <button
            key={option}
            onClick={() => handleSelect(index)}
            disabled={selected !== null}
            className={`text-left rounded border px-3 py-2 ${
              showResult && isCorrect ? 'border-green-500 bg-green-50' :
              showResult && isSelected ? 'border-red-500 bg-red-50' :
              'border-gray-200'
            }`}
          >
            {option}
          </button>
        )
      })}
      {selected !== null && <p className="text-sm text-gray-600">{quiz.explanation}</p>}
    </div>
  )
}
