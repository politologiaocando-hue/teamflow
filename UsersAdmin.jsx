import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Avatar, Btn } from './UI'

const ROLES = [
  { value: 'manager',  label: '🏢 Gerente' },
  { value: 'leader',   label: '👤 Líder' },
  { value: 'engineer', label: '⚙️ Ingeniero' },
]

export default function UsersAdmin() {
  const { profile: me } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [editing, setEditing]   = useState(null)
  const [name, setName]         = useState('')
  const [role, setRole]         = useState('engineer')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('role').order('full_name')
    setProfiles(data || [])
  }
  useEffect(() => { load() }, [])

  function startEdit(p) {
    setEditing(p.id)
    setName(p.full_name)
    setRole(p.role)
    setMsg('')
  }

  async function saveEdit(p) {
    if (!name.trim()) return
    setSaving(true)
    const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)
    await supabase.from('profiles').update({ full_name: name.trim(), initials, role }).eq('id', p.id)
    setEditing(null)
    setMsg('Usuario actualizado ✓')
    setSaving(false)
    load()
  }

  async function deleteUser(p) {
    if (!confirm(`¿Eliminar a ${p.full_name}? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    await supabase.from('profiles').delete().eq('id', p.id)
    setMsg(`Usuario ${p.full_name} eliminado`)
    setSaving(false)
    load()
  }

  const canAdmin = me?.role === 'manager' || me?.role === 'leader'
  if (!canAdmin) return (
    <div style={{ textAlign: 'center', color: '#888', padding: 40, fontSize: 14 }}>
      Solo los líderes y gerentes pueden administrar usuarios.
    </div>
  )

  const managers  = profiles.filter(p => p.role === 'manager')
  const leaders   = profiles.filter(p => p.role === 'leader')
  const engineers = profiles.filter(p => p.role === 'engineer')

  const inp = { fontSize: 13, padding: '4px 8px', border: '0.5px solid #3C3489', borderRadius: 6, fontFamily: 'inherit' }

  const Row = ({ p }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', borderRadius: 8, border: '0.5px solid #eee', marginBottom: 8 }}>
      <Avatar profile={{ ...p, role: editing === p.id ? role : p.role }} size={32} />
      <div style={{ flex: 1 }}>
        {editing === p.id ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveEdit(p)}
              autoFocus
              placeholder="Nombre"
              style={{ ...inp, width: 180 }}
            />
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 500 }}>{p.full_name}</div>
        )}
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
          {p.email} · {editing === p.id
            ? ROLES.find(r => r.value === role)?.label
            : ROLES.find(r => r.value === p.role)?.label || p.role}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {editing === p.id ? (
          <>
            <Btn primary small onClick={() => saveEdit(p)} disabled={saving}>Guardar</Btn>
            <Btn small onClick={() => setEditing(null)}>Cancelar</Btn>
          </>
        ) : (
          <>
            <Btn small onClick={() => startEdit(p)}>✏️ Editar</Btn>
            {p.id !== me.id && (
              <Btn danger small onClick={() => deleteUser(p)} disabled={saving}>Eliminar</Btn>
            )}
          </>
        )}
      </div>
    </div>
  )

  const Section = ({ title, list }) => list.length === 0 ? null : (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
        {title} ({list.length})
      </div>
      {list.map(p => <Row key={p.id} p={p} />)}
    </div>
  )

  return (
    <div>
      {msg && (
        <div style={{ background: '#EAF3DE', color: '#3B6D11', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          {msg}
        </div>
      )}
      <Section title="Gerentes" list={managers} />
      <Section title="Líderes" list={leaders} />
      <Section title="Ingenieros" list={engineers} />
      {profiles.length === 0 && (
        <div style={{ color: '#aaa', fontSize: 13, padding: '24px 0' }}>No hay usuarios registrados.</div>
      )}
    </div>
  )
}