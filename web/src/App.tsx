import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/AppLayout'
import { CreateOccurrencePage } from './pages/CreateOccurrencePage'
import { DashboardPage } from './pages/DashboardPage'
import { EditOccurrencePage } from './pages/EditOccurrencePage'
import { HistoryPage } from './pages/HistoryPage'
import { LandingPage } from './pages/LandingPage'
import { ListPage } from './pages/ListPage'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import { OccurrenceDetailPage } from './pages/OccurrenceDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />

          <Route element={<AppLayout />}>
            {/* O mapa é público; criar ocorrência e coletar exigem login */}
            <Route path="/mapa" element={<MapPage />} />
            <Route path="/painel" element={<DashboardPage />} />
            <Route path="/lista" element={<ListPage />} />
            <Route path="/ocorrencias/:id" element={<OccurrenceDetailPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/informar" element={<CreateOccurrencePage />} />
              <Route path="/ocorrencias/:id/editar" element={<EditOccurrencePage />} />
              <Route path="/historico" element={<HistoryPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
