'use strict';

/* ---------- KPI ---------- */
function renderKPIs(){
  const x=computed();
  $('kTotal').textContent=fmt(x.total);
  $('kTotalUnits').textContent=fmt(x.totalUnits)+' واحد در کل';
  $('kPassed').textContent=fmt(x.passed.length);
  $('kPassedUnits').textContent=fmt(x.passedUnits)+' واحد گذرانده';
  $('kRemaining').textContent=fmt(x.remaining.length);
  $('kRemainingUnits').textContent=fmt(x.remainingUnits)+' واحد باقی';
  $('kProgress').textContent=percent(x.progress);
  $('kSpecialty').textContent=fmt(x.special.length);
  $('kSpecialtyUnits').textContent=fmt(x.specialUnits)+' واحد تخصصی';
  $('kPassedBar').style.width=(x.total?x.passed.length/x.total*100:0)+'%';
  $('kRemainingBar').style.width=(x.total?x.remaining.length/x.total*100:0)+'%';
  $('kProgressBar').style.width=Math.min(100,x.progress)+'%';
  $('kSpecialtyBar').style.width=(x.remaining.length?x.special.length/x.remaining.length*100:0)+'%';
  $('progressLabel').textContent=percent(x.progress);
  $('progressMeter').style.width=Math.min(100,x.progress)+'%';
  $('withPrereq').textContent=fmt(courses.filter(c=>String(c.prereq??'').trim()&&String(c.prereq).trim()!=='_').length);
  $('unassignedTerm').textContent=fmt(courses.filter(c=>c.selectedTerm==null||c.selectedTerm==='').length);
  $('futureUnits').textContent=fmt(courses.filter(c=>n(c.selectedTerm)>=8).reduce((s,c)=>s+n(c.units),0))+' واحد';
  $('gpaAvg').textContent=x.avgGrade?fmt(x.avgGrade.toFixed(2))+' از '+fmt(x.grades)+' درس':'—';
}

/* ---------- Category progress ---------- */
function renderCategoryProgress(){
  const byType={};
  courses.forEach(c=>{
    const t=normalizeType(c.type);
    if(!byType[t])byType[t]={total:0,passed:0,units:0,passedUnits:0};
    byType[t].total++;
    byType[t].units+=n(c.units);
    if(c.status==='پاس شده'){byType[t].passed++;byType[t].passedUnits+=n(c.units)}
  });
  const types=TYPE_NAMES.filter(t=>byType[t]);
  $('catCount').textContent=fmt(types.length)+' نوع';
  $('catGrid').innerHTML=types.map(t=>{
    const d=byType[t],pct=d.units?d.passedUnits/d.units*100:0;
    return `<div class="cat-card"><div class="cat-head"><div class="cat-name" style="color:${TYPE_COLORS[t]}">${esc(t)}</div><div class="cat-stat">${fmt(d.passed)}/${fmt(d.total)} درس</div></div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:4px"><span>${fmt(d.passedUnits)} از ${fmt(d.units)} واحد</span><b style="color:var(--text)">${fmt(pct)}٪</b></div><div class="cat-meter"><span style="width:${pct}%;background:${TYPE_COLORS[t]}"></span></div></div>`;
  }).join('');
}

/* ---------- Priority ---------- */
function renderPriority(){
  const rows=computed().remaining.slice().sort((a,b)=>{
    const ta=a.suggestedTerm??99,tb=b.suggestedTerm??99;
    if(ta!==tb)return ta-tb;
    if(normalizeType(a.type)==='تخصصی'&&normalizeType(b.type)!=='تخصصی')return -1;
    if(normalizeType(b.type)==='تخصصی'&&normalizeType(a.type)!=='تخصصی')return 1;
    return String(a.name).localeCompare(String(b.name),'fa');
  }).slice(0,10);
  $('priorityBody').innerHTML=rows.map(c=>{
    const pr=checkPrereq(c);
    const badge=pr.ready?'<span class="pill ready">✅ آماده</span>':`<span class="pill blocked" title="${esc(pr.reasons.join('، '))}">⚠️ ${fmt(pr.reasons.length)} ناقص</span>`;
    return `<tr class="clickable" data-open-course="${esc(c.id)}"><td><b>${esc(String(c.name).trim())}</b></td><td><span class="pill special type-${esc(normalizeType(c.type))}">${esc(normalizeType(c.type))}</span></td><td>${fmt(c.units)}</td><td>${termLabel(c.suggestedTerm)}</td><td class="detail">${esc(c.prereq||'—')}</td><td>${badge}</td></tr>`;
  }).join('');
  $('priorityEmpty').hidden=rows.length>0;
}
function renderSourceNotes(){
  $('sourceNotes').innerHTML=originalSummary.notes.map(t=>`<li><span class="bullet">•</span><span>${esc(t)}</span></li>`).join('');
}

/* ---------- Courses ---------- */
function currentFiltered(){
  const q=filters.query.toLocaleLowerCase();
  return courses.filter(c=>{
    const txt=[c.name,c.prereq,normalizeType(c.type),c.status].join(' ').toLocaleLowerCase();
    if(q&&!txt.includes(q))return false;
    if(filters.status&&c.status!==filters.status)return false;
    if(filters.type&&normalizeType(c.type)!==filters.type)return false;
    if(filters.term){
      if(filters.term==='none'){if(c.selectedTerm!=null&&c.selectedTerm!=='')return false}
      else if(String(c.selectedTerm??'')!==filters.term)return false;
    }
    if(filters.ready){
      const pr=checkPrereq(c);
      if(filters.ready==='ready'&&!pr.ready)return false;
      if(filters.ready==='blocked'&&pr.ready)return false;
    }
    return true;
  });
}
function renderCourses(){
  const rows=currentFiltered().slice().sort((a,b)=>{
    let av=a[sortKey],bv=b[sortKey];
    if(sortKey==='type'){av=normalizeType(av);bv=normalizeType(bv)}
    if(['units','suggestedTerm','selectedTerm','sourceRow','grade'].includes(sortKey)){
      av=av==null?999:+av;bv=bv==null?999:+bv;
      return (av-bv)*sortDir;
    }
    return String(av??'').localeCompare(String(bv??''),'fa')*sortDir;
  });
  $('courseCountBadge').textContent=fmt(rows.length)+' درس';
  $('coursesEmpty').hidden=rows.length>0;
  $('coursesBody').innerHTML=rows.map(c=>{
    const pr=checkPrereq(c);
    const badge=pr.ready?'':'⚠️';
    return `<tr class="clickable" data-open-course="${esc(c.id)}"><td><b>${esc(String(c.name).trim())}</b><div class="detail">ردیف: ${fmt(c.sourceRow||'—')}</div></td><td>${statusPill(c.status)}</td><td><span class="pill special type-${esc(normalizeType(c.type))}">${esc(normalizeType(c.type))}</span></td><td>${fmt(c.units)}</td><td>${termLabel(c.selectedTerm)}</td><td class="detail">${badge}${esc(c.prereq||'—')}</td><td>${c.grade!=null?fmt(c.grade):'—'}</td><td><button class="btn sm" type="button" data-edit-course="${esc(c.id)}">✎</button></td></tr>`;
  }).join('');
  document.querySelectorAll('th[data-sort]').forEach(th=>{
    th.classList.remove('asc','desc');
    if(th.dataset.sort===sortKey)th.classList.add(sortDir===1?'asc':'desc');
  });
  const chips=[];
  if(filters.query)chips.push(['query','جست‌وجو: '+filters.query]);
  if(filters.status)chips.push(['status','وضعیت: '+filters.status]);
  if(filters.type)chips.push(['type','نوع: '+filters.type]);
  if(filters.term)chips.push(['term','ترم: '+(filters.term==='none'?'بدون ترم':'ترم '+filters.term)]);
  if(filters.ready)chips.push(['ready',filters.ready==='ready'?'آماده':'ناقص']);
  $('activeChips').innerHTML=chips.length
    ? chips.map(([k,v])=>`<span class="chip"><b>${esc(v)}</b><button type="button" data-chip="${k}">✕</button></span>`).join('')+`<span class="chip">${fmt(rows.length)} نتیجه</span>`
    : '';
}

/* ---------- Plan ---------- */
function renderPlan(){
  populatePlanNames();
  $('planBody').innerHTML=plan.map(p=>{
    const match=findCourseByName(p.name);
    const pr=match?checkPrereq(match):{ready:true,reasons:[]};
    const badge=pr.ready?'':'<span class="pill blocked" style="font-size:10px" title="'+esc(pr.reasons.join('، '))+'">⚠️ ناقص</span>';
    return `<tr><td><b>${esc(p.name)}</b></td><td><span class="pill special type-${esc(normalizeType(p.type))}">${esc(normalizeType(p.type))}</span></td><td>${fmt(p.units)}</td><td><select data-plan-term="${esc(p.id)}">${termOptions(p.targetTerm)}</select></td><td><select data-plan-status="${esc(p.id)}">${['باقی‌مانده','در حال برنامه‌ریزی','انتخاب شده','انجام شد'].map(s=>`<option ${p.status===s?'selected':''}>${s}</option>`).join('')}</select></td><td>${badge}</td><td><button class="btn sm" type="button" data-edit-plan="${esc(p.id)}">✎</button></td></tr>`;
  }).join('');
}
function populatePlanNames(){
  $('courseNames').innerHTML=courses.map(c=>`<option value="${esc(String(c.name).trim())}"></option>`).join('');
}

/* ---------- Terms ---------- */
function renderTerms(){
  $('otherTermsBody').innerHTML=termSummary.map(t=>`<tr><td>${esc(t.term)}</td><td>${fmt(t.units)}</td><td>${fmt(t.courseCount)}</td><td>${fmt(t.suggestedCount)}</td><td>${fmt(t.selectedCount)}</td></tr>`).join('');
  $('dashboardTermsBody').innerHTML=dashboardTerms.map(t=>`<tr><td>${esc(t.term)}</td><td>${fmt(t.units)}</td><td>${fmt(t.courseCount)}</td></tr>`).join('');
  const rows=[];
  const maxU=Math.max(1,...[...Array(9)].map((_,i)=>i+1).map(i=>courses.filter(c=>String(c.selectedTerm)===String(i)).reduce((s,c)=>s+n(c.units),0)));
  for(let i=1;i<=9;i++){
    const subset=courses.filter(c=>String(c.selectedTerm)===String(i));
    const p=subset.filter(c=>c.status==='پاس شده');
    const r=subset.filter(c=>c.status!=='پاس شده');
    if(subset.length||i>=8)rows.push({term:i,count:subset.length,units:subset.reduce((s,c)=>s+n(c.units),0),passed:p.length,remaining:r.length,pct:maxU?subset.reduce((s,c)=>s+n(c.units),0)/maxU*100:0});
  }
  $('computedTermsBody').innerHTML=rows.map(r=>`<tr><td>ترم ${fmt(r.term)}</td><td>${fmt(r.count)}</td><td>${fmt(r.units)}</td><td>${fmt(r.passed)}</td><td>${fmt(r.remaining)}</td><td><div style="height:6px;background:var(--panel2);border-radius:20px;overflow:hidden;min-width:80px"><div style="height:100%;width:${r.pct}%;background:linear-gradient(90deg,var(--accent),var(--accent2))"></div></div></td></tr>`).join('');
}

/* ---------- Stats ---------- */
function renderStats(){
  drawTermLoadChart();
  drawUnitDistChart();
  const x=computed();
  const withPr=courses.filter(c=>String(c.prereq??'').trim()&&String(c.prereq).trim()!=='_');
  const ready=withPr.filter(c=>checkPrereq(c).ready).length;
  const blocked=withPr.length-ready;
  $('prereqStats').innerHTML=`<ul class="stats-list"><li><span>کل دروس دارای پیش‌نیاز</span><strong>${fmt(withPr.length)}</strong></li><li><span>با پیش‌نیاز تکمیل‌شده (آماده)</span><strong style="color:var(--success)">${fmt(ready)}</strong></li><li><span>با پیش‌نیاز ناقص</span><strong style="color:var(--danger)">${fmt(blocked)}</strong></li><li><span>نسبت آمادگی</span><strong>${withPr.length?percent(ready/withPr.length*100):'—'}</strong></li></ul>`;
  const heavy=dashboardTerms.slice().sort((a,b)=>b.units-a.units)[0];
  const light=dashboardTerms.slice().sort((a,b)=>a.units-b.units)[0];
  const remByType={};
  computed().remaining.forEach(c=>{const t=normalizeType(c.type);remByType[t]=(remByType[t]||0)+1});
  const topType=Object.entries(remByType).sort((a,b)=>b[1]-a[1])[0];
  $('keyStats').innerHTML=`<li><span>مجموع واحد گذرانده</span><strong>${fmt(x.passedUnits)} واحد</strong></li><li><span>مجموع واحد باقی‌مانده</span><strong>${fmt(x.remainingUnits)} واحد</strong></li><li><span>میانگین نمرات ثبت‌شده</span><strong>${x.avgGrade?fmt(x.avgGrade.toFixed(2)):'—'}</strong></li><li><span>سنگین‌ترین ترم ثبت‌شده</span><strong>${heavy?heavy.term+' ('+fmt(heavy.units)+' واحد)':'—'}</strong></li><li><span>سبک‌ترین ترم ثبت‌شده</span><strong>${light?light.term+' ('+fmt(light.units)+' واحد)':'—'}</strong></li><li><span>بیشترین درس باقی‌مانده در نوع</span><strong>${topType?topType[0]+' ('+fmt(topType[1])+')':'—'}</strong></li>`;
}

/* ---------- Achievements ---------- */
function renderAchievements(){
  const x=computed();
  const achievements=[
    {id:'first10',icon:'🌱',name:'شروع مسیر',desc:'۱۰ درس پاس کن',unlocked:x.passed.length>=10},
    {id:'half',icon:'⭐',name:'نیمه راه',desc:'۵۰٪ پیشرفت واحدی',unlocked:x.progress>=50},
    {id:'threeQ',icon:'🎯',name:'سه‌چهارم راه',desc:'۷۵٪ پیشرفت واحدی',unlocked:x.progress>=75},
    {id:'specialDone',icon:'💎',name:'تخصصی‌زن',desc:'همه تخصصی‌ها پاس شود',unlocked:x.special.length===0},
    {id:'noRemaining',icon:'🏆',name:'فارغ‌التحصیل',desc:'همه دروس پاس شود',unlocked:x.remaining.length===0},
    {id:'units100',icon:'💯',name:'صدتایی',desc:'۱۰۰ واحد گذرانده',unlocked:x.passedUnits>=100},
    {id:'grade18',icon:'📚',name:'شاگرد ممتاز',desc:'میانگین ۱۸ یا بیشتر',unlocked:(x.avgGrade||0)>=18},
    {id:'plannerUsed',icon:'🧠',name:'برنامه‌ریز',desc:'از برنامه‌ریز هوشمند استفاده کن',unlocked:!!plannerOutput}
  ];
  const count=achievements.filter(a=>a.unlocked).length;
  $('achCount').textContent=fmt(count)+' از '+fmt(achievements.length);
  $('achGrid').innerHTML=achievements.map(a=>`<div class="ach-card ${a.unlocked?'unlocked':'locked'}">${a.unlocked?'<span class="ach-badge">✓</span>':''}<div class="ach-icon">${a.icon}</div><div class="ach-name">${esc(a.name)}</div><div class="ach-desc">${esc(a.desc)}</div></div>`).join('');
}

/* ---------- Source ---------- */
function renderSource(){
  const h=originalSummary.headline;
  $('sourceHeadline').innerHTML=[
    ['کل دروس ثبت‌شده',fmt(h.totalCourses)],
    ['درصد پاس‌شده',percent(h.passedPercent*100)],
    ['درصد باقی‌مانده',percent(h.remainingPercent*100)],
    ['ترم فعلی',fmt(h.currentTerm)],
    ['تخصصی باقی‌مانده',fmt(h.specialtyRemaining)],
    ['متن واحد کل',h.totalUnitsText],
    ['متن پاس‌شده',h.passedText],
    ['متن باقی‌مانده',h.remainingText],
    ['متن واحد ترم فعلی',h.currentTermUnitsText]
  ].map(([l,v])=>`<div class="mini-stat"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('');
  $('sourceProgressBody').innerHTML=originalSummary.progress.map(r=>`<tr><td>${esc(r.label)}</td><td>${fmt(r.courses)}</td><td>${fmt(r.units)}</td><td>${percent(r.share*100)}</td></tr>`).join('');
  $('sourceTypeBody').innerHTML=originalSummary.remainingByType.map(r=>`<tr><td>${esc(r.type)}</td><td>${fmt(r.courses)}</td><td>${fmt(r.units)}</td><td>${percent(r.share*100)}</td><td><span class="badge-priority">${esc(r.priority)}</span></td></tr>`).join('');
  const x=computed();
  $('sourceTransferNote').textContent=`در فهرست جزئی فعلی ${x.total} درس: ${x.passed.length} پاس‌شده و ${x.remaining.length} باقی‌مانده؛ مجموع ${x.totalUnits} واحد. کارت‌های بالای صفحه از این آمار ساخته می‌شوند.`;
}

/* ---------- همه ---------- */
function renderAll(){
  renderKPIs();
  drawCharts();
  renderCategoryProgress();
  renderPriority();
  renderGPA();
  renderGraph();
  renderSourceNotes();
  renderCourses();
  renderPlan();
  renderTerms();
  renderStats();
  renderAchievements();
  renderSource();
  persist();
}

function setView(view){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));
  document.querySelectorAll('.mobile-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  try{sessionStorage.setItem('choiceUnit.activeView',view)}catch(e){}
  if(view==='dashboard')setTimeout(drawCharts,30);
  if(view==='gpa')setTimeout(renderGPA,30);
  if(view==='graph')setTimeout(renderGraph,30);
  if(view==='stats')setTimeout(()=>{drawTermLoadChart();drawUnitDistChart()},30);
  if(view==='planner'&&!plannerOutput)$('plannerGenerate').click();
}