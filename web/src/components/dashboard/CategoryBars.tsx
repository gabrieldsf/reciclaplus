import { useState } from 'react'
import { categoryStyle } from '../../lib/categories'
import { formatPercent } from '../../lib/chart'
import type { CategoryStat } from '../../lib/types'

// Barras horizontais (uma série): ocorrências registradas por categoria
export function CategoryBars({ data }: { data: CategoryStat[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.total))

  return (
    <ul className="flex flex-col gap-1">
      {data.map((d) => {
        const { emoji } = categoryStyle(d.name)
        const width = (d.total / max) * 100
        const isActive = active === d.id
        return (
          <li
            key={d.id}
            // Linha inteira é a área de hover/foco (maior que a barra)
            tabIndex={0}
            onMouseEnter={() => setActive(d.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(d.id)}
            onBlur={() => setActive(null)}
            aria-label={`${d.name}: ${d.total} registradas, ${d.collected} coletadas`}
            className={`relative grid grid-cols-[7.5rem_1fr] items-center gap-3 rounded-lg px-1 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:grid-cols-[9rem_1fr] ${isActive ? 'bg-brand-50' : ''}`}
          >
            <span className="truncate text-sm">
              <span aria-hidden="true">{emoji} </span>
              {d.name}
            </span>
            <span className="flex items-center gap-2">
              <span
                className="h-5 rounded-r bg-series-1"
                style={{ width: `${width}%`, minWidth: d.total > 0 ? 4 : 0 }}
              />
              <span className="text-sm font-semibold tabular-nums">{d.total}</span>
            </span>
            {isActive && (
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full right-0 z-10 mt-1 rounded-lg bg-brand-900 px-3 py-2 text-xs text-white shadow-lg"
              >
                <strong className="block">{d.name}</strong>
                {d.total} registradas · {d.collected} coletadas
                {d.total > 0 && ` (${formatPercent(d.collected / d.total)})`}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
