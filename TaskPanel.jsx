import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Avatar, PriorityDot, Btn } from './UI'
import { STATUS, PRIORITY, TAGS, fmtDate, fmtTime, isOverdue } from './constants'

const inp = {
  width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid #ddd',
  borderRadius: 7, background: '#fafafa', color: '#111', fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function TaskPanel({ taskId, profiles, onClose, onUpdated, onDeleted }) {
  const { profile: me } = useAuth()
  const [task, setTask]         = useState(null)
  const [comments, setComments] = useState([])
  const [history, setHistory]   = useState([])
  const [tab, setTab]           = useState('detail')
  const [body, setBody]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [e, setE]               = useState({})

  const byId = id => profiles.find(p => p.id === id)
  const leaders   = profiles.filter(p => p.role === 'leader')
  const engineers = profiles.filter(p => p.role === 'engineer')
  const set = (k, v) => setE(prev => ({ ...prev, [k]: v }))

  async function load() {
    const [{ data: t }, { data: c }, { data: h }] = await Promise.all([
      supabase.from('tasks').select('*').eq('id', taskId).single(),
      supabase.from('comments').select('*, author:profiles(*)').eq('task_id', taskId).order('created_at'),
      supabase.from('history').select('*, actor:profiles(*)').eq('task_id', taskId).order('created_at', { ascending: false }),
    ])
    setTask(t)
    if (t) setE({ title: t.title, description: t.description || '', leader_id: t.leader_id || '', engineer_id: t.engineer_id || '', status: t.status, priority: t.priority, impact: t.impact, effort: t.effort, due_date: t.due_date || '', tag: t.tag || 'Procesos', meeting_origin: t.meeting_origin || '', meeting_type: t.meeting_type || '' })
    setComments(c || []); setHistory(h || [])
  }

  useEffect(() => { load() }, [taskId])
  useEffect(() => {
    const ch = supabase.channel(`task-${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history',  filter: `task_id=eq.${taskId}` }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [taskId])

  async function save() {
    if (!task || !me) return
    setSaving(true)
    const clean = { ...e, engineer_id: e.engineer_id || null, leader_id: e.leader_id || null }
    const changes = []
    if (task.status      !== clean.status)      changes.push(`Estado: ${STATUS[task.status]?.label} → ${STATUS[clean.status]?.label}`)
    if (task.priority    !== clean.priority)    changes.push(`Prioridad: ${PRIORITY[task.priority]?.label} → ${PRIORITY[clean.priority]?.label}`)
    if (task.engineer_id !== clean.engineer_id) { const o=byId(task.engineer_id),n=byId(clean.engineer_id); changes.push(`Ingeniero: ${o?.full_name||'Ninguno'} → ${n?.full_name||'Ninguno'}`) }
    if (task.leader_id   !== clean.leader_id)   { const o=byId(task.leader_id),n=byId(clean.leader_id); changes.push(`Líder: ${o?.full_name||'—'} → ${n?.full_name||'—'}`) }
    if (task.due_date    !== clean.due_date)    changes.push(`Fecha: ${fmtDate(task.due_date)} → ${fmtDate(clean.due_date)}`)
    if (task.impact      !== clean.impact)      changes.push(`Impacto: ${task.impact} → ${clean.impact}`)
    if (task.effort      !== clean.effort)      changes.push(`Esfuerzo: ${task.effort} → ${clean.effort}`)
    if (task.tag         !== clean.tag)         changes.push(`Etiqueta: ${task.tag} → ${clean.tag}`)
    if (task.title       !== clean.title)       changes.push('Título actualizado')
    if ((task.meeting_type||'')   !== clean.meeting_type)   changes.push(`Tipo reunión: ${task.meeting_type||'—'} → ${clean.meeting_type||'—'}`)
    if ((task.meeting_origin||'') !== clean.meeting_origin) changes.push(`Reunión origen: ${task.meeting_origin||'—'} → ${clean.meeting_origin||'—'}`)
    if (!changes.length) changes.push('Tarea actualizada')
    await supabase.from('tasks').update(clean).eq('id', taskId)
    await supabase.from('history').insert(changes.map(msg => ({ task_id: taskId, actor_id: me.id, message: msg })))
    setSaving(false); load(); onUpdated?.()
  }

  async function addComment() {
    const text = body.trim()
    if (!text || !me) return
    setSaving(true)
    await supabase.from('comments').insert({ task_id: taskId, author_id: me.id, body: text })
    await supabase.from('history').insert({ task_id: taskId, actor_id: me.id, message: `Comentó: "${text.substring(0,60)}${text.length>60?'…':''}"` })
    setBody(''); setSaving(false); load()
  }

  async function del() {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    onDeleted?.(); onClose()
  }

  if (!task) return (<div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center' }} onClick={onClose}><div style={{ color:'#fff',fontSize:14 }}>Cargando…</div></div>)

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.42)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'flex-end' }} onClick={onClose}>
      <div onClick={ev=>ev.stopPropagation()} style={{ width:520,height:'100%',background:'#fff',borderLeft:'0.5px solid #eee',display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'14px 20px',borderBottom:'0.5px solid #eee',display:'flex',gap:10,alignItems:'flex-start' }}>
          <PriorityDot priority={e.priority||task.priority} />
          <div style={{ flex:1 }}>
            <input value={e.title||''} onChange={ev=>set('title',ev.target.value)} style={{ ...inp,fontWeight:500,fontSize:15,background:'transparent',border:'0.5px solid transparent',padding:'2px 6px',borderRadius:6 }} onFocus={ev=>ev.target.style.border='0.5px solid #ddd'} onBlur={ev=>ev.target.style.border='0.5px solid transparent'} />
            <div style={{ fontSize:11,color:'#aaa',marginTop:2,paddingLeft:6 }}>{e.tag}</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:18,padding:4 }}>✕</button>
        </div>
        <div style={{ display:'flex',borderBottom:'0.5px solid #eee' }}>
          {[['detail','Detalle'],['comments',`Comentarios (${comments.length})`],['history',`Historial (${history.length})`]].map(([k,label])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ flex:1,padding:'10px 0',background:'none',border:'none',borderBottom:tab===k?'2px solid #3C3489':'2px solid transparent',color:tab===k?'#3C3489':'#888',fontWeight:tab===k?500:400,fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>{label}</button>
          ))}
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'16px 20px' }}>
          {tab==='detail' && (
            <div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12 }}>
                <div><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>Estado</div><select value={e.status} onChange={ev=>set('status',ev.target.value)} style={inp}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>Prioridad</div><select value={e.priority} onChange={ev=>set('priority',ev.target.value)} style={inp}>{Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>Líder responsable</div><select value={e.leader_id} onChange={ev=>set('leader_id',ev.target.value)} style={inp}><option value="">— Sin líder —</option>{leaders.map(l=><option key={l.id} value={l.id}>{l.full_name}</option>)}</select></div>
                <div><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>Ingeniero asignado</div><select value={e.engineer_id} onChange={ev=>set('engineer_id',ev.target.value)} style={inp}><option value="">— Sin asignar —</option>{engineers.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select></div>
                <div><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>Fecha compromiso</div><input type="date" value={e.due_date} onChange={ev=>set('due_date',ev.target.value)} style={{ ...inp,colorScheme:'light' }} /></div>
                <div><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>Etiqueta</div><select value={e.tag} onChange={ev=>set('tag',ev.target.value)} style={inp}>{TAGS.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>Impacto: {e.impact}/10</div><input type="range" min={1} max={10} step={1} value={e.impact} onChange={ev=>set('impact',+ev.target.value)} style={{ width:'100%' }} /></div>
                <div><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>Esfuerzo: {e.effort}/10</div><input type="range" min={1} max={10} step={1} value={e.effort} onChange={ev=>set('effort',+ev.target.value)} style={{ width:'100%' }} /></div>
              </div>
              <div style={{ marginBottom:12 }}><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>🗂️ Tipo de reunión</div><input value={e.meeting_type} onChange={ev=>set('meeting_type',ev.target.value)} placeholder="Ej: Standup, Revisión de sprint, Comité directivo, 1:1…" style={inp} /></div>
              <div style={{ marginBottom:12 }}><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>📅 Reunión de origen</div><input value={e.meeting_origin} onChange={ev=>set('meeting_origin',ev.target.value)} placeholder="Ej: Reunión semanal 3 jun, Daily 5 jun…" style={inp} /></div>
              <div style={{ marginBottom:12 }}><div style={{ fontSize:11,color:'#888',marginBottom:5,fontWeight:500 }}>Descripción</div><textarea value={e.description} onChange={ev=>set('description',ev.target.value)} rows={4} placeholder="Contexto, criterios de aceptación, notas…" style={{ ...inp,resize:'vertical',height:80 }} /></div>
              {isOverdue(task) && <div style={{ background:'#FCEBEB',color:'#A32D2D',borderRadius:8,padding:'8px 12px',fontSize:12,marginBottom:12 }}>⚠️ Tarea vencida — fecha límite: {fmtDate(task.due_date)}</div>}
              <Btn primary onClick={save} disabled={saving} style={{ width:'100%',justifyContent:'center' }}>{saving?'Guardando…':'Guardar cambios'}</Btn>
            </div>
          )}
          {tab==='comments' && (<>
            {comments.length===0 && <div style={{ textAlign:'center',color:'#aaa',fontSize:13,padding:'24px 0' }}>Sin comentarios aún.</div>}
            {comments.map(c=>(<div key={c.id} style={{ marginBottom:14,background:'#f9f9f9',borderRadius:8,padding:'10px 12px',border:'0.5px solid #eee' }}><div style={{ display:'flex',justifyContent:'space-between',marginBottom:6,alignItems:'center' }}><div style={{ display:'flex',alignItems:'center',gap:6 }}>{c.author&&<Avatar profile={c.author} size={20}/>}<span style={{ fontSize:12,fontWeight:500 }}>{c.author?.full_name||'—'}</span></div><span style={{ fontSize:11,color:'#aaa' }}>{fmtTime(c.created_at)}</span></div><div style={{ fontSize:13,lineHeight:1.6 }}>{c.body}</div></div>))}
          </>)}
          {tab==='history' && history.map((h,i)=>(<div key={h.id||i} style={{ display:'flex',gap:10,marginBottom:12 }}><div style={{ width:1,background:'#e0e0e0',flexShrink:0,marginLeft:6,position:'relative' }}><div style={{ width:7,height:7,borderRadius:'50%',background:'#CECBF6',border:'1.5px solid #7F77DD',position:'absolute',top:4,left:-3 }}/></div><div style={{ paddingBottom:12,flex:1 }}><div style={{ fontSize:12,color:'#444' }}>{h.message}</div><div style={{ fontSize:11,color:'#aaa',marginTop:2 }}>{h.actor?.full_name||'—'} · {fmtTime(h.created_at)}</div></div></div>))}
        </div>
        {tab==='comments' && (<div style={{ padding:'12px 20px',borderTop:'0.5px solid #eee',background:'#fff' }}><textarea value={body} onChange={ev=>setBody(ev.target.value)} placeholder="Escribe un comentario…" rows={3} onKeyDown={ev=>{if(ev.key==='Enter'&&ev.metaKey)addComment()}} style={{ width:'100%',fontSize:13,padding:'8px 10px',borderRadius:7,border:'0.5px solid #ddd',background:'#fafafa',color:'#111',resize:'none',fontFamily:'inherit',boxSizing:'border-box' }}/><div style={{ display:'flex',justifyContent:'flex-end',marginTop:8 }}><Btn primary onClick={addComment} disabled={!body.trim()||saving}>{saving?'Enviando…':'Comentar'}</Btn></div></div>)}
        <div style={{ padding:'10px 20px',borderTop:'0.5px solid #eee',display:'flex',justifyContent:'flex-end' }}><Btn danger small onClick={del}>Eliminar tarea</Btn></div>
      </div>
    </div>
  )
}