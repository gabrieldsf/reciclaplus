import { useState } from 'react'
import { formatWeek, niceMax } from '../../lib/chart'
import type { WeekStat } from '../../lib/types'

const PLOT_HEIGHT = 160

// Barras agrupadas por semana: registradas (série 1) e coletadas (série 2)
export function WeeklyChart({ data }: { data: WeekStat[] }) {
  const [active, setActive] = useState<string | null>(null)
  const top = niceMax(Math.max(...data.map((w) => Math.max(w.registered, w.collected))))
  const ticks = [top, top / 2, 0]
  const barHeight = (value: number) => (value / top) * PLOT_HEIGHT

  return (
    <div className="flex gap-2">
      {/* Eixo Y discreto */}
      <div
        aria-hidden="true"
        className="flex flex-col justify-between text-right text-xs text-brand-700 tabular-nums"
        style={{ height: PLOT_HEIGHT }}
      >
        {ticks.map((t) => (
          <span key={t} className="-translate-y-1/2 leading-none last:translate-y-0">
            {t}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: PLOT_HEIGHT }}>
          {/* Grade recessiva */}
          {ticks.map((t) => (
            <span
              key={t}
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-brand-100"
              style={{ bottom: (t / top) * PLOT_HEIGHT }}
            />
          ))}

          <ul className="absolute inset-0 grid grid-cols-8">
            {data.map((w) => {
              const isActive = active === w.weekStart
              return (
                <li
                  key={w.weekStart}
                  tabIndex={0}
                  onMouseEnter={() => setActive(w.weekStart)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(w.weekStart)}
                  onBlur={() => setActive(null)}
                  aria-label={`Semana de ${formatWeek(w.weekStart)}: ${w.registered} registradas, ${w.collected} coletadas`}
                  className={`relative flex items-end justify-center gap-0.5 rounded-t outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${isActive ? 'bg-brand-50' : ''}`}
                >
                  <span
                    className="w-[30%] max-w-4 rounded-t bg-series-1"
                    style={{ height: barHeight(w.registered) }}
                  />
                  <span
                    className="w-[30%] max-w-4 rounded-t bg-series-2"
                    style={{ height: barHeight(w.collected) }}
                  />
                  {isActive && (
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg bg-brand-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
                    >
                      <strong className="block">Semana de {formatWeek(w.weekStart)}</strong>
                      {w.registered} registradas · {w.collected} coletadas
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div
          aria-hidden="true"
          className="mt-1 grid grid-cols-8 text-center text-[11px] text-brand-700"
        >
          {data.map((w) => (
            <span key={w.weekStart}>{formatWeek(w.weekStart)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
