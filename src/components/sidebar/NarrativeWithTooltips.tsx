'use client'
import { useState } from 'react'
import { GLOSSARY } from '@/data/glossary'

const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length)
const TERM_PATTERN = new RegExp(`\\b(${TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')

type NarrativeWithTooltipsProps = {
  text: string
  onHighlightZone: (zone: GlossaryEntryZone | null) => void
}

type GlossaryEntryZone = NonNullable<(typeof GLOSSARY)[string]['zone']>

export function NarrativeWithTooltips({ text, onHighlightZone }: NarrativeWithTooltipsProps) {
  const [openTerm, setOpenTerm] = useState<string | null>(null)
  const parts = text.split(TERM_PATTERN)

  return (
    <p className="text-base leading-relaxed">
      {parts.map((part, i) => {
        const entry = GLOSSARY[part.toLowerCase()]
        if (!entry) return <span key={i}>{part}</span>

        return (
          <span
            key={i}
            className="underline decoration-dotted cursor-help relative"
            onMouseEnter={() => {
              setOpenTerm(part)
              if (entry.zone) onHighlightZone(entry.zone)
            }}
            onMouseLeave={() => {
              setOpenTerm(null)
              onHighlightZone(null)
            }}
          >
            {part}
            {openTerm === part && (
              <span className="absolute left-0 top-full z-10 w-56 rounded bg-gray-900 text-white text-sm p-2 shadow-lg">
                {entry.definition}
              </span>
            )}
          </span>
        )
      })}
    </p>
  )
}
