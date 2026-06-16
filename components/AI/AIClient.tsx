'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, User, Sparkles, Loader2 } from 'lucide-react'
import type { Event, Task, Subject, Grade } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface Message { role: 'user' | 'assistant'; content: string }

interface Context {
  events: Event[]
  tasks: Task[]
  subjects: Subject[]
  grades: Grade[]
  user: SupabaseUser
}

const SUGGESTIONS = [
  '¿Qué tengo pendiente esta semana?',
  '¿Cuándo es mi próximo examen?',
  'Resume mis notas actuales',
  '¿Qué tareas son más urgentes?',
  'Ayúdame a planificar mi semana',
]

export default function AIClient({ context }: { context: Context }) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: '¡Hola! Soy tu asistente académico 🎓 Tengo acceso a tu calendario, tareas, notas y sesiones de estudio. ¿En qué puedo ayudarte?' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMessages, context }) })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Lo siento, hubo un error.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error de conexión.' }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <div className="p-4 border-b border-border flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center"><Sparkles className="w-5 h-5 text-primary" /></div>
        <div><h1 className="font-semibold text-foreground">Asistente IA</h1><p className="text-xs text-muted-foreground">Acceso a tu calendario, tareas y notas</p></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-primary/15' : 'bg-secondary'}`}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'assistant' ? 'bg-card border border-border text-foreground' : 'bg-primary text-white'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-primary" /></div>
            <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2"><Loader2 className="w-4 h-4 text-primary animate-spin" /><span className="text-sm text-muted-foreground">Pensando...</span></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s, i) => <button key={i} onClick={() => send(s)} className="text-xs bg-secondary hover:bg-accent text-foreground px-3 py-1.5 rounded-full transition-colors border border-border">{s}</button>)}
        </div>
      )}

      <div className="p-4 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input className="input flex-1" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="Escribe tu pregunta..." disabled={loading} />
          <button onClick={() => send()} disabled={!input.trim() || loading} className="btn-primary px-3 disabled:opacity-50"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}
