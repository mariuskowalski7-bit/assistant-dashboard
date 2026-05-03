'use client'
import { Shell } from '@/components/layout/Shell'
import { useDashboard } from '@/components/dashboard/useDashboard'
import { YouTubePanel } from '@/components/youtube/YouTubePanel'
import type { Entry } from '@/types'

const PRIO: Record<string,string> = {high:'var(--coral)',medium:'var(--amber)',low:'var(--green)'}
const TYPE_C: Record<string,string> = {event:'var(--accent-2)',task:'var(--teal)',reminder:'var(--amber)'}
function fmtDate(d?:string|null,t?:string|null){ if(!d) return ''; const s=new Date(d).toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'}); return t?`${s} · ${t.slice(0,5)}`:s }
function Skel({h=36,mb=6}:{h?:number;mb?:number}){ return <div style={{height:h,background:'var(--bg-4)',borderRadius:'var(--r-md)',marginBottom:mb,animation:'pulse 1.5s ease infinite'}}/> }

function TimelineRow({e}:{e:Entry}){
  return <div style={{display:'flex',gap:12,padding:'9px 10px',borderRadius:'var(--r-md)',cursor:'default'}} onMouseEnter={ev=>(ev.currentTarget.style.background='var(--bg-3)')} onMouseLeave={ev=>(ev.currentTarget.style.background='transparent')}>
    <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-3)',minWidth:42,paddingTop:2}}>{e.time?e.time.slice(0,5):'—'}</div>
    <div style={{width:7,height:7,borderRadius:'50%',marginTop:5,flexShrink:0,background:TYPE_C[e.type]??'var(--text-3)'}}/>
    <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text)',fontWeight:500}}>{e.title}</div>{e.context&&<div style={{fontSize:11.5,color:'var(--text-3)'}}>{e.context}</div>}</div>
  </div>
}

function TaskRow({e,onToggle,onDelete}:{e:Entry;onToggle:()=>void;onDelete:()=>void}){
  const done=e.status==='done'
  return <div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 10px',borderRadius:'var(--r-md)'}} onMouseEnter={ev=>(ev.currentTarget.style.background='var(--bg-3)')} onMouseLeave={ev=>(ev.currentTarget.style.background='transparent')}>
    <button onClick={onToggle} style={{width:16,height:16,borderRadius:4,flexShrink:0,marginTop:2,border:`1.5px solid ${done?'var(--teal)':'var(--border-3)'}`,background:done?'var(--teal)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',transition:'all .15s'}}>{done&&'✓'}</button>
    <div style={{flex:1}}>
      <div style={{fontSize:13,color:done?'var(--text-3)':'var(--text)',textDecoration:done?'line-through':'none',lineHeight:1.4}}>{e.title}</div>
      {e.due_date&&<div style={{fontSize:11,color:'var(--text-3)',fontFamily:'var(--font-mono)',marginTop:2}}>{fmtDate(e.due_date)}</div>}
    </div>
    <div style={{padding:'2px 8px',borderRadius:99,fontSize:10.5,fontFamily:'var(--font-mono)',background:done?'transparent':`${PRIO[e.priority]}22`,color:done?'var(--text-4)':PRIO[e.priority],flexShrink:0}}>{done?'erledigt':e.priority}</div>
    <button onClick={onDelete} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-4)',fontSize:14,padding:'0 2px',opacity:0,transition:'opacity .15s'}} onMouseEnter={ev=>(ev.currentTarget.style.opacity='1')} onMouseLeave={ev=>(ev.currentTarget.style.opacity='0')}>×</button>
  </div>
}

function ReminderRow({e}:{e:Entry}){
  return <div style={{display:'flex',alignItems:'flex-start',gap:8,padding:'7px 10px',borderRadius:'var(--r-md)'}}>
    <div style={{width:7,height:7,borderRadius:'50%',background:'var(--amber)',flexShrink:0,marginTop:5}}/>
    <div><div style={{fontSize:12.5,color:'var(--text-2)'}}>{e.title}</div><div style={{fontSize:11,color:'var(--text-3)',fontFamily:'var(--font-mono)'}}>{fmtDate(e.date,e.time)}</div></div>
  </div>
}

export default function DashboardPage(){
  const {overview,isLoading,markDone,deleteEntry}=useDashboard()
  const today=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})
  const h=new Date().getHours(); const greeting=h<12?'Guten Morgen':h<17?'Guten Tag':'Guten Abend'
  return (
    <Shell>
      <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',padding:'22px 24px'}}>
          <div className="label" style={{marginBottom:6}}>{today}</div>
          <h1 style={{fontSize:22,fontWeight:600,marginBottom:20,lineHeight:1.3}}>{greeting}!{' '}{!isLoading&&overview&&<span style={{color:'var(--accent-2)'}}>{overview.events.length} Termin{overview.events.length!==1?'e':''} heute.</span>}</h1>
          {isLoading?<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:22}}>{[0,1,2].map(i=><Skel key={i} h={68} mb={0}/>)}</div>:overview&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:22}}>
              {[{num:overview.events.length,label:'Termine heute',color:'var(--accent-2)'},{num:overview.tasks.length,label:'Offene Tasks',color:'var(--teal)'},{num:overview.reminders.length,label:'Erinnerungen',color:'var(--amber)'}].map(s=>(
                <div key={s.label} style={{background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',padding:'12px 14px'}}>
                  <div style={{fontSize:26,fontWeight:600,color:s.color,lineHeight:1,marginBottom:4}}>{s.num}</div>
                  <div className="label">{s.label}</div>
                </div>
              ))}
            </div>
          )}
          {!isLoading&&overview&&overview.overdue.length>0&&<div style={{background:'var(--coral-dim)',border:'1px solid var(--coral)',borderRadius:'var(--r-lg)',padding:'10px 14px',marginBottom:18,fontSize:13,color:'var(--coral)'}}>⚠️ {overview.overdue.length} überfällige Aufgabe(n): {overview.overdue.map(e=>e.title).join(', ')}</div>}
          <div className="label" style={{marginBottom:10}}>Heute · Zeitplan</div>
          {isLoading?<>{[0,1,2].map(i=><Skel key={i} h={44} mb={4}/>)}</>:overview?.events.length?<div style={{marginBottom:22}}>{overview.events.map(e=><TimelineRow key={e.id} e={e}/>)}</div>:<div style={{fontSize:13,color:'var(--text-3)',marginBottom:22,paddingLeft:10}}>Keine Termine heute</div>}
          <div className="label" style={{marginBottom:10}}>Aufgaben · Priorisiert</div>
          {isLoading?<>{[0,1,2].map(i=><Skel key={i} h={40} mb={4}/>)}</>:overview?.tasks.length?<div style={{marginBottom:22}}>{overview.tasks.map(e=><TaskRow key={e.id} e={e} onToggle={()=>markDone(e.id)} onDelete={()=>deleteEntry(e.id)}/>)}</div>:<div style={{fontSize:13,color:'var(--text-3)',marginBottom:22,paddingLeft:10}}>Keine offenen Aufgaben 🎉</div>}
        </div>
        <div style={{width:280,flexShrink:0,borderLeft:'1px solid var(--border)',overflowY:'auto',padding:'22px 16px',background:'var(--bg)'}}>
          <div className="label" style={{marginBottom:10}}>Letztes Video</div>
          <div style={{marginBottom:22}}><YouTubePanel/></div>
          <div className="label" style={{marginBottom:10}}>Erinnerungen</div>
          {isLoading?<>{[0,1].map(i=><Skel key={i} h={40} mb={4}/>)}</>:overview?.reminders.length?overview.reminders.map(e=><ReminderRow key={e.id} e={e}/>):<div style={{fontSize:12.5,color:'var(--text-3)',paddingLeft:4}}>Keine Erinnerungen heute</div>}
        </div>
      </div>
    </Shell>
  )
}
