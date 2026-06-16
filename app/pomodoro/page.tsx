import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import PomodoroClient from '@/components/Pomodoro/PomodoroClient'

export default async function PomodoroPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [sessionsRes, subjectsRes] = await Promise.all([
    supabase.from('pomodoro_sessions').select('*, subject:subjects(*)').order('created_at', { ascending: false }).limit(50),
    supabase.from('subjects').select('*').order('name'),
  ])

  return <PomodoroClient sessions={sessionsRes.data || []} subjects={subjectsRes.data || []} />
}
