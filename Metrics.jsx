import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { STATUS, PRIORITY } from './constants'

const FLAG = { Chile: '🇨🇱', Colombia: '🇨🇴' }

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
}
function agingColor(days) {
  if (days === null) return '#aaa'
  if (days <= 7)  return '#3B6D11'
  if (days <= 14) return '#854F0B'
  if (days <= 30) return '#E24B4A'
  return '#7B0000'
}
function agingBg(days) {
  if (days === null) return '#f5f5f5'
  if (days <= 7)  return '#EAF3DE'
  if (days <= 14) return '#FAEEDA'
  if (days <= 30) return '#FCEBEB'
  return '#F5D0D0'
}
function agingLabel(days) {
  if (days === null) return '—'
  if (days <= 7)  return 'Reciente'
  if (days <= 14) return 'Normal'
  if (days <= 30) return 'Atención'
  return 'Crítico'
}
function Bar({ value, max, color = '#3C3489', height = 8 }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0
  return (<div style={{ height, background: '#eee', borderRadius: height, overflow: 'hidden', flex: 1 }}><div style={{ height, background: color, width: pct + '%', borderRadius: height, transition: 'width .4s' }} /></div>)
}
function StatCard({ label, value, sub, color = '#111', bg = '#fff' }) {
  return (<div style={{ background: bg, border: '0.5px solid #eee', borderRadius: 10, padding: '16px 18px' }}><div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 500 }}>{label}</div><div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>{sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{sub}</div>}</div>)
}
function Section({ title, children }) {
  return (<div style={{ marginBottom: 28 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 3, height: 14, background: '#3C3489', borderRadius: 2 }} />{title}</div>{children}</div>)
}

export default function Metrics() {
  const [tasks, setTasks] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCountry, setFilterCountry] = useState('all')

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('profiles').select('*'),
      ])
      setTasks(t || []); setProfiles(p || []); setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>Cargando métricas…</div>

  const byId = id => profiles.find(p => p.id === id)
  const ft = filterCountry === 'all' ? tasks : tasks.filter(t => t.country === filterCountry)

  const total   = ft.length
  const active  = ft.filter(t => t.status !== 'done').length
  const done    = ft.filter(t => t.status === 'done').length
  const blocked = ft.filter(t => t.status === 'blocked').length
  const overdue = ft.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()).length
  const noDate  = ft.filter(t => !t.due_date && t.status !== 'done').length
  const donePct = total > 0 ? Math.round(done / total * 100) : 0

  const activeTasks = ft.filter(t => t.status !== 'done')
  const agingData = activeTasks.filter(t => t.created_at).map(t => ({ ...t, age: daysSince(t.created_at) })).sort((a, b) => b.age - a.age)
  const avgAge = agingData.length > 0 ? Math.round(agingData.reduce((s, t) => s + t.age, 0) / agingData.length) : 0
  const critical14 = agingData.filter(t => t.age > 14).length

  const byStatus = Object.entries(STATUS).map(([k, v]) => ({ key: k, label: v.label, count: ft.filter(t => t.status === k).length }))
  const byPriority = Object.entries(PRIORITY).map(([k, v]) => ({ key: k, label: v.label, color: v.dot, count: ft.filter(t => t.priority === k && t.status !== 'done').length }))

  const engineers = profiles.filter(p => p.role === 'engineer')
  const engineerLoad = engineers.map(e => {
    const my = ft.filter(t => t.engineer_id === e.id)
    const myActive = my.filter(t => t.status !== 'done')
    const avgAgeEng = myActive.length > 0 ? Math.round(myActive.reduce((s, t) => s + (daysSince(t.created_at) || 0), 0) / myActive.length) : 0
    return { ...e, total: my.length, active: myActive.length, blocked: my.filter(t => t.status === 'blocked').length, overdue: my.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()).length, done: my.filter(t => t.status === 'done').length, avgAge: avgAgeEng }
  }).filter(e => e.total > 0).sort((a, b) => b.active - a.active)

  const leaders = profiles.filter(p => p.role === 'leader')
  const leaderLoad = leaders.map(l => {
    const my = ft.filter(t => t.leader_id === l.id)
    const myDone = my.filter(t => t.status === 'done')
    return { ...l, total: my.length, active: my.filter(t => t.status !== 'done').length, done: myDone.length, blocked: my.filter(t => t.status === 'blocked').length, overdue: my.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()).length, pct: my.length > 0 ? Math.round(myDone.length / my.length * 100) : 0 }
  }).filter(l => l.total > 0).sort((a, b) => b.total - a.total)

  const tags = [...new Set(ft.map(t => t.tag).filter(Boolean))]
  const byTag = tags.map(tag => ({ tag, total: ft.filter(t => t.tag === tag).length, active: ft.filter(t => t.tag === tag && t.status !== 'done').length, done: ft.filter(t => t.tag === tag && t.status === 'done').length })).sort((a, b) => b.total - a.total)
  const byCountry = ['Chile', 'Colombia'].map(c => ({ country: c, total: ft.filter(t => t.country === c).length, active: ft.filter(t => t.country === c && t.status !== 'done').length, done: ft.filter(t => t.country === c && t.status === 'done').length, overdue: ft.filter(t => t.country === c && t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()).length }))

  const inp = { padding: '5px 10px', fontSize: 13, border: '0.5px solid #ddd', borderRadius: 7, background: '#fff', color: '#111', cursor: 'pointer' }
  const tdS = { padding: '10px 12px', borderBottom: '0.5px solid #f5f5f5', fontSize: 13 }
  const th = { padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#aaa', fontWeight: 500, whiteSpace: 'nowrap', background: '#f9f9f9' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={inp}><option value="all">🌎 Todos los países</option><option value="Chile">🇨🇱 Chile</option><option value="Colombia">🇨🇴 Colombia</option></select>
        <span style={{ fontSize: 12, color: '#aaa' }}>{total} tarea{total !== 1 ? 's' : ''} en total</span>
      </div>

      <Section title="Resumen general">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
          <StatCard label="Total tareas"  value={total}   color="#111" />
          <StatCard label="Activas"       value={active}  color="#185FA5" bg="#EBF4FD" />
          <StatCard label="Completadas"   value={done}    color="#3B6D11" bg="#EAF3DE" sub={donePct + '% del total'} />
          <StatCard label="Bloqueadas"    value={blocked} color="#A32D2D" bg="#FCEBEB" />
          <StatCard label="Vencidas"      value={overdue} color="#E24B4A" bg="#FFF0F0" sub="sin completar" />
          <StatCard label="Sin fecha"     value={noDate}  color="#854F0B" bg="#FAEEDA" sub="activas" />
        </div>
      </Section>

      <Section title="⏱️ Envejecimiento de tareas activas">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <StatCard label="Edad promedio" value={avgAge + ' días'} color={agingColor(avgAge)} bg={agingBg(avgAge)} />
              <StatCard label="+14 días sin cerrar" value={critical14} color={critical14 > 0 ? '#E24B4A' : '#3B6D11'} bg={critical14 > 0 ? '#FCEBEB' : '#EAF3DE'} />
            </div>
            <div style={{ background: '#fff', border: '0.5px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
              {[{label:'≤ 7 días',min:0,max:7,color:'#3B6D11',bg:'#EAF3DE'},{label:'8–14 días',min:8,max:14,color:'#854F0B',bg:'#FAEEDA'},{label:'15–30 días',min:15,max:30,color:'#E24B4A',bg:'#FCEBEB'},{label:'+30 días',min:31,max:9999,color:'#7B0000',bg:'#F5D0D0'}].map(bucket => {
                const count = agingData.filter(t => t.age >= bucket.min && t.age <= bucket.max).length
                const pct = agingData.length > 0 ? Math.round(count / agingData.length * 100) : 0
                return (<div key={bucket.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '0.5px solid #f5f5f5' }}><span style={{ fontSize: 12, color: bucket.color, fontWeight: 500, minWidth: 80 }}>{bucket.label}</span><Bar value={count} max={agingData.length} color={bucket.color} /><span style={{ fontSize: 13, fontWeight: 700, color: bucket.color, minWidth: 28, textAlign: 'right' }}>{count}</span><span style={{ fontSize: 11, color: '#aaa', minWidth: 32, textAlign: 'right' }}>{pct}%</span></div>)
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 500 }}>Top tareas más antiguas</div>
            <div style={{ background: '#fff', border: '0.5px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
              {agingData.slice(0, 8).map(t => (<div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '0.5px solid #f5f5f5' }}><span style={{ background: agingBg(t.age), color: agingColor(t.age), borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '2px 7px', whiteSpace: 'nowrap', minWidth: 58, textAlign: 'center' }}>{t.age}d</span><div style={{ flex: 1, overflow: 'hidden' }}><div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div><div style={{ fontSize: 10, color: '#aaa' }}>{byId(t.engineer_id)?.full_name || 'Sin asignar'} · {STATUS[t.status]?.label}</div></div><span style={{ fontSize: 10, background: agingBg(t.age), color: agingColor(t.age), padding: '1px 6px', borderRadius: 8, whiteSpace: 'nowrap' }}>{agingLabel(t.age)}</span></div>))}
              {agingData.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>No hay tareas activas</div>}
            </div>
          </div>
        </div>
      </Section>

      {engineerLoad.length > 0 && (
        <Section title="👷 Carga por ingeniero">
          <div style={{ background: '#fff', border: '0.5px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Ingeniero','Activas','Completadas','Bloqueadas','Vencidas','Edad prom.','Progreso'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{engineerLoad.map(e => (<tr key={e.id}><td style={tdS}><div style={{ fontWeight: 500 }}>{e.full_name}</div></td><td style={tdS}><span style={{ fontWeight: 600, color: '#185FA5' }}>{e.active}</span></td><td style={tdS}><span style={{ color: '#3B6D11' }}>{e.done}</span></td><td style={tdS}>{e.blocked > 0 ? <span style={{ background: '#FCEBEB', color: '#A32D2D', borderRadius: 20, fontSize: 11, padding: '2px 8px' }}>{e.blocked}</span> : <span style={{ color: '#aaa' }}>0</span>}</td><td style={tdS}>{e.overdue > 0 ? <span style={{ background: '#FFF0F0', color: '#E24B4A', borderRadius: 20, fontSize: 11, padding: '2px 8px' }}>{e.overdue}</span> : <span style={{ color: '#aaa' }}>0</span>}</td><td style={tdS}><span style={{ color: agingColor(e.avgAge), fontWeight: 500 }}>{e.avgAge}d</span></td><td style={{ ...tdS, minWidth: 120 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Bar value={e.done} max={e.total} color="#3C3489" height={6} /><span style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>{e.total > 0 ? Math.round(e.done / e.total * 100) : 0}%</span></div></td></tr>))}</tbody>
            </table>
          </div>
        </Section>
      )}

      {leaderLoad.length > 0 && (
        <Section title="🎯 Rendimiento por líder">
          <div style={{ background: '#fff', border: '0.5px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Líder','Total','Activas','Completadas','Bloqueadas','Vencidas','% Completado'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{leaderLoad.map(l => (<tr key={l.id}><td style={tdS}><div style={{ fontWeight: 500 }}>{l.full_name}</div></td><td style={tdS}>{l.total}</td><td style={tdS}><span style={{ color: '#185FA5' }}>{l.active}</span></td><td style={tdS}><span style={{ color: '#3B6D11' }}>{l.done}</span></td><td style={tdS}>{l.blocked > 0 ? <span style={{ background: '#FCEBEB', color: '#A32D2D', borderRadius: 20, fontSize: 11, padding: '2px 8px' }}>{l.blocked}</span> : <span style={{ color: '#aaa' }}>0</span>}</td><td style={tdS}>{l.overdue > 0 ? <span style={{ background: '#FFF0F0', color: '#E24B4A', borderRadius: 20, fontSize: 11, padding: '2px 8px' }}>{l.overdue}</span> : <span style={{ color: '#aaa' }}>0</span>}</td><td style={{ ...tdS, minWidth: 140 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Bar value={l.done} max={l.total} color={l.pct >= 70 ? '#3B6D11' : l.pct >= 40 ? '#854F0B' : '#A32D2D'} height={6} /><span style={{ fontSize: 12, fontWeight: 600, color: l.pct >= 70 ? '#3B6D11' : l.pct >= 40 ? '#854F0B' : '#A32D2D', whiteSpace: 'nowrap' }}>{l.pct}%</span></div></td></tr>))}</tbody>
            </table>
          </div>
        </Section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 3, height: 14, background: '#3C3489', borderRadius: 2 }} />Distribución por prioridad (activas)</div>
          <div style={{ background: '#fff', border: '0.5px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            {byPriority.map(p => (<div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '0.5px solid #f5f5f5' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} /><span style={{ fontSize: 12, color: '#555', minWidth: 65 }}>{p.label}</span><Bar value={p.count} max={Math.max(...byPriority.map(x => x.count), 1)} color={p.color} /><span style={{ fontSize: 13, fontWeight: 700, color: p.color, minWidth: 24, textAlign: 'right' }}>{p.count}</span></div>))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 3, height: 14, background: '#3C3489', borderRadius: 2 }} />Distribución por etiqueta</div>
          <div style={{ background: '#fff', border: '0.5px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            {byTag.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Sin datos</div>}
            {byTag.map(t => (<div key={t.tag} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '0.5px solid #f5f5f5' }}><span style={{ fontSize: 12, color: '#555', minWidth: 130 }}>{t.tag}</span><Bar value={t.active} max={Math.max(...byTag.map(x => x.total), 1)} color="#3C3489" /><span style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>{t.active} activas / {t.done} ✓</span></div>))}
          </div>
        </div>
      </div>

      {filterCountry === 'all' && (
        <Section title="🌎 Comparativa por país">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {byCountry.filter(c => c.total > 0).map(c => (
              <div key={c.country} style={{ background: '#fff', border: '0.5px solid #eee', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{FLAG[c.country]} {c.country}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                  {[{label:'Total',val:c.total,color:'#111'},{label:'Activas',val:c.active,color:'#185FA5'},{label:'Completadas',val:c.done,color:'#3B6D11'},{label:'Vencidas',val:c.overdue,color:c.overdue>0?'#A32D2D':'#aaa'}].map(s => (<div key={s.label} style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div><div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{s.label}</div></div>))}
                </div>
                <div style={{ marginTop: 12 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Bar value={c.done} max={c.total} color="#3C3489" height={6} /><span style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>{c.total > 0 ? Math.round(c.done / c.total * 100) : 0}% completado</span></div></div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}