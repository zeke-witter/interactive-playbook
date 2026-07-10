import { redirect } from 'next/navigation'
import { DEFAULT_PLAY_ID } from '@/data/plays'

export default function HomePage() {
  redirect(`/plays/${DEFAULT_PLAY_ID}`)
}
