import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { STATUS, PRIORITY, fmtDate } from './constants'

const FLAG = { Chile: '🇨🇱', Colombia: '🇨🇴' }
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function getWeekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = (day === 0 ? -6 : 1 - day) + offset * 7
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999)
  return { from: mon, to: sun }
}
function fmt(d) { return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) }
function statusColor(s) { return ({ todo:'#888780', progress:'#185FA5', review:'#854F0B', done:'#3B6D11', blocked:'#A32D2D' })[s] || '#888' }
function statusBg(s) { return ({ todo:'#f5f5f5', progress:'#E6F1FB', review:'#FAEEDA', done:'#EAF3DE', blocked:'#FCEBEB' })[s] || '#f5f5f5' }
function priorityColor(p) { return ({ critical:'#E24B4A', high:'#EF9F27', medium:'#378ADD', low:'#888780' })[p] || '#888' }

export default function WeeklyReport() {
  const { profile: me } = useAuth()
  const [tasks, setTasks] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [filterLeader, setFilterLeader] = useState('all')
  const [filterCountry, setFilterCountry] = useState('all')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from('tasks').select('*').order('priority').order('due_date'),
        supabase.from('profiles').select('*'),
      ])
      setTasks(t || []); setProfiles(p || []); setLoading(false)
    }
    load()
  }, [])

  const { from, to } = getWeekRange(weekOffset)
  const byId = id => profiles.find(p => p.id === id)
  const leaders = profiles.filter(p => p.role === 'leader')

  const weekTasks = tasks.filter(t => {
    const due = t.due_date ? new Date(t.due_date) : null
    const inWeek = due && due >= from && due <= to
    const pending = ['todo','progress','review','blocked'].includes(t.status)
    return (pending || inWeek)
  }).filter(t =>
    (filterLeader === 'all' || t.leader_id === filterLeader) &&
    (filterCountry === 'all' || t.country === filterCountry)
  ).sort((a, b) => (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2))

  const inProg = weekTasks.filter(t => t.status === 'progress')
  const pending = weekTasks.filter(t => t.status === 'todo')
  const inReview = weekTasks.filter(t => t.status === 'review')
  const blocked = weekTasks.filter(t => t.status === 'blocked')
  const done = weekTasks.filter(t => t.status === 'done')

  const groups = [
    { key: 'progress', label: '🔵 En progreso', tasks: inProg },
    { key: 'todo',     label: '⚪ Por hacer',   tasks: pending },
    { key: 'review',   label: '🟡 En revisión', tasks: inReview },
    { key: 'blocked',  label: '🔴 Bloqueadas',  tasks: blocked },
    { key: 'done',     label: '✅ Completadas', tasks: done },
  ].filter(g => g.tasks.length > 0)

  function generateHTML() {
    const leaderName = filterLeader !== 'all' ? byId(filterLeader)?.full_name : 'Todos los líderes'
    const countryName = filterCountry !== 'all' ? filterCountry : 'Todos los países'
    const taskRow = t => {
      const leader = byId(t.leader_id), eng = byId(t.engineer_id)
      return `<tr><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${priorityColor(t.priority)};margin-right:6px;vertical-align:middle"></span><strong>${t.title}</strong>${t.description?'<div style="font-size:12px;color:#888;margin-top:3px">'+t.description.substring(0,120)+(t.description.length>120?'…':'')+'</div>':''}${t.meeting_type||t.meeting_origin?'<div style="font-size:11px;color:#aaa;margin-top:2px">'+(t.meeting_type?'🗂️ '+t.meeting_type:'')+(t.meeting_type&&t.meeting_origin?' · ':'')+(t.meeting_origin?'📅 '+t.meeting_origin:'')+'</div>':''}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;white-space:nowrap;font-size:12px">${leader?.full_name||'—'}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;white-space:nowrap;font-size:12px">${eng?.full_name||'—'}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;white-space:nowrap;font-size:12px;color:${t.due_date&&new Date(t.due_date)<new Date()&&t.status!=='done'?'#A32D2D':'#555'}">${fmtDate(t.due_date)}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;white-space:nowrap;font-size:13px">${FLAG[t.country]||''}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;white-space:nowrap"><span style="background:${statusBg(t.status)};color:${statusColor(t.status)};border-radius:20px;font-size:11px;font-weight:500;padding:2px 9px">${STATUS[t.status]?.label||t.status}</span></td></tr>`
    }
    const groupSection = g => `<h3 style="font-size:14px;font-weight:600;color:#333;margin:28px 0 12px;padding:8px 12px;background:#f7f7f9;border-radius:6px;border-left:3px solid ${statusColor(g.key)}">${g.label} (${g.tasks.length})</h3><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f7f7f9"><th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">Tarea</th><th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">Líder</th><th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">Ingeniero</th><th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">Vence</th><th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">País</th><th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">Estado</th></tr></thead><tbody>${g.tasks.map(taskRow).join('')}</tbody></table>`
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Semanal TeamFlow</title><style>body{font-family:system-ui,sans-serif;color:#111;margin:0;padding:0}@media print{.no-print{display:none}}</style></head><body style="padding:32px 40px;max-width:960px;margin:0 auto"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #3C3489"><div><div style="font-size:22px;font-weight:700;color:#3C3489">⬡ TeamFlow</div><div style="font-size:13px;color:#888;margin-top:4px">Reporte Semanal de Actividades</div></div><div style="text-align:right"><div style="font-size:15px;font-weight:600">${fmt(from)} — ${fmt(to)}</div><div style="font-size:12px;color:#888;margin-top:4px">${leaderName} · ${countryName}</div><div style="font-size:11px;color:#aaa;margin-top:2px">Generado: ${new Date().toLocaleString('es-CL')}</div></div></div><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:32px">${[{label:'Total semana',val:weekTasks.length,color:'#3C3489'},{label:'En progreso',val:inProg.length,color:'#185FA5'},{label:'Por hacer',val:pending.length,color:'#555'},{label:'Bloqueadas',val:blocked.length,color:'#A32D2D'},{label:'Completadas',val:done.length,color:'#3B6D11'}].map(s=>`<div style="background:#f7f7f9;border-radius:8px;padding:14px 16px;text-align:center;border:1px solid #eee"><div style="font-size:26px;font-weight:700;color:${s.color}">${s.val}</div><div style="font-size:11px;color:#888;margin-top:4px">${s.label}</div></div>`).join('')}</div>${groups.map(groupSection).join('')}${weekTasks.length===0?'<div style="text-align:center;color:#aaa;padding:60px 0">Sin tareas para esta semana.</div>':''}<div style="margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa;display:flex;justify-content:space-between"><span>TeamFlow · Reporte generado automáticamente</span><span>${fmt(from)} al ${fmt(to)}</span></div></body></html>`
  }

  function downloadReport() {
    setGenerating(true)
    const html = generateHTML()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-semanal-${from.toISOString().split('T')[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
    setGenerating(false)
  }

  function printReport() {
    const w = window.open('', '_blank')
    w.document.write(generateHTML())
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 500)
  }

  const inp = { padding: '5px 10px', fontSize: 13, border: '0.5px solid #ddd', borderRadius: 7, background: '#fff', color: '#111', cursor: 'pointer' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '0.5px solid #ddd', borderRadius: 8, padding: '4px 10px' }}>
          <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#555', padding: '2px 4px' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 500, minWidth: 200, textAlign: 'center' }}>{fmt(from)} — {fmt(to)}</span>
          <button onClick={() => setWeekOffset(o => o + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: weekOffset === 0 ? '#ccc' : '#555', padding: '2px 4px' }} disabled={weekOffset === 0}>›</button>
        </div>
        {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} style={{ ...inp, color: '#3C3489', borderColor: '#EEEDFE', background: '#EEEDFE', fontSize: 12 }}>Esta semana</button>}
        <select value={filterLeader} onChange={e => setFilterLeader(e.target.value)} style={inp}><option value="all">Todos los líderes</option>{leaders.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}</select>
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={inp}><option value="all">🌎 Todos los países</option><option value="Chile">🇨🇱 Chile</option><option value="Colombia">🇨🇴 Colombia</option></select>
        <div style={{ flex: 1 }} />
        <button onClick={printReport} style={{ ...inp, background: '#f7f7f9', fontFamily: 'inherit' }}>🖨️ Imprimir / PDF</button>
        <button onClick={downloadReport} disabled={generating} style={{ ...inp, background: '#3C3489', color: '#fff', border: 'none', fontFamily: 'inherit', fontWeight: 500 }}>{generating ? 'Generando…' : '⬇️ Descargar HTML'}</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
        {[{label:'Total semana',val:weekTasks.length,color:'#3C3489'},{label:'En progreso',val:inProg.length,color:'#185FA5'},{label:'Por hacer',val:pending.length,color:'#555'},{label:'Bloqueadas',val:blocked.length,color:'#A32D2D'},{label:'Completadas',val:done.length,color:'#3B6D11'}].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid #eee', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Cargando…</div>
      ) : weekTasks.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 60, fontSize: 14, background: '#fff', borderRadius: 10, border: '0.5px solid #eee' }}>No hay tareas para esta semana con los filtros seleccionados.</div>
      ) : (
        groups.map(g => (
          <div key={g.key} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10, padding: '7px 12px', background: '#f7f7f9', borderRadius: 6, borderLeft: `3px solid ${statusColor(g.key)}` }}>{g.label} ({g.tasks.length})</div>
            <div style={{ background: '#fff', border: '0.5px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f9f9f9' }}>{['', 'Tarea', 'Líder', 'Ingeniero', 'Vence', 'País', 'Estado'].map((h, i) => <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#aaa', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {g.tasks.map(t => {
                    const leader = byId(t.leader_id), eng = byId(t.engineer_id)
                    const over = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
                    return (
                      <tr key={t.id} style={{ borderTop: '0.5px solid #f5f5f5' }}>
                        <td style={{ padding: '10px 12px' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: priorityColor(t.priority) }} /></td>
                        <td style={{ padding: '10px 12px', maxWidth: 240 }}>
                          <div style={{ fontWeight: 500 }}>{t.title}</div>
                          {t.description && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{t.description.substring(0, 80)}{t.description.length > 80 ? '…' : ''}</div>}
                          {(t.meeting_type || t.meeting_origin) && <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>{t.meeting_type && '🗂️ ' + t.meeting_type}{t.meeting_type && t.meeting_origin && ' · '}{t.meeting_origin && '📅 ' + t.meeting_origin}</div>}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#555', whiteSpace: 'nowrap' }}>{leader?.full_name || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#555', whiteSpace: 'nowrap' }}>{eng?.full_name || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, whiteSpace: 'nowrap', color: over ? '#A32D2D' : '#555', fontWeight: over ? 600 : 400 }}>{over && '⚠️ '}{fmtDate(t.due_date)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>{FLAG[t.country] || ''}</td>
                        <td style={{ padding: '10px 12px' }}><span style={{ background: statusBg(g.key), color: statusColor(g.key), borderRadius: 20, fontSize: 11, fontWeight: 500, padding: '2px 9px', whiteSpace: 'nowrap' }}>{STATUS[t.status]?.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}