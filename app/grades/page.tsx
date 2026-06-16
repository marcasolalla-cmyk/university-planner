import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import GradesClient from '@/components/Grades/GradesClient'

export default async function GradesPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [gradesRes, subjectsRes] = await Promise.all([
    supabase.from('grades').select('*, subject:subjects(*)').order('date', { ascending: false }),
    supabase.from('subjects').select('*').order('name'),
  ])

  return <GradesClient grades={gradesRes.data || []} subjects={subjectsRes.data || []} />
}
