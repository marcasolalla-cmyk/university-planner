'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, CheckSquare, Clock, BookOpen, TrendingUp, AlertCircle, Plus, Timer } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Event, Task, Subject, PomodoroSession } from '@/lib/types'
import { getEventTypeColor, getEventTypeLabel, getPriorityColor, formatTime } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  user: User
  events: Event[]
  tasks: Task[]
  subjects: Subject[]
  pomodoroSessions: PomodoroSession[]
}

export default function DashboardClient({ user, events, tasks, subjects, pomodoroSessions }: Props) {
  const now = new Date()
  const todayStr = format(now, 'EEEE, d MMMM yyyy', { locale: es })

  const todayEvents = events.filter(e => {
    const d = new Date(e.start_time)
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const upcomingEvents = events.filter(e => {
    const d = new Date(e.start_time)
    return !(d.getDate() === now.getDate() && d.getMonth() === now.getMonth())
  }).slice(0, 3)

  const totalMinutes = pomodoroSessions.reduce((acc, s) => acc + s.duration_minutes, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  const urgentTasks = tasks.filter(t => {
    if (!t.due_date) return false
    const diff = (new Date(t.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 3
  })

  const greeting = () => {
    const h = now.getHours()
    const name = user.user_metadata?.full_name?.split(' ')[0] || 'estudiante'
    if (h < 12) return `Buenos días, ${name} ☀️`
    if (h < 20) return `Buenas tardes, ${name} 👋`
    return `Buenas noches, ${name} 🌙`
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">{greeting()}</h1>
          <p className="text-muted-foreground text-xs capitalize">{todayStr}</p>
        </div>
        <Link href="/calendar" className="btn-primary flex items-center gap-2 text-sm py-1.5">
          <Plus className="w-4 h-4" />Nuevo evento
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={<Calendar className="w-4 h-4 text-blue-400" />} label="Hoy" value={todayEvents.length.toString()} sub="eventos" color="blue" />
        <StatCard icon={<CheckSquare className="w-4 h-4 text-purple-400" />} label="Pendientes" value={tasks.length.toString()} sub="tareas" color="purple" />
        <StatCard icon={<Timer className="w-4 h-4 text-orange-400" />} label="Semana" value={`${totalHours}h${remainingMinutes}m`} sub="estudio" color="orange" />
        <StatCard icon={<BookOpen className="w-4 h-4 text-green-400" />} label="Asignaturas" value={subjects.length.toString()} sub="activas" color="green" />
      </div>

      {/* Alert */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400 font-medium">{urgentTasks.length} tarea{urgentTasks.length > 1 ? 's' : ''} urgente{urgentTasks.length > 1 ? 's' : ''}: {urgentTasks.map(t => t.title).join(', ')}</p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Today */}
        <div className="card space-y-2 p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary" />Hoy</h2>
            <Link href="/calendar" className="text-xs text-primary hover:underline">Ver todo</Link>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No tienes eventos hoy</p>
          ) : (
            <div className="space-y-1">{todayEvents.slice(0, 3).map(event => <EventRow key={event.id} event={event} />)}</div>
          )}
        </div>

        {/* Tasks */}
        <div className="card space-y-2 p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5 text-primary" />Tareas pendientes</h2>
            <Link href="/tasks" className="text-xs text-primary hover:underline">Ver todo</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">¡Sin tareas pendientes!</p>
          ) : (
            <div className="space-y-1">{tasks.slice(0, 3).map(task => <TaskRow key={task.id} task={task} />)}</div>
          )}
        </div>

        {/* Upcoming */}
        <div className="card space-y-2 p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-primary" />Próximos eventos</h2>
            <Link href="/calendar" className="text-xs text-primary hover:underline">Ver todo</Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Sin eventos próximos</p>
          ) : (
            <div className="space-y-1">{upcomingEvents.map(event => <EventRow key={event.id} event={event} showDate />)}</div>
          )}
        </div>

        {/* Subjects */}
        <div className="card space-y-2 p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-primary" />Asignaturas</h2>
            <Link href="/grades" className="text-xs text-primary hover:underline">Gestionar</Link>
          </div>
          {subjects.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No hay asignaturas</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {subjects.map(subject => (
                <div key={subject.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-secondary/50">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                  <span className="text-xs text-foreground truncate">{subject.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const bg: Record<string, string> = { blue: 'bg-blue-400/10', purple: 'bg-purple-400/10', orange: 'bg-orange-400/10', green: 'bg-green-400/10' }
  return (
    <div className="card flex items-center gap-2 p-3">
      <div className={`p-1.5 rounded-lg ${bg[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-bold text-foreground text-sm">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

function EventRow({ event, showDate }: { event: Event; showDate?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent/50 transition-colors">
      <div className={`w-1.5 h-6 rounded-full shrink-0 ${getEventTypeColor(event.type)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{event.title}</p>
        <p className="text-xs text-muted-foreground">
          {showDate && `${format(new Date(event.start_time), 'EEE d MMM', { locale: es })} · `}
          {formatTime(event.start_time)}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0 bg-secondary px-1 py-0.5 rounded">{getEventTypeLabel(event.type)}</span>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  const overdue = task.due_date && new Date(task.due_date) < new Date()
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="w-3.5 h-3.5 rounded border border-border shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
        {task.due_date && (
          <p className={`text-xs ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
            {overdue ? '⚠️ ' : ''}Vence {format(new Date(task.due_date), "d MMM", { locale: es })}
          </p>
        )}
      </div>
      <span className={`badge shrink-0 text-xs ${getPriorityColor(task.priority)}`}>{task.priority}</span>
    </div>
  )
}
