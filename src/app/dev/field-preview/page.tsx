import { FieldBackground } from '@/components/field/FieldBackground'
import { FIELD_WIDTH, FIELD_HEIGHT } from '@/lib/field'

export default function FieldPreviewPage() {
  return (
    <div className="p-8 bg-gray-900 min-h-screen flex items-center justify-center">
      <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} width={400} height={480} className="border border-white">
        <FieldBackground />
      </svg>
    </div>
  )
}
