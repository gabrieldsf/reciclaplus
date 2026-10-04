import { categoryStyle } from '../../lib/categories'

// Miniatura de cartões (Coletar, Histórico): a foto do material, com o ícone da categoria
// no canto; sem foto, só o ícone da categoria
export function OccurrenceThumb({
  categoryName,
  photoUrl,
}: {
  categoryName: string
  photoUrl: string | null
}) {
  const { emoji, color } = categoryStyle(categoryName)

  if (!photoUrl) {
    return (
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: color }}
      >
        {emoji}
      </span>
    )
  }
  return (
    <span className="relative shrink-0">
      <img
        src={photoUrl}
        alt={`Foto do material: ${categoryName}`}
        loading="lazy"
        className="size-16 rounded-lg object-cover ring-1 ring-brand-100"
      />
      <span
        aria-hidden="true"
        className="absolute -right-1.5 -bottom-1.5 grid size-6 place-items-center rounded-full text-xs ring-2 ring-white"
        style={{ backgroundColor: color }}
      >
        {emoji}
      </span>
    </span>
  )
}
