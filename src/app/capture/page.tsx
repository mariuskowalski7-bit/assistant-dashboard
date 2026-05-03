'use client'
import { useRef } from 'react'
import { Shell } from '@/components/layout/Shell'
import { useCapture, classifyLocally } from '@/components/capture/useCapture'

const TS: Record<string,{bg:string;color:string;label:string;desc:string}> = {
  event:    {bg:'var(--accent-dim)',color:'var(--accent-2)',label:'EVENT',   desc:'→ Apple Kalender'},
  task:     {bg:'var(--teal-dim)',  color:'var(--teal)',    label:'TASK',    desc:'→ Apple Erinnerungen'},
  reminder: {bg:'var(--amber-dim)',color:'var(--amber)',   label:'REMINDER',desc:'→ Apple Erinnerungen'},
  note:     {bg:'var(--green-dim)',color:'var(--green)',   label:'NOTE',    desc:'→ Wissensdatenbank'},
}
const EXAMPLES=['Morgen um 14 Uhr Zahnarzt','Heute Abend Mülltonne rausstellen','Bis Freitag Steuererklärung fertigstellen','Ich bevorzuge glutenfreie Ernährung']

export default function CapturePage(){
  const {text,setText,detectedType,isSubmitting,recentEntries,submit}=useCapture()
  const taRef=useRef<HTMLTextAreaElement>(null)
  const s=detectedType?TS[detectedType]:null
  async function handleKey(e:React.KeyboardEvent){if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();await submit()}}
  return (
    <Shell>
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',alignItems:'center',padding:'32px 24px 24px'}}>
        <div style={{width:'100%',maxWidth:560,marginBottom:24}}>
          <h1 style={{fontSize:22,fontWeight:600,marginBottom:4}}>Quick Capture</h1>
          <p style={{fontSize:13,color:'var(--text-3)'}}>Schreib einfach – Claude erkennt automatisch den Typ und speichert ihn.</p>
        </div>
        {s&&text.trim()&&<div className="animate-in" style={{width:'100%',maxWidth:560,background:s.bg,border:`1px solid ${s.color}44`,borderRadius:'var(--r-lg)',padding:'10px 14px',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
          <span style={{padding:'2px 9px',borderRadius:99,fontSize:10.5,fontFamily:'var(--font-mono)',fontWeight:600,background:`${s.color}22`,color:s.color,letterSpacing:'.04em'}}>{s.label}</span>
          <span style={{fontSize:12.5,color:'var(--text-2)'}}>Erkannt als <strong style={{color:s.color}}>{s.label}</strong></span>
          <span style={{fontSize:11,color:'var(--text-3)',fontFamily:'var(--font-mono)',marginLeft:'auto'}}>{s.desc}</span>
        </div>}
        <div style={{width:'100%',maxWidth:560,background:'var(--bg-3)',border:`1px solid ${s?`${s.color}55`:'var(--border-2)'}`,borderRadius:'var(--r-xl)',padding:'16px',marginBottom:14,transition:'border-color .2s',boxShadow:s?`0 0 0 3px ${s.color}11`:'none'}}>
          <textarea ref={taRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={handleKey} placeholder={`"${EXAMPLES[0]}"`}
            style={{width:'100%',background:'transparent',border:'none',outline:'none',color:'var(--text)',fontFamily:'var(--font-sans)',fontSize:15,lineHeight:1.65,resize:'none',minHeight:80}} autoFocus/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)'}}>
            <div style={{display:'flex',gap:6}}>
              {Object.entries(TS).map(([type,st])=>(
                <div key={type} style={{padding:'3px 10px',borderRadius:99,fontSize:11,fontFamily:'var(--font-mono)',border:`1px solid ${detectedType===type?st.color:'transparent'}`,background:detectedType===type?st.bg:'transparent',color:detectedType===type?st.color:'var(--text-4)',transition:'all .15s'}}>{st.label}</div>
              ))}
            </div>
            <button onClick={submit} disabled={isSubmitting||!text.trim()} style={{padding:'8px 18px',background:text.trim()?'var(--accent)':'var(--bg-5)',color:text.trim()?'#fff':'var(--text-4)',border:'none',borderRadius:'var(--r-md)',fontSize:13,fontWeight:500,fontFamily:'var(--font-sans)',cursor:text.trim()&&!isSubmitting?'pointer':'default'}}>
              {isSubmitting?'Speichere…':'⌘↵ Speichern'}
            </button>
          </div>
        </div>
        {!text&&<div style={{width:'100%',maxWidth:560,marginBottom:24}}>
          <div className="label" style={{marginBottom:10}}>Beispiele</div>
          {EXAMPLES.map(ex=>{const t=classifyLocally(ex);const es=t?TS[t]:null;return(
            <button key={ex} onClick={()=>{setText(ex);taRef.current?.focus()}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:'var(--r-md)',background:'var(--bg-3)',border:'1px solid var(--border)',cursor:'pointer',textAlign:'left',width:'100%',marginBottom:6}} onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--border-2)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
              {es&&<span style={{padding:'2px 7px',borderRadius:99,fontSize:10,fontFamily:'var(--font-mono)',background:es.bg,color:es.color,flexShrink:0}}>{es.label}</span>}
              <span style={{fontSize:13,color:'var(--text-2)'}}>{ex}</span>
            </button>
          )})}
        </div>}
        {recentEntries.length>0&&<div style={{width:'100%',maxWidth:560}}>
          <div className="label" style={{marginBottom:10}}>Gerade gespeichert</div>
          {recentEntries.map((entry,i)=>{const es=TS[entry.type];return(
            <div key={i} className="animate-in" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',marginBottom:6}}>
              <span style={{padding:'2px 8px',borderRadius:99,fontSize:10.5,fontFamily:'var(--font-mono)',background:es.bg,color:es.color,flexShrink:0}}>{es.label}</span>
              <span style={{fontSize:13,color:'var(--text)',flex:1}}>{entry.title}</span>
              {entry.date&&<span style={{fontSize:11,color:'var(--text-3)',fontFamily:'var(--font-mono)'}}>{entry.date}{entry.time?` · ${entry.time}`:''}</span>}
              <span style={{fontSize:11,color:'var(--green)'}}>✓</span>
            </div>
          )})}
        </div>}
      </div>
    </Shell>
  )
}
