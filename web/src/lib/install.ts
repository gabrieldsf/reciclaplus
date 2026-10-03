// Instalação do PWA ("Adicionar à tela inicial").
//
// O navegador dispara `beforeinstallprompt` quando o app pode ser instalado, às vezes
// antes de qualquer componente montar; por isso o evento é capturado aqui, assim que
// este módulo é importado (em main.tsx), e guardado para o botão "Instalar app".

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState = {
  // Já está aberto como app instalado (tela cheia, sem barra do navegador)
  installed: boolean
  // O navegador permite instalar por um botão nosso (Chrome, Edge, Android)
  canPrompt: boolean
  // iPhone/iPad: só dá para instalar pelo menu Compartilhar do Safari
  ios: boolean
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS se apresenta como Mac, mas tem tela touch
  (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)

let state: InstallState = { installed: isStandalone(), canPrompt: false, ios: isIOS() }

function update(patch: Partial<InstallState>) {
  state = { ...state, ...patch }
  listeners.forEach((notify) => notify())
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault() // segura o aviso do navegador para usarmos nosso botão
  deferredPrompt = event as BeforeInstallPromptEvent
  update({ canPrompt: true })
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  update({ installed: true, canPrompt: false })
})

export const installStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => state,
}

// Abre a janela de instalação do navegador. Só pode ser usada uma vez por evento.
export async function promptInstall() {
  if (!deferredPrompt) return false
  const prompt = deferredPrompt
  deferredPrompt = null
  update({ canPrompt: false })
  await prompt.prompt()
  const { outcome } = await prompt.userChoice
  return outcome === 'accepted'
}
