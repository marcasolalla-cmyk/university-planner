'use client'

import { useState } from 'react'

const ASIGNATURAS = ['Inglés', 'Literatura', 'Física', 'Matemáticas', 'Química', 'Filosofía']

export default function NotaCorteClient() {
  const [notas, setNotas] = useState<number[]>([4, 4, 4, 4, 4, 4])
  const [ponderadas, setPonderadas] = useState<number[]>([])

  const togglePonderada = (i: number) => {
    if (ponderadas.includes(i)) {
      setPonderadas(ponderadas.filter(p => p !== i))
    } else if (ponderadas.length < 2) {
      setPonderadas([...ponderadas, i])
    }
  }

  const notasMas3 = notas.map(n => n + 3)
  const media = notasMas3.reduce((a, b) => a + b, 0) / notasMas3.length
  const ponderacion = ponderadas.reduce((acc, i) => acc + notasMas3[i] * 0.2, 0)
  const notaCorte = Math.min(14, media + ponderacion)

  const getColor = (nota: number) => {
    if (nota >= 12) return 'text-green-400'
    if (nota >= 10) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nota de corte IB</h1>
        <p className="text-muted-foreground text-sm mt-1">Selecciona 2 asignaturas para ponderar</p>
      </div>

      <div className="space-y-5">
        {ASIGNATURAS.map((asig, i) => (
          <div key={i} className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => togglePonderada(i)}
                  className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors text-xs font-bold ${ponderadas.includes(i) ? 'bg-primary border-primary text-white' : 'border-border hover:border-primary'}`}
                >
                  {ponderadas.includes(i) && 'P'}
                </button>
                <span className="font-medium text-foreground">{asig}</span>
                {ponderadas.includes(i) && (
                  <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">×0.2</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-foreground">{notas[i]}</span>
                <span className="text-muted-foreground text-sm"> → {notasMas3[i]}</span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={7}
              step={1}
              value={notas[i]}
              onChange={e => setNotas(prev => { const n = [...prev]; n[i] = parseInt(e.target.value); return n })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {[1,2,3,4,5,6,7].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>
        ))}
      </div>

      <div className="card bg-primary/10 border-primary/20 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Nota de corte calculada</p>
        <p className={`text-6xl font-bold ${getColor(notaCorte)}`}>{notaCorte.toFixed(3)}</p>
        <div className="flex justify-center gap-6 text-xs text-muted-foreground mt-2">
          <span>Media: {media.toFixed(3)}</span>
          <span>Ponderación: +{ponderacion.toFixed(3)}</span>
        </div>
        {ponderadas.length < 2 && (
          <p className="text-xs text-yellow-400">Selecciona {2 - ponderadas.length} asignatura{2 - ponderadas.length > 1 ? 's' : ''} más para ponderar</p>
        )}
      </div>
    </div>
  )
}
