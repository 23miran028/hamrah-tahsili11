'use strict';

/* ======================================================================
   نقشه گرافیکی پیش‌نیازها (SVG) — نسخه تعاملی
   --------------------------------------------------------------------
   • Pan با کشیدن روی فضای خالی
   • Drag & Drop هر گره
   • ذخیره‌سازی چیدمان در localStorage
   • به‌روزرسانی زنده یال‌ها
   • Ctrl+Wheel zoom + Fit
   ====================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';
const GRAPH_KEY = 'choiceUnitGraph.v1';

let graphScale = 1;
let GRAPH = {
  layout:null, edges:[], upMap:{}, downMap:{},
  nodeEls:new Map(), edgeEls:[],
  viewport:null,
  pan:{x:0, y:0},
  customPositions:{},
  drag:null,
  suppressNextClick:false,
  wired:false
};

/* ---------- کمکی: ساخت عنصر SVG ---------- */
function svgEl(tag, attrs, text){
  const el = document.createElementNS(SVG_NS, tag);
  if(attrs) for(const k in attrs) el.setAttribute(k, attrs[k]);
  if(text != null) el.textContent = text;
  return el;
}

/* ---------- تبدیل مختصات صفحه به SVG ---------- */
function clientToSvg(svg, clientX, clientY){
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if(!ctm) return {x:clientX, y:clientY};
  return pt.matrixTransform(ctm.inverse());
}

/* ---------- ذخیره/بازیابی چیدمان ---------- */
function loadGraphUIState(){
  try{
    const v = JSON.parse(localStorage.getItem(GRAPH_KEY) || '{}');
    if(v && typeof v === 'object'){
      if(v.pan && typeof v.pan.x === 'number' && typeof v.pan.y === 'number'){
        GRAPH.pan = { x:v.pan.x, y:v.pan.y };
      }
      if(v.positions && typeof v.positions === 'object'){
        GRAPH.customPositions = v.positions;
      }
    }
  }catch(e){ /* بی‌صدا */ }
}

function saveGraphUIState(){
  try{
    localStorage.setItem(GRAPH_KEY, JSON.stringify({
      pan: GRAPH.pan,
      positions: GRAPH.customPositions
    }));
  }catch(e){ /* بی‌صدا */ }
}

/* ---------- استخراج نام پیش‌نیازها ---------- */
function prereqNames(course){
  if(!course.prereq || course.prereq==='_') return [];
  return normalizeDigits(String(course.prereq))
    .split(/[+,]/).map(s=>s.trim()).filter(Boolean)
    .filter(p=>!/هم\s*نیاز|ترم \d|گذراندن \d+|_\s*$/i.test(p));
}

/* ---------- ساخت داده گراف ---------- */
function buildGraphData(){
  const onlyRemaining = $('graphOnlyRemaining')?.checked;
  const onlySpecialty = $('graphOnlySpecialty')?.checked;

  const visible = courses.filter(c=>{
    if(onlyRemaining && c.status==='پاس شده') return false;
    if(onlySpecialty && normalizeType(c.type)!=='تخصصی') return false;
    return true;
  });

  const byTerm = {};
  visible.forEach(c=>{
    const t = c.selectedTerm || c.suggestedTerm || 8;
    (byTerm[t] ||= []).push(c);
  });
  Object.keys(byTerm).forEach(t=>{
    byTerm[t].sort((a,b)=>(a.sourceRow||0)-(b.sourceRow||0));
  });

  const NODE_W = 220, NODE_H = 62;
  const V_GAP = 16, H_GAP = 88;
  const TOP_PAD = 90, LEFT_PAD = 32, RIGHT_PAD = 32, BOTTOM_PAD = 40;

  const terms = Object.keys(byTerm).map(Number).sort((a,b)=>a-b);
  const maxRows = Math.max(1, ...terms.map(t=>byTerm[t].length));
  const columnHeight = maxRows * NODE_H + (maxRows-1) * V_GAP;

  const positions = {};
  terms.forEach((t, ti)=>{
    const list = byTerm[t] || [];
    const colH = list.length * NODE_H + (list.length-1) * V_GAP;
    const offsetY = TOP_PAD + (columnHeight - colH) / 2;
    const x = LEFT_PAD + (terms.length - 1 - ti) * (NODE_W + H_GAP);
    list.forEach((c, ri)=>{
      positions[c.id] = {
        x,
        y: offsetY + ri * (NODE_H + V_GAP),
        term: t, row: ri, col: ti
      };
    });
  });

  /* اعمال موقعیت‌های شخصی کاربر */
  Object.keys(GRAPH.customPositions).forEach(id=>{
    if(positions[id]){
      positions[id].x = GRAPH.customPositions[id].x;
      positions[id].y = GRAPH.customPositions[id].y;
    }
  });

  const width  = Math.max(300, LEFT_PAD + RIGHT_PAD + terms.length*(NODE_W + H_GAP) - H_GAP);
  const height = Math.max(260, TOP_PAD + columnHeight + BOTTOM_PAD);

  const edges = [];
  const upMap = {}, downMap = {};
  const visibleIds = new Set(visible.map(c=>c.id));

  visible.forEach(c=>{
    const to = positions[c.id];
    if(!to) return;
    prereqNames(c).forEach(pname=>{
      const p = findCourseByName(pname);
      if(!p || !visibleIds.has(p.id) || !positions[p.id]) return;
      const from = positions[p.id];
      if(from.term === to.term) return;
      edges.push({ fromId:p.id, toId:c.id });
      (upMap[c.id]   ||= new Set()).add(p.id);
      (downMap[p.id] ||= new Set()).add(c.id);
    });
  });

  return { byTerm, terms, positions, width, height, NODE_W, NODE_H, edges, upMap, downMap, visible };
}

/* ---------- مسیر منحنی یال ---------- */
function edgePath(from, to, NODE_W, NODE_H){
  const x1 = from.x;
  const y1 = from.y + NODE_H/2;
  const x2 = to.x + NODE_W;
  const y2 = to.y + NODE_H/2;
  const dx = Math.max(40, Math.abs(x1 - x2) * 0.45);
  return `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`;
}

function truncateForGraph(s, max){
  const str = String(s).trim();
  return str.length > max ? str.slice(0, max-1) + '…' : str;
}

/* ---------- Empty State ---------- */
function renderGraphEmpty(svg){
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', '0 0 600 240');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.width = '100%';
  svg.style.height = '240px';

  const g = svgEl('g');
  g.appendChild(svgEl('text', { x:300, y:100, 'text-anchor':'middle', 'font-size':'52' }, '🌳'));
  g.appendChild(svgEl('text', {
    x:300, y:150, 'text-anchor':'middle',
    fill:'#a9c0dd', 'font-size':'15', 'font-weight':'600',
    'font-family':'Estedad,Tahoma,sans-serif'
  }, 'درسی برای نمایش در نقشه نیست'));
  g.appendChild(svgEl('text', {
    x:300, y:178, 'text-anchor':'middle',
    fill:'#7d94b3', 'font-size':'12',
    'font-family':'Estedad,Tahoma,sans-serif'
  }, 'فیلترها را تغییر دهید یا از داده اولیه استفاده کنید'));
  svg.appendChild(g);
}

/* ---------- به‌روزرسانی یال‌های یک گره ---------- */
function updateEdgesForNode(nodeId){
  const layout = GRAPH.layout;
  if(!layout) return;
  const NODE_W = layout.NODE_W, NODE_H = layout.NODE_H;
  GRAPH.edges.forEach(e=>{
    if(e.fromId !== nodeId && e.toId !== nodeId) return;
    if(!e.pathEl) return;
    const from = layout.positions[e.fromId];
    const to   = layout.positions[e.toId];
    if(!from || !to) return;
    e.pathEl.setAttribute('d', edgePath(from, to, NODE_W, NODE_H));
  });
}

/* ---------- اعمال pan روی viewport ---------- */
function applyPan(){
  if(!GRAPH.viewport) return;
  GRAPH.viewport.setAttribute(
    'transform',
    `translate(${GRAPH.pan.x}, ${GRAPH.pan.y})`
  );
}

/* ---------- رندر اصلی ---------- */
function renderGraph(){
  const svg = $('graphSvg');
  if(!svg){ console.warn('renderGraph: graphSvg not found'); return; }

  loadGraphUIState();

  const data = buildGraphData();
  GRAPH.layout = data;
  GRAPH.edges = data.edges;
  GRAPH.upMap = data.upMap;
  GRAPH.downMap = data.downMap;
  GRAPH.nodeEls = new Map();
  GRAPH.edgeEls = [];

  if(!data.visible.length){
    renderGraphEmpty(svg);
    updateGraphStats(data);
    return;
  }

  const {NODE_W, NODE_H} = data;

  while(svg.firstChild) svg.removeChild(svg.firstChild);

  svg.setAttribute('viewBox', `0 0 ${data.width} ${data.height}`);
  svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  svg.style.width  = (data.width  * graphScale) + 'px';
  svg.style.height = (data.height * graphScale) + 'px';
  svg.style.touchAction = 'none';

  /* ============ defs ============ */
  const defs = svgEl('defs');

  const termGrad = svgEl('linearGradient', {id:'gr-term-grad', x1:'0', y1:'0', x2:'0', y2:'1'});
  termGrad.appendChild(svgEl('stop', {offset:'0', 'stop-color':'#54c8ff', 'stop-opacity':'0.09'}));
  termGrad.appendChild(svgEl('stop', {offset:'1', 'stop-color':'#54c8ff', 'stop-opacity':'0.02'}));
  defs.appendChild(termGrad);

  const passedGrad = svgEl('linearGradient', {id:'gr-node-passed', x1:'0', y1:'0', x2:'1', y2:'1'});
  passedGrad.appendChild(svgEl('stop', {offset:'0', 'stop-color':'#10bb80', 'stop-opacity':'0.24'}));
  passedGrad.appendChild(svgEl('stop', {offset:'1', 'stop-color':'#10bb80', 'stop-opacity':'0.06'}));
  defs.appendChild(passedGrad);

  const remainGrad = svgEl('linearGradient', {id:'gr-node-remaining', x1:'0', y1:'0', x2:'1', y2:'1'});
  remainGrad.appendChild(svgEl('stop', {offset:'0', 'stop-color':'#f6c747', 'stop-opacity':'0.22'}));
  remainGrad.appendChild(svgEl('stop', {offset:'1', 'stop-color':'#f6c747', 'stop-opacity':'0.05'}));
  defs.appendChild(remainGrad);

  const filter = svgEl('filter', {id:'gr-shadow', x:'-20%', y:'-20%', width:'140%', height:'140%'});
  filter.appendChild(svgEl('feDropShadow', {
    dx:'0', dy:'2', stdDeviation:'3', 'flood-color':'#000', 'flood-opacity':'0.3'
  }));
  defs.appendChild(filter);

  const mkMarker = (id, color, size)=>{
    const m = svgEl('marker', {
      id, viewBox:'0 0 10 10', refX:'9', refY:'5',
      markerWidth:String(size), markerHeight:String(size),
      orient:'auto-start-reverse'
    });
    m.appendChild(svgEl('path', {d:'M0,0 L10,5 L0,10 z', fill:color}));
    return m;
  };
  defs.appendChild(mkMarker('gr-arrow',      '#3d6a9e', 5));
  defs.appendChild(mkMarker('gr-arrow-up',   '#9564f5', 6));
  defs.appendChild(mkMarker('gr-arrow-down', '#22d3c5', 6));

  svg.appendChild(defs);

  /* ============ viewport (قابل pan) ============ */
  const viewport = svgEl('g', {'class':'gr-viewport'});
  GRAPH.viewport = viewport;

  /* ============ ستون‌های ترم ============ */
  const termGroup = svgEl('g', {'class':'gr-terms'});
  const maxRows = Math.max(...data.terms.map(t=>data.byTerm[t].length));
  const columnHeight = maxRows * NODE_H + (maxRows-1) * 14;

  data.terms.forEach(t=>{
    const list = data.byTerm[t] || [];
    if(!list.length) return;
    const anyPos = Object.values(data.positions).find(p=>p.term===t);
    if(!anyPos) return;

    const colH = list.length * NODE_H + (list.length-1) * 14;
    const offsetY = 90 + (columnHeight - colH) / 2;
    const x = anyPos.x - 16;
    const w = NODE_W + 32;
    const y = offsetY - 16;
    const h = colH + 32;

    termGroup.appendChild(svgEl('rect', {
      x, y, width:w, height:h, rx:18,
      fill:'url(#gr-term-grad)',
      stroke:'#54c8ff', 'stroke-opacity':'0.18', 'stroke-width':'1'
    }));

    const pillW = 72, pillH = 28;
    const pillX = x + (w - pillW) / 2;
    const pillY = y - pillH - 10;
    termGroup.appendChild(svgEl('rect', {
      x:pillX, y:pillY, width:pillW, height:pillH, rx:14,
      fill:'#0a1e3a', stroke:'#54c8ff', 'stroke-opacity':'0.6', 'stroke-width':'1'
    }));
    termGroup.appendChild(svgEl('text', {
      x: x + w/2, y: pillY + pillH/2 + 1,
      'text-anchor':'middle',
      fill:'#54c8ff', 'font-size':'12', 'font-weight':'700',
      'font-family':'Estedad,Tahoma,sans-serif',
      'dominant-baseline':'middle'
    }, `ترم ${t}`));
  });
  viewport.appendChild(termGroup);

  /* ============ یال‌ها ============ */
  const edgeGroup = svgEl('g', {'class':'gr-edges'});
  data.edges.forEach(e=>{
    const from = data.positions[e.fromId];
    const to   = data.positions[e.toId];
    if(!from || !to) return;

    const p = svgEl('path', {
      d: edgePath(from, to, NODE_W, NODE_H),
      fill:'none', stroke:'#3d6a9e',
      'stroke-width':'1.6', opacity:'0.5',
      'marker-end':'url(#gr-arrow)',
      'data-from': e.fromId, 'data-to': e.toId
    });
    e.pathEl = p;
    edgeGroup.appendChild(p);
    GRAPH.edgeEls.push(p);
  });
  viewport.appendChild(edgeGroup);

  /* ============ گره‌ها ============ */
  const nodeGroup = svgEl('g', {'class':'gr-nodes'});

  data.visible.forEach(c=>{
    const pos = data.positions[c.id];
    if(!pos) return;

    const type      = normalizeType(c.type);
    const typeColor = TYPE_COLORS[type] || '#7d94b3';
    const passed    = c.status === 'پاس شده';
    const name      = truncateForGraph(c.name, 24);
    const termTxt   = c.selectedTerm ?? c.suggestedTerm ?? '—';
    const dotColor  = passed ? '#10bb80' : '#f6c747';

    const g = svgEl('g', {
      'class': `gr-node ${passed?'passed':'remaining'}`,
      'data-node': c.id,
      'tabindex': '0',
      'role': 'button',
      'aria-label': c.name,
      'direction': 'rtl',
      transform: `translate(${pos.x}, ${pos.y})`
    });

    g.appendChild(svgEl('rect', {
      x: 0, y: 0, width: NODE_W, height: NODE_H, rx: 12,
      fill: passed ? 'url(#gr-node-passed)' : 'url(#gr-node-remaining)',
      stroke: typeColor, 'stroke-width': '1.4', 'stroke-opacity': '0.9',
      filter: 'url(#gr-shadow)'
    }));

    g.appendChild(svgEl('rect', {
      x: NODE_W - 4, y: 12,
      width: 4, height: NODE_H - 24, rx: 2,
      fill: typeColor
    }));

    g.appendChild(svgEl('circle', {
      cx: NODE_W - 15, cy: 20, r: 4.5,
      fill: dotColor, stroke: '#0a1e3a', 'stroke-width': '1.5'
    }));

    g.appendChild(svgEl('text', {
      x: NODE_W - 28, y: 20,
      'text-anchor': 'start',
      'direction': 'rtl',
      'dominant-baseline': 'central',
      'font-family': 'Estedad,Tahoma,sans-serif',
      'font-size': '12.5',
      'font-weight': '600',
      fill: '#edf5ff'
    }, name));

    g.appendChild(svgEl('text', {
      x: NODE_W - 15, y: NODE_H - 16,
      'text-anchor': 'start',
      'direction': 'rtl',
      'dominant-baseline': 'central',
      'font-family': 'Estedad,Tahoma,sans-serif',
      'font-size': '11',
      'font-weight': '500',
      fill: '#a9c0dd'
    }, `${fmt(c.units)} واحد · ترم ${fmt(termTxt)}`));

    nodeGroup.appendChild(g);
    GRAPH.nodeEls.set(c.id, g);
  });

  viewport.appendChild(nodeGroup);
  svg.appendChild(viewport);

  applyPan();
  updateGraphStats(data);
  ensureResetButton();
  setupGraphInteractions();
}

/* ---------- دکمه «چیدمان اصلی» ---------- */
function ensureResetButton(){
  if($('graphResetLayout')) return;
  const fit = $('graphFit');
  if(!fit || !fit.parentElement) return;
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.id = 'graphResetLayout';
  btn.type = 'button';
  btn.textContent = '⟲ چیدمان اصلی';
  btn.title = 'پاک‌کردن جابه‌جایی‌ها و بازگشت به حالت اول';
  fit.parentElement.insertBefore(btn, fit.nextSibling);

  btn.addEventListener('click', ()=>{
    GRAPH.customPositions = {};
    GRAPH.pan = {x:0, y:0};
    saveGraphUIState();
    renderGraph();
    toast('چیدمان به حالت اول بازگشت','success');
  });
}

/* ---------- آمار ---------- */
function updateGraphStats(data){
  const el = $('graphStats');
  if(!el) return;
  const totalNodes = data.visible.length;
  const totalEdges = data.edges.length;
  const blocked = data.visible.filter(c=>!checkPrereq(c).ready).length;
  const passed = data.visible.filter(c=>c.status==='پاس شده').length;
  el.innerHTML = `
    <span class="mini-badge">📚 ${fmt(totalNodes)} درس</span>
    <span class="mini-badge" style="color:var(--success)">✓ ${fmt(passed)} پاس‌شده</span>
    <span class="mini-badge">🔗 ${fmt(totalEdges)} ارتباط</span>
    <span class="mini-badge" style="color:var(--danger)">⚠️ ${fmt(blocked)} ناقص</span>
  `;
}

/* ---------- هایلایت ---------- */
function clearGraphHighlight(){
  const svg = $('graphSvg');
  if(!svg) return;
  svg.querySelectorAll('.gr-node').forEach(n=>n.classList.remove('hl','up','down','dim'));
  svg.querySelectorAll('.gr-edges path').forEach(p=>{
    p.classList.remove('hl-up','hl-down','dim');
    p.setAttribute('marker-end','url(#gr-arrow)');
  });
}

function highlightNode(id){
  const svg = $('graphSvg');
  if(!svg) return;
  clearGraphHighlight();

  const node = svg.querySelector(`[data-node="${CSS.escape(id)}"]`);
  if(!node) return;
  node.classList.add('hl');

  const up = new Set(), down = new Set();
  const walk = (startId, set, map)=>{
    const next = map[startId];
    if(!next) return;
    next.forEach(nid=>{
      if(set.has(nid)) return;
      set.add(nid);
      walk(nid, set, map);
    });
  };
  walk(id, up,   GRAPH.upMap);
  walk(id, down, GRAPH.downMap);

  svg.querySelectorAll('.gr-node').forEach(n=>{
    const nid = n.dataset.node;
    if(nid === id) return;
    if(up.has(nid))        n.classList.add('up');
    else if(down.has(nid)) n.classList.add('down');
    else                   n.classList.add('dim');
  });

  svg.querySelectorAll('.gr-edges path').forEach(p=>{
    const from = p.dataset.from, to = p.dataset.to;
    const fromInUp   = up.has(from)   || from === id;
    const toInUp     = up.has(to)     || to   === id;
    const fromInDown = down.has(from) || from === id;
    const toInDown   = down.has(to)   || to   === id;

    p.classList.remove('hl-up','hl-down','dim');

    if(fromInUp && toInUp){
      p.classList.add('hl-up');
      p.setAttribute('marker-end','url(#gr-arrow-up)');
    } else if(fromInDown && toInDown){
      p.classList.add('hl-down');
      p.setAttribute('marker-end','url(#gr-arrow-down)');
    } else {
      p.classList.add('dim');
    }
  });
}

/* ======================================================================
   تعاملات: Pan + Drag & Drop + Zoom
   ====================================================================== */
function setupGraphInteractions(){
  const svg = $('graphSvg');
  const wrap = $('graphWrap');
  if(!svg || !wrap) return;

  /* --- Ctrl + Wheel برای zoom --- */
  if(!wrap.__grWheelWired){
    wrap.__grWheelWired = true;
    wrap.addEventListener('wheel', e=>{
      if(!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if(e.deltaY < 0) graphZoomIn();
      else graphZoomOut();
    }, {passive:false});
  }

  /* --- Pointer events فقط یک بار --- */
  if(svg.__grPointerWired) return;
  svg.__grPointerWired = true;

  /* بلوک کردن کلیک بعد از drag */
  svg.addEventListener('click', e=>{
    if(GRAPH.suppressNextClick){
      e.stopImmediatePropagation();
      e.preventDefault();
      GRAPH.suppressNextClick = false;
    }
  }, true);

  svg.addEventListener('pointerdown', e=>{
    if(e.button !== 0 && e.pointerType === 'mouse') return;
    const layout = GRAPH.layout;
    if(!layout) return;

    const nodeEl = e.target.closest?.('[data-node]');

    if(nodeEl){
      /* drag گره */
      const id = nodeEl.dataset.node;
      const pos = layout.positions[id];
      if(!pos) return;

      const p = clientToSvg(svg, e.clientX, e.clientY);
      GRAPH.drag = {
        type: 'node',
        id,
        el: nodeEl,
        startX: pos.x,
        startY: pos.y,
        offsetX: p.x - GRAPH.pan.x - pos.x,
        offsetY: p.y - GRAPH.pan.y - pos.y,
        moved: false,
        pointerId: e.pointerId
      };
      nodeEl.classList.add('dragging');
      svg.classList.add('is-dragging-node');
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    /* pan روی فضای خالی */
    GRAPH.drag = {
      type: 'pan',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: GRAPH.pan.x,
      startPanY: GRAPH.pan.y,
      moved: false,
      pointerId: e.pointerId
    };
    svg.classList.add('is-panning');
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  svg.addEventListener('pointermove', e=>{
    const drag = GRAPH.drag;
    if(!drag) return;

    const p = clientToSvg(svg, e.clientX, e.clientY);

    if(drag.type === 'node'){
      const layout = GRAPH.layout;
      if(!layout) return;
      const newX = p.x - GRAPH.pan.x - drag.offsetX;
      const newY = p.y - GRAPH.pan.y - drag.offsetY;

      if(Math.abs(newX - drag.startX) > 3 || Math.abs(newY - drag.startY) > 3){
        drag.moved = true;
      }

      const pos = layout.positions[drag.id];
      pos.x = newX;
      pos.y = newY;
      drag.el.setAttribute('transform', `translate(${newX}, ${newY})`);
      updateEdgesForNode(drag.id);
      e.preventDefault();
      return;
    }

    if(drag.type === 'pan'){
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      if(Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;

      /* تبدیل delta از پیکسل به مختصات SVG */
      const ctm = svg.getScreenCTM();
      if(!ctm) return;
      const scaleX = 1 / ctm.a;
      const scaleY = 1 / ctm.d;
      GRAPH.pan.x = drag.startPanX + dx * scaleX;
      GRAPH.pan.y = drag.startPanY + dy * scaleY;
      applyPan();
      e.preventDefault();
      return;
    }
  });

  const endDrag = e=>{
    const drag = GRAPH.drag;
    if(!drag) return;
    GRAPH.drag = null;

    svg.classList.remove('is-panning','is-dragging-node');

    if(drag.type === 'node'){
      drag.el.classList.remove('dragging');

      if(drag.moved){
        GRAPH.suppressNextClick = true;
        const pos = GRAPH.layout.positions[drag.id];
        GRAPH.customPositions[drag.id] = { x: pos.x, y: pos.y };
        saveGraphUIState();
      }
    } else if(drag.type === 'pan'){
      if(drag.moved) saveGraphUIState();
    }
  };

  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  window.addEventListener('pointerup', endDrag);   // اگر بیرون از svg رها شد
}

/* ---------- Zoom / Fit ---------- */
function applyGraphZoom(){
  const svg = $('graphSvg');
  const l = GRAPH.layout;
  if(!svg || !l) return;
  svg.style.width  = (l.width  * graphScale) + 'px';
  svg.style.height = (l.height * graphScale) + 'px';
  const btn = $('graphZoomReset');
  if(btn) btn.textContent = Math.round(graphScale * 100) + '٪';
}
function graphZoomIn(){ graphScale = Math.min(2.5, graphScale * 1.18); applyGraphZoom(); }
function graphZoomOut(){ graphScale = Math.max(0.3, graphScale / 1.18); applyGraphZoom(); }
function graphZoomReset(){ graphScale = 1; applyGraphZoom(); }
function graphFit(){
  const wrap = $('graphWrap');
  const l = GRAPH.layout;
  if(!wrap || !l || !l.width) return;
  const availW = wrap.clientWidth - 32;
  const availH = wrap.clientHeight - 32;
  if(availW <= 0) return;
  const scaleW = availW / l.width;
  const scaleH = availH > 100 ? availH / l.height : Infinity;
  graphScale = Math.max(0.3, Math.min(1.35, Math.min(scaleW, scaleH)));
  applyGraphZoom();
}