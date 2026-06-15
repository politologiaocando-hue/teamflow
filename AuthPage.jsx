import { useState } from 'react'
import { supabase } from './supabase'

const inp = { width:'100%', padding:'10px 12px', fontSize:14, border:'1px solid #ddd', borderRadius:8, background:'#fafafa', color:'#111', fontFamily:'inherit', boxSizing:'border-box', marginBottom:12 }

const ROLES = [
  { value:'manager',  label:'🏢 Gerente / Director',  desc:'Asigna tareas a líderes de equipo' },
  { value:'leader',   label:'👤 Líder de equipo',  desc:'Gestiona y delega tareas a ingenieros' },
  { value:'engineer', label:'⚙️ Ingeniero / Ejecutor', desc:'Ejecuta tareas asignadas' },
]

export default function AuthPage() {
  const[tab,setTab]=useState('login')
  const[email,setEmail]=useState('')
  const[pass,setPass]=useState('')
  const[name,setName]=useState('')
  const[role,setRole]=useState('engineer')
  const[error,setError]=useState('')
  const[loading,setLoading]=useState(false)

  async function login(e){
    e.preventDefault();setError('');setLoading(true)
    const{error}=await supabase.auth.signInWithPassword({email,password:pass})
    if(error)setError(error.message)
    setLoading(false)
  }

  async function register(e){
    e.preventDefault();setError('');setLoading(true)
    const{error}=await supabase.auth.signUp({email,password:pass,options:{data:{full_name:name,role}}})
    if(error)setError(error.message)
    else setTab('login')
    setLoading(false)
  }

  return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f4f9',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#fff',borderRadius:14,border:'0.5px solid #eee',padding:'32px 36px',width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:28,marginBottom:6}}>⬡</div>
          <div style={{fontSize:20,fontWeight:700,color:'#3C3489'}}>TeamFlow</div>
          <div style={{fontSize:12,color:'#aaa',marginTop:4}}>Gestión de equipo</div>
        </div>
        <div style={{display:'flex',borderBottom:'1px solid #eee',marginBottom:24}}>
          {[['login','Iniciar sesión'],['register','Registrarse']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'8px 0',background:'none',border:'none',borderBottom:tab===k?'2px solid #3C3489':'2px solid transparent',color:tab===k?'#3C3489':'#888',fontWeight:tab===k?600:400,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
          ))}
        </div>
        {tab==='login'?(
          <form onSubmit={login}>
            <input style={inp} type="email" placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)} required/>
            <input style={inp} type="password" placeholder="Contraseña" value={pass} onChange={e=>setPass(e.target.value)} required/>
            {error&&<div style={{color:'#A32D2D',fontSize:12,marginBottom:12,background:'#FCEBEB',padding:'8px 10px',borderRadius:6}}>{error}</div>}
            <button type="submit" disabled={loading} style={{width:'100%',padding:'11px',background:'#3C3489',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{loading?'Entrando…':'Iniciar sesión'}</button>
          </form>
        ):(
          <form onSubmit={register}>
            <input style={inp} type="text" placeholder="Nombre completo" value={name} onChange={e=>setName(e.target.value)} required/>
            <input style={inp} type="email" placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)} required/>
            <input style={inp} type="password" placeholder="Contraseña (mín. 6 caracteres)" value={pass} onChange={e=>setPass(e.target.value)} required/>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,color:'#888',marginBottom:8,fontWeight:500}}>Rol en el equipo</div>
              {ROLES.map(r=>(
                <label key={r.value} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',border:`1.5px solid ${role===r.value?'#3C3489':'#eee'}`,borderRadius:8,marginBottom:8,cursor:'pointer',background:role===r.value?'#EEEDFE':'#fff'}}>
                  <input type="radio" name="role" value={r.value} checked={role===r.value} onChange={()=>setRole(r.value)} style={{marginTop:2,accentColor:'#3C3489'}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:role===r.value?'#3C3489':'#111'}}>{r.label}</div>
                    <div style={{fontSize:11,color:'#aaa',marginTop:2}}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {error&&<div style={{color:'#A32D2D',fontSize:12,marginBottom:12,background:'#FCEBEB',padding:'8px 10px',borderRadius:6}}>{error}</div>}
            <button type="submit" disabled={loading} style={{width:'100%',padding:'11px',background:'#3C3489',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{loading?'Registrando…':'Crear cuenta'}</button>
          </form>
        )}
      </div>
    </div>
  )
}