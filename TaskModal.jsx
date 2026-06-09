import { useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { STATUS, PRIORITY, TAGS } from './constants'
import { Btn, FG } from './UI'
const inputStyle={width:'100%',padding:'8px 10px',fontSize:13,border:'0.5px solid #ddd',borderRadius:7,background:'#fafafa',color:'#111',fontFamily:'inherit',boxSizing:'border-box'}
export default function TaskModal({task,profiles,onSave,onClose}){
  const{profile:me}=useAuth()
  const isNew=!task?.id
  const leaders=profiles.filter(p=>p.role==='leader')
  const engineers=profiles.filter(p=>p.role==='engineer')
  const[f,setF]=useState({title:task?.title||'',description:task?.description||'',leader_id:task?.leader_id||leaders[0]?.id||'',engineer_id:task?.engineer_id||'',status:task?.status||'todo',priority:task?.priority||'medium',impact:task?.impact||5,effort:task?.effort||5,due_date:task?.due_date||'',tag:task?.tag||'Procesos',meeting_origin:task?.meeting_origin||'',meeting_type:task?.meeting_type||''})
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')
  const set=(k,v)=>setF(prev=>({...prev,[k]:v}))
  async function save(){
    if(!f.title.trim()){setError('El título es obligatorio');return}
    setSaving(true);setError('')
    try{
      const clean={...f,engineer_id:f.engineer_id||null,leader_id:f.leader_id||null}
      if(isNew){
        const{data:t,error:e}=await supabase.from('tasks').insert({...clean,created_by:me?.id}).select().single()
        if(e)throw e
        await supabase.from('history').insert({task_id:t.id,actor_id:me?.id,message:'Tarea creada'})
      }else{
        const old=task
        const changes=[]
        if(old.status!==clean.status)changes.push(`Estado: ${STATUS[old.status]?.label} → ${STATUS[clean.status]?.label}`)
        if(old.priority!==clean.priority)changes.push(`Prioridad: ${PRIORITY[old.priority]?.label} → ${PRIORITY[clean.priority]?.label}`)
        if(old.engineer_id!==clean.engineer_id){const oldE=profiles.find(p=>p.id===old.engineer_id);const newE=profiles.find(p=>p.id===clean.engineer_id);changes.push(`Ingeniero: ${oldE?.full_name||'Ninguno'} → ${newE?.full_name||'Ninguno'}`)}
        if(old.due_date!==clean.due_date)changes.push(`Fecha: ${old.due_date||'—'} → ${clean.due_date||'—'}`)
        if((old.meeting_type||'')!==clean.meeting_type)changes.push(`Tipo reunión: ${old.meeting_type||'—'} → ${clean.meeting_type||'—'}`)
        if((old.meeting_origin||'')!==clean.meeting_origin)changes.push(`Reunión origen: ${old.meeting_origin||'—'} → ${clean.meeting_origin||'—'}`)
        if(!changes.length)changes.push('Tarea actualizada')
        const{error:e}=await supabase.from('tasks').update(clean).eq('id',task.id)
        if(e)throw e
        await supabase.from('history').insert(changes.map(msg=>({task_id:task.id,actor_id:me?.id,message:msg})))
      }
      onSave?.();onClose()
    }catch(e){setError(e.message)}
    setSaving(false)
  }
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.42)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,border:'0.5px solid #ddd',width:'100%',maxWidth:580,maxHeight:'90vh',overflow:'auto'}}>
        <div style={{padding:'18px 24px 14px',borderBottom:'0.5px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:15,fontWeight:500}}>{isNew?'Nueva tarea':'Editar tarea'}</span>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#888'}}>✕</button>
        </div>
        <div style={{padding:'20px 24px'}}>
          <FG label="Título *"><input style={inputStyle} value={f.title} onChange={e=>set('title',e.target.value)} placeholder="Ej: Implementar módulo de autenticación"/></FG>
          <FG label="Descripción"><textarea style={{...inputStyle,height:70,resize:'vertical'}} value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Contexto, criterios de aceptación, notas…"/></FG>
          <FG label="🗂️ Tipo de reunión"><input style={inputStyle} value={f.meeting_type} onChange={e=>set('meeting_type',e.target.value)} placeholder="Ej: Standup, Revisión de sprint, Comité directivo, 1:1…"/></FG>
          <FG label="📅 Reunión de origen"><input style={inputStyle} value={f.meeting_origin} onChange={e=>set('meeting_origin',e.target.value)} placeholder="Ej: Reunión semanal 3 jun, Daily 5 jun, Comité de gestión…"/></FG>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <FG label="Líder responsable" mb={0}><select style={inputStyle} value={f.leader_id} onChange={e=>set('leader_id',e.target.value)}><option value="">— Sin líder —</option>{leaders.map(l=><option key={l.id} value={l.id}>{l.full_name}</option>)}</select></FG>
            <FG label="Ingeniero asignado" mb={0}><select style={inputStyle} value={f.engineer_id} onChange={e=>set('engineer_id',e.target.value)}><option value="">— Sin asignar —</option>{engineers.map(l=><option key={l.id} value={l.id}>{l.full_name}</option>)}</select></FG>
            <FG label="Estado" mb={0}><select style={inputStyle} value={f.status} onChange={e=>set('status',e.target.value)}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></FG>
            <FG label="Prioridad" mb={0}><select style={inputStyle} value={f.priority} onChange={e=>set('priority',e.target.value)}>{Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></FG>
            <FG label={`Impacto: ${f.impact}/10`} mb={0}><input type="range" min={1} max={10} step={1} value={f.impact} onChange={e=>set('impact',+e.target.value)} style={{width:'100%'}}/></FG>
            <FG label={`Esfuerzo: ${f.effort}/10`} mb={0}><input type="range" min={1} max={10} step={1} value={f.effort} onChange={e=>set('effort',+e.target.value)} style={{width:'100%'}}/></FG>
            <FG label="Fecha compromiso" mb={0}><input type="date" style={inputStyle} value={f.due_date} onChange={e=>set('due_date',e.target.value)}/></FG>
            <FG label="Etiqueta" mb={0}><select style={inputStyle} value={f.tag} onChange={e=>set('tag',e.target.value)}>{TAGS.map(t=><option key={t}>{t}</option>)}</select></FG>
          </div>
          {error&&<div style={{background:'#FCEBEB',color:'#A32D2D',borderRadius:8,padding:'10px 12px',fontSize:13,marginBottom:14}}>{error}</div>}
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <Btn onClick={onClose}>Cancelar</Btn>
            <Btn primary onClick={save} disabled={saving}>{saving?'Guardando…':'Guardar tarea'}</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}