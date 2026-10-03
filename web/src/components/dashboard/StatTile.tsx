import type { ReactNode } from 'react'

export function StatTile({
  label,
  value,
  detail,
  size = 'lg',
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  size?: 'lg' | 'sm'
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white p-4 shadow-sm">
      <dt className="text-sm text-brand-700">{label}</dt>
      <dd
        className={`font-extrabold tabular-nums ${size === 'lg' ? 'text-3xl md:text-4xl' : 'text-2xl'}`}
      >
        {value}
      </dd>
      {detail && <dd className="text-xs text-brand-700">{detail}</dd>}
    </div>
  )
}
