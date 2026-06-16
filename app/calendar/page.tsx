import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import CalendarClient from '@/components/Calendar/CalendarClient'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

  const [eventsRes, subjectsRes] = await Promise.all([
    supabase.from('events').select('*, subject:subjects(*)').gte('start_time', start).lte('start_time', end).order('start_time'),
    supabase.from('subjects').select('*').order('name'),
  ])

  return <CalendarClient events={eventsRes.data || []} subjects={subjectsRes.data || []} />
}
