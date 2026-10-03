import { useEffect, useState } from 'react'
import { CategoryBars } from '../components/dashboard/CategoryBars'
import { ChartCard, DataTable, LegendItem } from '../components/dashboard/ChartCard'
import { StatTile } from '../components/dashboard/StatTile'
import { WeeklyChart } from '../components/dashboard/WeeklyChart'
import { api } from '../lib/api'
import { formatHours, formatPercent, formatWeek, plural } from '../lib/chart'
import type { PlatformStats } from '../lib/types'

// Painel público de impacto da plataforma (Sprint 10)
export function DashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api<PlatformStats>('/stats')
      .then((data) => active && setStats(data))
      .catch((err: Error) => active && setError(err.message))
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold">Painel de impacto</h1>
        <p className="text-brand-700">O que a comunidade Recicla+ já fez até agora.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {error}
        </p>
      )}
      {!stats && !error && <p className="text-brand-700">Carregando…</p>}

      {stats && (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Ocorrências registradas" value={stats.occurrences.total} />
            <StatTile label="Coletas concluídas" value={stats.occurrences.COLLECTED} />
            <StatTile
              label="Taxa de coleta"
              value={formatPercent(stats.collectionRate)}
              detail="coletadas ÷ não canceladas"
            />
            <StatTile
              label="Tempo médio até a coleta"
              value={formatHours(stats.averageHours.untilCollected)}
              detail={`assumidas em ${formatHours(stats.averageHours.untilClaimed)}, em média`}
            />
          </dl>

          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile size="sm" label="Disponíveis agora" value={stats.occurrences.AVAILABLE} />
            <StatTile size="sm" label="Em coleta" value={stats.occurrences.IN_COLLECTION} />
            <StatTile
              size="sm"
              label="Participantes"
              value={stats.participants.people + stats.participants.companies}
              detail={`${plural(stats.participants.people, 'pessoa', 'pessoas')} · ${plural(stats.participants.companies, 'empresa', 'empresas')}`}
            />
            <StatTile
              size="sm"
              label="Coletores ativos"
              value={stats.participants.collectors}
              detail="concluíram ao menos uma coleta"
            />
          </dl>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Ocorrências por categoria"
              chart={<CategoryBars data={stats.byCategory} />}
              table={
                <DataTable
                  head={['Categoria', 'Registradas', 'Coletadas']}
                  rows={stats.byCategory.map((c) => [c.name, c.total, c.collected])}
                />
              }
            />

            <ChartCard
              title="Atividade nas últimas 8 semanas"
              legend={
                <div className="mb-3 flex gap-4">
                  <LegendItem color="var(--color-series-1)" label="Registradas" />
                  <LegendItem color="var(--color-series-2)" label="Coletadas" />
                </div>
              }
              chart={<WeeklyChart data={stats.weekly} />}
              table={
                <DataTable
                  head={['Semana de', 'Registradas', 'Coletadas']}
                  rows={stats.weekly.map((w) => [
                    formatWeek(w.weekStart),
                    w.registered,
                    w.collected,
                  ])}
                />
              }
            />
          </div>

          <p className="text-xs text-brand-700">
            As quantidades de material são informadas livremente (ex.: “3 sacos”), por isso o painel
            conta ocorrências e coletas, e não quilos.
          </p>
        </>
      )}
    </section>
  )
}
