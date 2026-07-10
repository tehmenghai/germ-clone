/* ============================================================
   viz.jsx — interactive ML "under the hood" visualizations
   Each is real ML behaviour driven by a control, not decoration.
   Exports: BiasVarianceViz, RegularizationViz, KNNViz, GradDescViz, MLViz
   ============================================================ */
const { useState, useRef, useEffect } = React;
/* exposed globally so the other Babel scripts share the same hooks */
window.useState = useState; window.useRef = useRef; window.useEffect = useEffect;

function palette(theme){
  return theme === 'clinical'
    ? { green:'#1f9d6b', green2:'#37b07e', amber:'#c98a2a', cyan:'#3a78c0', red:'#c0492f',
        line:'#cfdad4', grid:'rgba(60,95,78,0.13)', dim:'#5a6b63', txt:'#22322b', bg:'#f1f6f3' }
    : { green:'#34e08a', green2:'#7af0b2', amber:'#f0c560', cyan:'#5fd2e6', red:'#ef7a63',
        line:'#2f4a39', grid:'rgba(120,200,150,0.16)', dim:'#85b89a', txt:'#dff5e6', bg:'#16241b' };
}

/* ---------- shared control ---------- */
function Slider({label, min, max, step, value, onChange, fmt}){
  return (
    <div className="ctrl">
      <span style={{minWidth:'112px'}}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))} />
      <span className="val">{fmt ? fmt(value) : value}</span>
    </div>
  );
}

/* =====================================================
   1 · BIAS–VARIANCE  (SVG, theme-adaptive via CSS vars)
   ===================================================== */
function BiasVarianceViz(){
  const [c, setC] = useState(5);
  const W=520, H=270, padL=46, padR=18, padT=16, padB=42;
  const xA=padL, xB=W-padR, yA=H-padB, yB=padT, xmin=1, xmax=10, ymax=100;
  const sx = v => xA + (v-xmin)/(xmax-xmin)*(xB-xA);
  const sy = v => yA - Math.min(v,ymax)/ymax*(yA-yB);
  const bias2 = x => 68*Math.exp(-0.55*x)+2;
  const variance = x => 0.8*Math.exp(0.42*x);
  const noise = 8;
  const test = x => bias2(x)+variance(x)+noise;
  const train = x => 70*Math.exp(-0.52*x)+2;
  const pts = [];
  for(let x=xmin; x<=xmax+0.001; x+=0.25) pts.push(x);
  const poly = f => pts.map(x=>`${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`).join(' ');
  // sweet spot = argmin test
  let best=xmin, bv=1e9;
  pts.forEach(x=>{ if(test(x)<bv){bv=test(x);best=x;} });
  const gap = (test(c)-train(c));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
        {/* zones */}
        <rect x={xA} y={yB} width={sx(best-0.4)-xA} height={yA-yB} fill="var(--amber)" opacity="0.06"/>
        <rect x={sx(best+0.4)} y={yB} width={xB-sx(best+0.4)} height={yA-yB} fill="var(--red)" opacity="0.07"/>
        {/* grid */}
        {[0,25,50,75,100].map(g=>(
          <g key={g}>
            <line x1={xA} y1={sy(g)} x2={xB} y2={sy(g)} stroke="var(--line-soft)" strokeWidth="1"/>
            <text x={xA-8} y={sy(g)+3} textAnchor="end" fontSize="9" fill="var(--txt-faint)">{g}</text>
          </g>
        ))}
        <line x1={xA} y1={yA} x2={xB} y2={yA} stroke="var(--line)" strokeWidth="1.5"/>
        {/* marker */}
        <line x1={sx(c)} y1={yB} x2={sx(c)} y2={yA} stroke="var(--green)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7"/>
        {/* curves */}
        <polyline points={poly(train)} fill="none" stroke="var(--cyan)" strokeWidth="2.2"/>
        <polyline points={poly(test)} fill="none" stroke="var(--green)" strokeWidth="2.6"/>
        <polyline points={poly(bias2)} fill="none" stroke="var(--txt-faint)" strokeWidth="1.3" strokeDasharray="4 3"/>
        {/* dots */}
        <circle cx={sx(c)} cy={sy(test(c))} r="4.5" fill="var(--green)"/>
        <circle cx={sx(c)} cy={sy(train(c))} r="4.5" fill="var(--cyan)"/>
        {/* sweet spot */}
        <circle cx={sx(best)} cy={sy(test(best))} r="3" fill="none" stroke="var(--amber)" strokeWidth="1.5"/>
        <text x={sx(best)} y={sy(test(best))-9} textAnchor="middle" fontSize="9" fill="var(--amber)">sweet spot</text>
        <text x={(xA+xB)/2} y={H-6} textAnchor="middle" fontSize="9.5" fill="var(--txt-dim)">model complexity  ·  tree depth →</text>
      </svg>
      <Slider label="tree depth" min={1} max={10} step={1} value={c} onChange={setC} fmt={v=>'d='+v}/>
      <div className="legend">
        <span><i style={{background:'var(--cyan)'}}></i> training error {train(c).toFixed(0)}</span>
        <span><i style={{background:'var(--green)'}}></i> test error {test(c).toFixed(0)}</span>
        <span style={{color:gap>22?'var(--amber)':'var(--txt-faint)'}}>gap {gap.toFixed(0)} {gap>22?'· overfitting':''}</span>
      </div>
    </div>
  );
}

/* =====================================================
   2 · L1 vs L2 REGULARIZATION  (SVG)
   ===================================================== */
function RegularizationViz(){
  const [norm, setNorm] = useState('L2');
  const [lam, setLam] = useState(0.35);
  const W=360, H=300, cx=178, cy=158, u=42;   // u px per weight unit
  const px = w => cx + w*u, py = w => cy - w*u;
  const ols = [2.15, 1.5];                      // unconstrained solution
  const q = [1.0, 1.8];                          // loss curvature (anisotropic)
  const loss = (a,b) => q[0]*(a-ols[0])**2 + q[1]*(b-ols[1])**2;
  const r = 3.0 - lam*2.7;                       // constraint radius shrinks with lambda
  // find constrained solution on boundary
  let sol=[0,0], bv=1e9;
  for(let i=0;i<720;i++){
    let a,b;
    if(norm==='L2'){ const t=i/720*2*Math.PI; a=r*Math.cos(t); b=r*Math.sin(t); }
    else { const t=i/720*4, e=Math.floor(t), f=t-e; // diamond edges
      const C=[[r,0],[0,r],[-r,0],[0,-r],[r,0]]; a=C[e][0]+(C[e+1][0]-C[e][0])*f; b=C[e][1]+(C[e+1][1]-C[e][1])*f; }
    const l=loss(a,b); if(l<bv){bv=l; sol=[a,b];}
  }
  const sparse = norm==='L1' && (Math.abs(sol[0])<0.07*r || Math.abs(sol[1])<0.07*r);
  // contour ellipses around OLS
  const ell = k => { const rx=k/Math.sqrt(q[0])*u, ry=k/Math.sqrt(q[1])*u;
    return <ellipse key={k} cx={px(ols[0])} cy={py(ols[1])} rx={rx} ry={ry} fill="none" stroke="var(--txt-faint)" strokeWidth="1" opacity="0.4"/>; };
  const constraintPath = norm==='L2'
    ? <circle cx={cx} cy={cy} r={r*u} fill="var(--green)" fillOpacity="0.08" stroke="var(--green)" strokeWidth="1.6"/>
    : <polygon points={`${px(r)},${cy} ${cx},${py(r)} ${px(-r)},${cy} ${cx},${py(-r)}`} fill="var(--green)" fillOpacity="0.08" stroke="var(--green)" strokeWidth="1.6"/>;
  return (
    <div>
      <div className="seg" style={{marginBottom:'10px'}}>
        {['L2','L1'].map(n=>(
          <button key={n} className={norm===n?'on':''} onClick={()=>setNorm(n)}>
            {n} · {n==='L2'?'Ridge':'Lasso'}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
        <line x1="20" y1={cy} x2={W-20} y2={cy} stroke="var(--line)" strokeWidth="1"/>
        <line x1={cx} y1="14" x2={cx} y2={H-14} stroke="var(--line)" strokeWidth="1"/>
        <text x={W-22} y={cy-6} textAnchor="end" fontSize="9" fill="var(--txt-faint)">w₁</text>
        <text x={cx+7} y="22" fontSize="9" fill="var(--txt-faint)">w₂</text>
        {[0.5,1.1,1.8,2.6,3.5].map(ell)}
        {constraintPath}
        <line x1={px(ols[0])} y1={py(ols[1])} x2={px(sol[0])} y2={py(sol[1])} stroke="var(--amber)" strokeWidth="1.2" strokeDasharray="3 3"/>
        <circle cx={px(ols[0])} cy={py(ols[1])} r="4.5" fill="var(--cyan)"/>
        <text x={px(ols[0])+8} y={py(ols[1])-6} fontSize="9" fill="var(--cyan)">OLS (no penalty)</text>
        <circle cx={px(sol[0])} cy={py(sol[1])} r="5.5" fill="var(--green)"/>
        <text x={px(sol[0])+(sol[0]<0?-8:8)} y={py(sol[1])+(sol[1]<0?16:-9)} textAnchor={sol[0]<0?'end':'start'} fontSize="9" fill="var(--green)">solution</text>
      </svg>
      <Slider label="λ  (penalty)" min={0} max={0.95} step={0.01} value={lam} onChange={setLam} fmt={v=>v.toFixed(2)}/>
      <div className="legend">
        <span>w₁ = {sol[0].toFixed(2)}</span>
        <span>w₂ = {sol[1].toFixed(2)}</span>
        {sparse
          ? <span style={{color:'var(--amber)'}}>● sparse — a weight hit exactly 0 (feature dropped)</span>
          : <span style={{color:'var(--txt-faint)'}}>shrinking toward origin</span>}
      </div>
    </div>
  );
}

/* =====================================================
   3 · KNN decision boundary  (canvas)
   ===================================================== */
const KNN_PTS = [
  // class 0 (lower-left cluster)
  [0.18,0.30,0],[0.25,0.22,0],[0.30,0.38,0],[0.22,0.45,0],[0.34,0.28,0],[0.28,0.52,0],
  [0.40,0.42,0],[0.36,0.55,0],[0.20,0.38,0],[0.44,0.34,0],[0.32,0.46,0],[0.26,0.33,0],
  [0.46,0.50,0],[0.38,0.36,0],[0.30,0.60,0],[0.50,0.44,0],[0.52,0.58,0],[0.48,0.62,0],
  // class 1 (upper-right cluster)
  [0.62,0.55,1],[0.70,0.48,1],[0.66,0.66,1],[0.74,0.60,1],[0.58,0.62,1],[0.78,0.52,1],
  [0.68,0.58,1],[0.72,0.70,1],[0.60,0.50,1],[0.80,0.64,1],[0.64,0.45,1],[0.76,0.68,1],
  [0.56,0.70,1],[0.82,0.56,1],[0.70,0.62,1],[0.54,0.58,1],[0.50,0.46,1],[0.46,0.40,1]
];
function KNNViz({theme}){
  const [k, setK] = useState(5);
  const ref = useRef(null);
  useEffect(()=>{
    const cv=ref.current; if(!cv) return; const ctx=cv.getContext('2d');
    const P=palette(theme); const W=cv.width=cv.clientWidth*2, H=cv.height=300*2; ctx.scale(1,1);
    const mx=v=>20+v*(W-40), my=v=>20+v*(H-40);
    const colA = theme==='clinical'?'rgba(31,157,107,':'rgba(52,224,138,';
    const colB = theme==='clinical'?'rgba(58,120,192,':'rgba(95,210,230,';
    const step=14;
    for(let gx=0; gx<W; gx+=step){
      for(let gy=0; gy<H; gy+=step){
        const x=(gx-20)/(W-40), y=(gy-20)/(H-40);
        const ds=KNN_PTS.map(p=>[(p[0]-x)**2+(p[1]-y)**2,p[2]]).sort((a,b)=>a[0]-b[0]);
        let s=0; for(let i=0;i<k;i++) s+=ds[i][1];
        const c1=s/k;
        ctx.fillStyle=(c1>0.5?colB:colA)+0.13+')';
        ctx.fillRect(gx,gy,step,step);
      }
    }
    // boundary contour (cells where neighbours split)
    KNN_PTS.forEach(p=>{
      ctx.beginPath(); ctx.arc(mx(p[0]),my(p[1]),9,0,7); 
      ctx.fillStyle=p[2]?(theme==='clinical'?'#3a78c0':'#5fd2e6'):(theme==='clinical'?'#1f9d6b':'#34e08a');
      ctx.fill(); ctx.lineWidth=2.5; ctx.strokeStyle=P.bg; ctx.stroke();
    });
  },[k,theme]);
  return (
    <div>
      <canvas ref={ref} style={{width:'100%',height:'300px',display:'block',borderRadius:'6px'}}></canvas>
      <Slider label="k  (neighbours)" min={1} max={25} step={2} value={k} onChange={setK} fmt={v=>'k='+v}/>
      <div className="legend">
        <span><i style={{background:'var(--green)',borderRadius:'50%',width:'10px',height:'10px'}}></i> class A</span>
        <span><i style={{background:'var(--cyan)',borderRadius:'50%',width:'10px',height:'10px'}}></i> class B</span>
        <span style={{color:'var(--txt-faint)'}}>{k<=3?'small k → jagged, low bias / high variance':k>=15?'large k → smooth, high bias / low variance':'balanced boundary'}</span>
      </div>
    </div>
  );
}

/* =====================================================
   4 · GRADIENT DESCENT  (canvas, animated)
   ===================================================== */
function GradDescViz({theme}){
  const [lr, setLr] = useState(0.18);
  const ref = useRef(null);
  const [tick, setTick] = useState(0);
  const runRef = useRef(null);
  const q=[0.6,1.6], start=[-4.2,3.3];
  function compute(rate){
    const path=[start.slice()]; let [x,y]=start;
    for(let i=0;i<42;i++){ x-=rate*2*q[0]*x; y-=rate*2*q[1]*y;
      if(Math.abs(x)>9||Math.abs(y)>9){path.push([Math.max(-9,Math.min(9,x)),Math.max(-9,Math.min(9,y))]);break;}
      path.push([x,y]); }
    return path;
  }
  useEffect(()=>{
    const cv=ref.current; if(!cv) return; const ctx=cv.getContext('2d');
    const P=palette(theme); const W=cv.width=cv.clientWidth, H=cv.height=300;
    const cx=W/2, cy=H/2, sc=22;
    const wx=x=>cx+x*sc, wy=y=>cy-y*sc;
    ctx.clearRect(0,0,W,H);
    // contours
    for(let lvl=1; lvl<=6; lvl++){
      ctx.beginPath();
      ctx.ellipse(cx,cy, lvl*sc/Math.sqrt(q[0])*0.8, lvl*sc/Math.sqrt(q[1])*0.8, 0,0,7);
      ctx.strokeStyle=P.grid; ctx.lineWidth=1; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx,cy,3,0,7); ctx.fillStyle=P.amber; ctx.fill();
    // path up to tick
    const path=compute(lr); const n=Math.min(tick,path.length-1);
    ctx.beginPath();
    for(let i=0;i<=n;i++){ const[x,y]=path[i]; i?ctx.lineTo(wx(x),wy(y)):ctx.moveTo(wx(x),wy(y)); }
    ctx.strokeStyle=P.green; ctx.lineWidth=2; ctx.stroke();
    for(let i=0;i<=n;i++){ const[x,y]=path[i]; ctx.beginPath(); ctx.arc(wx(x),wy(y),i===n?5:2.6,0,7);
      ctx.fillStyle=i===n?P.green:P.green2; ctx.fill(); }
    const diverge = path.length<42 && (Math.abs(path[path.length-1][0])>8||Math.abs(path[path.length-1][1])>8);
    ctx.fillStyle=diverge?P.red:P.dim; ctx.font='11px JetBrains Mono';
    ctx.fillText(diverge?'⚠ diverging — lr too high':`step ${n}/${path.length-1}`,12,20);
  },[lr,tick,theme]);
  function run(){ clearInterval(runRef.current); setTick(0);
    let t=0; runRef.current=setInterval(()=>{ t++; setTick(t); if(t>42){clearInterval(runRef.current);} },90); }
  useEffect(()=>()=>clearInterval(runRef.current),[]);
  return (
    <div>
      <canvas ref={ref} style={{width:'100%',height:'300px',display:'block',borderRadius:'6px'}}></canvas>
      <Slider label="learning rate η" min={0.02} max={0.95} step={0.01} value={lr} onChange={v=>{setLr(v);setTick(0);}} fmt={v=>v.toFixed(2)}/>
      <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
        <button className="act" onClick={run}>▸ run descent</button>
        <button className="act" onClick={()=>setTick(t=>t+1)}>step +1</button>
        <button className="act" onClick={()=>setTick(0)}>↺ reset</button>
      </div>
    </div>
  );
}

/* ---------- dispatcher ---------- */
function MLViz({kind, theme}){
  if(kind==='biasvar') return <BiasVarianceViz/>;
  if(kind==='reg') return <RegularizationViz/>;
  if(kind==='knn') return <KNNViz theme={theme}/>;
  if(kind==='grad') return <GradDescViz theme={theme}/>;
  return <div style={{padding:'20px',color:'var(--txt-faint)',fontSize:'12px'}}>No visual for this topic yet.</div>;
}

Object.assign(window, { BiasVarianceViz, RegularizationViz, KNNViz, GradDescViz, MLViz });
