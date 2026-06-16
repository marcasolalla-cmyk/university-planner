'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar, CheckSquare, Clock, BookOpen,
  TrendingUp, AlertCircle, Plus, Timer
} from 'lucide-react'
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
    return d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
  })

  const upcomingEvents = events.filter(e => {
    const d = new Date(e.start_time)
    return !(d.getDate() === now.getDate() && d.getMonth() === now.getMonth())
  }).slice(0, 5)

  const totalMinutes = pomodoroSessions.reduce((acc, s) => acc + s.duration_minutes, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  const urgentTasks = tasks.filter(t => {
    if (!t.due_date) return false
    const due = new Date(t.due_date)
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting()}</h1>
          <p className="text-muted-foreground capitalize">{todayStr}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/calendar" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Nuevo evento
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="w-5 h-5 text-blue-400" />} label="Hoy" value={todayEvents.length.toString()} sub="eventos" color="blue" />
        <StatCard icon={<CheckSquare className="w-5 h-5 text-purple-400" />} label="Pendientes" value={tasks.length.toString()} sub="tareas" color="purple" />
        <StatCard icon={<Timer className="w-5 h-5 text-orange-400" />} label="Esta semana" value={`${totalHours}h ${remainingMinutes}m`} sub="estudiadas" color="orange" />
        <StatCard icon={<BookOpen className="w-5 h-5 text-green-400" />} label="Asignaturas" value={subjects.length.toString()} sub="activas" color="green" />
      </div>

      {urgentTasks.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-400">Tareas urgentes</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tienes {urgentTasks.length} tarea{urgentTasks.length > 1 ? 's' : ''} con fecha límite en menos de 3 días
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {urgentTasks.map(t => (
                <span key={t.id} className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">{t.title}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Hoy</h2>
            <Link href="/calendar" className="text-xs text-primary hover:underline">Ver todo</Link>
          </div>
          {todayEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tienes eventos hoy</p>
              <Link href="/calendar" className="text-xs text-primary hover:underline mt-1 inline-block">Añadir evento</Link>
            </div>
          ) : (
            <div className="space-y-2">{todayEvents.map(event => <EventRow key={event.id} event={event} />)}</div>
          )}
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><CheckSquare className="w-4 h-4 text-primary" />Tareas pendientes</h2>
            <Link href="/tasks" className="text-xs text-primary hover:underline">Ver todo</Link>
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">¡Sin tareas pendientes!</p>
            </div>
          ) : (
            <div className="space-y-2">{tasks.slice(0, 5).map(task => <TaskRow key={task.id} task={task} />)}</div>
          )}
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Próximos eventos</h2>
            <Link href="/calendar" className="text-xs text-primary hover:underline">Ver todo</Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin eventos próximos</p>
            </div>
          ) : (
            <div className="space-y-2">{upcomingEvents.map(event => <EventRow key={event.id} event={event} showDate />)}</div>
          )}
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Mis asignaturas</h2>
            <Link href="/grades" className="text-xs text-primary hover:underline">Gestionar</Link>
          </div>
          {subjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay asignaturas</p>
              <Link href="/grades" className="text-xs text-primary hover:underline mt-1 inline-block">Añadir asignatura</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {subjects.map(subject => (
                <div key={subject.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                  <span className="text-sm text-foreground truncate">{subject.name}</span>
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
    <div className="card flex items-center gap-3">
      <div className={`p-2 rounded-lg ${bg[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

function EventRow({ event, showDate }: { event: Event; showDate?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
      <div className={`w-2 h-8 rounded-full shrink-0 ${getEventTypeColor(event.type)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
        <p className="text-xs text-muted-foreground">
          {showDate && `${format(new Date(event.start_time), 'EEE d MMM', { locale: es })} · `}
          {formatTime(event.start_time)}
          {event.location && ` · ${event.location}`}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0 bg-secondary px-1.5 py-0.5 rounded">{getEventTypeLabel(event.type)}</span>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  const overdue = task.due_date && new Date(task.due_date) < new Date()
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="w-4 h-4 rounded border border-border shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
        {task.due_date && (
          <p className={`text-xs ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
            {overdue ? '⚠️ ' : ''}
            Vence {format(new Date(task.due_date), "d MMM 'a las' HH:mm", { locale: es })}
          </p>
        )}
      </div>
      {task.subject && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.subject.color }} />}
      <span className={`badge shrink-0 ${getPriorityColor(task.priority)}`}>{task.priority}</span>
    </div>
  )
}
