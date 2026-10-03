import { useId, useState } from 'react'
import type { ReactNode } from 'react'

// Moldura dos gráficos: título, legenda opcional e alternância gráfico ↔ tabela
export function ChartCard({
  title,
  legend,
  chart,
  table,
}: {
  title: string
  legend?: ReactNode
  chart: ReactNode
  table: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="rounded-lg px-2 py-1 text-sm font-medium text-brand-700 underline hover:bg-brand-50"
        >
          {showTable ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>
      {!showTable && legend}
      {showTable ? table : chart}
    </section>
  )
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-brand-900">
      <span aria-hidden="true" className="size-3 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm tabular-nums">
        <thead>
          <tr className="border-b border-brand-100 text-brand-700">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`py-2 font-medium ${i > 0 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])} className="border-b border-brand-50">
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="py-2 font-normal">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className="py-2 text-right">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
