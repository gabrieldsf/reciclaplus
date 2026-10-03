import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Em desenvolvimento (e no preview), /api é encaminhado para o backend local.
// API_URL permite apontar para outra API (ex.: a pilha isolada dos testes E2E).
const proxy = { '/api': process.env['API_URL'] ?? 'http://localhost:3333' }

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA enxuto: instalável (tela inicial, tela cheia, ícone) e com os arquivos do
    // app em cache para abrir rápido. Sem modo offline para dados: a API e os
    // mapas do OpenStreetMap sempre vêm da rede.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Recicla+',
        short_name: 'Recicla+',
        description: 'Encontre, compartilhe e colete materiais recicláveis perto de você.',
        lang: 'pt-BR',
        start_url: '/mapa',
        scope: '/',
        display: 'standalone',
        theme_color: '#1b4332',
        background_color: '#edf7ef',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Rotas do React (ex.: /mapa) abrem o index.html; a API nunca
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: { proxy },
  preview: { proxy },
})
