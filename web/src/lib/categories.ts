// Identidade visual de cada categoria no mapa e nas listas

type CategoryStyle = { color: string; emoji: string }

const styles: Record<string, CategoryStyle> = {
  'Papel / Papelão': { color: '#2563eb', emoji: '📦' },
  Plástico: { color: '#dc2626', emoji: '🧴' },
  Metal: { color: '#ca8a04', emoji: '🥫' },
  Vidro: { color: '#16a34a', emoji: '🍾' },
  Eletrônicos: { color: '#7c3aed', emoji: '💻' },
}

const fallback: CategoryStyle = { color: '#57534e', emoji: '♻️' }

export function categoryStyle(categoryName: string) {
  return styles[categoryName] ?? fallback
}
