import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json()

    const systemPrompt = `Eres un asistente académico personal llamado UniBot. Hablas siempre en español y tienes acceso a los datos académicos del estudiante.

DATOS ACTUALES DEL ESTUDIANTE:
- Nombre: ${context.user?.user_metadata?.full_name || context.user?.email || 'Estudiante'}
- Fecha y hora actual: ${new Date().toLocaleString('es-ES')}

PRÓXIMOS EVENTOS (${context.events?.length || 0}):
${context.events?.slice(0, 10).map((e: { title: string; type: string; start_time: string; location?: string }) => `- ${e.title} (${e.type}) el ${new Date(e.start_time).toLocaleString('es-ES')}${e.location ? ` en ${e.location}` : ''}`).join('\n') || 'Sin eventos próximos'}

TAREAS PENDIENTES (${context.tasks?.length || 0}):
${context.tasks?.slice(0, 10).map((t: { title: string; priority: string; due_date?: string; subject?: { name: string } }) => `- ${t.title} [${t.priority}]${t.due_date ? ` - vence ${new Date(t.due_date).toLocaleString('es-ES')}` : ''}${t.subject ? ` (${t.subject.name})` : ''}`).join('\n') || 'Sin tareas pendientes'}

ASIGNATURAS:
${context.subjects?.map((s: { name: string; credits: number }) => `- ${s.name} (${s.credits} créditos)`).join('\n') || 'Sin asignaturas'}

NOTAS RECIENTES:
${context.grades?.slice(0, 10).map((g: { name: string; grade: number; max_grade: number; subject?: { name: string } }) => `- ${g.name}: ${g.grade}/${g.max_grade} ${g.subject ? `(${g.subject.name})` : ''}`).join('\n') || 'Sin notas registradas'}

INSTRUCCIONES:
- Responde siempre en español, de forma amigable y concisa
- Cuando el estudiante pregunte por fechas relativas, calcula la fecha real basándote en la fecha actual
- Si detectas que tiene un examen próximo sin sesiones de estudio, avísale
- Da sugerencias útiles basadas en los datos disponibles
- Sé directo y práctico`

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        reply: 'El asistente de IA no está configurado aún. Añade tu clave de Anthropic en las variables de entorno para activarlo.'
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
          .filter((m: { role: string }) => m.role !== 'system')
          .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      }),
    })

    const data = await response.json()
    const reply = data.content?.[0]?.text || 'No pude generar una respuesta.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json({ reply: 'Hubo un error al procesar tu solicitud.' }, { status: 500 })
  }
}
