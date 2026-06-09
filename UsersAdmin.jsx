import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Avatar, Btn } from './UI'

export default function UsersAdmin() {
  const { profile: me } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('role').order('full_name')
    setProfiles(data || [])
  }
  useEffect(() => { load() }, [])

  function startEdit(p) { setEditing(p.id); setName(p.full_name); setMsg('') }

  async function saveEdit(p) {
    if (!name.trim()) return
    setSaving(true)
    const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)
    await supabase.from('profiles').update({ full_name: name.trim(), initials }).eq('id', p.id)
    setEditing(null); setMsg('Nombre actualizado ✓'); setSaving(false); load()
  }

  async function deleteUser(p) {
    if (!confirm(`¿Eliminar a ${p.full_name}? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    await supabase.from('profiles').delete().eq('id', p.id)
    setMsg(`Usuario ${p.full_name} eliminado`); setSaving(false); load()
  }

  if (me?.role !== 'leader') return (<div style={{ textAlign: 'center', color: '#888', padding: 40, fontSize: 14 }}>Solo los líderes pueden administrar usuarios.</div>)

  const leaders = profiles.filter(p => p.role === 'leader')
  const engineers = profiles.filter(p => p.role === 'engineer')

  const Row = ({ p }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', borderRadius: 8, border: '0.5px solid #eee', marginBottom: 8 }}>
      <Avatar profile={p} size={32} />
      <div style={{ flex: 1 }}>
        {editing === p.id ? (
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit(p)} autoFocus style={{ fontSize: 13, padding: '4px 8px', border: '0.5px solid #3C3489', borderRadius: 6, fontFamily: 'inherit', width: '100%', maxWidth: 260 }} />
        ) : (
          <div style={{ fontSize: 13, fontWeight: 500 }}>{p.full_name}</div>
        )}
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{p.email} · {p.role === 'leader' ? 'Líder' : 'Ingeniero'}</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {editing === p.id ? (<><Btn primary small onClick={() => saveEdit(p)} disabled={saving}>Guardar</Btn><Btn small onClick={() => setEditing(null)}>Cancelar</Btn></>) : (<><Btn small onClick={() => startEdit(p)}>✏️ Editar</Btn>{p.id !== me.id && <Btn danger small onClick={() => deleteUser(p)} disabled={saving}>Eliminar</Btn>}</>)}
      </div>
    </div>
  )

  return (
    <div>
      {msg && <div style={{ background: '#EAF3DE', color: '#3B6D11', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{msg}</div>}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>Líderes ({leaders.length})</div>
        {leaders.map(p => <Row key={p.id} p={p} />)}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>Ingenieros ({engineers.length})</div>
        {engineers.length === 0 && <div style={{ color: '#aaa', fontSize: 13, padding: '16px 0' }}>Aún no hay ingenieros registrados.</div>}
        {engineers.map(p => <Row key={p.id} p={p} />)}
      </div>
    </div>
  )
}