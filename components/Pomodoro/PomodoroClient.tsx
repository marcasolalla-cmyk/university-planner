'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Timer, BarChart2, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { PomodoroSession, Subject } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props { sessions: PomodoroSession[]; subjects: Subject[] }

export default function PomodoroClient({ sessions: initialSessions, subjects }: Props) {
  const [sessions, setSessions] = useState<PomodoroSession[]>(initialSessions)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null)
  const [customInput, setCustomInput] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  const progress = targetMinutes ? Math.min((seconds / (targetMinutes * 60)) * 100, 100) : 0
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const saveSession = useCallback(async (duration: number) => {
    if (duration < 60) return
    await supabase.from('pomodoro_sessions').insert({
      subject_id: selectedSubject || null,
      duration_minutes: Math.floor(duration / 60),
      completed: true,
      date: new Date().toISOString().split('T')[0],
    })
    const { data } = await supabase.from('pomodoro_sessions').select('*, subject:subjects(*)').order('created_at', { ascending: false }).limit(50)
    if (data) setSessions(data)
  }, [selectedSubject, supabase])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          const next = prev + 1
          if (targetMinutes && next >= targetMinutes * 60) {
            setRunning(false)
            setFinished(true)
            saveSession(next)
            document.title = '✅ ¡Tiempo completado!'
            setTimeout(() => { document.title = 'UniPlanner' }, 4000)
            return next
          }
          return next
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, targetMinutes, saveSession])

  const reset = () => {
    if (seconds > 60 && running === false) saveSession(seconds)
    setRunning(false)
    setSeconds(0)
    setFinished(false)
    setTargetMinutes(null)
    setCustomInput('')
  }

  const setQuickTarget = (m: number) => {
    setSeconds(0)
    setTargetMinutes(m)
    setFinished(false)
    setRunning(true)
  }

  const setCustomTarget = () => {
    const m = parseInt(customInput)
    if (m > 0) {
      setSeconds(0)
      setTargetMinutes(m)
      setFinished(false)
      setCustomInput('')
    }
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const mins = sessions.filter(s => s.date === dateStr).reduce((acc, s) => acc + s.duration_minutes, 0)
    return { day: format(d, 'EEE', { locale: es }), horas: parseFloat((mins / 60).toFixed(1)) }
  })

  const thisWeekMinutes = sessions.filter(s => (new Date().getTime() - new Date(s.date).getTime()) < 7 * 24 * 60 * 60 * 1000).reduce((acc, s) => acc + s.duration_minutes, 0)

  const subjectStats = subjects.map(sub => ({
    name: sub.name, color: sub.color,
    minutes: sessions.filter(s => s.subject_id === sub.id).reduce((acc, s) => acc + s.duration_minutes, 0)
  })).filter(s => s.minutes > 0).sort((a, b) => b.minutes - a.minutes)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Timer className="w-6 h-6 text-primary" />
        Temporizador de estudio
      </h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card space-y-6">
          {/* Círculo */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <svg width="220" height="220" className="-rotate-90">
                <circle cx="110" cy="110" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                {targetMinutes && (
                  <circle cx="110" cy="110" r={radius} fill="none"
                    stroke={finished ? '#10b981' : 'hsl(var(--primary))'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-foreground tabular-nums">{mins}:{secs}</span>
                {targetMinutes && !finished && (
                  <span className="text-xs text-muted-foreground mt-1">de {targetMinutes} min</span>
                )}
                {finished && <span className="text-green-400 font-medium mt-1">✅ ¡Completado!</span>}
                {!targetMinutes && <span className="text-xs text-muted-foreground mt-1">cronómetro libre</span>}
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={reset} className="p-3 hover:bg-accent rounded-xl transition-colors">
              <RotateCcw className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setRunning(!running)}
              className="px-8 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {running ? 'Pausar' : seconds > 0 ? 'Continuar' : 'Iniciar'}
            </button>
          </div>

          {/* Modos rápidos */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 text-center">Tiempo objetivo</p>
            <div className="grid grid-cols-3 gap-2">
              {[25, 45, 60].map(m => (
                <button key={m} onClick={() => setQuickTarget(m)} className={`py-2 rounded-lg text-sm font-medium transition-colors border ${targetMinutes === m ? 'bg-primary text-white border-primary' : 'border-border hover:bg-accent text-foreground'}`}>
                  {m} min
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                className="input text-sm"
                placeholder="Minutos personalizados..."
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setCustomTarget()}
              />
              <button onClick={setCustomTarget} className="btn-secondary text-sm px-3 shrink-0">
                <Target className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Asignatura */}
          <div>
            <label className="label text-center block">Asignatura</label>
            <select className="input" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="">Sin asignatura</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" />Esta semana</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{Math.floor(thisWeekMinutes / 60)}h {thisWeekMinutes % 60}m</p>
                <p className="text-xs text-muted-foreground">tiempo estudiado</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{sessions.filter(s => (new Date().getTime() - new Date(s.date).getTime()) < 7 * 24 * 60 * 60 * 1000).length}</p>
                <p className="text-xs text-muted-foreground">sesiones</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={last7}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: any) => [`${Number(v)}h`, 'Horas']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {subjectStats.length > 0 && (
            <div className="card space-y-3">
              <h2 className="font-semibold text-foreground text-sm">Por asignatura</h2>
              <div className="space-y-2">
                {subjectStats.map(s => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground truncate">{s.name}</span>
                        <span className="text-muted-foreground">{Math.floor(s.minutes / 60)}h {s.minutes % 60}m</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ backgroundColor: s.color, width: `${Math.min((s.minutes / Math.max(...subjectStats.map(x => x.minutes))) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sessions.length > 0 && (
            <div className="card space-y-3">
              <h2 className="font-semibold text-foreground text-sm">Historial</h2>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {sessions.map(session => (
                  <div key={session.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{session.subject?.name || 'Sin asignatura'}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(session.date), "d MMM yyyy", { locale: es })}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{session.duration_minutes} min</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
