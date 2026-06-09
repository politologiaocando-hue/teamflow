import { AuthProvider, useAuth } from './AuthContext'
import AuthPage from './AuthPage'
import AppPage  from './AppPage'

function Gate() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#888', fontSize: 14 }}>
      Cargando TeamFlow…
    </div>
  )
  return user ? <AppPage /> : <AuthPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
