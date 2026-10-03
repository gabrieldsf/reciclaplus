import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Importado cedo para não perder o evento de instalação do PWA
import './lib/install'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
