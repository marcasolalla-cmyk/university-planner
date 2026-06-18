export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'alta': return 'text-red-400 bg-red-400/10'
    case 'media': return 'text-yellow-400 bg-yellow-400/10'
    case 'baja': return 'text-green-400 bg-green-400/10'
    default: return 'text-gray-400 bg-gray-400/10'
  }
}

export function getEventTypeColor(type: string): string {
  switch (type) {
    case 'examen': return 'bg-red-500'
    case 'entrega': return 'bg-orange-500'
    case 'clase': return 'bg-blue-500'
    case 'personal': return 'bg-purple-500'
    default: return 'bg-gray-500'
  }
}

export function getEventTypeLabel(type: string): string {
  switch (type) {
    case 'examen': return 'Examen'
    case 'entrega': return 'Entrega'
    case 'clase': return 'Clase'
    case 'personal': return 'Personal'
    default: return type
  }
}

export function getEventTypeColorHex(type: string): string {
  switch (type) {
    case 'examen': return '#ef4444'
    case 'entrega': return '#f97316'
    case 'clase': return '#3b82f6'
    case 'personal': return '#a855f7'
    default: return '#6b7280'
  }
}
