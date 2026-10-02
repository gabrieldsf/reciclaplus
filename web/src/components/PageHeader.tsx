import { useNavigate } from 'react-router'

// Título de página com botão "voltar" (wireframe 6.4)
export function PageHeader({ title }: { title: string }) {
  const navigate = useNavigate()

  return (
    <div className="mb-6 flex items-center gap-2">
      <button
        type="button"
        // Sem histórico dentro do app (ex.: link aberto direto), volta para o mapa
        onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/mapa'))}
        aria-label="Voltar"
        className="grid size-10 place-items-center rounded-full text-xl hover:bg-brand-100"
      >
        ←
      </button>
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  )
}
