import { useSyncExternalStore } from 'react'
import { installStore, promptInstall } from '../lib/install'

// Botão "Instalar app": aparece só quando o navegador permite instalar.
// No iPhone/iPad mostra como instalar pelo Safari. Já instalado, não mostra nada.
export function InstallAppButton({ className = '' }: { className?: string }) {
  const { installed, canPrompt, ios } = useSyncExternalStore(
    installStore.subscribe,
    installStore.getSnapshot,
  )

  if (installed) return null

  if (canPrompt) {
    return (
      <button
        type="button"
        onClick={() => void promptInstall()}
        className={`flex items-center justify-center gap-2 rounded-xl border-2 border-brand-700 bg-white px-6 py-3 font-semibold text-brand-900 hover:bg-brand-100 ${className}`}
      >
        <span aria-hidden="true">📲</span> Instalar app
      </button>
    )
  }

  if (ios) {
    return (
      <p className={`rounded-xl bg-white px-4 py-3 text-sm text-brand-700 ${className}`}>
        <span aria-hidden="true">📲 </span>
        Para instalar no iPhone: no Safari, toque em <strong>Compartilhar</strong> e depois em{' '}
        <strong>Adicionar à Tela de Início</strong>.
      </p>
    )
  }

  return null
}
