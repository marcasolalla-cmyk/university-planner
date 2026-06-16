export type EventType = 'examen' | 'entrega' | 'clase' | 'personal'
export type Priority = 'alta' | 'media' | 'baja'

export interface Subject {
  id: string
  user_id: string
  name: string
  color: string
  credits: number
  created_at: string
}

export interface Event {
  id: string
  user_id: string
  subject_id?: string
  title: string
  description?: string
  type: EventType
  start_time: string
  end_time: string
  location?: string
  priority: Priority
  is_recurring: boolean
  recurrence_rule?: string
  notification_enabled: boolean
  notification_minutes: number
  subject?: Subject
}

export interface Task {
  id: string
  user_id: string
  subject_id?: string
  event_id?: string
  title: string
  description?: string
  priority: Priority
  due_date?: string
  completed: boolean
  completed_at?: string
  subject?: Subject
  subtasks?: Subtask[]
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
}

export interface Grade {
  id: string
  user_id: string
  subject_id: string
  name: string
  grade: number
  max_grade: number
  weight: number
  convocatoria: string
  date?: string
  subject?: Subject
}

export interface PomodoroSession {
  id: string
  user_id: string
  subject_id?: string
  duration_minutes: number
  completed: boolean
  date: string
  subject?: Subject
}

export interface UserPreferences {
  id: string
  user_id: string
  theme: string
  language: string
  preferences: Record<string, unknown>
}
