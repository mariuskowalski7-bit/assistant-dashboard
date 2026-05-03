'use client'

import { Shell } from '@/components/layout/Shell'
import { useYouTube } from '@/components/youtube/useYouTube'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}
function fmtDur(s: number): string {
  const m = Math.floor(s/60); return `${m}:${String(Math.round(s%60)).padStart(2,'0')}`
}

function Skel({h=36,mb=8}:{h?:number;mb?:number}){
  return <div style={{height:h,background:'var(--bg-4)',borderRadius:'var(--r-md)',marginBottom:mb,animation:'pulse 1.5s ease infinite'}}/>
}

const PERIODS: Array<{value:'7d'|'28d'|'90d';label:string}> = [
  {value:'7d',label:'7 Tage'},{value:'28d',label:'28 Tage'},{value:'90d',label:'90 Tage'},
]

export default function YouTubePage() {
  const { data, isLoading, isConnected, error, period, setPeriod, connectUrl } = useYouTube()

  return (
    <Shell>
      <div style={{ flex:1, overflowY:'auto', padding:'22px 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:600 }}>YouTube Analytics</h1>
            {data && <div style={{ fontSize:13, color:'var(--text-3)', marginTop:2 }}>{data.video.snippet.channelTitle}</div>}
          </div>
          {/* Period switcher */}
          <div style={{ display:'flex', gap:6 }}>
            {PERIODS.map(p=>(
              <button key={p.value} onClick={()=>setPeriod(p.value)} style={{
                padding:'6px 14px', borderRadius:'var(--r-md)', fontSize:12,
                fontFamily:'var(--font-mono)',
                border:'1px solid var(--border-2)',
                background: period===p.value ? 'var(--accent-dim)' : 'transparent',
                color: period===p.value ? 'var(--accent-2)' : 'var(--text-3)',
                cursor:'pointer', transition:'all .15s',
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* Not connected */}
        {!isConnected && (
          <div style={{ textAlign:'center', padding:'60px 24px' }}>
            <div style={{ fontSize:36, marginBottom:16 }}>▶</div>
            <div style={{ fontSize:16, fontWeight:500, marginBottom:8 }}>YouTube nicht verbunden</div>
            <div style={{ fontSize:13, color:'var(--text-3)', marginBottom:20 }}>
              Verbinde deinen YouTube-Kanal, um Analytics zu sehen.
            </div>
            <a href={connectUrl} style={{
              display:'inline-block', padding:'10px 24px',
              background:'#ff0000', color:'#fff', borderRadius:'var(--r-lg)',
              fontSize:13, fontWeight:500, textDecoration:'none',
            }}>
              Mit YouTube verbinden
            </a>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding:'12px 16px', borderRadius:'var(--r-lg)', background:'var(--coral-dim)', color:'var(--coral)', fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && isConnected && (
          <div style={{ maxWidth:680 }}>
            <Skel h={200} mb={16}/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
              {[0,1,2,3].map(i=><Skel key={i} h={70} mb={0}/>)}
            </div>
            <Skel h={120}/>
          </div>
        )}

        {/* Data */}
        {data && !isLoading && (() => {
          const {video, totals, insights} = data
          const thumb = video.snippet.thumbnails.maxres ?? video.snippet.thumbnails.high

          return (
            <div style={{ maxWidth:680 }}>
              {/* Video header */}
              <div style={{ display:'flex', gap:16, marginBottom:22, background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:16 }}>
                <img src={thumb.url} alt={video.snippet.title}
                  style={{ width:160, height:90, objectFit:'cover', borderRadius:'var(--r-md)', flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500, lineHeight:1.5, marginBottom:6 }}>
                    {video.snippet.title}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}>
                    {new Date(video.snippet.publishedAt).toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)', marginTop:4 }}>
                    {video.contentDetails.definition.toUpperCase()} · {video.contentDetails.duration.replace('PT','').replace('M',':').replace('S','')}
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:22 }}>
                {[
                  {label:'VIEWS',     val:fmt(totals.views),                                  hi:false},
                  {label:'CTR',       val:`${totals.ctr.toFixed(1)}%`,                         hi:totals.ctr>=6},
                  {label:'WATCHTIME', val:fmtDur(totals.averageViewDuration),                  hi:false},
                  {label:'WIEDERG. %',val:`${totals.averageViewPercentage.toFixed(0)}%`,        hi:totals.averageViewPercentage>=40},
                  {label:'IMPRESSIONEN', val:fmt(totals.impressions),                          hi:false},
                  {label:'LIKES',     val:fmt(totals.likes),                                   hi:false},
                  {label:'KOMMENTARE',val:fmt(totals.comments),                                hi:false},
                  {label:'ABONNENTEN +',val:`+${totals.subscribersGained}`,                    hi:totals.subscribersGained>0},
                ].map(s=>(
                  <div key={s.label} style={{
                    background:'var(--bg-3)', border:`1px solid ${s.hi?'var(--teal)':'var(--border)'}`,
                    borderRadius:'var(--r-md)', padding:'12px 14px',
                  }}>
                    <div style={{ fontSize:20, fontWeight:600, color:s.hi?'var(--teal)':'var(--text)', lineHeight:1, marginBottom:4 }}>{s.val}</div>
                    <div className="label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Claude Insights */}
              {insights && (
                <div style={{
                  background:'var(--accent-dim)',
                  border:'1px solid var(--accent-glow)',
                  borderRadius:'var(--r-xl)',
                  padding:'16px 20px',
                  marginBottom:22,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                    <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--accent)',boxShadow:'0 0 6px var(--accent)',animation:'pulse 2s ease infinite' }}/>
                    <span className="label" style={{ color:'var(--accent-2)' }}>CLAUDE INSIGHTS</span>
                  </div>
                  <p style={{ fontSize:13.5, lineHeight:1.65, color:'var(--text)', marginBottom:14 }}>
                    {insights.summary}
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:14 }}>
                    <div>
                      <div className="label" style={{ color:'var(--green)', marginBottom:8 }}>✓ STÄRKEN</div>
                      {insights.strengths.map((s,i)=>(
                        <div key={i} style={{ fontSize:12.5, color:'var(--text-2)', marginBottom:5, lineHeight:1.5 }}>· {s}</div>
                      ))}
                    </div>
                    <div>
                      <div className="label" style={{ color:'var(--amber)', marginBottom:8 }}>↑ VERBESSERUNGEN</div>
                      {insights.improvements.map((s,i)=>(
                        <div key={i} style={{ fontSize:12.5, color:'var(--text-2)', marginBottom:5, lineHeight:1.5 }}>· {s}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    background:'var(--bg-3)', borderRadius:'var(--r-md)',
                    padding:'10px 14px', fontSize:13, lineHeight:1.6, color:'var(--text)',
                  }}>
                    <span style={{ color:'var(--accent-2)', fontWeight:500 }}>Empfehlung: </span>
                    {insights.suggestion}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </Shell>
  )
}
