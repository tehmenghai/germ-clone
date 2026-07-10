/* ============================================================
   pipeline.jsx — the agent loop, rendered three ways
   (rail / graph / terminal) + the climbing eval gauge.
   Driven by run state owned by app.jsx.
   ============================================================ */

const PIPE_STAGES = [
  {key:'route',     name:'Route',              icon:'⟁'},
  {key:'rewrite',   name:'Rewrite',            icon:'✎'},
  {key:'retrieve1', name:'Retrieve · hop 1',   icon:'⛁'},
  {key:'react',     name:'ReAct',              icon:'◈'},
  {key:'reflect',   name:'Reflect / Correct',  icon:'◎', reloop:true},
  {key:'evaluate1', name:'Evaluate · pass 1',  icon:'▦', evalStage:1},
  {key:'retrieve2', name:'Re-retrieve · hop 2',icon:'⛁', reloop:true},
  {key:'evaluate2', name:'Evaluate · pass 2',  icon:'▦', evalStage:2},
  {key:'compose',   name:'Compose answer',     icon:'✦'}
];

function stageDetail(t, key){
  if(!t) return '';
  const P1=t.evalP1, P2=t.evalP2;
  switch(key){
    case 'route': return t.route;
    case 'rewrite': return t.rewrite;
    case 'retrieve1': return t.retrieve1;
    case 'react': return t.react;
    case 'reflect': return t.reflect;
    case 'evaluate1': return `faithful ${P1.f} · relevant ${P1.r} · complete ${P1.c}  →  BELOW 0.80, reloop`;
    case 'retrieve2': return t.retrieve2;
    case 'evaluate2': return `faithful ${P2.f} · relevant ${P2.r} · complete ${P2.c}  →  PASS ✓`;
    case 'compose': return 'answer composed · fully cited · grade = PASS';
    default: return '';
  }
}

const mean = o => o ? (o.f+o.r+o.c)/3 : 0;

/* ---------- eval gauge ---------- */
function Gauge({scores, label, small}){
  const s = scores || {f:0,r:0,c:0};
  const pct = Math.round(mean(s)*100);
  const pass = mean(s) >= 0.80;
  const sz = small ? 56 : 74;
  return (
    <div className="gauge">
      <div className="ring" style={{'--p':pct, width:sz+'px', height:sz+'px',
            background:`conic-gradient(${pass?'var(--green)':'var(--amber)'} ${pct}%, var(--line-soft) 0)`}}>
        <b style={{fontSize: small?'13px':'18px', color:pass?'var(--green)':'var(--amber)'}}>{pct}</b>
        {!small && <small>{label||'score'}</small>}
      </div>
      <div className="bars">
        {[['faithfulness',s.f],['relevance',s.r],['completeness',s.c]].map(([n,v])=>(
          <div className={'bar'+(v<0.80?' low':'')} key={n}>
            <div className="lab"><span>{n}</span><b>{v.toFixed(2)}</b></div>
            <div className="track"><div className="fill" style={{width:(v*100)+'%'}}></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Reading-mode rail ---------- */
function PipelineRail({topic, activeIdx, evalScores, done, collapsed, onToggle}){
  const [open, setOpen] = useState({});
  const passLabel = activeIdx<0 ? 'idle'
      : (activeIdx>=8 ? 'pass 2/2 · done' : activeIdx>=6 ? 'pass 2/2' : 'pass 1/2');
  return (
    <div className="rail">
      <div className="rail-head">
        <span>◷ agent trace</span>
        <span className="pass">{passLabel}</span>
        <button className="iconbtn" style={{width:'26px',height:'26px',fontSize:'12px'}}
          onClick={onToggle} title="collapse">{collapsed?'⟨':'⟩'}</button>
      </div>
      <div className="rail-body">
        {PIPE_STAGES.map((st,i)=>{
          const state = activeIdx<0 ? 'pending'
            : i<activeIdx ? 'done' : i===activeIdx ? 'active' : 'pending';
          const cls = ['rstage', state, st.reloop&&state!=='pending'?'reloop':'',
            open[st.key]?'open':''].filter(Boolean).join(' ');
          const showDet = (state==='active'||state==='done');
          return (
            <div key={st.key} className={cls} onClick={()=>setOpen(o=>({...o,[st.key]:!o[st.key]}))}>
              <div className="rt">
                <span className="ic">{st.icon}</span>{st.name}
                <span className="chev">▸</span>
                <span className="st">{state==='active'?'…':state==='done'?'✓':''}</span>
              </div>
              {showDet && open[st.key] && <div className="det">{stageDetail(topic,st.key)}</div>}
            </div>
          );
        })}
      </div>
      <div className="gaugebox">
        <Gauge scores={evalScores} label={done?'PASS':'eval'}/>
        <div className="gaugenote">
          {!evalScores ? 'waiting for first answer…'
            : done ? <span>pass 1 → <span className="am">0.73 (low completeness)</span> · re-retrieved · pass 2 → <span className="hl">PASS</span></span>
            : <span className="am">↻ scoring &amp; looping until ≥ 0.80…</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Canvas-mode agent graph ---------- */
function AgentGraph({topic, activeIdx, evalScores, done}){
  const N = [
    {k:'route',label:'Route',icon:'⟁',x:11,y:26},
    {k:'rewrite',label:'Rewrite',icon:'✎',x:31,y:26},
    {k:'retrieve1',label:'Retrieve',icon:'⛁',x:54,y:24},
    {k:'react',label:'ReAct',icon:'◈',x:60,y:62},
    {k:'reflect',label:'Reflect',icon:'◎',x:32,y:64,amber:true},
    {k:'evaluate2',label:'Evaluate',icon:'▦',x:82,y:46,amber:true},
  ];
  const idxOf = k => PIPE_STAGES.findIndex(s=>s.key===k);
  return (
    <div className="graphwrap">
      <svg className="gsvg" viewBox="0 0 900 300" preserveAspectRatio="none">
        <path d="M110,82 C170,82 175,82 250,80"/>
        <path d="M310,80 C380,80 400,76 470,74"/>
        <path d="M520,84 C560,110 560,150 540,176"/>
        <path d="M470,196 C400,214 350,210 310,190"/>
        <path d="M260,176 C230,150 235,118 255,100"/>
        <path className={'amber'+(activeIdx>=idxOf('retrieve2')?' fire':'')} d="M540,200 C620,250 360,270 175,108"/>
        <path d="M560,180 C660,180 700,150 740,138"/>
      </svg>
      {N.map(n=>{
        const ai=idxOf(n.k);
        const on = activeIdx>=ai && activeIdx>=0;
        const active = activeIdx===ai;
        return (
          <div key={n.k} className={'node'+(on?' on':'')+(n.amber&&on?' amber':'')+(active?' pulse':'')}
            style={{left:n.x+'%',top:n.y+'%'}}>
            <span className="g">{n.icon}</span>
            <div><small>{n.label.toUpperCase()}</small><b>{n.label}</b></div>
          </div>
        );
      })}
      <div className="gbadge">
        <Gauge scores={evalScores} label={done?'PASS':'live'} small/>
      </div>
    </div>
  );
}

/* ---------- Console-mode terminal trace ---------- */
function TerminalTrace({topic, activeIdx, lines}){
  return (
    <div className="termtrace">
      {lines.map((ln,i)=>(
        <div className="ln" key={i}><span className="gut">{String(i+1).padStart(2,'0')}</span>
          <div dangerouslySetInnerHTML={{__html:ln}}></div></div>
      ))}
      {activeIdx>=0 && activeIdx<8 && <div className="ln"><span className="gut">··</span>
        <div className="typing"><i></i><i></i><i></i></div></div>}
    </div>
  );
}

function terminalLines(t, activeIdx){
  if(!t) return [];
  const L=[];
  const step=(i,html)=>{ if(activeIdx>=i) L.push(html); };
  L.push(`<span class="pr">germ&gt;</span> <span class="cm">${t.q}</span>`);
  step(0,`<span class="dim">[route]</span> ${t.route}`);
  step(1,`<span class="dim">[rewrite]</span> ${t.rewrite}`);
  step(2,`<span class="dim">[retrieve·hop1]</span> <span class="ok">${t.retrieve1}</span>`);
  step(3,`<span class="dim">[react]</span> ${t.react}`);
  step(4,`<span class="dim">[reflect]</span> <span class="am">${t.reflect}</span>`);
  step(5,`<span class="dim">[evaluate]</span> faithful <span class="am">${t.evalP1.f}</span> · complete <span class="am">${t.evalP1.c}</span> → <span class="rd">BELOW 0.80, reloop</span>`);
  step(6,`<span class="dim">[retrieve·hop2]</span> <span class="ok">${t.retrieve2}</span>`);
  step(7,`<span class="dim">[evaluate]</span> faithful <span class="ok">${t.evalP2.f}</span> · relevant <span class="ok">${t.evalP2.r}</span> · complete <span class="ok">${t.evalP2.c}</span> → <span class="ok">PASS ✓</span>`);
  return L;
}

Object.assign(window, { PIPE_STAGES, Gauge, PipelineRail, AgentGraph, TerminalTrace, terminalLines, stageDetail, meanScore:mean });
