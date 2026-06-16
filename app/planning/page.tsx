import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import PlanningClient from '@/components/Planning/PlanningClient'

export default async function PlanningPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const [eventsRes, tasksRes] = await Promise.all([
    supabase.from('events').select('*, subject:subjects(*)').gte('start_time', start).lt('start_time', end).order('start_time'),
    supabase.from('tasks').select('*, subject:subjects(*)').eq('completed', false).order('due_date'),
  ])

  return <PlanningClient events={eventsRes.data || []} tasks={tasksRes.data || []} />
}
