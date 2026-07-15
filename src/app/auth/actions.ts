'use server'
import { redirect } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'

/** Sign the current user out and return home. */
export async function signOut() {
  const supabase = await getServerSupabase()
  await supabase.auth.signOut()
  redirect('/')
}
