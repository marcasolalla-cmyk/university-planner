import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import AIClient from '@/components/AI/AIClient'

export default async function AIPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [eventsRes, tasksRes, subjectsRes, gradesRes] = await Promise.all([
    supabase.from('events').select('*, subject:subjects(*)').gte('start_time', new Date().toISOString()).order('start_time').limit(20),
    supabase.from('tasks').select('*, subject:subjects(*)').eq('completed', false).order('due_date').limit(20),
    supabase.from('subjects').select('*').order('name'),
    supabase.from('grades').select('*, subject:subjects(*)').order('date', { ascending: false }).limit(30),
  ])

  const context = {
    events: eventsRes.data || [],
    tasks: tasksRes.data || [],
    subjects: subjectsRes.data || [],
    grades: gradesRes.data || [],
    user: session.user,
  }

  return <AIClient context={context} />
}
