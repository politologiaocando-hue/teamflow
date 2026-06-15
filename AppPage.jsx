import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Avatar, Badge, PriorityDot, ProgressBar, Spinner } from './UI'
import TaskPanel from './TaskPanel'
import TaskModal from './TaskModal'
import UsersAdmin from './UsersAdmin'
import WeeklyReport from './WeeklyReport'
import Metrics from './Metrics'
import { STATUS, PRIORITY, QUADS, fmtDate, isOverdue, quadrant } from './constants'

function ListView({ tasks, profiles, onOpen, filterStatus, filterLeader, filterEngineer, filterMeeting, setFilterStatus, setFilterLeader, setFilterEngineer, setFilterMeeting }) {
  const byId = id => profiles.find(p => p.id === id)
  const ft = tasks.filter(t =>
    (filterStatus  === 'all' || t.status === filterStatus) &&
    (filterLeader  === 'all' || t.leader_id === filterLeader) &&
    (filterEngineer === 'all' || t.engineer_id === filterEngineer) &&
    (filterMeeting === 'all' || (t.meeting_type||'').toLowerCase().includes(filterMeeting.toLowerCase()))
  )
  const done = tasks.filter(t => t.status==='done').length
  const leaders = profiles.filter(p => p.role==='leader'||p.role==='manager')
  const FLAG = {Chile:'🇨🇱',Colombia:'🇨🇴'}
  const meetingTypes = [...new Set(tasks.map(t=>t.meeting_type).filter(Boolean))].sort()
  const sel = (v,fn,ch) => <select value={v} onChange={e=>fn(e.target.value)} style={{padding:'5px 10px',fontSize:13,border:'0.5px solid #ddd',borderRadius:7,background:'#fff',color:'#111',cursor:'pointer'}}>{ch}</select>
  return (<>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
      {[{label:'Total tareas',val:tasks.length},{label:'En progreso',val:tasks.filter(t=>t.status==='progress').length},{label:'Bloqueadas',val:tasks.filter(t=>t.status==='blocked').length,danger:true},{label:'Completadas',val:done,bar:tasks.length?Math.round(done/tasks.length*100):0}].map(m=>(
        <div key={m.label} style={{background:'#f7f7f9',borderRadius:8,padding:'12px 14px',border:'0.5px solid #eee'}}>
          <div style={{fontSize:11,color:'#888',marginBottom:4}}>{m.label}</div>
          <div style={{fontSize:22,fontWeight:500,color:m.danger?'#A32D2D':'#111'}}>{m.val}</div>
          {m.bar!==undefined&&<ProgressBar value={m.bar} color="#639922" height={4}/>}
        </div>
      ))}
    </div>
    <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
      {sel(filterStatus,setFilterStatus,<><option value="all">Todos los estados</option>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</>)}
      {sel(filterLeader,setFilterLeader,<><option value="all">Todos los líderes</option>{leaders.map(l=><option key={l.id} value={l.id}>{l.full_name}</option>)}</>)}
      {sel(filterMeeting,setFilterMeeting,<><option value="all">Tipo de reunión</option>{meetingTypes.map(m=><option key={m} value={m}>{m}</option>)}</>)}
      <span style={{fontSize:12,color:'#aaa'}}>{ft.length} tarea{ft.length!==1?'s':''}</span>
    </div>
    <div style={{background:'#fff',border:'0.5px solid #eee',borderRadius:10,overflow:'hidden'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
        <thead><tr style={{borderBottom:'0.5px solid #eee'}}>{['','Tarea','Líder','Ingeniero','Estado','País','Tipo reunión','Vence','Etiqueta'].map((h,i)=><th key={i} style={{textAlign:'left',padding:'8px 12px',fontSize:11,fontWeight:500,color:'#aaa',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
        <tbody>{ft.map(t=>{const l=byId(t.leader_id),e=byId(t.engineer_id),over=isOverdue(t);return(
          <tr key={t.id} onClick={()=>onOpen(t.id)} style={{cursor:'pointer',borderBottom:'0.5px solid #f5f5f5'}} onMouseEnter={ev=>ev.currentTarget.style.background='#fafafa'} onMouseLeave={ev=>ev.currentTarget.style.background=''}>
            <td style={{padding:'10px 12px'}}><PriorityDot priority={t.priority}/></td>
            <td style={{padding:'10px 12px',maxWidth:180}}><div style={{fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div>{t._comment_count>0&&<span style={{fontSize:10,color:'#185FA5'}}>💬 {t._comment_count}</span>}</td>
            <td style={{padding:'10px 12px',fontSize:12,color:'#555',whiteSpace:'nowrap'}}>{l&&<span style={{display:'flex',alignItems:'center',gap:4}}><Avatar profile={l} size={18}/>{l.full_name}</span>}</td>
            <td style={{padding:'10px 12px',fontSize:12,color:'#555',whiteSpace:'nowrap'}}>{e&&<span style={{display:'flex',alignItems:'center',gap:4}}><Avatar profile={e} size={18}/>{e.full_name}</span>}</td>
            <td style={{padding:'10px 12px'}}><Badge status={t.status}/></td>
            <td style={{padding:'10px 12px',fontSize:13}}>{FLAG[t.country]||''}</td>
            <td style={{padding:'10px 12px',fontSize:11,color:'#666',whiteSpace:'nowrap'}}>{t.meeting_type?<span style={{background:'#f0f0f0',padding:'2px 7px',borderRadius:10}}>{t.meeting_type}</span>:<span style={{color:'#ccc'}}>—</span>}</td>
            <td style={{padding:'10px 12px',fontSize:12,color:over?'#A32D2D':'#111',whiteSpace:'nowrap'}}>{over&&<span style={{fontSize:10,background:'#FCEBEB',color:'#A32D2D',padding:'1px 5px',borderRadius:10,marginRight:4}}>Vencida</span>}{t.due_date?new Date(t.due_date).toLocaleDateString('es-CL',{day:'2-digit',month:'short'}):'—'}</td>
            <td style={{padding:'10px 12px'}}><span style={{fontSize:11,background:'#f5f5f5',padding:'2px 8px',borderRadius:20,color:'#666',border:'0.5px solid #eee'}}>{t.tag}</span></td>
          </tr>
        )})}</tbody>
      </table>
      {ft.length===0&&<div style={{padding:'32px 0',textAlign:'center',color:'#aaa',fontSize:13}}>Sin tareas con estos filtros.</div>}
    </div>
  </>)
}
function KanbanView({tasks,profiles,onOpen,filterLeader,filterEngineer,filterMeeting}){
  const byId=id=>profiles.find(p=>p.id===id)
  const ft=tasks.filter(t=>(filterLeader==='all'||t.leader_id===filterLeader)&&(filterEngineer==='all'||t.engineer_id===filterEngineer)&&(filterMeeting==='all'||(t.meeting_type||'').toLowerCase().includes(filterMeeting.toLowerCase())))
  const cols=[{key:'todo',bg:'#f7f7f9'},{key:'progress',bg:'#EBF4FD'},{key:'review',bg:'#FEF6EA'},{key:'blocked',bg:'#FEF0F0'},{key:'done',bg:'#F0F7E8'}]
  const FLAG={Chile:'🇨🇱',Colombia:'🇨🇴'}
  return(<div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:8,minHeight:440}}>{cols.map(col=>{const ct=ft.filter(t=>t.status===col.key);return(<div key={col.key} style={{minWidth:190,flex:1,background:col.bg,borderRadius:10,padding:10,border:'0.5px solid #eee'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontSize:12,fontWeight:500,color:'#666'}}>{STATUS[col.key]?.label}</span><span style={{fontSize:11,background:'#fff',padding:'1px 7px',borderRadius:10,color:'#aaa',border:'0.5px solid #eee'}}>{ct.length}</span></div>{ct.map(t=>{const e=byId(t.engineer_id),over=isOverdue(t);return(<div key={t.id} onClick={()=>onOpen(t.id)} style={{background:'#fff',border:'0.5px solid #eee',borderRadius:8,padding:10,marginBottom:8,cursor:'pointer'}} onMouseEnter={ev=>ev.currentTarget.style.borderColor='#ccc'} onMouseLeave={ev=>ev.currentTarget.style.borderColor='#eee'}><div style={{display:'flex',justifyContent:'space-between',gap:4,marginBottom:4}}><span style={{fontSize:13,fontWeight:500,lineHeight:1.4}}>{t.title}</span><PriorityDot priority={t.priority}/></div>{t.meeting_type&&<div style={{fontSize:10,color:'#888',marginBottom:4}}>🗂️ {t.meeting_type}</div>}<div style={{fontSize:11,color:'#aaa',marginBottom:6}}>{FLAG[t.country]||''} {t.tag}</div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>{e?<Avatar profile={e} size={20}/>:<span/>}<span style={{fontSize:10,color:over?'#A32D2D':'#aaa'}}>{t.due_date?new Date(t.due_date).toLocaleDateString('es-CL',{day:'2-digit',month:'short'}):'—'}</span></div></div>)})}</div>)})}</div>)
}
function MatrixView({tasks,onOpen,filterLeader,filterEngineer,filterMeeting}){
  const ft=tasks.filter(t=>(filterLeader==='all'||t.leader_id===filterLeader)&&(filterEngineer==='all'||t.engineer_id===filterEngineer)&&(filterMeeting==='all'||(t.meeting_type||'').toLowerCase().includes(filterMeeting.toLowerCase())))
  return(<><p style={{fontSize:13,color:'#888',marginBottom:14}}>Clasificación automática.</p><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>{['do-first','plan','fill-in','avoid'].map(k=>{const info=QUADS[k],qt=ft.filter(t=>quadrant(t)===k);return(<div key={k} style={{background:info.bg,border:`0.5px solid ${info.bc}`,borderRadius:10,padding:14,minHeight:150}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><div><div style={{fontSize:13,fontWeight:500,color:info.tc}}>{info.label}</div><div style={{fontSize:11,color:info.tc,opacity:.8}}>{info.sub}</div></div><span style={{fontSize:11,background:'rgba(255,255,255,.6)',padding:'2px 8px',borderRadius:10,color:info.tc}}>{qt.length}</span></div>{qt.map(t=>(<div key={t.id} onClick={()=>onOpen(t.id)} style={{background:'rgba(255,255,255,.75)',border:`0.5px solid ${info.bc}`,borderRadius:6,padding:'7px 10px',marginBottom:6,cursor:'pointer'}} onMouseEnter={ev=>ev.currentTarget.style.background='rgba(255,255,255,.95)'} onMouseLeave={ev=>ev.currentTarget.style.background='rgba(255,255,255,.75)'}><div style={{fontSize:12,fontWeight:500}}>{t.title}</div><div style={{display:'flex',gap:8,marginTop:4,alignItems:'center'}}><span style={{fontSize:10,color:'#666'}}>I:{t.impact} E:{t.effort}</span><Badge status={t.status}/></div></div>))}</div>)})}</div></>)
}
function TeamView({tasks,profiles}){
  const allLeaders=profiles.filter(p=>p.role==='leader'||p.role==='manager')
  const engineers=profiles.filter(p=>p.role==='engineer')
  return(<>{allLeaders.map(l=>{const lTasks=tasks.filter(t=>t.leader_id===l.id),done=lTasks.filter(t=>t.status==='done').length,pct=lTasks.length?Math.round(done/lTasks.length*100):0;const eng=engineers.filter(e=>lTasks.some(t=>t.engineer_id===e.id));const roleLabel=l.role==='manager'?'🏢 Gerente':'👤 Líder';return(<div key={l.id} style={{background:'#fff',border:'0.5px solid #eee',borderRadius:10,padding:16,marginBottom:14}}><div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}><Avatar profile={l} size={36}/><div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{l.full_name}</div><div style={{fontSize:11,color:'#888'}}>{roleLabel} · {lTasks.length} tareas · {done} completadas</div></div><div style={{textAlign:'right',minWidth:100}}><ProgressBar value={pct} color="#3C3489"/><div style={{fontSize:11,color:'#aaa',marginTop:4}}>{pct}% completado</div></div></div>{eng.map(e=>{const eTasks=lTasks.filter(t=>t.engineer_id===e.id),eB=eTasks.filter(t=>t.status==='blocked').length;return(<div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'#f7f7f9',borderRadius:7,marginBottom:6}}><Avatar profile={e} size={24}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{e.full_name}</div></div><div style={{textAlign:'right'}}><div style={{fontSize:12}}>{eTasks.length} tareas</div>{eB>0&&<span style={{fontSize:10,background:'#FCEBEB',color:'#A32D2D',padding:'1px 6px',borderRadius:10}}>{eB} bloqueada{eB>1?'s':''}</span>}</div></div>)})}</div>)})}</>)
}
export default function AppPage(){
  const{profile:me,signOut}=useAuth()
  const[tasks,setTasks]=useState([])
  const[profiles,setProfiles]=useState([])
  const[loading,setLoading]=useState(true)
  const[view,setView]=useState('list')
  const[filterStatus,setFilterStatus]=useState('all')
  const[filterLeader,setFilterLeader]=useState('all')
  const[filterEngineer,setFilterEngineer]=useState('all')
  const[filterMeeting,setFilterMeeting]=useState('all')
  const[openTaskId,setOpenTaskId]=useState(null)
  const[showForm,setShowForm]=useState(false)
  const loadAll=useCallback(async()=>{
    const[{data:t},{data:p},{data:cc}]=await Promise.all([supabase.from('tasks').select('*').order('created_at',{ascending:false}),supabase.from('profiles').select('*'),supabase.from('comments').select('task_id')])
    const countMap={};(cc||[]).forEach(c=>{countMap[c.task_id]=(countMap[c.task_id]||0)+1})
    setTasks((t||[]).map(task=>({...task,_comment_count:countMap[task.id]||0})))
    setProfiles(p||[]);setLoading(false)
  },[])
  useEffect(()=>{loadAll()},[loadAll])
  useEffect(()=>{ if(me?.role==='engineer'&&me?.id)setFilterEngineer(me.id) },[me])
  useEffect(()=>{
    const ch=supabase.channel('app-rt').on('postgres_changes',{event:'*',schema:'public',table:'tasks'},loadAll).on('postgres_changes',{event:'*',schema:'public',table:'comments'},loadAll).subscribe()
    return()=>supabase.removeChannel(ch)
  },[loadAll])
  const isManager=me?.role==='manager'
  const isLeader=me?.role==='leader'
  const canCreate=isManager||isLeader
  const canAdmin=isManager||isLeader
  const leaders=profiles.filter(p=>p.role==='leader'||p.role==='manager')
  const engineers=profiles.filter(p=>p.role==='engineer')
  const meetingTypes=[...new Set(tasks.map(t=>t.meeting_type).filter(Boolean))].sort()
  const noFilters=['team','admin','report','metrics']
  const VIEWS=[
    {key:'list',icon:'≡',label:'Tareas'},
    {key:'kanban',icon:'⊞',label:'Tablero'},
    {key:'matrix',icon:'◎',label:'Matriz'},
    {key:'team',icon:'⊙',label:'Equipo'},
    {key:'report',icon:'📄',label:'Reporte'},
    {key:'metrics',icon:'📊',label:'Métricas'},
    ...(canAdmin?[{key:'admin',icon:'👥',label:'Usuarios'}]:[]),
  ]
  const done=tasks.filter(t=>t.status==='done').length
  const pct=tasks.length?Math.round(done/tasks.length*100):0
  const viewTitle={list:'Todas las tareas',kanban:'Tablero Kanban',matrix:'Matriz Impacto / Esfuerzo',team:'Equipo',report:'Reporte Semanal',metrics:'Métricas',admin:'Administrar usuarios'}
  return(
    <div style={{display:'flex',height:'100vh',fontFamily:'system-ui,-apple-system,sans-serif',background:'#f5f4f9'}}>
      <div style={{width:210,minWidth:210,background:'#fff',borderRight:'0.5px solid #eee',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px 16px 14px',borderBottom:'0.5px solid #eee'}}>
          <div style={{fontSize:15,fontWeight:600,display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:18}}>⬡</span> TeamFlow</div>
          <div style={{fontSize:11,color:'#aaa',marginTop:2}}>Gestión de equipo</div>
        </div>
        <div style={{padding:'8px 0'}}>
          <div style={{padding:'4px 16px 6px',fontSize:10,color:'#bbb',textTransform:'uppercase',letterSpacing:.5}}>Vistas</div>
          {VIEWS.map(v=>(<div key={v.key} onClick={()=>setView(v.key)} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 16px',fontSize:13,cursor:'pointer',color:view===v.key?'#111':'#888',background:view===v.key?'#f5f4f9':'transparent',fontWeight:view===v.key?500:400}} onMouseEnter={ev=>{if(view!==v.key)ev.currentTarget.style.background='#fafafa'}} onMouseLeave={ev=>{if(view!==v.key)ev.currentTarget.style.background='transparent'}}><span style={{fontSize:14,opacity:.7}}>{v.icon}</span> {v.label}</div>))}
        </div>
        <div style={{marginTop:'auto',padding:'14px 16px',borderTop:'0.5px solid #eee'}}>
          <div style={{fontSize:11,color:'#888',marginBottom:6}}>Progreso general</div>
          <ProgressBar value={pct} color="#3C3489" height={5}/>
          <div style={{fontSize:11,color:'#aaa',marginTop:5}}>{done} / {tasks.length} completadas</div>
          <div style={{marginTop:12,display:'flex',alignItems:'center',gap:8}}>
            {me&&<Avatar profile={me} size={24}/>}
            <div style={{flex:1,overflow:'hidden'}}><div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{me?.full_name}</div><div style={{fontSize:10,color:'#aaa'}}>{me?.role==='manager'?'🏢 Gerente':me?.role==='leader'?'Líder':'Ingeniero'}</div></div>
            <button onClick={signOut} style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:16,padding:2}}>⏻</button>
          </div>
        </div>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{background:'#fff',borderBottom:'0.5px solid #eee',padding:'0 22px',height:50,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:15,fontWeight:500,flex:1}}>{viewTitle[view]}</span>
          {!noFilters.includes(view)&&(<>
            {(isManager||isLeader)&&<select value={filterLeader} onChange={e=>setFilterLeader(e.target.value)} style={{padding:'5px 10px',fontSize:13,border:'0.5px solid #ddd',borderRadius:7,background:'#fff',color:'#111',cursor:'pointer'}}><option value="all">Todos los líderes</option>{leaders.map(l=><option key={l.id} value={l.id}>{l.full_name}</option>)}</select>}
            <select value={filterEngineer} onChange={e=>setFilterEngineer(e.target.value)} style={{padding:'5px 10px',fontSize:13,border:'0.5px solid #ddd',borderRadius:7,background:'#fff',color:'#111',cursor:'pointer'}}><option value="all">Todos los ingenieros</option>{engineers.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
            {meetingTypes.length>0&&<select value={filterMeeting} onChange={e=>setFilterMeeting(e.target.value)} style={{padding:'5px 10px',fontSize:13,border:'0.5px solid #ddd',borderRadius:7,background:'#fff',color:'#111',cursor:'pointer'}}><option value="all">Tipo de reunión</option>{meetingTypes.map(m=><option key={m} value={m}>{m}</option>)}</select>}
          </>)}
          {canCreate&&!noFilters.includes(view)&&<button onClick={()=>setShowForm(true)} style={{background:'#3C3489',color:'#fff',border:'none',borderRadius:7,padding:'7px 14px',fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>+ Nueva tarea</button>}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
          {loading?<Spinner/>:(<>
            {view==='list'&&<ListView tasks={tasks} profiles={profiles} onOpen={setOpenTaskId} filterStatus={filterStatus} filterLeader={filterLeader} filterEngineer={filterEngineer} filterMeeting={filterMeeting} setFilterStatus={setFilterStatus} setFilterLeader={setFilterLeader} setFilterEngineer={setFilterEngineer} setFilterMeeting={setFilterMeeting}/>}
            {view==='kanban'&&<KanbanView tasks={tasks} profiles={profiles} onOpen={setOpenTaskId} filterLeader={filterLeader} filterEngineer={filterEngineer} filterMeeting={filterMeeting}/>}
            {view==='matrix'&&<MatrixView tasks={tasks} onOpen={setOpenTaskId} filterLeader={filterLeader} filterEngineer={filterEngineer} filterMeeting={filterMeeting}/>}
            {view==='team'&&<TeamView tasks={tasks} profiles={profiles}/>}
            {view==='report'&&<WeeklyReport/>}
            {view==='metrics'&&<Metrics/>}
            {view==='admin'&&<UsersAdmin/>}
          </>)}
        </div>
      </div>
      {openTaskId&&<TaskPanel taskId={openTaskId} profiles={profiles} onClose={()=>setOpenTaskId(null)} onUpdated={loadAll} onDeleted={loadAll}/>}
      {showForm&&<TaskModal profiles={profiles} onSave={loadAll} onClose={()=>setShowForm(false)}/>}
    </div>
  )
}