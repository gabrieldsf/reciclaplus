import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/AppLayout'
import { NotificationsProvider } from './notifications/NotificationsContext'
import { CreateOccurrencePage } from './pages/CreateOccurrencePage'
import { DashboardPage } from './pages/DashboardPage'
import { EditOccurrencePage } from './pages/EditOccurrencePage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HistoryPage } from './pages/HistoryPage'
import { LandingPage } from './pages/LandingPage'
import { CollectPage } from './pages/CollectPage'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { OccurrenceDetailPage } from './pages/OccurrenceDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/confirmar-email" element={<VerifyEmailPage />} />
            </Route>

            <Route element={<AppLayout />}>
              {/* O mapa é público; criar ocorrência e coletar exigem login */}
              <Route path="/mapa" element={<MapPage />} />
              <Route path="/painel" element={<DashboardPage />} />
              <Route path="/coletar" element={<CollectPage />} />
              <Route path="/lista" element={<Navigate to="/coletar" replace />} />
              <Route path="/ocorrencias/:id" element={<OccurrenceDetailPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/informar" element={<CreateOccurrencePage />} />
                <Route path="/ocorrencias/:id/editar" element={<EditOccurrencePage />} />
                <Route path="/historico" element={<HistoryPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
                <Route path="/notificacoes" element={<NotificationsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
