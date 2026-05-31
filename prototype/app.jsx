/* ============================================================
   app.jsx — germ//clone shell
   view modes (reading/canvas/console) · run sequence ·
   difficulty · LLM drawer · theme · collapsed pipeline
   ============================================================ */

const LLMS = {
  ollama:{ name:'llama3.1:8b', label:'Ollama · local', priv:'private', badges:[['private','g'],['free','g'],['~8B','']], desc:'Runs fully on your machine. Nothing leaves the device — ideal for course notes.' },
  alt:{ name:'qwen2.5:14b', label:'Alt · vLLM / LM Studio', priv:'self-host', badges:[['self-host',''],['your endpoint',''],['~14B','']], desc:'Point at any OpenAI-compatible endpoint you run — bigger local models, your rules.' },
  cloud:{ name:'claude / gpt-4o', label:'Cloud API', priv:'API key', badges:[['strongest','g'],['paid','a'],['key required','a']], desc:'Frontier reasoning for the hardest concepts. Sends queries to the provider; needs an API key.' }
};
const DIFFS = [['eli5','ELI5'],['standard','Standard'],['rigorous','Academia']];
const MODES = [['reading','▤ Reality'],['console','⌅ Matrix']];
const MODULES = [['3.1','Prob/Stat'],['3.2','Intro ML'],['3.3','Supervised'],['3.4','Sup.Adv'],['3.5','Unsup'],['3.6','TimeSeries'],['3.7','NeuralNet'],['3.8','CV'],['3.9','NLP'],['3.10','NLP+']];

function CoverageMap({topic}){
  const hot = topic ? topic.module.split(' · ') : [];
  return (
    <div className="cov">
      <div className="cov-h">⊞ corpus coverage</div>
      <div className="cov-grid">
        {MODULES.map(([id,nm])=>(
          <div key={id} className={'cov-m'+(hot.includes(id)?' hot':'')}>
            <span className="cid">{id}</span><span className="cnm">{nm}</span>
          </div>
        ))}
      </div>
      <div className="cov-note">142 hrs transcripts · 4 textbooks · 38 notebooks indexed</div>
    </div>
  );
}

function App(){
  const [theme,setTheme]   = useState(localStorage.getItem('gc-theme')||'matrix');
  const [mode,setMode]     = useState('reading');
  const [diff,setDiff]     = useState('standard');
  const [llm,setLlm]       = useState('ollama');
  const [drawer,setDrawer] = useState(false);
  const [railOpen,setRail] = useState(false);
  const [graphOpen,setGraph] = useState(false);
  const [wsTab,setWsTab]   = useState('visualize');
  const [srcOpen,setSrc]   = useState(false);
  const [citeHot,setCite]  = useState(null);
  const [input,setInput]   = useState('');
  const [msgs,setMsgs]     = useState([]);          // {role, topicId, note}
  const [topicId,setTopic] = useState(null);        // current workspace topic
  const [phase,setPhase]   = useState('idle');      // idle|running|done
  const [activeIdx,setAI]  = useState(-1);
  const [scores,setScores] = useState(null);
  const timer = useRef(null);
  const scrollRef = useRef(null);

  useEffect(()=>{ document.documentElement.setAttribute('data-theme',theme); localStorage.setItem('gc-theme',theme); },[theme]);
  useEffect(()=>{ if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; },[msgs,phase,activeIdx]);
  useEffect(()=>()=>clearTimeout(timer.current),[]);

  const topic = topicId ? TOPICS[topicId] : null;

  function ask(text){
    const id = routeQuery(text);
    const tid = id || 'overfit';
    clearTimeout(timer.current);
    setMsgs(m=>[...m,{role:'user',text}]);
    setTopic(tid); setPhase('running'); setAI(-1); setScores(null);
    setSrc(false); setWsTab('visualize'); setInput('');
    // step through the pipeline
    const seq = [0,1,2,3,4,5,6,7,8];
    let p=0;
    const tick=()=>{
      const i=seq[p];
      setAI(i);
      if(i===5) setScores(TOPICS[tid].evalP1);
      if(i===7) setScores(TOPICS[tid].evalP2);
      p++;
      if(p<seq.length){ timer.current=setTimeout(tick, i===5?1100:i===7?900:560); }
      else { timer.current=setTimeout(()=>{ setPhase('done'); setMsgs(m=>[...m,{role:'bot',topicId:tid,note:id?null:'(routing to the closest module topic — I cover modules 3.1–3.10)'}]); },500); }
    };
    timer.current=setTimeout(tick,400);
  }
  function submit(){ const t=input.trim(); if(t&&phase!=='running') ask(t); }

  const done = phase==='done';
  const lastBot = [...msgs].reverse().find(m=>m.role==='bot');

  return (
    <div className={'app'+(graphOpen&&topicId?' graphmode':'')}>
      <Header {...{theme,setTheme,mode,setMode,diff,setDiff,llm,openDrawer:()=>setDrawer(true),graphOpen,setGraph,topicId}}/>
      {mode==='reading'  && <Reading   {...{msgs,topic,topicId,diff,phase,activeIdx,scores,done,wsTab,setWsTab,theme,srcOpen,setSrc,citeHot,setCite,input,setInput,submit,scrollRef,ask,setGraph}}/>}
      {mode==='console'  && <Console   {...{msgs,topic,topicId,diff,phase,activeIdx,scores,done,wsTab,setWsTab,theme,srcOpen,setSrc,citeHot,setCite,input,setInput,submit,scrollRef,ask,setGraph}}/>}
      {graphOpen && topicId && <RagGraphPanel {...{topic,activeIdx,scores,done,close:()=>setGraph(false)}}/>}
      {drawer && <Drawer {...{theme,setTheme,llm,setLlm,diff,setDiff,mode,setMode,close:()=>setDrawer(false)}}/>}
    </div>
  );
}

/* ---------- bottom RAG graph panel (on-demand, both modes) ---------- */
function RagGraphPanel({topic,activeIdx,scores,done,close}){
  return (
    <div className="ragpanel">
      <div className="ragpanel-head">
        <span>◷ RAG agent pipeline</span>
        <span className="rp-sub">route → rewrite → retrieve → reflect → evaluate → compose · loops until ≥ 0.80</span>
        <button className="rail-close" style={{position:'static',marginLeft:'auto'}} onClick={close}>✕</button>
      </div>
      <AgentGraph topic={topic} activeIdx={activeIdx} evalScores={scores} done={done}/>
    </div>
  );
}

/* ---------- header ---------- */
function Header({theme,setTheme,mode,setMode,diff,setDiff,llm,openDrawer,graphOpen,setGraph,topicId}){
  return (
    <header className="header">
      <div className="brand">
        <div className="avatar">g</div>
        <div><div className="nm">germ<span style={{color:'var(--txt-faint)'}}>//</span>clone</div>
          <div className="sub">module 3 tutor · ML 3.1–3.10</div></div>
      </div>
      <div className="h-sp"></div>
      <div className="h-tools">
        <div className="seg">{MODES.map(([k,l])=>(
          <button key={k} className={mode===k?'on':''} onClick={()=>setMode(k)}>{l}</button>))}</div>
        <div className="seg">{DIFFS.map(([k,l])=>(
          <button key={k} className={diff===k?'on':''} onClick={()=>setDiff(k)}>{l}</button>))}</div>
        <button className={'pill graphpill'+(graphOpen?' on':'')} disabled={!topicId} onClick={()=>setGraph(g=>!g)} title="show the RAG agent pipeline">◷ RAG pipe</button>
        <button className="pill" onClick={openDrawer}><span className="sd"></span> <b>{LLMS[llm].name}</b></button>
        <button className="iconbtn" title="light / dark theme" onClick={()=>setTheme(theme==='matrix'?'clinical':'matrix')}>{theme==='matrix'?'☾':'☀'}</button>
        <button className="iconbtn settings-btn" title="settings" onClick={openDrawer}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </div>
    </header>
  );
}

/* ---------- welcome ---------- */
function Welcome({ask}){
  return (
    <div className="welcome">
      <div className="ded"><i></i> a digital twin of your instructor, germayne</div>
      <h1 className="serif">Ask me anything from<br/>modules 3.1 – 3.10.</h1>
      <p className="lede">I answer in germayne's teaching style, grounded in the Zoom transcripts &amp; textbooks — and every answer comes with the <b>visual and the math</b> so you actually see how the ML works. Toggle the RAG pipeline whenever you want to see my retrieval &amp; self-checking.</p>
      <div className="chips">
        <div className="lab">try one</div>
        {TOPIC_ORDER.map(id=>(
          <button key={id} className="chip" onClick={()=>ask(TOPICS[id].chip)}>
            <span className="mod">{TOPICS[id].module.split(' · ')[0]}</span>{TOPICS[id].chip}<span className="ar">↗</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- thinking ticker ---------- */
function Thinking({activeIdx}){
  const st = activeIdx>=0 && activeIdx<PIPE_STAGES.length ? PIPE_STAGES[activeIdx] : null;
  return (
    <div className="thinking">
      <div className="typing"><i></i><i></i><i></i></div>
      <span>{st? <span><span className="ic">{st.icon}</span> {st.name}…</span> : 'thinking…'}</span>
      <span className="thint">watch the agent →</span>
    </div>
  );
}

/* ---------- answer block (chat side) ---------- */
function AnswerBlock({topic,diff,note,done,scores,onCite,srcOpen,setSrc,citeHot,openTrace,saved,onSave}){
  return (
    <div className="msg-bot">
      <div className="av">G</div>
      <div className="ans">
        <div className="ans-head">
          <span className="ans-name">germ//clone {done&&<span className="grade">PASS {Math.round(meanScore(scores||topic.evalP2)*100)/100}</span>}</span>
          <button className="act" onClick={openTrace}>◷ agent trace</button>
        </div>
        <div className="tabpane">
          <AnswerProse topic={topic} difficulty={diff} onCite={onCite}/>
          {note && <div className="aside"><span className="g">note:</span> {note}</div>}
        </div>
        <div className="actions">
          <button className={'act'+(saved?' done':'')} onClick={onSave}>{saved?'✓ saved':'＋ notebook'}</button>
          <button className={'act'+(srcOpen?' done':'')} onClick={()=>setSrc(!srcOpen)}>⌥ {topic.sources.length} sources</button>
          <span style={{fontSize:'10.5px',color:'var(--txt-faint)',marginLeft:'auto'}}>switch difficulty in the header ↑</span>
        </div>
        <Sources topic={topic} hot={citeHot} open={srcOpen}/>
      </div>
    </div>
  );
}

/* ---------- conversation column (shared) ---------- */
function Convo({msgs,topic,diff,phase,activeIdx,scores,done,srcOpen,setSrc,citeHot,setCite,openTrace,input,setInput,submit,scrollRef,ask}){
  const [saved,setSaved]=useState({});
  return (
    <div className="convo">
      <div className="scroll" ref={scrollRef}>
        <div className="scroll-inner">
          {msgs.length===0 && <Welcome ask={ask}/>}
          {msgs.map((m,i)=> m.role==='user'
            ? <div className="msg-user" key={i}>{m.text}</div>
            : <AnswerBlock key={i} topic={TOPICS[m.topicId]} diff={diff} note={m.note} done={true}
                scores={TOPICS[m.topicId].evalP2} onCite={setCite} srcOpen={srcOpen} setSrc={setSrc}
                citeHot={citeHot} openTrace={openTrace} saved={saved[i]} onSave={()=>setSaved(s=>({...s,[i]:!s[i]}))}/>
          )}
          {phase==='running' && <Thinking activeIdx={activeIdx}/>}
        </div>
      </div>
      <div className="composer-wrap">
        <div className="composer">
          <textarea rows="1" placeholder="Ask about any concept in modules 3.1–3.10…" value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); submit(); } }}/>
          <button className="send" onClick={submit} disabled={phase==='running'||!input.trim()}>↑</button>
        </div>
        <div className="composer-hint">
          <span><span className="kbd">↵</span> send</span>
          <span>grounded in your course corpus · faithful &amp; cited</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- READING (Reality) mode ---------- */
function Reading(props){
  const {topic,topicId,wsTab,setWsTab,theme,setGraph,srcOpen,setSrc,citeHot}=props;
  return (
    <div className="stage reading">
      <Convo {...props} openTrace={()=>setGraph(true)}/>
      <div className="wspane">
        <MLWorkspace topic={topic} theme={theme} tab={wsTab} setTab={setWsTab}/>
        {topic && <Sources topic={topic} hot={citeHot} open={true}/>}
      </div>
    </div>
  );
}

/* ---------- CONSOLE mode ---------- */
function Console(props){
  const {topic,topicId,wsTab,setWsTab,theme,scores,done,activeIdx,diff,input,setInput,submit,phase,citeHot,srcOpen,setSrc,ask}=props;
  const lines = topic ? terminalLines(topic,activeIdx) : [];
  return (
    <div className="stage console">
      <CoverageMap topic={topic}/>
      <div className="console-main">
        <div className="console-left">
          <div className="termscroll">
            {!topicId && <div className="canvas-empty" style={{border:0}}>⌥ germ console — type a question below or pick one:
              <div className="chips" style={{marginTop:'14px'}}>{TOPIC_ORDER.map(id=>(
                <button key={id} className="chip" onClick={()=>ask(TOPICS[id].chip)}><span className="mod">{TOPICS[id].module.split(' · ')[0]}</span>{TOPICS[id].chip}<span className="ar">↗</span></button>))}</div>
            </div>}
            {topicId && <TerminalTrace topic={topic} activeIdx={activeIdx} lines={lines}/>}
            {done && topic && <div className="term-answer">
              <div className="ln"><span className="gut">→</span><div><span className="pr" style={{color:'var(--green)'}}>answer&gt;</span></div></div>
              <AnswerProse topic={topic} difficulty={diff} onCite={()=>{}}/>
              <div className="termcmds"><span className="kbd">/quiz</span> <span className="kbd">/eli5</span> <span className="kbd">/save</span> <span className="kbd">/sources</span></div>
            </div>}
          </div>
          <div className="console-composer">
            <span className="pr2">germ&gt;</span>
            <input value={input} placeholder="type a question…" onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); submit(); } }}/>
            <button className="send" style={{width:'34px',height:'34px'}} onClick={submit} disabled={phase==='running'||!input.trim()}>↵</button>
          </div>
        </div>
        <div className="console-right">
          <MLWorkspace topic={topic} theme={theme} tab={wsTab} setTab={setWsTab} compact/>
          {topic && <Sources topic={topic} hot={citeHot} open={true}/>}
        </div>
      </div>
    </div>
  );
}

/* ---------- settings drawer ---------- */
function Drawer({theme,setTheme,llm,setLlm,diff,setDiff,mode,setMode,close}){
  return (
    <div className="overlay" onClick={close}>
      <div className="drawer" onClick={e=>e.stopPropagation()}>
        <button className="dclose" onClick={close}>✕</button>
        <h2 className="serif">Settings</h2>
        <div className="dsub">germ//clone · dedicated to our instructor. Tune the engine, voice &amp; look.</div>

        <div className="dgroup"><h3>LLM backend</h3>
          {Object.entries(LLMS).map(([k,v])=>(
            <div key={k} className={'optcard'+(llm===k?' on':'')} onClick={()=>setLlm(k)}>
              <div className="radio"></div>
              <div><div className="ot">{v.label}<span style={{color:'var(--txt-faint)',fontWeight:400,fontSize:'11px'}}>· {v.name}</span></div>
                <div className="od">{v.desc}</div>
                <div className="badges">{v.badges.map(([b,c],i)=><span key={i} className={'badge '+(c||'')}>{b}</span>)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="dgroup"><h3>Theme</h3>
          <div className="seg" style={{width:'100%'}}>
            <button style={{flex:1}} className={theme==='matrix'?'on':''} onClick={()=>setTheme('matrix')}>◖ Matrix (dark)</button>
            <button style={{flex:1}} className={theme==='clinical'?'on':''} onClick={()=>setTheme('clinical')}>◗ Clinical (light)</button>
          </div>
        </div>

        <div className="dgroup"><h3>Answer difficulty</h3>
          <div className="seg" style={{width:'100%'}}>{DIFFS.map(([k,l])=>(
            <button key={k} style={{flex:1}} className={diff===k?'on':''} onClick={()=>setDiff(k)}>{l}</button>))}</div>
        </div>

        <div className="dgroup"><h3>View mode</h3>
          <div className="seg" style={{width:'100%'}}>{MODES.map(([k,l])=>(
            <button key={k} style={{flex:1}} className={mode===k?'on':''} onClick={()=>setMode(k)}>{l}</button>))}</div>
        </div>

        <div className="dgroup"><h3>Corpus</h3>
          <div style={{fontSize:'11.5px',color:'var(--txt-dim)',lineHeight:1.7}}>
            ✓ 10 modules · 3.1 Prob/Stat → 3.10 NLP+<br/>✓ 142 hrs Zoom transcripts<br/>✓ 4 reference textbooks · 38 notebooks<br/>
            <span style={{color:'var(--txt-faint)'}}>retrieval scope: all modules (corpus-only · web off)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
