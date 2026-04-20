'use client';
import { useState, useRef, useEffect } from 'react';

const OXFORD_BLUE = '#002147';
const OXFORD_BLUE_LIGHT = '#003580';
const OXFORD_GOLD = '#c8a951';

const cefrColors = {
  A1: { bg: 'rgba(0,33,71,0.07)', border: '#4a90d9', text: '#003a7a' },
  A2: { bg: 'rgba(0,33,71,0.10)', border: '#2e6db4', text: '#002d6b' },
  B1: { bg: 'rgba(0,53,128,0.08)', border: '#1a5ba0', text: '#003580' },
  B2: { bg: 'rgba(0,33,71,0.13)', border: '#0d4f8c', text: '#002147' },
  C1: { bg: 'rgba(200,169,81,0.12)', border: '#c8a951', text: '#7a6020' },
  C2: { bg: 'rgba(200,169,81,0.18)', border: '#b8941e', text: '#6b5010' },
};
const levelNames = { A1:'Breakthrough', A2:'Waystage', B1:'Threshold', B2:'Vantage', C1:'Advanced', C2:'Mastery' };

const WRITING_PROMPTS = [
  {
    id: 0,
    title: "A Memorable Journey",
    text: "Describe a memorable journey or trip you have taken. Include where you went, who you were with, what you did, and explain why this experience was meaningful to you. (150–250 words recommended)"
  },
  {
    id: 1,
    title: "Technology in Daily Life",
    text: "How has technology changed the way people communicate and interact in everyday life? Discuss both the benefits and drawbacks, giving examples from your own experience. (150–250 words recommended)"
  },
  {
    id: 2,
    title: "An Important Life Decision",
    text: "Describe an important decision you have made in your life. What options did you consider, what did you choose, and what were the consequences? What would you do differently, if anything? (150–250 words recommended)"
  }
];

const SPEAKING_PROMPT = "Talk about a person who has had a great influence on your life. Describe who they are, how you met them, what qualities they have, and explain how they have influenced you.";

export default function Home() {
  const [tab, setTab] = useState('writing');
  const [writingText, setWritingText] = useState('');
  const [activePromptIdx, setActivePromptIdx] = useState(0);
  const [speakingMethod, setSpeakingMethod] = useState('record');
  const [speakingText, setSpeakingText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState('00:00');
  const [recordStatus, setRecordStatus] = useState('Click to start recording');
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
  const activePrompt = WRITING_PROMPTS[activePromptIdx];

  function selectPrompt(idx) {
    setActivePromptIdx(idx);
    setWritingText('');
    setWritingResult(null);
    setWritingError('');
  }

  function startRecording() {
    transcriptRef.current = '';
    setTranscript('');
    setRecordStatus('Recording… speak in English');
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
          const result = e.results[i];
          const t = result && result[0] && result[0].transcript ? result[0].transcript : '';
          if (result.isFinal) { transcriptRef.current += t + ' '; }
          else interim = t;
        }
        const combined = (transcriptRef.current + interim).trim();
        setTranscript(combined || 'Listening…');
      };
      rec.onerror = () => setTranscript(transcriptRef.current || 'Microphone error. Use text mode.');
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
    setRecordStatus('Recording complete. Ready to evaluate.');
  }

  async function evaluate(type) {
    const promptText = type === 'writing' ? activePrompt.text : SPEAKING_PROMPT;
    const text = type === 'writing' ? writingText : (speakingMethod === 'record' ? transcriptRef.current : speakingText);
    if (!text || text.trim().length < 20) {
      const msg = 'Please enter at least 20 words to evaluate.';
      type === 'writing' ? setWritingError(msg) : setSpeakingError(msg);
      return;
    }

    if (type === 'writing') { setWritingLoading(true); setWritingError(''); setWritingResult(null); }
    else { setSpeakingLoading(true); setSpeakingError(''); setSpeakingResult(null); }

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, text: text.trim(), prompt: promptText })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (type === 'writing') setWritingResult(data);
      else setSpeakingResult(data);
    } catch (err) {
      const msg = 'Evaluation error: ' + err.message;
      type === 'writing' ? setWritingError(msg) : setSpeakingError(msg);
    } finally {
      if (type === 'writing') setWritingLoading(false);
      else setSpeakingLoading(false);
    }
  }

  function resetPanel(type) {
    if (type === 'writing') { setWritingText(''); setWritingResult(null); setWritingError(''); }
    else { transcriptRef.current = ''; setTranscript(''); setSpeakingText(''); setSpeakingResult(null); setSpeakingError(''); setTimer('00:00'); setRecordStatus('Click to start recording'); }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        :root{
          --bg:#f5f7fa;
          --surface:#ffffff;
          --surface2:#eef1f6;
          --border:#d0d9e8;
          --accent:${OXFORD_BLUE};
          --accent-light:${OXFORD_BLUE_LIGHT};
          --gold:${OXFORD_GOLD};
          --text:${OXFORD_BLUE};
          --text-muted:#5a6a88;
        }
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;overflow-x:hidden;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:scale(.8);opacity:.5}40%{transform:scale(1.2);opacity:1}}
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(0,33,71,.35)}70%{box-shadow:0 0 0 16px rgba(0,33,71,0)}100%{box-shadow:0 0 0 0 rgba(0,33,71,0)}}
        .prompt-btn{transition:all .2s;cursor:pointer;}
        .prompt-btn:hover{border-color:var(--accent) !important;background:rgba(0,33,71,0.06) !important;}
        .prompt-btn.active{border-color:var(--accent) !important;background:rgba(0,33,71,0.08) !important;}
        textarea:focus{border-color:var(--accent) !important;outline:none;box-shadow:0 0 0 3px rgba(0,33,71,0.1);}
      `}</style>

      <div style={{maxWidth:900,margin:'0 auto',padding:'0 24px',position:'relative',zIndex:1}}>

        {/* Header */}
        <header style={{padding:'40px 0 28px',textAlign:'center',borderBottom:`2px solid ${OXFORD_BLUE}`,marginBottom:40}}>
          <img src="/logo.png" alt="Oxford Centre English Institute" style={{width:90,height:90,objectFit:'contain',marginBottom:16}} />
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(22px,4vw,38px)',fontWeight:900,lineHeight:1.15,letterSpacing:-0.5,color:OXFORD_BLUE,marginBottom:6}}>
            Writing and Speaking Exam
          </h1>
          <p style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(13px,2vw,17px)',fontWeight:400,color:OXFORD_BLUE,letterSpacing:1,opacity:0.75}}>
            by Oxford Centre English
          </p>
          <div style={{display:'inline-block',marginTop:14,background:OXFORD_BLUE,color:'#fff',fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:2,textTransform:'uppercase',padding:'5px 16px',borderRadius:100}}>
            CEFR · Common European Framework of Reference
          </div>
        </header>

        {/* CEFR Scale */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,marginBottom:40}}>
          {[['A1','Breakthrough','#4a90d9'],['A2','Waystage','#2e6db4'],['B1','Threshold','#1a5ba0'],['B2','Vantage','#002147'],['C1','Advanced','#c8a951'],['C2','Mastery','#b8941e']].map(([lvl,name,color])=>(
            <div key={lvl} style={{background:'var(--surface)',border:`1.5px solid ${color}`,borderRadius:8,padding:'10px 4px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,33,71,0.07)'}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700,color,display:'block',marginBottom:3}}>{lvl}</span>
              <span style={{fontSize:9,color:'var(--text-muted)',letterSpacing:.5}}>{name}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,background:'var(--surface)',border:`1.5px solid var(--border)`,padding:4,borderRadius:12,marginBottom:32,boxShadow:'0 1px 6px rgba(0,33,71,0.08)'}}>
          {[['writing','✍️  Writing'],['speaking','🎙️  Speaking']].map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'12px 20px',background:tab===t?OXFORD_BLUE:'transparent',border:'none',color:tab===t?'#fff':'var(--text-muted)',fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,cursor:'pointer',borderRadius:8,transition:'all .2s',boxShadow:tab===t?'0 4px 16px rgba(0,33,71,.25)':'none',letterSpacing:.5}}>
              {label}
            </button>
          ))}
        </div>

        {/* WRITING PANEL */}
        {tab === 'writing' && (
          <div style={{animation:'fadeIn .3s ease'}}>
            {!writingResult ? (
              <>
                {/* Prompt selector */}
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'var(--text-muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>
                    Choose a writing topic
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                    {WRITING_PROMPTS.map((p,i)=>(
                      <button key={p.id} onClick={()=>selectPrompt(i)}
                        className={`prompt-btn${activePromptIdx===i?' active':''}`}
                        style={{background:'var(--surface)',border:`1.5px solid ${activePromptIdx===i?OXFORD_BLUE:'var(--border)'}`,borderRadius:10,padding:'12px 14px',textAlign:'left',fontFamily:"'DM Sans',sans-serif",cursor:'pointer',background:activePromptIdx===i?'rgba(0,33,71,0.07)':'var(--surface)'}}>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:activePromptIdx===i?OXFORD_BLUE:'var(--text-muted)',letterSpacing:1.5,textTransform:'uppercase',marginBottom:5}}>
                          Topic {i+1}
                        </div>
                        <div style={{fontSize:12,fontWeight:600,color:OXFORD_BLUE,lineHeight:1.4}}>{p.title}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active prompt */}
                <div style={{background:'rgba(0,33,71,0.05)',border:`1.5px solid rgba(0,33,71,0.2)`,borderRadius:12,padding:20,marginBottom:20}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:OXFORD_BLUE,letterSpacing:2,textTransform:'uppercase',marginBottom:8,fontWeight:500}}>
                    📝 Writing Prompt — {activePrompt.title}
                  </div>
                  <p style={{fontSize:15,lineHeight:1.7,color:OXFORD_BLUE}}>{activePrompt.text}</p>
                </div>

                <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'var(--text-muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                  Your response <span style={{flex:1,height:1,background:'var(--border)',display:'inline-block'}}/>
                </div>
                <textarea value={writingText} onChange={e=>setWritingText(e.target.value)} placeholder="Write your response in English here..." style={{width:'100%',background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:12,color:OXFORD_BLUE,fontFamily:"'DM Sans',sans-serif",fontSize:15,lineHeight:1.7,padding:20,resize:'vertical',minHeight:200}}/>
                <div style={{textAlign:'right',fontSize:12,color:'var(--text-muted)',fontFamily:"'DM Mono',monospace",marginTop:6}}>{wordCount} words</div>
                {writingError && <div style={{background:'rgba(220,50,50,.07)',border:'1.5px solid rgba(220,50,50,.25)',borderRadius:12,padding:16,fontSize:14,color:'#b02020',marginTop:12}}>{writingError}</div>}
                <button onClick={()=>evaluate('writing')} disabled={writingLoading} style={{width:'100%',padding:16,background:OXFORD_BLUE,border:'none',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:600,cursor:writingLoading?'not-allowed':'pointer',borderRadius:12,marginTop:20,opacity:writingLoading?.6:1,letterSpacing:.5}}>
                  {writingLoading ? '⏳ Evaluating…' : '✦ Evaluate Writing'}
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
                  {[['record','🎙️','Record audio','Automatic transcription'],['text','💬','Enter text','Paste transcript']].map(([m,icon,title,desc])=>(
                    <div key={m} onClick={()=>setSpeakingMethod(m)} style={{background:speakingMethod===m?'rgba(0,33,71,0.07)':'var(--surface)',border:`2px solid ${speakingMethod===m?OXFORD_BLUE:'var(--border)'}`,borderRadius:12,padding:20,cursor:'pointer',textAlign:'center',boxShadow:'0 1px 4px rgba(0,33,71,0.06)'}}>
                      <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
                      <div style={{fontWeight:600,fontSize:14,marginBottom:4,color:OXFORD_BLUE}}>{title}</div>
                      <div style={{fontSize:12,color:'var(--text-muted)'}}>{desc}</div>
                    </div>
                  ))}
                </div>

                <div style={{background:'rgba(0,33,71,0.05)',border:`1.5px solid rgba(0,33,71,0.2)`,borderRadius:12,padding:20,marginBottom:20}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:OXFORD_BLUE,letterSpacing:2,textTransform:'uppercase',marginBottom:8,fontWeight:500}}>🎤 Speaking Prompt</div>
                  <p style={{fontSize:15,lineHeight:1.7,color:OXFORD_BLUE}}>{SPEAKING_PROMPT}</p>
                </div>

                {speakingMethod === 'record' && (
                  <div style={{background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:12,padding:32,textAlign:'center',marginBottom:16,boxShadow:'0 1px 4px rgba(0,33,71,0.06)'}}>
                    <button onClick={isRecording?stopRecording:startRecording} style={{width:72,height:72,borderRadius:'50%',background:isRecording?'rgba(0,33,71,0.12)':'var(--surface2)',border:`2px solid ${isRecording?OXFORD_BLUE:'var(--border)'}`,color:OXFORD_BLUE,fontSize:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',animation:isRecording?'pulse 1.2s infinite':'none'}}>
                      {isRecording ? '⏹' : '🎙️'}
                    </button>
                    <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:8}}>{recordStatus}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:24,fontWeight:500,color:OXFORD_BLUE}}>{timer}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'var(--text-muted)',letterSpacing:2,textTransform:'uppercase',margin:'20px 0 8px',textAlign:'left'}}>Live transcription</div>
                    <div style={{background:'var(--surface2)',borderRadius:8,padding:16,fontSize:14,lineHeight:1.7,color:'var(--text-muted)',minHeight:80,textAlign:'left',fontStyle:'italic'}}>
                      {transcript || 'Your speech will appear here as you speak…'}
                    </div>
                  </div>
                )}

                {speakingMethod === 'text' && (
                  <textarea value={speakingText} onChange={e=>setSpeakingText(e.target.value)} placeholder="Paste or type the spoken text in English here..." style={{width:'100%',background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:12,color:OXFORD_BLUE,fontFamily:"'DM Sans',sans-serif",fontSize:15,lineHeight:1.7,padding:20,resize:'vertical',minHeight:160,outline:'none',marginBottom:16}}/>
                )}

                {speakingError && <div style={{background:'rgba(220,50,50,.07)',border:'1.5px solid rgba(220,50,50,.25)',borderRadius:12,padding:16,fontSize:14,color:'#b02020',marginBottom:12}}>{speakingError}</div>}

                <button onClick={()=>evaluate('speaking')} disabled={speakingLoading} style={{width:'100%',padding:16,background:OXFORD_BLUE,border:'none',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:600,cursor:speakingLoading?'not-allowed':'pointer',borderRadius:12,marginTop:8,opacity:speakingLoading?.6:1,letterSpacing:.5}}>
                  {speakingLoading ? '⏳ Evaluating…' : '✦ Evaluate Speaking'}
                </button>
                {speakingLoading && <Loader text="Evaluating fluency, grammar, vocabulary and discourse…"/>}
              </>
            ) : (
              <Results data={speakingResult} skillType="speaking" onReset={()=>resetPanel('speaking')}/>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{textAlign:'center',padding:'32px 0 24px',borderTop:`1px solid var(--border)`,marginTop:40}}>
          <img src="/logo.png" alt="Oxford Centre" style={{width:36,height:36,objectFit:'contain',opacity:0.4}} />
          <p style={{fontSize:11,color:'var(--text-muted)',fontFamily:"'DM Mono',monospace",letterSpacing:1,marginTop:8}}>
            OXFORD CENTRE ENGLISH · CEFR AI EVALUATOR
          </p>
        </div>
      </div>
    </>
  );
}

function Loader({ text }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'32px 0',textAlign:'center'}}>
      <div style={{display:'flex',gap:6}}>
        {[0,.15,.3].map((d,i)=>(
          <span key={i} style={{width:8,height:8,borderRadius:'50%',background:OXFORD_BLUE,display:'inline-block',animation:`bounce 1.2s ${d}s infinite`}}/>
        ))}
      </div>
      <p style={{fontSize:14,color:'#5a6a88'}}>{text}</p>
    </div>
  );
}

function Results({ data, skillType, onReset }) {
  const c = cefrColors[data.level] || cefrColors['B1'];
  const skillLabel = skillType === 'writing' ? '✍️ Writing' : '🎤 Speaking';

  return (
    <div style={{animation:'fadeIn .4s ease'}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:24,background:'#fff',border:`1.5px solid ${c.border}`,borderRadius:16,padding:28,marginBottom:24,boxShadow:'0 2px 12px rgba(0,33,71,0.08)'}}>
        <div style={{minWidth:88,height:88,borderRadius:16,background:c.bg,border:`2px solid ${c.border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,color:c.text}}>{data.level}</span>
          <span style={{fontSize:10,letterSpacing:1,textTransform:'uppercase',color:c.text,opacity:.8}}>{levelNames[data.level]}</span>
        </div>
        <div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,marginBottom:6,color:OXFORD_BLUE}}>{skillLabel} · {data.level} — {levelNames[data.level]}</h2>
          <p style={{fontSize:14,color:'#5a6a88',lineHeight:1.6}}>{data.summary}</p>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:24}}>
        {data.criteria.map(cr=>(
          <div key={cr.name} style={{background:'#fff',border:'1.5px solid #d0d9e8',borderRadius:12,padding:16,boxShadow:'0 1px 4px rgba(0,33,71,0.05)'}}>
            <div style={{fontSize:11,color:'#5a6a88',textTransform:'uppercase',letterSpacing:1,marginBottom:10,fontFamily:"'DM Mono',monospace"}}>{cr.name}</div>
            <div style={{background:'#eef1f6',borderRadius:100,height:6,marginBottom:8}}>
              <div style={{height:'100%',borderRadius:100,background:c.border,width:`${cr.score*4}%`,transition:'width 1s cubic-bezier(.16,1,.3,1)'}}/>
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:500,color:c.text}}>{cr.score}<span style={{fontSize:14,color:'#5a6a88'}}>/25</span></div>
          </div>
        ))}
      </div>

      {[['strengths','✅ Strengths','rgba(34,197,94,.07)','rgba(34,197,94,.25)','#16a34a'],
        ['improvements','📈 Areas for improvement','rgba(234,179,8,.07)','rgba(234,179,8,.25)','#a16207'],
        ['errors','⚠️ Common errors','rgba(239,68,68,.07)','rgba(239,68,68,.2)','#dc2626']
      ].map(([key,title,bg,border,color])=>(
        <div key={key} style={{background:bg,border:`1.5px solid ${border}`,borderRadius:12,padding:18,marginBottom:12,fontSize:14,lineHeight:1.7}}>
          <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:1.5,fontFamily:"'DM Mono',monospace",marginBottom:8,fontWeight:600,color}}>{title}</div>
          {data[key]}
        </div>
      ))}

      <button onClick={onReset} style={{width:'100%',padding:14,background:'transparent',border:`1.5px solid #d0d9e8`,color:'#5a6a88',fontFamily:"'DM Sans',sans-serif",fontSize:14,cursor:'pointer',borderRadius:12,marginTop:12,fontWeight:500}}>
        ↩ New evaluation
      </button>
    </div>
  );
}
