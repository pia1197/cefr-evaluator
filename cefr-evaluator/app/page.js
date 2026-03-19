'use client';
import { useState, useRef, useEffect } from 'react';

const cefrColors = {
  A1: { bg: 'rgba(74,222,128,0.15)', border: '#4ade80', text: '#4ade80' },
  A2: { bg: 'rgba(134,239,172,0.15)', border: '#86efac', text: '#86efac' },
  B1: { bg: 'rgba(96,165,250,0.15)', border: '#60a5fa', text: '#60a5fa' },
  B2: { bg: 'rgba(147,197,253,0.15)', border: '#93c5fd', text: '#93c5fd' },
  C1: { bg: 'rgba(244,114,182,0.15)', border: '#f472b6', text: '#f472b6' },
  C2: { bg: 'rgba(249,168,212,0.15)', border: '#f9a8d4', text: '#f9a8d4' },
};
const levelNames = { A1:'Breakthrough', A2:'Waystage', B1:'Threshold', B2:'Vantage', C1:'Advanced', C2:'Mastery' };

const WRITING_PROMPT = "Describe a memorable journey or trip you have taken. Include where you went, who you were with, what you did, and explain why this experience was meaningful to you. (150–250 words recommended)";
const SPEAKING_PROMPT = "Talk about a person who has had a great influence on your life. Describe who they are, how you met them, what qualities they have, and explain how they have influenced you.";

export default function Home() {
  const [tab, setTab] = useState('writing');
  const [writingText, setWritingText] = useState('');
  const [speakingMethod, setSpeakingMethod] = useState('record');
  const [speakingText, setSpeakingText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState('00:00');
  const [recordStatus, setRecordStatus] = useState('Haz clic para comenzar a grabar');
  const [writingResult, setWritingResult] = useState(null);
  const [speakingResult, setSpeakingResult] = useState(null);
  const [writingLoading, setWritingLoading] = useState(false);
  const [speakingLoading, setSpeakingLoading] = useState(false);
  const [writingError, setWritingError] = useState('');
  const [speakingError, setSpeakingError] = useState('');

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const secondsRef = useRef(0);
  const transcriptRef = useRef('');

  const wordCount = writingText.trim() ? writingText.trim().split(/\s+/).length : 0;

  function startRecording() {
    transcriptRef.current = '';
    setTranscript('');
    setRecordStatus('Grabando… habla en inglés');
    setIsRecording(true);
    secondsRef.current = 0;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i].transcript;
          if (e.results[i].isFinal) { transcriptRef.current += t + ' '; }
          else interim = t;
        }
        setTranscript((transcriptRef.current + interim).trim() || 'Escuchando…');
      };
      rec.onerror = () => setTranscript(transcriptRef.current || 'Error de micrófono. Usa el modo texto.');
      rec.start();
      recognitionRef.current = rec;
    }

    timerRef.current = setInterval(() => {
      secondsRef.current++;
      const m = String(Math.floor(secondsRef.current / 60)).padStart(2, '0');
      const s = String(secondsRef.current % 60).padStart(2, '0');
      setTimer(m + ':' + s);
    }, 1000);
  }

  function stopRecording() {
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    clearInterval(timerRef.current);
    setRecordStatus('Grabación completada. Listo para evaluar.');
  }

  async function evaluate(type) {
    const text = type === 'writing' ? writingText : (speakingMethod === 'record' ? transcriptRef.current : speakingText);
    if (!text || text.trim().length < 20) {
      const msg = 'Por favor ingresa al menos 20 palabras para evaluar.';
      type === 'writing' ? setWritingError(msg) : setSpeakingError(msg);
      return;
    }

    if (type === 'writing') { setWritingLoading(true); setWritingError(''); setWritingResult(null); }
    else { setSpeakingLoading(true); setSpeakingError(''); setSpeakingResult(null); }

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, text: text.trim(), prompt: type === 'writing' ? WRITING_PROMPT : SPEAKING_PROMPT })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (type === 'writing') setWritingResult(data);
      else setSpeakingResult(data);
    } catch (err) {
      const msg = 'Error al evaluar: ' + err.message;
      type === 'writing' ? setWritingError(msg) : setSpeakingError(msg);
    } finally {
      if (type === 'writing') setWritingLoading(false);
      else setSpeakingLoading(false);
    }
  }

  function resetPanel(type) {
    if (type === 'writing') { setWritingText(''); setWritingResult(null); setWritingError(''); }
    else { transcriptRef.current = ''; setTranscript(''); setSpeakingText(''); setSpeakingResult(null); setSpeakingError(''); setTimer('00:00'); setRecordStatus('Haz clic para comenzar a grabar'); }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        :root{--bg:#0a0a0f;--surface:#111118;--surface2:#1a1a24;--border:#2a2a3a;--accent:#7c6af7;--text:#e8e8f0;--text-muted:#6a6a8a;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;overflow-x:hidden;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 40% at 20% 20%,rgba(124,106,247,.12) 0%,transparent 60%),radial-gradient(ellipse 50% 35% at 80% 80%,rgba(106,247,197,.08) 0%,transparent 60%);pointer-events:none;z-index:0;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:scale(.8);opacity:.5}40%{transform:scale(1.2);opacity:1}}
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(248,113,113,.4)}70%{box-shadow:0 0 0 16px rgba(248,113,113,0)}100%{box-shadow:0 0 0 0 rgba(248,113,113,0)}}
      `}</style>

      <div style={{maxWidth:900,margin:'0 auto',padding:'0 24px',position:'relative',zIndex:1}}>

        {/* Header */}
        <header style={{padding:'48px 0 32px',textAlign:'center',borderBottom:'1px solid var(--border)',marginBottom:48}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'var(--surface2)',border:'1px solid var(--border)',padding:'6px 16px',borderRadius:100,fontFamily:"'DM Mono',monospace",fontSize:11,color:'var(--accent)',letterSpacing:2,textTransform:'uppercase',marginBottom:24}}>
            ◆ Marco Común Europeo · CEFR
          </div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(36px,5vw,64px)',fontWeight:900,lineHeight:1.05,letterSpacing:-1,marginBottom:12}}>
            English <span style={{color:'var(--accent)',fontStyle:'italic'}}>AI</span> Evaluator
          </h1>
          <p style={{color:'var(--text-muted)',fontSize:15,fontWeight:300,maxWidth:460,margin:'0 auto',lineHeight:1.6}}>
            Evaluación inteligente de Speaking y Writing según los descriptores del MCER / CEFR
          </p>
        </header>

        {/* CEFR Scale */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,marginBottom:48}}>
          {[['A1','Breakthrough','#4ade80'],['A2','Waystage','#86efac'],['B1','Threshold','#60a5fa'],['B2','Vantage','#93c5fd'],['C1','Advanced','#f472b6'],['C2','Mastery','#f9a8d4']].map(([lvl,name,color])=>(
            <div key={lvl} style={{background:'var(--surface)',border:`1px solid ${color}`,borderRadius:8,padding:'10px 4px',textAlign:'center'}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:500,color,display:'block',marginBottom:3}}>{lvl}</span>
              <span style={{fontSize:9,color:'var(--text-muted)',letterSpacing:.5}}>{name}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,background:'var(--surface)',border:'1px solid var(--border)',padding:4,borderRadius:12,marginBottom:32}}>
          {[['writing','✍️ Writing'],['speaking','🎙️ Speaking']].map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'12px 20px',background:tab===t?'var(--accent)':'transparent',border:'none',color:tab===t?'#fff':'var(--text-muted)',fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,cursor:'pointer',borderRadius:8,transition:'all .2s',boxShadow:tab===t?'0 4px 20px rgba(124,106,247,.4)':'none'}}>
              {label}
            </button>
          ))}
        </div>

        {/* WRITING PANEL */}
        {tab === 'writing' && (
          <div style={{animation:'fadeIn .3s ease'}}>
            {!writingResult ? (
              <>
                <div style={{background:'linear-gradient(135deg,rgba(124,106,247,.1),rgba(106,247,197,.05))',border:'1px solid rgba(124,106,247,.3)',borderRadius:12,padding:20,marginBottom:20}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'var(--accent)',letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>📝 Writing Prompt</div>
                  <p style={{fontSize:15,lineHeight:1.6}}>{WRITING_PROMPT}</p>
                </div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'var(--accent)',letterSpacing:2,textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                  Tu respuesta <span style={{flex:1,height:1,background:'var(--border)',display:'inline-block'}}/>
                </div>
                <textarea value={writingText} onChange={e=>setWritingText(e.target.value)} placeholder="Write your response in English here..." style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,color:'var(--text)',fontFamily:"'DM Sans',sans-serif",fontSize:15,lineHeight:1.7,padding:20,resize:'vertical',minHeight:200,outline:'none'}}/>
                <div style={{textAlign:'right',fontSize:12,color:'var(--text-muted)',fontFamily:"'DM Mono',monospace",marginTop:6}}>{wordCount} words</div>
                {writingError && <div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',borderRadius:12,padding:16,fontSize:14,color:'#fca5a5',marginTop:12}}>{writingError}</div>}
                <button onClick={()=>evaluate('writing')} disabled={writingLoading} style={{width:'100%',padding:16,background:'var(--accent)',border:'none',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:600,cursor:writingLoading?'not-allowed':'pointer',borderRadius:12,marginTop:20,opacity:writingLoading?.6:1}}>
                  {writingLoading ? '⏳ Evaluando…' : '✦ Evaluate Writing'}
                </button>
                {writingLoading && <Loader text="Analyzing grammar, coherence, vocabulary and CEFR criteria…"/>}
              </>
            ) : (
              <Results data={writingResult} skillType="writing" onReset={()=>resetPanel('writing')}/>
            )}
          </div>
        )}

        {/* SPEAKING PANEL */}
        {tab === 'speaking' && (
          <div style={{animation:'fadeIn .3s ease'}}>
            {!speakingResult ? (
              <>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
                  {[['record','🎙️','Grabar audio','Transcripción automática'],['text','💬','Ingresar texto','Pega la transcripción']].map(([m,icon,title,desc])=>(
                    <div key={m} onClick={()=>setSpeakingMethod(m)} style={{background:'var(--surface)',border:`2px solid ${speakingMethod===m?'var(--accent)':'var(--border)'}`,borderRadius:12,padding:20,cursor:'pointer',textAlign:'center',background:speakingMethod===m?'rgba(124,106,247,.08)':'var(--surface)'}}>
                      <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
                      <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>{title}</div>
                      <div style={{fontSize:12,color:'var(--text-muted)'}}>{desc}</div>
                    </div>
                  ))}
                </div>

                <div style={{background:'linear-gradient(135deg,rgba(124,106,247,.1),rgba(106,247,197,.05))',border:'1px solid rgba(124,106,247,.3)',borderRadius:12,padding:20,marginBottom:20}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'var(--accent)',letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>🎤 Speaking Prompt</div>
                  <p style={{fontSize:15,lineHeight:1.6}}>{SPEAKING_PROMPT}</p>
                </div>

                {speakingMethod === 'record' && (
                  <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:32,textAlign:'center',marginBottom:16}}>
                    <button onClick={isRecording?stopRecording:startRecording} style={{width:72,height:72,borderRadius:'50%',background:isRecording?'rgba(248,113,113,.15)':'var(--surface2)',border:`2px solid ${isRecording?'#f87171':'var(--border)'}`,color:'var(--text)',fontSize:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',animation:isRecording?'pulse 1.2s infinite':'none'}}>
                      {isRecording ? '⏹' : '🎙️'}
                    </button>
                    <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:8}}>{recordStatus}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:24,fontWeight:500}}>{timer}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'var(--accent)',letterSpacing:2,textTransform:'uppercase',margin:'20px 0 8px',textAlign:'left'}}>Transcripción en tiempo real</div>
                    <div style={{background:'var(--surface2)',borderRadius:8,padding:16,fontSize:14,lineHeight:1.7,color:'var(--text-muted)',minHeight:80,textAlign:'left',fontStyle:'italic'}}>
                      {transcript || 'Tu discurso aparecerá aquí mientras hablas…'}
                    </div>
                  </div>
                )}

                {speakingMethod === 'text' && (
                  <textarea value={speakingText} onChange={e=>setSpeakingText(e.target.value)} placeholder="Paste or type the spoken text in English here..." style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,color:'var(--text)',fontFamily:"'DM Sans',sans-serif",fontSize:15,lineHeight:1.7,padding:20,resize:'vertical',minHeight:160,outline:'none',marginBottom:16}}/>
                )}

                {speakingError && <div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',borderRadius:12,padding:16,fontSize:14,color:'#fca5a5',marginBottom:12}}>{speakingError}</div>}

                <button onClick={()=>evaluate('speaking')} disabled={speakingLoading} style={{width:'100%',padding:16,background:'var(--accent)',border:'none',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:600,cursor:speakingLoading?'not-allowed':'pointer',borderRadius:12,marginTop:8,opacity:speakingLoading?.6:1}}>
                  {speakingLoading ? '⏳ Evaluando…' : '✦ Evaluate Speaking'}
                </button>
                {speakingLoading && <Loader text="Evaluating fluency, grammar, vocabulary and discourse…"/>}
              </>
            ) : (
              <Results data={speakingResult} skillType="speaking" onReset={()=>resetPanel('speaking')}/>
            )}
          </div>
        )}

        <div style={{height:64}}/>
      </div>
    </>
  );
}

function Loader({ text }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'32px 0',textAlign:'center'}}>
      <div style={{display:'flex',gap:6}}>
        {[0,.15,.3].map((d,i)=>(
          <span key={i} style={{width:8,height:8,borderRadius:'50%',background:'var(--accent)',display:'inline-block',animation:`bounce 1.2s ${d}s infinite`}}/>
        ))}
      </div>
      <p style={{fontSize:14,color:'var(--text-muted)'}}>{text}</p>
    </div>
  );
}

function Results({ data, skillType, onReset }) {
  const c = cefrColors[data.level] || cefrColors['B1'];
  const skillLabel = skillType === 'writing' ? '✍️ Writing' : '🎤 Speaking';

  return (
    <div style={{animation:'fadeIn .4s ease'}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:24,background:'var(--surface)',border:`1px solid ${c.border}`,borderRadius:16,padding:28,marginBottom:24}}>
        <div style={{minWidth:88,height:88,borderRadius:16,background:c.bg,border:`2px solid ${c.border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,color:c.text}}>{data.level}</span>
          <span style={{fontSize:10,letterSpacing:1,textTransform:'uppercase',color:c.text,opacity:.8}}>{levelNames[data.level]}</span>
        </div>
        <div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,marginBottom:6}}>{skillLabel} · {data.level} — {levelNames[data.level]}</h2>
          <p style={{fontSize:14,color:'var(--text-muted)',lineHeight:1.6}}>{data.summary}</p>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:24}}>
        {data.criteria.map(cr=>(
          <div key={cr.name} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:16}}>
            <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:10,fontFamily:"'DM Mono',monospace"}}>{cr.name}</div>
            <div style={{background:'var(--surface2)',borderRadius:100,height:6,marginBottom:8}}>
              <div style={{height:'100%',borderRadius:100,background:c.border,width:`${cr.score*4}%`,transition:'width 1s cubic-bezier(.16,1,.3,1)'}}/>
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:500,color:c.text}}>{cr.score}<span style={{fontSize:14,color:'var(--text-muted)'}}>/25</span></div>
          </div>
        ))}
      </div>

      {[['strengths','✅ Fortalezas','rgba(74,222,128,.08)','rgba(74,222,128,.2)','#4ade80'],
        ['improvements','📈 Áreas de mejora','rgba(251,191,36,.08)','rgba(251,191,36,.2)','#fbbf24'],
        ['errors','⚠️ Errores frecuentes','rgba(248,113,113,.08)','rgba(248,113,113,.2)','#f87171']
      ].map(([key,title,bg,border,color])=>(
        <div key={key} style={{background:bg,border:`1px solid ${border}`,borderRadius:12,padding:18,marginBottom:12,fontSize:14,lineHeight:1.7}}>
          <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:1.5,fontFamily:"'DM Mono',monospace",marginBottom:8,fontWeight:500,color}}>{title}</div>
          {data[key]}
        </div>
      ))}

      <button onClick={onReset} style={{width:'100%',padding:14,background:'transparent',border:'1px solid var(--border)',color:'var(--text-muted)',fontFamily:"'DM Sans',sans-serif",fontSize:14,cursor:'pointer',borderRadius:12,marginTop:12}}>
        ↩ Nueva evaluación
      </button>
    </div>
  );
}
