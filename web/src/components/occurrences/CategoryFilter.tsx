import { categoryStyle } from '../../lib/categories'
import type { Category } from '../../lib/types'

type CategoryFilterProps = {
  categories: Category[]
  selected: Set<number>
  onChange: (selected: Set<number>) => void
}

export function CategoryFilter({ categories, selected, onChange }: CategoryFilterProps) {
  const allSelected = selected.size === categories.length

  function toggle(id: number) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold tracking-wide uppercase">
        Filtros
      </legend>
      {categories.map((category) => {
        const { color, emoji } = categoryStyle(category.name)
        return (
          <label
            key={category.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-brand-50"
          >
            <input
              type="checkbox"
              checked={selected.has(category.id)}
              onChange={() => toggle(category.id)}
              className="size-4 accent-brand-700"
            />
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-full text-sm"
              style={{ backgroundColor: color }}
            >
              {emoji}
            </span>
            {category.name}
          </label>
        )
      })}
      <button
        type="button"
        onClick={() => onChange(new Set(allSelected ? [] : categories.map((c) => c.id)))}
        className="mt-2 self-start rounded-lg px-2 py-1 text-sm font-medium text-brand-700 underline"
      >
        {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
      </button>
    </fieldset>
  )
}
