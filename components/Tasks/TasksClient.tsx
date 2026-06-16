'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, X, ChevronDown, ChevronRight, Check, Clock, Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Task, Subtask, Subject } from '@/lib/types'
import { getPriorityColor } from '@/lib/utils'

interface Props { tasks: Task[]; subjects: Subject[] }

function getDifficultyLabel(d: number) {
  const labels = ['', 'Muy fácil', 'Fácil', 'Normal', 'Difícil', 'Muy difícil']
  return labels[d] || 'Normal'
}

function getDifficultyColor(d: number) {
  const colors = ['', 'text-green-400', 'text-blue-400', 'text-yellow-400', 'text-orange-400', 'text-red-400']
  return colors[d] || 'text-yellow-400'
}

function getSmartScore(task: Task): number {
  const difficulty = (task as any).difficulty || 3
  const now = new Date()
  let urgency = 0
  if (task.due_date) {
    const daysLeft = (new Date(task.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysLeft < 0) urgency = 100
    else if (daysLeft < 1) urgency = 50
    else if (daysLeft < 3) urgency = 30
    else if (daysLeft < 7) urgency = 15
    else urgency = 5
  }
  return difficulty * 20 + urgency
}

export default function TasksClient({ tasks: initialTasks, subjects }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [filterSubject, setFilterSubject] = useState('')
  const [sortMode, setSortMode] = useState<'smart' | 'date' | 'priority'>('smart')
  const supabase = createClient()

  const refresh = async () => {
    const { data } = await supabase.from('tasks').select('*, subject:subjects(*), subtasks(*)').order('due_date', { ascending: true })
    if (data) setTasks(data)
  }

  const toggleComplete = async (task: Task) => {
    await supabase.from('tasks').update({ completed: !task.completed, completed_at: !task.completed ? new Date().toISOString() : null }).eq('id', task.id)
    refresh()
  }

  const toggleSubtask = async (subtask: Subtask) => {
    await supabase.from('subtasks').update({ completed: !subtask.completed }).eq('id', subtask.id)
    refresh()
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pending' && t.completed) return false
    if (filter === 'completed' && !t.completed) return false
    if (filterSubject && t.subject_id !== filterSubject) return false
    return true
  }).sort((a, b) => {
    if (sortMode === 'smart') return getSmartScore(b) - getSmartScore(a)
    if (sortMode === 'date') {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    const p: Record<string, number> = { alta: 3, media: 2, baja: 1 }
    return (p[b.priority] || 0) - (p[a.priority] || 0)
  })

  const pending = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)
  const topTask = filter === 'pending' && sortMode === 'smart' && filtered[0]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tareas</h1>
          <p className="text-muted-foreground text-sm">{pending.length} pendientes · {completed.length} completadas</p>
        </div>
        <button onClick={() => { setEditingTask(null); setShowForm(true) }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Nueva tarea</button>
      </div>

      {topTask && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <Flame className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-primary">Recomendación: empieza por esta</p>
            <p className="text-sm text-foreground mt-0.5">{topTask.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Dificultad: {getDifficultyLabel((topTask as any).difficulty || 3)}
              {topTask.due_date && ` · Vence ${format(new Date(topTask.due_date), "d MMM", { locale: es })}`}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="bg-secondary rounded-lg p-1 flex">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completadas'}
            </button>
          ))}
        </div>
        <div className="bg-secondary rounded-lg p-1 flex">
          {([['smart', '🧠 Inteligente'], ['date', '📅 Fecha'], ['priority', '⚡ Prioridad']] as const).map(([mode, label]) => (
            <button key={mode} onClick={() => setSortMode(mode)} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${sortMode === mode ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
        <select className="input w-auto text-sm" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">Todas las asignaturas</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card text-center py-12 text-muted-foreground">
            <Check className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{filter === 'completed' ? '¡Sin tareas completadas aún!' : '¡Sin tareas pendientes!'}</p>
          </div>
        ) : (
          filtered.map(task => (
            <TaskCard key={task.id} task={task} onToggle={() => toggleComplete(task)} onEdit={() => { setEditingTask(task); setShowForm(true) }} onToggleSubtask={toggleSubtask} />
          ))
        )}
      </div>

      {showForm && <TaskForm task={editingTask} subjects={subjects} onClose={() => setShowForm(false)} onSaved={refresh} />}
    </div>
  )
}

function TaskCard({ task, onToggle, onEdit, onToggleSubtask }: { task: Task; onToggle: () => void; onEdit: () => void; onToggleSubtask: (s: Subtask) => void }) {
  const [expanded, setExpanded] = useState(false)
  const overdue = !task.completed && task.due_date && new Date(task.due_date) < new Date()
  const subtasks = task.subtasks || []
  const completedSubs = subtasks.filter(s => s.completed).length
  const difficulty = (task as any).difficulty || 3

  return (
    <div className={`card space-y-2 ${task.completed ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${task.completed ? 'bg-primary border-primary' : 'border-border hover:border-primary'}`}>
          {task.completed && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium text-foreground ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
            <button onClick={onEdit} className="text-xs text-muted-foreground hover:text-primary shrink-0">Editar</button>
          </div>
          {task.description && <p className="text-sm text-muted-foreground mt-0.5">{task.description}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {task.due_date && (
              <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                <Clock className="w-3 h-3" />
                {overdue ? '¡Vencida! ' : ''}
                {format(new Date(task.due_date), "d MMM yyyy 'a las' HH:mm", { locale: es })}
              </span>
            )}
            <span className={`badge ${getPriorityColor(task.priority)}`}>{task.priority}</span>
            <span className={`text-xs font-medium ${getDifficultyColor(difficulty)}`}>
              {'●'.repeat(difficulty)}{'○'.repeat(5 - difficulty)} {getDifficultyLabel(difficulty)}
            </span>
            {task.subject && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.subject.color }} />
                {task.subject.name}
              </span>
            )}
          </div>
        </div>
      </div>
      {subtasks.length > 0 && (
        <div>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-8">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Subtareas ({completedSubs}/{subtasks.length})
          </button>
          {expanded && (
            <div className="ml-8 mt-2 space-y-1.5">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2">
                  <button onClick={() => onToggleSubtask(sub)} className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${sub.completed ? 'bg-primary border-primary' : 'border-border hover:border-primary'}`}>
                    {sub.completed && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <span className={`text-sm ${sub.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{sub.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskForm({ task, subjects, onClose, onSaved }: { task: Task | null; subjects: Subject[]; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'media',
    difficulty: (task as any)?.difficulty || 3,
    due_date: task?.due_date ? format(new Date(task.due_date), "yyyy-MM-dd'T'HH:mm") : '',
    subject_id: task?.subject_id || '',
  })
  const [subtasks, setSubtasks] = useState<string[]>(task?.subtasks?.map(s => s.title) || [''])

  const handleSubmit = async () => {
    if (!form.title) return
    setLoading(true)
    const payload = { ...form, subject_id: form.subject_id || null, due_date: form.due_date ? new Date(form.due_date).toISOString() : null }
    let taskId = task?.id
    if (task) {
      await supabase.from('tasks').update(payload).eq('id', task.id)
      await supabase.from('subtasks').delete().eq('task_id', task.id)
    } else {
      const { data } = await supabase.from('tasks').insert(payload).select().single()
      taskId = data?.id
    }
    const validSubs = subtasks.filter(s => s.trim())
    if (validSubs.length > 0 && taskId) {
      await supabase.from('subtasks').insert(validSubs.map(title => ({ task_id: taskId, title })))
    }
    setLoading(false); onSaved(); onClose()
  }

  const handleDelete = async () => {
    if (!task || !confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tasks').delete().eq('id', task.id)
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{task ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div><label className="label">Título *</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título de la tarea" /></div>
          <div><label className="label">Descripción</label><textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Prioridad</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}>
                <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
              </select>
            </div>
            <div><label className="label">Fecha límite</label><input type="datetime-local" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
          </div>
          <div>
            <label className="label">Dificultad / Carga de trabajo: <span className={`font-bold ${getDifficultyColor(form.difficulty)}`}>{getDifficultyLabel(form.difficulty)}</span></label>
            <input type="range" min={1} max={5} value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: parseInt(e.target.value) }))} className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Muy fácil</span><span>Fácil</span><span>Normal</span><span>Difícil</span><span>Muy difícil</span>
            </div>
          </div>
          <div><label className="label">Asignatura</label>
            <select className="input" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Sin asignatura</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subtareas</label>
            <div className="space-y-2">
              {subtasks.map((sub, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input" value={sub} onChange={e => setSubtasks(prev => { const n = [...prev]; n[i] = e.target.value; return n })} placeholder={`Subtarea ${i + 1}`} />
                  {subtasks.length > 1 && <button onClick={() => setSubtasks(prev => prev.filter((_, j) => j !== i))} className="p-2 hover:bg-accent rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>}
                </div>
              ))}
              <button onClick={() => setSubtasks(prev => [...prev, ''])} className="text-sm text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Añadir subtarea</button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div>{task && <button onClick={handleDelete} className="text-sm text-destructive hover:underline">Eliminar</button>}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={handleSubmit} disabled={loading || !form.title} className="btn-primary text-sm disabled:opacity-50">{loading ? 'Guardando...' : task ? 'Guardar cambios' : 'Crear tarea'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
