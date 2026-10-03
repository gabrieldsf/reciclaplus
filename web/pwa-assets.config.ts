import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Gera os ícones do PWA a partir de public/logo.svg: npm run icons -w @reciclaplus/web
const brand = '#2d6a4f'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Ícones "maskable" (Android) e Apple são recortados/sem transparência: fundo na cor da marca
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: brand } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: brand } },
  },
  images: ['public/logo.svg'],
})
