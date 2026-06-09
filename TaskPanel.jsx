import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Avatar, Badge, PriorityDot, Btn } from './UI'
import { STATUS, PRIORITY, fmtDate, fmtTime, isOverdue } from './constants'

export default function TaskPanel({ taskId, profiles, onClose, onUpdated, onDeleted }) {
  const { profile: me } = useAuth()
  const [task, setTask]         = useState(null)
  const [comments, setComments] = useState([])
  const [history, setHistory]   = useState([])
  const [tab, setTab]           = useState('comments')
  const [body, setBody]         = useState('')
  const [saving, setSaving]     = useState(false)

  const byId = id => profiles.find(p => p.id === id)

  async function load() {
    const [{ data: t }, { data: c }, { data: h }] = await Promise.all([
      supabase.from('tasks').select('*').eq('id', taskId).single(),
      supabase.from('comments').select('*, author:profiles(*)').eq('task_id', taskId).order('created_at'),
      supabase.from('history').select('*, actor:profiles(*)').eq('task_id', taskId).order('created_at', { ascending: false }),
    ])
    setTask(t); setComments(c || []); setHistory(h || [])
  }

  useEffect(() => { load() }, [taskId])

  useEffect(() => {
    const ch = supabase.channel(`task-${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history', filter: `task_id=eq.${taskId}` }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [taskId])

  async function changeStatus(newStatus) {
    if (!task || !me) return
    const oldLabel = STATUS[task.status]?.label
    const newLabel = STATUS[newStatus]?.label
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    await supabase.from('history').insert({ task_id: taskId, actor_id: me.id, message: `Estado: ${oldLabel} → ${newLabel}` })
    load(); onUpdated?.()
  }

  async function addComment() {
    const text = body.trim()
    if (!text || !me) return
    setSaving(true)
    await supabase.from('comments').insert({ task_id: taskId, author_id: me.id, body: text })
    await supabase.from('history').insert({ task_id: taskId, actor_id: me.id, message: `Comentó: "${text.substring(0, 60)}${text.length > 60 ? '…' : ''}"` })
    setBody(''); setSaving(false); load()
  }

  async function deleteTask() {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    onDeleted?.(); onClose()
  }

  if (!task) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ color: '#fff', fontSize: 14 }}>Cargando…</div>
    </div>
  )

  const leader   = byId(task.leader_id)
  const engineer = byId(task.engineer_id)
  const over     = isOverdue(task)
  const isLeader = me?.role === 'leader'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.42)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, height: '100%', background: '#fff', borderLeft: '0.5px solid #eee', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #eee', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <PriorityDot priority={task.priority} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 15, lineHeight: 1.4 }}>{task.title}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{task.tag}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18, padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #eee', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 5 }}>Estado</div>
            {isLeader || me?.id === task.engineer_id ? (
              <select value={task.status} onChange={e => changeStatus(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '0.5px solid #ccc', background: '#fff', color: '#111' }}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            ) : <Badge status={task.status} />}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 5 }}>Prioridad</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityDot priority={task.priority} /><span style={{ fontSize: 13 }}>{PRIORITY[task.priority]?.label}</span></div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 5 }}>Líder</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{leader && <Avatar profile={leader} size={22} />}<span style={{ fontSize: 13 }}>{leader?.full_name || '—'}</span></div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 5 }}>Ingeniero</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{engineer && <Avatar profile={engineer} size={22} />}<span style={{ fontSize: 13 }}>{engineer?.full_name || '—'}</span></div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 5 }}>Fecha compromiso</div>
            <div style={{ fontSize: 13, color: over ? '#A32D2D' : '#111' }}>{fmtDate(task.due_date)}{over && ' · Vencida'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 5 }}>Impacto / Esfuerzo</div>
            <div style={{ fontSize: 13 }}>{task.impact}<span style={{ color: '#aaa' }}>/10</span> · {task.effort}<span style={{ color: '#aaa' }}>/10</span></div>
          </div>
        </div>

        {task.description && (
          <div style={{ padding: '12px 20px', borderBottom: '0.5px solid #eee' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 5 }}>Descripción</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: '#555', whiteSpace: 'pre-wrap' }}>{task.description}</div>
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '0.5px solid #eee' }}>
          {['comments', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #3C3489' : '2px solid transparent', color: tab === t ? '#3C3489' : '#888', fontWeight: tab === t ? 500 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t === 'comments' ? `Comentarios (${comments.length})` : `Historial (${history.length})`}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {tab === 'comments' ? (
            <>
              {comments.length === 0 && <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: '24px 0' }}>Sin comentarios aún.</div>}
              {comments.map(c => (
                <div key={c.id} style={{ marginBottom: 14, background: '#f9f9f9', borderRadius: 8, padding: '10px 12px', border: '0.5px solid #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.author && <Avatar profile={c.author} size={20} />}
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{c.author?.full_name || '—'}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#aaa' }}>{fmtTime(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{c.body}</div>
                </div>
              ))}
            </>
          ) : (
            history.map((h, i) => (
              <div key={h.id || i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 1, background: '#e0e0e0', flexShrink: 0, marginLeft: 6, position: 'relative' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#CECBF6', border: '1.5px solid #7F77DD', position: 'absolute', top: 4, left: -3 }} />
                </div>
                <div style={{ paddingBottom: 12, flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#444' }}>{h.message}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{h.actor?.full_name || '—'} · {fmtTime(h.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {tab === 'comments' && (
          <div style={{ padding: '12px 20px', borderTop: '0.5px solid #eee', background: '#fff' }}>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Escribe un comentario…" rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addComment() }}
              style={{ width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 7, border: '0.5px solid #ddd', background: '#fafafa', color: '#111', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn primary onClick={addComment} disabled={!body.trim() || saving}>{saving ? 'Enviando…' : 'Comentar'}</Btn>
            </div>
          </div>
        )}

        {(isLeader || me?.id === task.created_by) && (
          <div style={{ padding: '10px 20px', borderTop: '0.5px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
            <Btn danger small onClick={deleteTask}>Eliminar tarea</Btn>
          </div>
        )}
      </div>
    </div>
  )
}
