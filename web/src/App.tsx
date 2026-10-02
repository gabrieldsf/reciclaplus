import { useEffect, useState } from 'react'

type ApiStatus = 'checking' | 'online' | 'offline'

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => setApiStatus(res.ok ? 'online' : 'offline'))
      .catch(() => setApiStatus('offline'))
  }, [])

  return (
    <div className="flex min-h-dvh flex-col bg-brand-50 text-brand-900">
      <header className="flex items-center justify-between px-4 py-3 md:px-8">
        <span className="text-xl font-bold">♻ Recicla+</span>
        <button type="button" className="rounded-lg px-3 py-2 font-medium hover:bg-brand-100">
          Entrar
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
          Encontre. Compartilhe.
          <br />
          Recicle.
        </h1>
        <p className="max-w-md text-lg text-brand-700">
          Conectando materiais recicláveis a quem pode coletá-los.
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            className="rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-900"
          >
            Explorar mapa
          </button>
          <button
            type="button"
            className="rounded-xl border-2 border-brand-700 px-6 py-3 font-semibold hover:bg-brand-100"
          >
            Criar conta
          </button>
        </div>
      </main>

      <footer className="px-4 py-3 text-center text-xs text-brand-700">
        API: {apiStatus === 'checking' ? 'verificando…' : apiStatus}
      </footer>
    </div>
  )
}

export default App
