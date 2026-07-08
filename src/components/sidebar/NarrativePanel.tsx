export function NarrativePanel({ text }: { text: string | undefined }) {
  return (
    <p className="text-base leading-relaxed">
      {text ?? "You're off the disc for this step — hold your spacing and watch how the play develops."}
    </p>
  )
}
