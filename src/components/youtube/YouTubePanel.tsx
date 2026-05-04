'use client'

import { useState } from 'react'
import { useYouTube } from './useYouTube'
import type { PublicYouTubeData, StudioYouTubeData } from '@/lib/youtube/types'

function fmt(n: string | number | undefined): string {
  if (n === undefined || n === '') return '—'
  const num = Number(n)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000)     return `${(num / 1_000).toFixed(1)}K`
  return String(Math.round(num))
}
function fmtDur(iso: string | undefined): string {
  if (!iso) return ''
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return ''
  const h = Number(m[1] ?? 0), min = Number(m[2] ?? 0), s = Number(m[3] ?? 0)
  return h > 0 ? `${h}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${min}:${String(s).padStart(2,'0')}`
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}
function Skel({ h = 36, mb = 6 }: { h?: number; mb?: number }) {
  return <div style={{ height: h, background: 'var(--bg-4)', borderRadius: 'var(--r-md)', marginBottom: mb, animation: 'pulse 1.5s ease infinite' }} />
}

function ModeBadge({ mode }: { mode: 'public' | 'studio' }) {
  const pub = mode === 'public'
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:99, fontSize:10.5, fontFamily:'var(--font-mono)', background: pub?'var(--amber-dim)':'var(--teal-dim)', color: pub?'var(--amber)':'var(--teal)', border:`1px solid ${pub?'var(--amber)':'var(--teal)'}44` }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor', display:'inline-block' }}/>
      {pub ? 'Public Mode' : 'Studio'}
    </span>
  )
}

type PubVideo = PublicYouTubeData['videos'][0]

function PubCard({ v, compact }: { v: PubVideo; compact: boolean }) {
  return (
    <a href={v.videoUrl} target="_blank" rel="noopener noreferrer" style={{ display:'block', textDecoration:'none', color:'inherit' }}>
      <div style={{ background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}
        onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--border-2)')}
        onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
        <div style={{ position:'relative', width:'100%', paddingTop:'56.25%', background:'#000', overflow:'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.thumbnail} alt={v.title} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'cover' }}/>
          {v.duration && <div style={{ position:'absolute', bottom:6, right:6, background:'rgba(0,0,0,.85)', color:'#fff', fontSize:11, fontFamily:'var(--font-mono)', padding:'2px 6px', borderRadius:4 }}>{fmtDur(v.duration)}</div>}
        </div>
        <div style={{ padding: compact ? '8px 10px' : '10px 12px' }}>
          <div style={{ fontSize:compact?12:13, fontWeight:500, color:'var(--text)', lineHeight:1.4, marginBottom:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{v.title}</div>
          <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)', marginBottom: compact||!v.viewCount?0:6 }}>{fmtDate(v.publishedAt)}</div>
          {!compact && (v.viewCount||v.likeCount) && (
            <div style={{ display:'flex', gap:12 }}>
              {v.viewCount    && <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}><strong style={{ color:'var(--text-2)', fontSize:13, display:'block' }}>{fmt(v.viewCount)}</strong>Views</div>}
              {v.likeCount    && <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}><strong style={{ color:'var(--text-2)', fontSize:13, display:'block' }}>{fmt(v.likeCount)}</strong>Likes</div>}
              {v.commentCount && <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}><strong style={{ color:'var(--text-2)', fontSize:13, display:'block' }}>{fmt(v.commentCount)}</strong>Kommentare</div>}
            </div>
          )}
        </div>
      </div>
    </a>
  )
}

function PublicPanel({ data, compact }: { data: PublicYouTubeData; compact: boolean }) {
  const latest = data.videos[0]
  if (!latest) return <div style={{ fontSize:13, color:'var(--text-3)' }}>Keine Videos gefunden.</div>
  if (compact) return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <ModeBadge mode="public"/>
        {data.oauthAvailable && <a href="/api/youtube/auth" style={{ fontSize:11, color:'var(--accent-2)', textDecoration:'none', fontFamily:'var(--font-mono)' }}>Studio verbinden ↗</a>}
      </div>
      <PubCard v={latest} compact/>
    </div>
  )
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <ModeBadge mode="public"/>
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:5 }}>
            {data.oauthAvailable ? 'Öffentliche Daten · Für CTR & Impressionen Google verbinden' : 'Öffentliche Daten · GOOGLE_CLIENT_ID setzen für Studio-Zugang'}
          </div>
        </div>
        {data.oauthAvailable && (
          <a href="/api/youtube/auth" style={{ padding:'6px 14px', borderRadius:'var(--r-md)', background:'var(--accent-dim)', border:'1px solid var(--accent-glow)', color:'var(--accent-2)', fontSize:12, fontFamily:'var(--font-mono)', textDecoration:'none', whiteSpace:'nowrap' }}>
            YouTube Studio verbinden →
          </a>
        )}
      </div>
      <div style={{ marginBottom:16 }}><PubCard v={latest} compact={false}/></div>
      {data.videos.length > 1 && (
        <>
          <div className="label" style={{ marginBottom:10 }}>Ältere Videos</div>
          {data.videos.slice(1).map(v => (
            <a key={v.id} href={v.videoUrl} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', gap:10, alignItems:'center', textDecoration:'none', padding:'6px 8px', borderRadius:'var(--r-md)', marginBottom:4 }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-3)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.thumbnail} alt={v.title} style={{ width:80, height:45, objectFit:'cover', borderRadius:6, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, color:'var(--text)', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.title}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)', marginTop:2 }}>{fmtDate(v.publishedAt)}{v.viewCount?` · ${fmt(v.viewCount)} Views`:''}</div>
              </div>
            </a>
          ))}
        </>
      )}
    </div>
  )
}

function StudioPanel({ data, compact }: { data: StudioYouTubeData; compact: boolean }) {
  const { video, totals, insights } = data
  const thumb = video.snippet.thumbnails.maxres ?? video.snippet.thumbnails.high
  if (compact) return (
    <div>
      <div style={{ marginBottom:8 }}><ModeBadge mode="studio"/></div>
      <div style={{ background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb.url} alt={video.snippet.title} style={{ width:'100%', height:118, objectFit:'cover', display:'block' }}/>
        <div style={{ padding:'8px 10px' }}>
          <div style={{ fontSize:12, fontWeight:500, lineHeight:1.4, marginBottom:6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{video.snippet.title}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
            {[{l:'Views',v:fmt(totals.views)},{l:'CTR',v:`${totals.ctr.toFixed(1)}%`,hi:totals.ctr>=6},{l:'Likes',v:fmt(totals.likes)},{l:'Abonnenten',v:`+${totals.subscribersGained}`}].map(s=>(
              <div key={s.l} style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}>
                <strong style={{ color:(s as {hi?:boolean}).hi?'var(--teal)':'var(--text-2)', fontSize:13, display:'block' }}>{s.v}</strong>{s.l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
  return (
    <div>
      <div style={{ marginBottom:14 }}><ModeBadge mode="studio"/></div>
      <div style={{ display:'flex', gap:14, background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:14, marginBottom:18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb.url} alt={video.snippet.title} style={{ width:140, height:79, objectFit:'cover', borderRadius:'var(--r-md)', flexShrink:0 }}/>
        <div><div style={{ fontSize:13, fontWeight:500, lineHeight:1.5, marginBottom:4 }}>{video.snippet.title}</div><div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}>{fmtDate(video.snippet.publishedAt)}</div></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:18 }}>
        {[
          {l:'VIEWS',v:fmt(totals.views),hi:false},
          {l:'CTR',v:`${totals.ctr.toFixed(1)}%`,hi:totals.ctr>=6},
          {l:'WATCHTIME Ø',v:`${Math.floor(totals.averageViewDuration/60)}:${String(Math.round(totals.averageViewDuration%60)).padStart(2,'0')}`,hi:false},
          {l:'WIEDERG. %',v:`${totals.averageViewPercentage.toFixed(0)}%`,hi:totals.averageViewPercentage>=40},
          {l:'IMPRESSIONEN',v:fmt(totals.impressions),hi:false},
          {l:'LIKES',v:fmt(totals.likes),hi:false},
          {l:'KOMMENTARE',v:fmt(totals.comments),hi:false},
          {l:'ABONNENTEN +',v:`+${totals.subscribersGained}`,hi:totals.subscribersGained>0},
        ].map(s=>(
          <div key={s.l} style={{ background:'var(--bg-3)', border:`1px solid ${s.hi?'var(--teal)':'var(--border)'}`, borderRadius:'var(--r-md)', padding:'10px 12px' }}>
            <div style={{ fontSize:18, fontWeight:600, color:s.hi?'var(--teal)':'var(--text)', lineHeight:1, marginBottom:4 }}>{s.v}</div>
            <div className="label">{s.l}</div>
          </div>
        ))}
      </div>
      {insights && (
        <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-glow)', borderRadius:'var(--r-xl)', padding:'14px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', animation:'pulse 2s ease infinite' }}/>
            <span className="label" style={{ color:'var(--accent-2)' }}>CLAUDE INSIGHTS</span>
          </div>
          <p style={{ fontSize:13, lineHeight:1.65, color:'var(--text)', marginBottom:12 }}>{insights.summary}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div><div className="label" style={{ color:'var(--green)', marginBottom:6 }}>✓ STÄRKEN</div>{insights.strengths.map((s,i)=><div key={i} style={{ fontSize:12, color:'var(--text-2)', marginBottom:4, lineHeight:1.5 }}>· {s}</div>)}</div>
            <div><div className="label" style={{ color:'var(--amber)', marginBottom:6 }}>↑ VERBESSERUNGEN</div>{insights.improvements.map((s,i)=><div key={i} style={{ fontSize:12, color:'var(--text-2)', marginBottom:4, lineHeight:1.5 }}>· {s}</div>)}</div>
          </div>
          <div style={{ background:'var(--bg-3)', borderRadius:'var(--r-md)', padding:'10px 12px', fontSize:13, lineHeight:1.6 }}>
            <span style={{ color:'var(--accent-2)', fontWeight:500 }}>Empfehlung: </span>{insights.suggestion}
          </div>
        </div>
      )}
    </div>
  )
}

function NotConfigured() {
  return (
    <div style={{ padding:16, background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', textAlign:'center' }}>
      <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:6 }}>YouTube nicht konfiguriert</div>
      <div style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.6 }}>
        Setze <code style={{ fontFamily:'var(--font-mono)', fontSize:10.5 }}>NEXT_PUBLIC_YOUTUBE_CHANNEL_ID</code> in den Environment Variables.
      </div>
    </div>
  )
}

export function YouTubeWidget({ onExpand }: { onExpand: () => void }) {
  const { data, isLoading, notConfigured, error } = useYouTube()
  if (notConfigured) return <NotConfigured/>
  if (error) return <div style={{ fontSize:12, color:'var(--coral)', padding:8 }}>{error}</div>
  if (isLoading) return <><Skel h={140} mb={8}/><Skel h={60}/></>
  if (!data) return null
  return <div onClick={onExpand} style={{ cursor:'pointer' }}>{data.mode==='public'?<PublicPanel data={data} compact/>:<StudioPanel data={data} compact/>}</div>
}

export function YouTubeDetail({ onClose }: { onClose: () => void }) {
  const { data, isLoading, notConfigured, error, period, setPeriod } = useYouTube()
  const PERIODS: Array<{value:'7d'|'28d'|'90d';label:string}> = [{value:'7d',label:'7 Tage'},{value:'28d',label:'28 Tage'},{value:'90d',label:'90 Tage'}]
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 }} onClick={onClose}>
      <div style={{ background:'var(--bg-2)', border:'1px solid var(--border-2)', borderRadius:'var(--r-xl)', width:'100%', maxWidth:680, maxHeight:'90vh', overflow:'auto', padding:24 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:600 }}>YouTube</div>
            {data && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3, fontFamily:'var(--font-mono)' }}>{data.mode==='public'?data.videos[0]?.channelTitle:data.video.snippet.channelTitle}</div>}
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {data?.mode==='studio' && PERIODS.map(p=>(
              <button key={p.value} onClick={()=>setPeriod(p.value)} style={{ padding:'5px 10px', borderRadius:'var(--r-md)', fontSize:11, fontFamily:'var(--font-mono)', border:'1px solid var(--border-2)', background:period===p.value?'var(--accent-dim)':'transparent', color:period===p.value?'var(--accent-2)':'var(--text-3)', cursor:'pointer' }}>{p.label}</button>
            ))}
            <button onClick={onClose} style={{ background:'var(--bg-4)', border:'1px solid var(--border-2)', borderRadius:'var(--r-md)', width:30, height:30, cursor:'pointer', color:'var(--text-2)', fontSize:16 }}>×</button>
          </div>
        </div>
        {notConfigured && <NotConfigured/>}
        {error && <div style={{ padding:'12px 16px', borderRadius:'var(--r-md)', background:'var(--coral-dim)', color:'var(--coral)', fontSize:13 }}>{error}</div>}
        {isLoading && <><Skel h={200} mb={12}/><div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>{[0,1,2,3].map(i=><Skel key={i} h={60} mb={0}/>)}</div></>}
        {data && !isLoading && (data.mode==='public'?<PublicPanel data={data} compact={false}/>:<StudioPanel data={data} compact={false}/>)}
      </div>
    </div>
  )
}

export function YouTubePanel() {
  const [open, setOpen] = useState(false)
  return <><YouTubeWidget onExpand={()=>setOpen(true)}/>{open && <YouTubeDetail onClose={()=>setOpen(false)}/>}</>
}
