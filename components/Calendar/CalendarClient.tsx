'use client'

import { useState, useRef, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks, isSameDay, isSameMonth, parseISO, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Event, Subject } from '@/lib/types'
import { getEventTypeColor, getEventTypeLabel } from '@/lib/utils'

interface Props { events: Event[]; subjects: Subject[] }
type View = 'month' | 'week' | 'day'

export default function CalendarClient({ events: initialEvents, subjects }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<View>('month')
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const supabase = createClient()

  // Drag to navigate
  const dragStart = useRef<number | null>(null)
  const isDragging = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => { dragStart.current = e.clientX; isDragging.current = false }
  const handleMouseMove = (e: React.MouseEvent) => { if (dragStart.current !== null && Math.abs(e.clientX - dragStart.current) > 5) isDragging.current = true }
  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStart.current === null) return
    const diff = e.clientX - dragStart.current
    if (Math.abs(diff) > 50) {
      if (diff < 0) navigateForward()
      else navigateBack()
    }
    dragStart.current = null
  }

  const handleTouchStart = (e: React.TouchEvent) => { dragStart.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStart.current === null) return
    const diff = e.changedTouches[0].clientX - dragStart.current
    if (Math.abs(diff) > 50) {
      if (diff < 0) navigateForward()
      else navigateBack()
    }
    dragStart.current = null
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      if (e.deltaY < 0) {
        // zoom in
        if (view === 'month') setView('week')
        else if (view === 'week') setView('day')
      } else {
        // zoom out
        if (view === 'day') setView('week')
        else if (view === 'week') setView('month')
      }
    }
  }

  const navigateForward = () => {
    if (view === 'month') setCurrentDate(d => addMonths(d, 1))
    else if (view === 'week') setCurrentDate(d => addWeeks(d, 1))
    else setCurrentDate(d => addDays(d, 1))
  }

  const navigateBack = () => {
    if (view === 'month') setCurrentDate(d => subMonths(d, 1))
    else if (view === 'week') setCurrentDate(d => subWeeks(d, 1))
    else setCurrentDate(d => addDays(d, -1))
  }

  const refresh = useCallback(async () => {
    const now = currentDate
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()
    const { data } = await supabase.from('events').select('*, subject:subjects(*)').gte('start_time', start).lte('start_time', end).order('start_time')
    if (data) setEvents(data)
  }, [currentDate, supabase])

  const exportICS = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UniPlanner//ES', 'CALSCALE:GREGORIAN']
    events.forEach(ev => {
      const s = new Date(ev.start_time), en = new Date(ev.end_time)
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      lines.push('BEGIN:VEVENT', `DTSTART:${fmt(s)}`, `DTEND:${fmt(en)}`, `SUMMARY:${ev.title}`, 'END:VEVENT')
    })
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'uniplanner.ics'; a.click()
  }

  const title = view === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: es })
    : view === 'week'
    ? `Semana del ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`
    : format(currentDate, "EEEE, d 'de' MMMM", { locale: es })

  return (
    <div
      className="p-4 space-y-3 max-w-7xl mx-auto select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={navigateBack} className="p-2 hover:bg-accent rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <h1 className="text-lg font-bold text-foreground capitalize min-w-52 text-center">{title}</h1>
          <button onClick={navigateForward} className="p-2 hover:bg-accent rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs text-primary hover:underline">Hoy</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-secondary rounded-lg p-1 flex text-xs">
            {(['month', 'week', 'day'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-2.5 py-1.5 rounded font-medium transition-colors ${view === v ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>
                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
          <button onClick={exportICS} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"><Download className="w-3.5 h-3.5" />Exportar</button>
          <button onClick={() => { setEditingEvent(null); setSelectedDate(new Date()); setShowForm(true) }} className="btn-primary flex items-center gap-1.5 text-sm py-1.5"><Plus className="w-3.5 h-3.5" />Evento</button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground">💡 Arrastra para cambiar · Ctrl+Scroll para zoom</p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[{ type: 'clase', label: 'Clase' }, { type: 'examen', label: 'Examen' }, { type: 'entrega', label: 'Entrega' }, { type: 'personal', label: 'Personal' }].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${getEventTypeColor(type)}`} />{label}
          </div>
        ))}
      </div>

      {/* Views */}
      {view === 'month' && <MonthView currentDate={currentDate} events={events} isDragging={isDragging} onDayClick={d => { if (!isDragging.current) { setSelectedDate(d); setEditingEvent(null); setShowForm(true) } }} onEventClick={(e, ev) => { ev.stopPropagation(); setEditingEvent(e); setShowForm(true) }} onDayZoom={d => { setCurrentDate(d); setView('week') }} />}
      {view === 'week' && <WeekView currentDate={currentDate} events={events} isDragging={isDragging} onDayClick={d => { if (!isDragging.current) { setSelectedDate(d); setEditingEvent(null); setShowForm(true) } }} onEventClick={(e, ev) => { ev.stopPropagation(); setEditingEvent(e); setShowForm(true) }} onDayZoom={d => { setCurrentDate(d); setView('day') }} />}
      {view === 'day' && <DayView currentDate={currentDate} events={events} onSlotClick={d => { setSelectedDate(d); setEditingEvent(null); setShowForm(true) }} onEventClick={(e, ev) => { ev.stopPropagation(); setEditingEvent(e); setShowForm(true) }} />}

      {showForm && <EventForm date={selectedDate || new Date()} event={editingEvent} subjects={subjects} onClose={() => setShowForm(false)} onSaved={refresh} />}
    </div>
  )
}

function MonthView({ currentDate, events, isDragging, onDayClick, onEventClick, onDayZoom }: {
  currentDate: Date; events: Event[]
  isDragging: React.MutableRefObject<boolean>
  onDayClick: (d: Date) => void; onEventClick: (e: Event, ev: React.MouseEvent) => void; onDayZoom: (d: Date) => void
}) {
  const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
  const days: Date[] = []
  let d = start
  while (d <= end) { days.push(d); d = addDays(d, 1) }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day => (
          <div key={day} className="p-1.5 text-center text-xs font-medium text-muted-foreground">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), day))
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, currentDate)
          return (
            <div key={i} onClick={() => { if (!isDragging.current) onDayClick(day) }} onDoubleClick={() => onDayZoom(day)} className={`min-h-16 p-1 border-b border-r border-border cursor-pointer hover:bg-accent/30 transition-colors ${!isCurrentMonth ? 'opacity-40' : ''}`}>
              <div className={`w-5 h-5 flex items-center justify-center text-xs font-medium rounded-full mb-0.5 ${isToday ? 'bg-primary text-white' : 'text-foreground'}`}>{format(day, 'd')}</div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map(event => {
                  const color = (event as any).color || event.subject?.color
                  return (
                    <div key={event.id} onClick={ev => onEventClick(event, ev)} className={`text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 ${!color ? getEventTypeColor(event.type) : ''}`} style={color ? { backgroundColor: color } : {}}>
                      {event.title}
                    </div>
                  )
                })}
                {dayEvents.length > 2 && <div className="text-xs text-muted-foreground">+{dayEvents.length - 2}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ currentDate, events, isDragging, onDayClick, onEventClick, onDayZoom }: {
  currentDate: Date; events: Event[]
  isDragging: React.MutableRefObject<boolean>
  onDayClick: (d: Date) => void; onEventClick: (e: Event, ev: React.MouseEvent) => void; onDayZoom: (d: Date) => void
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const HOUR_HEIGHT = 48

  return (
    <div className="card p-0 overflow-hidden">
      <div className="grid grid-cols-8 border-b border-border">
        <div className="p-2" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, new Date())
          return (
            <div key={i} onClick={() => { if (!isDragging.current) onDayZoom(day) }} className="p-1.5 text-center border-l border-border cursor-pointer hover:bg-accent/30">
              <div className="text-xs text-muted-foreground capitalize">{format(day, 'EEE', { locale: es })}</div>
              <div className={`text-sm font-medium mt-0.5 w-6 h-6 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-primary text-white' : 'text-foreground'}`}>{format(day, 'd')}</div>
            </div>
          )
        })}
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <div className="relative" style={{ height: HOUR_HEIGHT * 24 }}>
          {/* Hour lines */}
          {hours.map(hour => (
            <div key={hour} className="absolute w-full flex" style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
              <div className="w-12 shrink-0 text-xs text-muted-foreground text-right pr-2 pt-1">{hour}:00</div>
              <div className="flex-1 border-t border-border/50 grid grid-cols-7">
                {days.map((_, i) => (
                  <div key={i} onClick={() => { const d = new Date(days[i]); d.setHours(hour); if (!isDragging.current) onDayClick(d) }} className="border-l border-border/30 hover:bg-accent/10 cursor-pointer" />
                ))}
              </div>
            </div>
          ))}
          {/* Events */}
          {days.map((day, di) => {
            const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), day))
            return dayEvents.map(event => {
              const start = parseISO(event.start_time)
              const end = parseISO(event.end_time)
              const topPx = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT
              const heightPx = Math.max(((end.getHours() + end.getMinutes() / 60) - (start.getHours() + start.getMinutes() / 60)) * HOUR_HEIGHT, 20)
              const color = (event as any).color || event.subject?.color
              const left = `calc(${(di / 7) * 100}% + 48px)`
              const width = `calc(${100 / 7}% - 4px)`
              return (
                <div key={event.id} onClick={ev => { ev.stopPropagation(); onEventClick(event, ev) }}
                  className={`absolute rounded text-white text-xs px-1 py-0.5 cursor-pointer hover:opacity-80 overflow-hidden ${!color ? getEventTypeColor(event.type) : ''}`}
                  style={{ top: topPx, height: heightPx, left, width, ...(color ? { backgroundColor: color } : {}) }}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  <div className="opacity-75">{format(start, 'HH:mm')}</div>
                </div>
              )
            })
          })}
        </div>
      </div>
    </div>
  )
}

function DayView({ currentDate, events, onSlotClick, onEventClick }: {
  currentDate: Date; events: Event[]
  onSlotClick: (d: Date) => void; onEventClick: (e: Event, ev: React.MouseEvent) => void
}) {
  const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), currentDate))
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const HOUR_HEIGHT = 60

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-3 border-b border-border">
        <h2 className="font-semibold text-foreground capitalize">{format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}</h2>
        <p className="text-xs text-muted-foreground">{dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <div className="relative" style={{ height: HOUR_HEIGHT * 24 }}>
          {hours.map(hour => (
            <div key={hour} className="absolute w-full flex border-t border-border/30" style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
              <div className="w-14 shrink-0 text-xs text-muted-foreground text-right pr-2 pt-1">{hour.toString().padStart(2,'0')}:00</div>
              <div onClick={() => { const d = new Date(currentDate); d.setHours(hour); onSlotClick(d) }} className="flex-1 hover:bg-accent/10 cursor-pointer border-l border-border/30" />
            </div>
          ))}
          {dayEvents.map(event => {
            const start = parseISO(event.start_time)
            const end = parseISO(event.end_time)
            const topPx = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT
            const heightPx = Math.max(((end.getHours() + end.getMinutes() / 60) - (start.getHours() + start.getMinutes() / 60)) * HOUR_HEIGHT, 30)
            const color = (event as any).color || event.subject?.color
            return (
              <div key={event.id} onClick={ev => { ev.stopPropagation(); onEventClick(event, ev) }}
                className={`absolute left-16 right-2 rounded-lg text-white px-2 py-1 cursor-pointer hover:opacity-80 overflow-hidden ${!color ? getEventTypeColor(event.type) : ''}`}
                style={{ top: topPx, height: heightPx, ...(color ? { backgroundColor: color } : {}) }}
              >
                <div className="font-medium text-sm truncate">{event.title}</div>
                <div className="text-xs opacity-75">{format(start, 'HH:mm')} – {format(end, 'HH:mm')}</div>
                {event.location && <div className="text-xs opacity-75 truncate">📍 {event.location}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EventForm({ date, event, subjects, onClose, onSaved }: { date: Date; event: Event | null; subjects: Subject[]; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const defaultColor = event ? ((event as any).color || event.subject?.color || '') : ''
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
    color: defaultColor,
  })

  const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#84cc16']

  const handleSubmit = async () => {
    if (!form.title) return
    setLoading(true)
    const payload = { ...form, subject_id: form.subject_id || null, start_time: new Date(form.start_time).toISOString(), end_time: new Date(form.end_time || form.start_time).toISOString(), color: form.color || null }
    if (event) { await supabase.from('events').update(payload).eq('id', event.id) }
    else { await supabase.from('events').insert(payload) }
    setLoading(false); onSaved(); onClose()
  }

  const handleDelete = async () => {
    if (!event || !confirm('¿Eliminar este evento?')) return
    await supabase.from('events').delete().eq('id', event.id)
    onSaved(); onClose()
  }

  // Auto-set color from subject
  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId)
    setForm(f => ({ ...f, subject_id: subjectId, color: subject?.color || f.color }))
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
            <select className="input" value={form.subject_id} onChange={e => handleSubjectChange(e.target.value)}>
              <option value="">Sin asignatura</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Color del evento</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-card' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
              ))}
              <button onClick={() => setForm(f => ({ ...f, color: '' }))} className={`w-7 h-7 rounded-full border-2 border-border text-xs text-muted-foreground flex items-center justify-center hover:border-primary ${!form.color ? 'ring-2 ring-white ring-offset-1 ring-offset-card' : ''}`}>✕</button>
            </div>
          </div>
          <div><label className="label">Aula / Lugar</label><input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Aula 3B, Biblioteca..." /></div>
          <div><label className="label">Descripción</label><textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} className="w-4 h-4" />
            <label htmlFor="recurring" className="text-sm text-foreground">Repetir semanalmente</label>
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <p className="text-sm font-medium text-foreground">Notificación</p>
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
            <button onClick={handleSubmit} disabled={loading || !form.title} className="btn-primary text-sm disabled:opacity-50">{loading ? 'Guardando...' : event ? 'Guardar' : 'Crear evento'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

