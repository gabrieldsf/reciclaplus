import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { categoryStyle } from '../../lib/categories'
import { distanceKm, formatDistance } from '../../lib/geo'
import { formatLeft } from '../../lib/route'
import type { LatLng, MyCollection } from '../../lib/types'
import { NavigationButtons } from '../occurrences/NavigationButtons'

// Mesmo limite da API (MAX_ACTIVE_COLLECTIONS)
const MAX_ACTIVE = 3

type Props = {
  collections: MyCollection[]
  selected: MyCollection
  onSelect: (id: string) => void
  position: LatLng | null
  leftMeters: number | null
}

function title(c: MyCollection) {
  const { emoji } = categoryStyle(c.occurrence.category.name)
  return `${emoji} ${c.occurrence.category.name}`
}

// Aviso no topo do mapa: coletas em andamento + qual a rota está seguindo.
// Tocar abre o painel para trocar de coleta e abrir o GPS.
export function ActiveCollections({
  collections,
  selected,
  onSelect,
  position,
  leftMeters,
}: Props) {
  const [open, setOpen] = useState(false)
  const many = collections.length > 1

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="pointer-events-auto flex max-w-full flex-col items-center rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-1.5 text-center text-amber-950 shadow-md"
      >
        <span className="text-sm font-bold">
          <span aria-hidden="true">🚚 </span>
          {many ? `${collections.length} coletas em andamento` : 'Coleta em andamento'}
        </span>
        <span className="text-xs">
          Rota até {title(selected)}
          {leftMeters !== null && ` · ${formatLeft(leftMeters).replace('Faltam ', '')}`}
          {many && (
            <span>
              {' · '}
              <span className="font-semibold underline">trocar</span>
            </span>
          )}
          <span aria-hidden="true"> ▾</span>
        </span>
      </button>

      {/* Portal no <body>: fora da camada do mapa (que deixa os toques passarem) */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[2000] flex items-end bg-black/40 md:items-center md:justify-center"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="active-collections-title"
              className="flex max-h-[85dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:max-w-md md:rounded-2xl"
            >
              <div>
                <h2 id="active-collections-title" className="text-lg font-bold">
                  Coletas em andamento ({collections.length}/{MAX_ACTIVE})
                </h2>
                <p className="text-sm text-brand-700">
                  Escolha para qual coleta mostrar o caminho. Você pode ter até {MAX_ACTIVE} coletas
                  ao mesmo tempo.
                </p>
              </div>

              <ul className="flex flex-col gap-2">
                {collections.map((c) => {
                  const { emoji, color } = categoryStyle(c.occurrence.category.name)
                  const isSelected = c.id === selected.id
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          onSelect(c.id)
                          setOpen(false)
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left ${isSelected ? 'border-amber-400 bg-amber-50' : 'border-brand-100 hover:bg-brand-50'}`}
                      >
                        <span
                          aria-hidden="true"
                          className="grid size-10 shrink-0 place-items-center rounded-full"
                          style={{ backgroundColor: color }}
                        >
                          {emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">
                            {c.occurrence.category.name}
                            {c.occurrence.subcategory && ` · ${c.occurrence.subcategory.name}`}
                          </span>
                          <span className="block text-xs text-brand-700">
                            {[
                              c.occurrence.estimatedQuantity,
                              position &&
                                `a ${formatDistance(distanceKm(position, c.occurrence))} de você`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                        {isSelected && (
                          <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950">
                            Rota
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="flex flex-col gap-2 border-t border-brand-100 pt-3">
                <p className="text-sm font-semibold">Ir até {title(selected)}</p>
                <NavigationButtons destination={selected.occurrence} />
                <Link
                  to={`/ocorrencias/${selected.occurrence.id}`}
                  className="text-center text-sm font-semibold text-brand-700 underline"
                >
                  Ver detalhes e finalizar a coleta
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white"
              >
                Fechar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
