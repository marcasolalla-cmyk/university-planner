import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import TasksClient from '@/components/Tasks/TasksClient'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tasksRes, subjectsRes] = await Promise.all([
    supabase.from('tasks').select('*, subject:subjects(*), subtasks(*)').order('due_date', { ascending: true }),
    supabase.from('subjects').select('*').order('name'),
  ])

  return <TasksClient tasks={tasksRes.data || []} subjects={subjectsRes.data || []} />
}
