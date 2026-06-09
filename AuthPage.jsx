import { useState } from 'react'
import { useAuth } from './AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [name, setName]       = useState('')
  const [role, setRole]       = useState('engineer')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const inputStyle = {
    width: '100%', padding: '9px 12px', fontSize: 14, border: '0.5px solid #ddd',
    borderRadius: 8, background: '#fafafa', color: '#111', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      const { error } = await signUp(email, password, name, role)
      if (error) setError(error.message)
      else setDone(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f9', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 14, border: '0.5px solid #e0e0e0', padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>⬡</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>TeamFlow</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
            {mode === 'login' ? 'Inicia sesión en tu equipo' : 'Crea tu cuenta'}
          </p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', color: '#3B6D11', background: '#EAF3DE', borderRadius: 8, padding: '16px 12px', fontSize: 14 }}>
            ¡Cuenta creada! Revisa tu correo para confirmar y luego inicia sesión.
            <br />
            <button onClick={() => { setMode('login'); setDone(false) }} style={{ marginTop: 12, color: '#3C3489', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
              Ir al login →
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {mode === 'register' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Nombre completo</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Ana Martínez" required />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Correo electrónico</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" required />
            </div>
            <div style={{ marginBottom: mode === 'register' ? 14 : 20 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Contraseña</label>
              <input style={inputStyle} type="password" value={password} onChange={e => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>
            {mode === 'register' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Rol en el equipo</label>
                <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, background: '#fafafa' }}>
                  <option value="leader">Líder</option>
                  <option value="engineer">Ingeniero</option>
                </select>
              </div>
            )}
            {error && (
              <div style={{ background: '#FCEBEB', color: '#A32D2D', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '10px 0', background: '#3C3489', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
              cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
            }}>
              {loading ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
        )}

        {!done && (
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#888' }}>
            {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            {' '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ color: '#3C3489', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
