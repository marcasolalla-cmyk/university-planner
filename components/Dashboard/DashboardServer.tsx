'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import DashboardClient from './DashboardClient'

export default function DashboardServer({ user }: { user: any }) {
  const [data, setData] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString()

    Promise.all([
      supabase.from('events').select('*, subject:subjects(*)').gte('start_time', startOfDay).lte('start_time', endOfWeek).order('start_time'),
      supabase.from('tasks').select('*, subject:subjects(*), subtasks(*)').eq('completed', false).order('due_date', { ascending: true }).limit(5),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('pomodoro_sessions').select('*').gte('date', new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString().split('T')[0])
    ]).then(([eventsRes, tasksRes, subjectsRes, pomodoroRes]) => {
      setData({
        events: eventsRes.data || [],
        tasks: tasksRes.data || [],
        subjects: subjectsRes.data || [],
        pomodoroSessions: pomodoroRes.data || [],
      })
    })
  }, [])

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <DashboardClient user={user} {...data} />
}
