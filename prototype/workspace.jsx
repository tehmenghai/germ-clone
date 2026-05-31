/* ============================================================
   workspace.jsx — the "ML under the hood" half-page panel
   (Visualize / Code / Math) + answer prose + sources.
   ============================================================ */

/* tiny python highlighter (escaped -> spans) */
function hlPy(src){
  let s = src.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  s = s.replace(/(#[^\n]*)/g,'<span class="cm">$1</span>');
  s = s.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,'<span class="st">$1</span>');
  s = s.replace(/\b(from|import|for|in|if|else|elif|return|def|class|None|True|False|and|or|not|with|as|lambda|while|print)\b/g,'<span class="kw">$1</span>');
  s = s.replace(/\b([A-Za-z_]\w*)(\()/g,'<span class="fn">$1</span>$2');
  return s;
}
function CodeBlock({code}){
  return <pre className="code" dangerouslySetInnerHTML={{__html:hlPy(code)}}></pre>;
}

/* answer prose (Explain), with citation hover */
function AnswerProse({topic, difficulty, onCite}){
  const html = topic.explain[difficulty] || topic.explain.standard;
  return (
    <div className="prose"
      onMouseOver={e=>{ const c=e.target.closest('.cite'); if(c) onCite(parseInt(c.dataset.cite)); }}
      onMouseOut={e=>{ if(e.target.closest('.cite')) onCite(null); }}
      dangerouslySetInnerHTML={{__html:html}}>
    </div>
  );
}

function MathView({topic}){
  return (
    <div className="math">
      {topic.math.map((m,i)=>(
        <div key={i}>
          <div className="eq" dangerouslySetInnerHTML={{__html:m.eq}}></div>
          <div className="mathnote">{m.note}</div>
        </div>
      ))}
    </div>
  );
}

/* monochrome bar-chart icon for Visualize tab */
function VizIcon(){
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" style={{display:'block'}}>
      <rect x="0" y="7" width="3" height="6" rx="1"/>
      <rect x="5" y="4" width="3" height="9" rx="1"/>
      <rect x="10" y="1" width="3" height="12" rx="1"/>
    </svg>
  );
}

const WS_TABS = [
  {k:'visualize', label:'Visualize', icon:<VizIcon/>},
  {k:'math',      label:'Math',      icon:'∑'}
];

/* the big half-page ML workspace */
function MLWorkspace({topic, theme, tab, setTab, compact}){
  if(!topic) return (
    <div className="ws empty">
      <div className="ws-empty-inner">
        <div className="ws-glyph">∂</div>
        <div>The <b>ML workspace</b> lands here.</div>
        <p>Every answer comes with an interactive plot and the math — ask a question to light it up.</p>
      </div>
    </div>
  );
  return (
    <div className={'ws'+(compact?' compact':'')}>
      <div className="ws-top">
        <span className="ws-title">⊞ ML workspace</span>
        <span className="ws-topic">{topic.q.slice(0,46)}{topic.q.length>46?'…':''}</span>
        <div className="ws-tabs">
          {WS_TABS.map(t=>(
            <button key={t.k} className={tab===t.k?'on':''} onClick={()=>setTab(t.k)}>
              <span style={{fontSize:'12px'}}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ws-body">
        {tab==='visualize' && (
          <div className="viz">
            <div className="viz-top"><span className="t">{vizTitle(topic.viz)}</span>
              <span style={{marginLeft:'auto',color:'var(--txt-faint)',fontSize:'10px'}}>drag the control — it's live</span></div>
            <div className="viz-body"><MLViz kind={topic.viz} theme={theme}/></div>
          </div>
        )}
        {tab==='math' && (
          <div>
            <div className="ws-hint">↳ the formalism behind the intuition</div>
            <MathView topic={topic}/>
          </div>
        )}
      </div>
    </div>
  );
}
function vizTitle(kind){
  return ({biasvar:'Bias–variance vs. model complexity',
    reg:'L1 / L2 constraint geometry', knn:'KNN decision boundary',
    grad:'Gradient descent on a loss surface'})[kind]||'Visualization';
}

/* sources list */
function Sources({topic, hot, open}){
  if(!open) return null;
  return (
    <div className="sources">
      <div style={{fontSize:'10px',letterSpacing:'1px',textTransform:'uppercase',color:'var(--txt-dim)',marginBottom:'2px'}}>⌥ retrieved sources · {topic.sources.length}</div>
      {topic.sources.map(s=>(
        <div key={s.id} className={'source'+(hot===s.id?' hot':'')}>
          <div className="meta"><span className="id">{s.id}</span> <span className="mod">module {s.mod}</span> · {s.file}{s.ts&&<span className="ts">@ {s.ts}</span>}</div>
          <div className="snip">"{s.snip}"</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { MLWorkspace, AnswerProse, Sources, CodeBlock, WS_TABS, hlPy });
