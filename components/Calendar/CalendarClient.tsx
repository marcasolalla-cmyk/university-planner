'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks, isSameDay, isSameMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Event, Subject } from '@/lib/types'
import { getEventTypeColor, getEventTypeLabel } from '@/lib/utils'

interface Props { events: Event[]; subjects: Subject[] }
type View = 'month' | 'week'

export default function CalendarClient({ events: initialEvents, subjects }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<View>('month')
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const supabase = createClient()

  const refresh = async () => {
    const now = currentDate
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()
    const { data } = await supabase.from('events').select('*, subject:subjects(*)').gte('start_time', start).lte('start_time', end).order('start_time')
    if (data) setEvents(data)
  }

  const exportICS = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UniPlanner//ES', 'CALSCALE:GREGORIAN']
    events.forEach(ev => {
      const start = new Date(ev.start_time)
      const end = new Date(ev.end_time)
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      lines.push('BEGIN:VEVENT', `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`, `SUMMARY:${ev.title}`, `DESCRIPTION:${ev.description || ''}`, `LOCATION:${ev.location || ''}`, 'END:VEVENT')
    })
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'uniplanner.ics'; a.click()
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => view === 'month' ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(subWeeks(currentDate, 1))} className="p-2 hover:bg-accent rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <h1 className="text-xl font-bold text-foreground capitalize min-w-48 text-center">
            {view === 'month' ? format(currentDate, 'MMMM yyyy', { locale: es }) : `Semana del ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`}
          </h1>
          <button onClick={() => view === 'month' ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(addWeeks(currentDate, 1))} className="p-2 hover:bg-accent rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs text-primary hover:underline">Hoy</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-secondary rounded-lg p-1 flex">
            <button onClick={() => setView('month')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${view === 'month' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>Mes</button>
            <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${view === 'week' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>Semana</button>
          </div>
          <button onClick={exportICS} className="btn-secondary flex items-center gap-2 text-sm"><Download className="w-4 h-4" />Exportar</button>
          <button onClick={() => { setEditingEvent(null); setSelectedDate(new Date()); setShowForm(true) }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Evento</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {[{ type: 'clase', label: 'Clase' }, { type: 'examen', label: 'Examen' }, { type: 'entrega', label: 'Entrega' }, { type: 'personal', label: 'Personal' }].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`w-2.5 h-2.5 rounded-full ${getEventTypeColor(type)}`} />{label}
          </div>
        ))}
      </div>

      {view === 'month'
        ? <MonthView currentDate={currentDate} events={events} onDayClick={d => { setSelectedDate(d); setEditingEvent(null); setShowForm(true) }} onEventClick={(e, ev) => { ev.stopPropagation(); setEditingEvent(e); setShowForm(true) }} />
        : <WeekView currentDate={currentDate} events={events} onDayClick={d => { setSelectedDate(d); setEditingEvent(null); setShowForm(true) }} onEventClick={(e, ev) => { ev.stopPropagation(); setEditingEvent(e); setShowForm(true) }} />
      }

      {showForm && <EventForm date={selectedDate || new Date()} event={editingEvent} subjects={subjects} onClose={() => setShowForm(false)} onSaved={refresh} />}
    </div>
  )
}

function MonthView({ currentDate, events, onDayClick, onEventClick }: { currentDate: Date; events: Event[]; onDayClick: (d: Date) => void; onEventClick: (e: Event, ev: React.MouseEvent) => void }) {
  const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
  const days: Date[] = []
  let d = start
  while (d <= end) { days.push(d); d = addDays(d, 1) }
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="card p-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map(day => <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), day))
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, currentDate)
          return (
            <div key={i} onClick={() => onDayClick(day)} className={`min-h-20 p-1.5 border-b border-r border-border cursor-pointer hover:bg-accent/30 transition-colors ${!isCurrentMonth ? 'opacity-40' : ''}`}>
              <div className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full mb-1 ${isToday ? 'bg-primary text-white' : 'text-foreground'}`}>{format(day, 'd')}</div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <div key={event.id} onClick={(e) => onEventClick(event, e)} className={`text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 ${getEventTypeColor(event.type)}`}>{event.title}</div>
                ))}
                {dayEvents.length > 3 && <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} más</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ currentDate, events, onDayClick, onEventClick }: { currentDate: Date; events: Event[]; onDayClick: (d: Date) => void; onEventClick: (e: Event, ev: React.MouseEvent) => void }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="card p-0 overflow-hidden">
      <div className="grid grid-cols-8 border-b border-border">
        <div className="p-2" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, new Date())
          return (
            <div key={i} className="p-2 text-center border-l border-border">
              <div className="text-xs text-muted-foreground capitalize">{format(day, 'EEE', { locale: es })}</div>
              <div className={`text-sm font-medium mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-primary text-white' : 'text-foreground'}`}>{format(day, 'd')}</div>
            </div>
          )
        })}
      </div>
      <div className="overflow-y-auto max-h-[600px]">
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-border min-h-12">
            <div className="p-1 text-xs text-muted-foreground text-right pr-2 pt-1">{hour}:00</div>
            {days.map((day, i) => {
              const dayEvents = events.filter(e => { const d = parseISO(e.start_time); return isSameDay(d, day) && d.getHours() === hour })
              return (
                <div key={i} onClick={() => { const d = new Date(day); d.setHours(hour); onDayClick(d) }} className="border-l border-border p-0.5 cursor-pointer hover:bg-accent/20 transition-colors">
                  {dayEvents.map(event => (
                    <div key={event.id} onClick={(e) => onEventClick(event, e)} className={`text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 mb-0.5 ${getEventTypeColor(event.type)}`}>{event.title}</div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventForm({ date, event, subjects, onClose, onSaved }: { date: Date; event: Event | null; subjects: Subject[]; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    type: event?.type || 'clase',
    start_time: event?.start_time ? format(parseISO(event.start_time), "yyyy-MM-dd'T'HH:mm") : format(date, "yyyy-MM-dd'T'HH:mm"),
    end_time: event?.end_time ? format(parseISO(event.end_time), "yyyy-MM-dd'T'HH:mm") : format(date, "yyyy-MM-dd'T'HH:mm"),
    location: event?.location || '',
    priority: event?.priority || 'media',
    subject_id: event?.subject_id || '',
    is_recurring: event?.is_recurring || false,
    notification_enabled: event?.notification_enabled ?? true,
    notification_minutes: event?.notification_minutes || 30,
  })

  const handleSubmit = async () => {
    if (!form.title) return
    setLoading(true)
    const payload = { ...form, subject_id: form.subject_id || null, start_time: new Date(form.start_time).toISOString(), end_time: new Date(form.end_time || form.start_time).toISOString() }
    if (event) { await supabase.from('events').update(payload).eq('id', event.id) }
    else { await supabase.from('events').insert(payload) }
    setLoading(false); onSaved(); onClose()
  }

  const handleDelete = async () => {
    if (!event || !confirm('¿Eliminar este evento?')) return
    await supabase.from('events').delete().eq('id', event.id)
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{event ? 'Editar evento' : 'Nuevo evento'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div><label className="label">Título *</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título del evento" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Event['type'] }))}>
                <option value="clase">Clase</option><option value="examen">Examen</option><option value="entrega">Entrega</option><option value="personal">Personal</option>
              </select>
            </div>
            <div><label className="label">Prioridad</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Event['priority'] }))}>
                <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Inicio</label><input type="datetime-local" className="input" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
            <div><label className="label">Fin</label><input type="datetime-local" className="input" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
          </div>
          <div><label className="label">Asignatura</label>
            <select className="input" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Sin asignatura</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="label">Aula / Lugar</label><input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Aula 3B, Biblioteca..." /></div>
          <div><label className="label">Descripción</label><textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} className="w-4 h-4" />
            <label htmlFor="recurring" className="text-sm text-foreground">Repetir semanalmente</label>
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div><p className="text-sm font-medium text-foreground">Notificación</p></div>
            <div className="flex items-center gap-2">
              <select className="input w-auto text-sm" value={form.notification_minutes} onChange={e => setForm(f => ({ ...f, notification_minutes: parseInt(e.target.value) }))} disabled={!form.notification_enabled}>
                <option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>1 hora</option><option value={1440}>1 día</option>
              </select>
              <input type="checkbox" checked={form.notification_enabled} onChange={e => setForm(f => ({ ...f, notification_enabled: e.target.checked }))} className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div>{event && <button onClick={handleDelete} className="text-sm text-destructive hover:underline">Eliminar</button>}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={handleSubmit} disabled={loading || !form.title} className="btn-primary text-sm disabled:opacity-50">{loading ? 'Guardando...' : event ? 'Guardar cambios' : 'Crear evento'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
