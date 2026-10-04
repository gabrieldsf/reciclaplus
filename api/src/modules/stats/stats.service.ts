import { prisma } from '../../lib/prisma.js'

// Semanas são contadas no fuso de Brasília, começando na segunda-feira
const TIME_ZONE = 'America/Sao_Paulo'
const WEEKS = 8

type TimeRow = { avg_claim_hours: number | null; avg_collect_hours: number | null }
type WeekRow = { week: Date; registered: number; collected: number }

const round1 = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10)

// Indicadores públicos da plataforma (Sprint 10 — painel de impacto)
export async function getPlatformStats() {
  const [statusGroups, categoryGroups, categories, userGroups, collectors, times, weeks] =
    await Promise.all([
      prisma.occurrence.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.occurrence.groupBy({ by: ['categoryId', 'status'], _count: { _all: true } }),
      prisma.category.findMany({
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true },
      }),
      prisma.user.groupBy({
        by: ['userType'],
        where: { userType: { not: 'ADMIN' } },
        _count: { _all: true },
      }),
      prisma.collection.findMany({
        where: { completedAt: { not: null } },
        distinct: ['collectorId'],
        select: { collectorId: true },
      }),
      // Tempo médio entre o registro e: a coleta ser assumida / o material ser coletado
      prisma.$queryRaw<TimeRow[]>`
        SELECT
          AVG(EXTRACT(EPOCH FROM (c.accepted_at - o.created_at)) / 3600)::float AS avg_claim_hours,
          AVG(EXTRACT(EPOCH FROM (c.completed_at - o.created_at)) / 3600)
            FILTER (WHERE c.completed_at IS NOT NULL)::float AS avg_collect_hours
        FROM collections c
        JOIN occurrences o ON o.id = c.occurrence_id`,
      // Atividade semanal: ocorrências registradas e coletas concluídas por semana
      prisma.$queryRaw<WeekRow[]>`
        WITH weeks AS (
          SELECT generate_series(
            date_trunc('week', now() AT TIME ZONE ${TIME_ZONE}) - make_interval(weeks => ${WEEKS - 1}),
            date_trunc('week', now() AT TIME ZONE ${TIME_ZONE}),
            interval '1 week'
          ) AS week
        )
        SELECT
          w.week::date AS week,
          (SELECT COUNT(*) FROM occurrences o
            WHERE date_trunc('week', o.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${TIME_ZONE}) = w.week
          )::int AS registered,
          (SELECT COUNT(*) FROM collections c
            WHERE c.completed_at IS NOT NULL
              AND date_trunc('week', c.completed_at AT TIME ZONE 'UTC' AT TIME ZONE ${TIME_ZONE}) = w.week
          )::int AS collected
        FROM weeks w
        ORDER BY w.week`,
    ])

  const byStatus = { AVAILABLE: 0, IN_COLLECTION: 0, COLLECTED: 0, CANCELLED: 0 }
  for (const group of statusGroups) byStatus[group.status] = group._count._all
  const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0)

  // Taxa de coleta: das ocorrências não canceladas, quantas já foram coletadas
  const valid = total - byStatus.CANCELLED
  const collectionRate = valid > 0 ? byStatus.COLLECTED / valid : null

  const byCategory = categories.map((category) => {
    const groups = categoryGroups.filter((g) => g.categoryId === category.id)
    const count = (status?: string) =>
      groups
        .filter((g) => status === undefined || g.status === status)
        .reduce((sum, g) => sum + g._count._all, 0)
    return { id: category.id, name: category.name, total: count(), collected: count('COLLECTED') }
  })

  const usersByType = { PERSON: 0, COMPANY: 0 }
  for (const group of userGroups) {
    if (group.userType !== 'ADMIN') usersByType[group.userType] = group._count._all
  }

  return {
    occurrences: { total, ...byStatus },
    collectionRate,
    averageHours: {
      untilClaimed: round1(times[0]?.avg_claim_hours ?? null),
      untilCollected: round1(times[0]?.avg_collect_hours ?? null),
    },
    participants: {
      people: usersByType.PERSON,
      companies: usersByType.COMPANY,
      collectors: collectors.length,
    },
    byCategory,
    weekly: weeks.map((w) => ({
      weekStart: w.week.toISOString().slice(0, 10),
      registered: w.registered,
      collected: w.collected,
    })),
  }
}
