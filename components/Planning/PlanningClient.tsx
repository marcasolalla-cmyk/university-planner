'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, CheckSquare, Calendar } from 'lucide-react'
import type { Event, Task } from '@/lib/types'
import { getEventTypeColor, getEventTypeLabel, getPriorityColor } from '@/lib/utils'

interface Props { events: Event[]; tasks: Task[] }

export default function PlanningClient({ events, tasks }: Props) {
  const today = new Date()
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const items = [
    ...events.map(e => ({ type: 'event' as const, time: new Date(e.start_time), data: e })),
    ...tasks.filter(t => t.due_date).map(t => ({ type: 'task' as const, time: new Date(t.due_date!), data: t })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime())

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Planificación diaria</h1>
        <p className="text-muted-foreground capitalize">{format(today, "EEEE, d 'de' MMMM", { locale: es })}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card flex items-center gap-3"><Calendar className="w-5 h-5 text-blue-400" /><div><p className="text-xl font-bold text-foreground">{events.length}</p><p className="text-xs text-muted-foreground">eventos hoy</p></div></div>
        <div className="card flex items-center gap-3"><CheckSquare className="w-5 h-5 text-purple-400" /><div><p className="text-xl font-bold text-foreground">{tasks.length}</p><p className="text-xs text-muted-foreground">tareas pendientes</p></div></div>
      </div>

      <div className="card space-y-0 p-0 overflow-hidden">
        <div className="p-4 border-b border-border"><h2 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Vista del día</h2></div>
        {hours.map(hour => {
          const hourItems = items.filter(item => item.time.getHours() === hour)
          const hasItems = hourItems.length > 0
          return (
            <div key={hour} className={`flex border-b border-border/50 last:border-0 ${hasItems ? '' : 'opacity-40'}`}>
              <div className="w-14 shrink-0 p-2 text-xs text-muted-foreground text-right border-r border-border/50">{hour.toString().padStart(2, '0')}:00</div>
              <div className="flex-1 p-1.5 min-h-10 space-y-1">
                {hourItems.map((item, i) => (
                  item.type === 'event' ? (
                    <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded text-white text-xs ${getEventTypeColor((item.data as Event).type)}`}>
                      <div className="font-medium truncate">{(item.data as Event).title}</div>
                      <div className="opacity-80 shrink-0">{getEventTypeLabel((item.data as Event).type)}</div>
                    </div>
                  ) : (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-secondary border border-border text-xs">
                      <CheckSquare className="w-3 h-3 text-muted-foreground shrink-0" />
                      <div className="text-foreground truncate">{(item.data as Task).title}</div>
                      <span className={`badge ${getPriorityColor((item.data as Task).priority)} shrink-0`}>{(item.data as Task).priority}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {tasks.filter(t => !t.due_date).length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-foreground">Tareas sin hora específica</h2>
          <div className="space-y-2">
            {tasks.filter(t => !t.due_date).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30">
                <div className="w-4 h-4 rounded border border-border shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{task.title}</p>
                  {task.subject && <p className="text-xs text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: task.subject.color }} />{task.subject.name}</p>}
                </div>
                <span className={`badge ${getPriorityColor(task.priority)}`}>{task.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
