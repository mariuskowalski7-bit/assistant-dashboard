'use client'
import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Shell } from '@/components/layout/Shell'
import { useChat } from '@/components/chat/useChat'
import type { ChatMessage } from '@/types'

const TYPE_STYLE: Record<string,{bg:string;color:string;label:string}> = {
  event:    {bg:'var(--accent-dim)',color:'var(--accent-2)',label:'EVENT'},
  task:     {bg:'var(--teal-dim)',  color:'var(--teal)',    label:'TASK'},
  reminder: {bg:'var(--amber-dim)',color:'var(--amber)',    label:'REMINDER'},
  note:     {bg:'var(--green-dim)',color:'var(--green)',    label:'NOTE'},
}

function Bubble({msg}:{msg:ChatMessage}) {
  const isUser = msg.role === 'user'
  const ex = msg.extracted
  const s = ex ? (TYPE_STYLE[ex.type] ?? TYPE_STYLE.note) : null
  const time = new Date(msg.created_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})
  return (
    <div className="animate-in" style={{display:'flex',gap:10,flexDirection:isUser?'row-reverse':'row'}}>
      <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,marginTop:2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,background:isUser?'linear-gradient(135deg,var(--accent) 0%,var(--teal) 100%)':'var(--bg-4)',border:isUser?'none':'1px solid var(--border-2)',color:isUser?'#fff':'var(--accent-2)'}}>
        {isUser?'Du':'C'}
      </div>
      <div style={{maxWidth:'78%'}}>
        <div style={{padding:'10px 14px',borderRadius:isUser?'14px 4px 14px 14px':'4px 14px 14px 14px',background:isUser?'var(--accent)':'var(--bg-3)',border:isUser?'none':'1px solid var(--border)',fontSize:13.5,lineHeight:1.65,color:'var(--text)',whiteSpace:'pre-wrap'}}>
          {msg.content}
        </div>
        {ex && s && (
          <div style={{marginTop:6,display:'flex',alignItems:'center',gap:8,background:'var(--bg-4)',border:'1px solid var(--border-2)',borderRadius:'var(--r-md)',padding:'8px 12px',fontSize:12.5}}>
            <span style={{padding:'2px 8px',borderRadius:99,background:s.bg,color:s.color,fontSize:10.5,fontFamily:'var(--font-mono)',fontWeight:500,letterSpacing:'.04em',flexShrink:0}}>{s.label}</span>
            <span style={{color:'var(--text)'}}>{ex.title}</span>
            {(ex.date||ex.time) && <span style={{color:'var(--text-3)',fontFamily:'var(--font-mono)',fontSize:11,marginLeft:'auto'}}>{ex.date}{ex.time?` · ${ex.time}`:''}</span>}
          </div>
        )}
        <div style={{fontSize:11,color:'var(--text-4)',marginTop:4,fontFamily:'var(--font-mono)',textAlign:isUser?'right':'left'}}>{time}</div>
      </div>
    </div>
  )
}

const CHIPS = ['Was steht heute an?','Neue Aufgabe anlegen','Erinnere mich …','YouTube-Stats zeigen']

export default function ChatPage() {
  const {messages,isLoading,send} = useChat()
  const [input,setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[messages,isLoading])

  async function handleSend() {
    const t = input.trim(); if(!t||isLoading) return
    setInput(''); if(taRef.current) taRef.current.style.height='auto'
    await send(t)
  }
  function onKey(e:KeyboardEvent<HTMLTextAreaElement>) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }
  function grow(el:HTMLTextAreaElement){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px'}

  return (
    <Shell>
      <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
        <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'var(--teal)',boxShadow:'0 0 6px var(--teal)',animation:'pulse 2s ease infinite'}}/>
          <span style={{fontSize:13,color:'var(--text-2)'}}>Claude · Persönlicher Assistent</span>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px 20px 8px',display:'flex',flexDirection:'column',gap:16}}>
          {messages.length===0 && (
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,color:'var(--text-3)',textAlign:'center',animation:'fade-in .4s ease both'}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent) 0%,var(--teal) 100%)',opacity:.3}}/>
              <div style={{fontSize:14}}>Womit kann ich dir helfen?</div>
            </div>
          )}
          {messages.map(m=><Bubble key={m.id} msg={m}/>)}
          {isLoading && (
            <div style={{display:'flex',gap:10}}>
              <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,background:'var(--bg-4)',border:'1px solid var(--border-2)',color:'var(--accent-2)'}}>C</div>
              <div style={{padding:'12px 16px',borderRadius:'4px 14px 14px 14px',background:'var(--bg-3)',border:'1px solid var(--border)',display:'flex',alignItems:'center',gap:5}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'var(--text-3)',animation:`pulse 1.2s ease ${i*.2}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:'10px 16px 14px',borderTop:'1px solid var(--border)',flexShrink:0}}>
          {messages.length===0 && (
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
              {CHIPS.map(c=>(
                <button key={c} onClick={()=>{setInput(c);taRef.current?.focus()}}
                  style={{padding:'5px 12px',borderRadius:99,fontSize:12,fontFamily:'var(--font-sans)',background:'var(--bg-3)',border:'1px solid var(--border-2)',color:'var(--text-2)',cursor:'pointer'}}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <div style={{display:'flex',alignItems:'flex-end',gap:8,background:'var(--bg-3)',border:'1px solid var(--border-2)',borderRadius:'var(--r-xl)',padding:'10px 12px'}}>
            <textarea ref={taRef} value={input} onChange={e=>{setInput(e.target.value);grow(e.target)}} onKeyDown={onKey} rows={1} placeholder="Sag mir, was du vorhast…"
              style={{flex:1,background:'transparent',border:'none',outline:'none',color:'var(--text)',fontFamily:'var(--font-sans)',fontSize:13.5,resize:'none',lineHeight:1.5,maxHeight:120}}/>
            <button onClick={handleSend} disabled={isLoading||!input.trim()}
              style={{width:32,height:32,borderRadius:'var(--r-md)',background:input.trim()?'var(--accent)':'var(--bg-5)',border:'none',cursor:input.trim()?'pointer':'default',color:'#fff',fontSize:14,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>↑</button>
          </div>
        </div>
      </div>
    </Shell>
  )
}
