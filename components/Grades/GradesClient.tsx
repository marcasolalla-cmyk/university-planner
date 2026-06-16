'use client'

import { useState } from 'react'
import { Plus, X, GraduationCap, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Grade, Subject } from '@/lib/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Props { grades: Grade[]; subjects: Subject[] }

export default function GradesClient({ grades: initialGrades, subjects: initialSubjects }: Props) {
  const [grades, setGrades] = useState<Grade[]>(initialGrades)
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [showGradeForm, setShowGradeForm] = useState(false)
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [activeSubject, setActiveSubject] = useState<string | null>(null)
  const supabase = createClient()

  const refresh = async () => {
    const [g, s] = await Promise.all([
      supabase.from('grades').select('*, subject:subjects(*)').order('date', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
    ])
    if (g.data) setGrades(g.data)
    if (s.data) setSubjects(s.data)
  }

  const subjectStats = subjects.map(subject => {
    const subGrades = grades.filter(g => g.subject_id === subject.id)
    const avg = subGrades.length > 0
      ? subGrades.reduce((acc, g) => acc + (g.grade / g.max_grade) * 10 * g.weight, 0) / subGrades.reduce((acc, g) => acc + g.weight, 0)
      : null
    return { subject, grades: subGrades, avg }
  })

  const overallAvg = subjectStats.filter(s => s.avg !== null).reduce((acc, s, _, arr) => acc + (s.avg || 0) / arr.length, 0)

  const chartData = subjectStats.filter(s => s.avg !== null).map(s => ({
    name: s.subject.name.length > 10 ? s.subject.name.substring(0, 10) + '…' : s.subject.name,
    nota: parseFloat((s.avg || 0).toFixed(2)),
    color: s.subject.color,
  }))

  const displayGrades = activeSubject ? grades.filter(g => g.subject_id === activeSubject) : grades

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notas académicas</h1>
          <p className="text-muted-foreground text-sm">Media global: <span className="text-foreground font-medium">{overallAvg ? overallAvg.toFixed(2) : '—'}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingSubject(null); setShowSubjectForm(true) }} className="btn-secondary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Asignatura</button>
          <button onClick={() => { setEditingGrade(null); setShowGradeForm(true) }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Nota</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center"><p className="text-2xl font-bold text-primary">{overallAvg ? overallAvg.toFixed(2) : '—'}</p><p className="text-xs text-muted-foreground">Media global</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-foreground">{subjects.length}</p><p className="text-xs text-muted-foreground">Asignaturas</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-green-400">{subjectStats.filter(s => (s.avg || 0) >= 5).length}</p><p className="text-xs text-muted-foreground">Aprobadas</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-foreground">{subjects.reduce((acc, s) => acc + s.credits, 0)}</p><p className="text-xs text-muted-foreground">Créditos totales</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {chartData.length > 0 && (
          <div className="card space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Notas por asignatura</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: any) => [Number(v).toFixed(2), 'Nota']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="nota" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" />Asignaturas</h2>
          {subjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Añade tus asignaturas para empezar</p></div>
          ) : (
            <div className="space-y-2">
              {subjectStats.map(({ subject, avg, grades: sg }) => (
                <div key={subject.id} onClick={() => setActiveSubject(activeSubject === subject.id ? null : subject.id)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${activeSubject === subject.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent/50'}`}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">{subject.credits} créditos · {sg.length} evaluaciones</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${avg === null ? 'text-muted-foreground' : avg >= 9 ? 'text-green-400' : avg >= 7 ? 'text-blue-400' : avg >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>{avg !== null ? avg.toFixed(2) : '—'}</p>
                    <p className="text-xs text-muted-foreground">{avg === null ? 'Sin notas' : avg >= 5 ? 'Aprobada' : 'Suspenso'}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setEditingSubject(subject); setShowSubjectForm(true) }} className="text-xs text-muted-foreground hover:text-primary ml-1">✏️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-foreground">Registro de notas {activeSubject && <button onClick={() => setActiveSubject(null)} className="ml-2 text-xs text-muted-foreground hover:text-foreground">(limpiar filtro)</button>}</h2>
        {displayGrades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground"><p className="text-sm">Sin notas registradas aún</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-left"><th className="pb-2 font-medium">Evaluación</th><th className="pb-2 font-medium">Asignatura</th><th className="pb-2 font-medium">Nota</th><th className="pb-2 font-medium">Convocatoria</th><th className="pb-2 font-medium">Fecha</th><th className="pb-2" /></tr></thead>
              <tbody className="divide-y divide-border">
                {displayGrades.map(grade => (
                  <tr key={grade.id} className="hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 font-medium text-foreground">{grade.name}</td>
                    <td className="py-2.5">{grade.subject && <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: grade.subject.color }} />{grade.subject.name}</span>}</td>
                    <td className="py-2.5"><span className={`font-bold ${(grade.grade / grade.max_grade) * 10 >= 5 ? 'text-green-400' : 'text-red-400'}`}>{grade.grade}/{grade.max_grade}</span><span className="text-muted-foreground ml-1">({((grade.grade / grade.max_grade) * 10).toFixed(1)})</span></td>
                    <td className="py-2.5 text-muted-foreground capitalize">{grade.convocatoria}</td>
                    <td className="py-2.5 text-muted-foreground">{grade.date || '—'}</td>
                    <td className="py-2.5"><button onClick={() => { setEditingGrade(grade); setShowGradeForm(true) }} className="text-xs text-muted-foreground hover:text-primary">Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showGradeForm && <GradeForm grade={editingGrade} subjects={subjects} onClose={() => setShowGradeForm(false)} onSaved={refresh} />}
      {showSubjectForm && <SubjectForm subject={editingSubject} onClose={() => setShowSubjectForm(false)} onSaved={refresh} />}
    </div>
  )
}

function GradeForm({ grade, subjects, onClose, onSaved }: { grade: Grade | null; subjects: Subject[]; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: grade?.name || '', subject_id: grade?.subject_id || '', grade: grade?.grade?.toString() || '', max_grade: grade?.max_grade?.toString() || '10', weight: grade?.weight?.toString() || '1', convocatoria: grade?.convocatoria || 'ordinaria', date: grade?.date || '' })

  const handleSubmit = async () => {
    if (!form.name || !form.subject_id || !form.grade) return
    setLoading(true)
    const payload = { ...form, grade: parseFloat(form.grade), max_grade: parseFloat(form.max_grade), weight: parseFloat(form.weight) }
    if (grade) { await supabase.from('grades').update(payload).eq('id', grade.id) }
    else { await supabase.from('grades').insert(payload) }
    setLoading(false); onSaved(); onClose()
  }

  const handleDelete = async () => {
    if (!grade || !confirm('¿Eliminar esta nota?')) return
    await supabase.from('grades').delete().eq('id', grade.id)
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border"><h2 className="font-semibold">{grade ? 'Editar nota' : 'Nueva nota'}</h2><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <div className="p-4 space-y-4">
          <div><label className="label">Evaluación *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Parcial 1, Práctica..." /></div>
          <div><label className="label">Asignatura *</label>
            <select className="input" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Selecciona asignatura</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Nota *</label><input type="number" step="0.01" className="input" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="7.5" /></div>
            <div><label className="label">Sobre</label><input type="number" className="input" value={form.max_grade} onChange={e => setForm(f => ({ ...f, max_grade: e.target.value }))} /></div>
            <div><label className="label">Peso</label><input type="number" step="0.1" className="input" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Convocatoria</label>
              <select className="input" value={form.convocatoria} onChange={e => setForm(f => ({ ...f, convocatoria: e.target.value }))}>
                <option value="ordinaria">Ordinaria</option><option value="extraordinaria">Extraordinaria</option>
              </select>
            </div>
            <div><label className="label">Fecha</label><input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div>{grade && <button onClick={handleDelete} className="text-sm text-destructive hover:underline">Eliminar</button>}</div>
          <div className="flex gap-2"><button onClick={onClose} className="btn-secondary text-sm">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary text-sm disabled:opacity-50">{loading ? 'Guardando...' : grade ? 'Guardar' : 'Añadir nota'}</button></div>
        </div>
      </div>
    </div>
  )
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6']

function SubjectForm({ subject, onClose, onSaved }: { subject: Subject | null; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: subject?.name || '', color: subject?.color || COLORS[0], credits: subject?.credits?.toString() || '6' })

  const handleSubmit = async () => {
    if (!form.name) return
    setLoading(true)
    const payload = { ...form, credits: parseFloat(form.credits) }
    if (subject) { await supabase.from('subjects').update(payload).eq('id', subject.id) }
    else { await supabase.from('subjects').insert(payload) }
    setLoading(false); onSaved(); onClose()
  }

  const handleDelete = async () => {
    if (!subject || !confirm('¿Eliminar asignatura y todas sus notas?')) return
    await supabase.from('subjects').delete().eq('id', subject.id)
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border"><h2 className="font-semibold">{subject ? 'Editar asignatura' : 'Nueva asignatura'}</h2><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <div className="p-4 space-y-4">
          <div><label className="label">Nombre *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Matemáticas, Historia..." /></div>
          <div><label className="label">Créditos</label><input type="number" className="input" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} /></div>
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map(c => <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-card' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />)}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div>{subject && <button onClick={handleDelete} className="text-sm text-destructive hover:underline">Eliminar</button>}</div>
          <div className="flex gap-2"><button onClick={onClose} className="btn-secondary text-sm">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary text-sm disabled:opacity-50">{loading ? 'Guardando...' : subject ? 'Guardar' : 'Crear'}</button></div>
        </div>
      </div>
    </div>
  )
}
