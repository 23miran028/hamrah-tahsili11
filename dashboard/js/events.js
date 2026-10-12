'use strict';

function wireEvents(){
  /* --- Tabs & mobile nav --- */
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  document.querySelectorAll('.mobile-nav button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('goCourses').addEventListener('click',()=>setView('courses'));

  /* --- Filters --- */
  $('searchCourse').addEventListener('input',e=>{filters.query=e.target.value;renderCourses()});
  $('filterStatus').addEventListener('change',e=>{filters.status=e.target.value;renderCourses()});
  $('filterType').addEventListener('change',e=>{filters.type=e.target.value;renderCourses()});
  $('filterTerm').addEventListener('change',e=>{filters.term=e.target.value;renderCourses()});
  $('filterReady').addEventListener('change',e=>{filters.ready=e.target.value;renderCourses()});
  $('clearFilters').addEventListener('click',()=>{
    filters={query:'',status:'',type:'',term:'',ready:''};
    $('searchCourse').value='';
    $('filterStatus').value='';
    $('filterType').value='';
    $('filterTerm').value='';
    $('filterReady').value='';
    renderCourses();
  });
  $('activeChips').addEventListener('click',e=>{
    const b=e.target.closest('[data-chip]');if(!b)return;
    const k=b.dataset.chip;filters[k]='';
    if(k==='query')$('searchCourse').value='';
    if(k==='status')$('filterStatus').value='';
    if(k==='type')$('filterType').value='';
    if(k==='term')$('filterTerm').value='';
    if(k==='ready')$('filterReady').value='';
    renderCourses();
  });
  document.querySelectorAll('th[data-sort]').forEach(th=>th.addEventListener('click',()=>{
    const k=th.dataset.sort;
    if(sortKey===k)sortDir*=-1;
    else{sortKey=k;sortDir=1}
    renderCourses();
  }));

  $('filterRemaining').addEventListener('click',()=>{setView('courses');filters.status='پاس نشده';$('filterStatus').value='پاس نشده';renderCourses()});
  $('filterSpecialty').addEventListener('click',()=>{setView('courses');filters.status='پاس نشده';filters.type='تخصصی';$('filterStatus').value='پاس نشده';$('filterType').value='تخصصی';renderCourses()});
  $('filterReadyBtn').addEventListener('click',()=>{setView('courses');filters.ready='ready';$('filterReady').value='ready';renderCourses()});

  /* --- Reset --- */
  $('resetData').addEventListener('click',async()=>{
    const ok=await confirmDialog('بازگردانی','تمام تغییرات حذف و داده اولیه بازیابی شود؟','بازگردانی','↺');
    if(!ok)return;
    courses=clone(SOURCE.courses);
    plan=clone(SOURCE.plan);
    termSummary=clone(SOURCE.termSummary);
    dashboardTerms=clone(SOURCE.dashboardTerms);
    originalSummary=clone(SOURCE.sourceSummary);
    filters={query:'',status:'',type:'',term:'',ready:''};
    $('searchCourse').value='';$('filterStatus').value='';$('filterType').value='';$('filterTerm').value='';$('filterReady').value='';
    renderAll();
    toast('بازگردانی شد');
  });
  $('resetPlan').addEventListener('click',async()=>{
    const ok=await confirmDialog('بازگردانی','برنامه اولیه بازیابی شود؟','بازگردانی','↺');
    if(!ok)return;
    plan=clone(SOURCE.plan);
    renderAll();
    toast('بازگردانی شد');
  });

  /* --- Course modal --- */
  $('addCourseBtn').onclick=()=>openCourse();
  $('addCourseQuick').onclick=()=>openCourse();
  $('closeCourseModal').onclick=closeCourse;
  $('cancelCourse').onclick=closeCourse;
  $('courseModal').addEventListener('click',e=>{if(e.target===$('courseModal'))closeCourse()});

  $('courseForm').addEventListener('submit',e=>{
    e.preventDefault();
    const id=$('courseId').value||'new-'+Date.now();
    const existing=courses.find(c=>c.id===id);
    const gradeV=$('courseGrade').value.trim();
    const c={
      id,
      sourceRow:existing?.sourceRow??null,
      status:$('courseStatus').value,
      suggestedTerm:getTerm('courseSuggested'),
      selectedTerm:getTerm('courseSelected'),
      name:$('courseName').value.trim(),
      type:rawType($('courseType').value),
      prereq:$('coursePrereq').value.trim()||null,
      units:Math.max(0,Math.round(n($('courseUnits').value))),
      notes:$('courseNotes2').value.trim(),
      grade:gradeV===''?null:n(gradeV)
    };
    if(existing)courses=courses.map(x=>x.id===id?c:x);
    else courses.push(c);
    closeCourse();
    renderAll();
    toast(existing?'ویرایش شد.':'درس اضافه شد.');
  });

  $('deleteCourse').addEventListener('click',async()=>{
    const id=$('courseId').value,c=courses.find(x=>x.id===id);
    if(!c)return;
    const ok=await confirmDialog('حذف درس','درس «'+String(c.name).trim()+'» حذف شود؟','حذف','🗑️');
    if(!ok)return;
    lastDeleted={type:'course',data:clone(c),index:courses.findIndex(x=>x.id===id)};
    courses=courses.filter(x=>x.id!==id);
    closeCourse();
    renderAll();
    toast('حذف شد','warning',{label:'بازگردانی',fn:()=>{
      if(lastDeleted?.type==='course'){
        courses.splice(lastDeleted.index,0,lastDeleted.data);
        lastDeleted=null;renderAll();toast('بازگردانی شد');
      }
    }});
  });

  /* --- Plan modal --- */
  $('addPlan').onclick=()=>openPlan();
  $('closePlanModal').onclick=closePlan;
  $('cancelPlan').onclick=closePlan;
  $('planModal').addEventListener('click',e=>{if(e.target===$('planModal'))closePlan()});

  $('planForm').addEventListener('submit',e=>{
    e.preventDefault();
    const id=$('planId').value||'plan-new-'+Date.now();
    const old=plan.find(p=>p.id===id);
    const p={id,name:$('planName').value.trim(),type:rawType($('planType').value),units:Math.max(0,Math.round(n($('planUnits').value))),targetTerm:getTerm('planTarget'),status:$('planStatus').value};
    if(old)plan=plan.map(x=>x.id===id?p:x);
    else plan.push(p);
    closePlan();
    renderAll();
    toast('ذخیره شد');
  });

  $('deletePlan').addEventListener('click',async()=>{
    const id=$('planId').value;
    const item=plan.find(x=>x.id===id);
    const ok=await confirmDialog('حذف','حذف شود؟','حذف','🗑️');
    if(!ok)return;
    lastDeleted={type:'plan',data:clone(item),index:plan.findIndex(x=>x.id===id)};
    plan=plan.filter(x=>x.id!==id);
    closePlan();
    renderAll();
    toast('حذف شد','warning',{label:'بازگردانی',fn:()=>{
      if(lastDeleted?.type==='plan'){
        plan.splice(lastDeleted.index,0,lastDeleted.data);
        lastDeleted=null;renderAll();toast('بازگردانی شد');
      }
    }});
  });

  $('planBody').addEventListener('change',e=>{
    const t=e.target.closest('[data-plan-term]');
    const s=e.target.closest('[data-plan-status]');
    if(t){const p=plan.find(x=>x.id===t.dataset.planTerm);if(p)p.targetTerm=t.value===''?null:Number(t.value);renderAll()}
    if(s){const p=plan.find(x=>x.id===s.dataset.planStatus);if(p)p.status=s.value;renderAll()}
  });
  $('planBody').addEventListener('click',e=>{
    const b=e.target.closest('[data-edit-plan]');
    if(b){const p=plan.find(x=>x.id===b.dataset.editPlan);if(p)openPlan(p)}
  });

  /* --- Drawer --- */
  $('closeDrawer').onclick=closeDrawer;
  $('drawerBg').onclick=closeDrawer;

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-edit-course]');
    if(b){closeDrawer();const c=courses.find(x=>x.id===b.dataset.editCourse);if(c)openCourse(c);return}
    const o=e.target.closest('[data-open-course]');
    if(o&&!e.target.closest('[data-edit-course]'))openDrawer(o.dataset.openCourse);
  });

  /* --- Export / Import --- */
  $('exportBtn').onclick=exportJSON;
  $('csvBtn').onclick=exportCSV;
  $('importBtn').onclick=()=>$('importFile').click();
    $('shareBtn')?.addEventListener('click', shareLink);
  $('importFile').addEventListener('change',e=>{
    const f=e.target.files?.[0];e.target.value='';
    if(f)handleImport(f);
  });
/* --- Prerequisite Graph --- */
const graphSvg = $('graphSvg');
if(graphSvg){
  graphSvg.addEventListener('mouseover', e=>{
    const n = e.target.closest('[data-node]');
    if(n) highlightNode(n.dataset.node);
  });
  graphSvg.addEventListener('mouseleave', ()=>clearGraphHighlight());
  graphSvg.addEventListener('click', e=>{
    const n = e.target.closest('[data-node]');
    if(n) openDrawer(n.dataset.node);
  });
  graphSvg.addEventListener('keydown', e=>{
    if(e.key==='Enter' || e.key===' '){
      const n = e.target.closest('[data-node]');
      if(n){ e.preventDefault(); openDrawer(n.dataset.node); }
    }
  });
  graphSvg.addEventListener('focusout', ()=>clearGraphHighlight());
}

$('graphZoomIn')   ?.addEventListener('click', graphZoomIn);
$('graphZoomOut')  ?.addEventListener('click', graphZoomOut);
$('graphZoomReset')?.addEventListener('click', graphZoomReset);
$('graphFit')      ?.addEventListener('click', graphFit);

$('graphOnlyRemaining')?.addEventListener('change', ()=>{ renderGraph(); setTimeout(graphFit, 30); });
$('graphOnlySpecialty')?.addEventListener('change', ()=>{ renderGraph(); setTimeout(graphFit, 30); });

/* --- GPA Simulator --- */
$('gpaLoadFromPlan').addEventListener('click',gpaLoadFromPlan);
$('gpaLoadFromRemaining').addEventListener('click',gpaLoadFromRemaining);
$('gpaClear').addEventListener('click',gpaClear);
$('gpaAddRow').addEventListener('click',gpaAddRow);

/* ورودی نمرات فرضی — delegate شده روی tbody */
$('gpaBody').addEventListener('input',e=>{
  const inp = e.target.closest('[data-gpa-input]');
  if(!inp) return;
  const i = +inp.dataset.gpaInput;
  const raw = inp.value.trim();
  gpaRows[i].simGrade = raw==='' ? null : Math.max(0, Math.min(20, Number(raw)));
  /* برای جلوگیری از رندر مجدد و از دست رفتن focus، فقط KPIها را آپدیت کن */
  updateGPAKPIsOnly();
});

$('gpaBody').addEventListener('change',e=>{
  const inp = e.target.closest('[data-gpa-input]');
  if(!inp) return;
  /* روی blur یا change، رندر کامل برای نمایش نوارها و تأثیرات */
  renderGPA();
  persist();
});

$('gpaBody').addEventListener('click',e=>{
  const btn = e.target.closest('[data-gpa-remove]');
  if(!btn) return;
  const i = +btn.dataset.gpaRemove;
  gpaRows.splice(i,1);
  renderGPA();
  persist();
});

  /* --- Planner --- */
  $('plannerGenerate').onclick=generatePlanSuggestion;
  $('plannerApply').onclick=applyPlannerToTerms;
  $('plannerMaxUnits').addEventListener('change',()=>{if(plannerOutput)generatePlanSuggestion()});

  /* --- Print --- */
  $('printBtn').onclick=()=>window.print();



  /* --- cmdk --- */
  $('cmdkBtn').onclick=openCmdk;
  $('cmdk').addEventListener('click',e=>{
    if(e.target===$('cmdk'))closeCmdk();
    const it=e.target.closest('[data-cmdk]');
    if(it)runCmdk(+it.dataset.cmdk);
  });
  $('cmdkInput').addEventListener('input',e=>renderCmdk(e.target.value));
  $('cmdkInput').addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){e.preventDefault();cmdkIndex=Math.min(cmdkIndex+1,cmdkItems.length-1);updateCmdkSelection()}
    else if(e.key==='ArrowUp'){e.preventDefault();cmdkIndex=Math.max(cmdkIndex-1,0);updateCmdkSelection()}
    else if(e.key==='Enter'){e.preventDefault();runCmdk(cmdkIndex)}
    else if(e.key==='Escape')closeCmdk();
  });

  /* --- Keyboard --- */
  document.addEventListener('keydown',e=>{
    const tag=e.target.tagName;
    const typing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.target.isContentEditable;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCmdk();return}
    if(e.key==='Escape'){
      if($('cmdk').classList.contains('open'))closeCmdk();
      else if($('courseModal').classList.contains('open'))closeCourse();
      else if($('planModal').classList.contains('open'))closePlan();
      else if($('confirmModal').classList.contains('open'))$('confirmCancel').click();
      else if($('drawer').style.transform==='translateX(0px)'||$('drawer').style.transform.includes('matrix'))closeDrawer();
      return;
    }
    if(typing)return;
    if(e.key.toLowerCase()==='n'){e.preventDefault();openCourse()}
    if(e.key==='/'){e.preventDefault();setView('courses');setTimeout(()=>$('searchCourse').focus(),100)}
  });

  /* --- Scroll top --- */
  window.addEventListener('scroll',()=>{$('scrollTop').classList.toggle('show',window.scrollY>400)},{passive:true});
  $('scrollTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});

  window.addEventListener('resize',()=>{
    clearTimeout(window.__ct);
    window.__ct=setTimeout(redrawAllCharts,120);
  });
    /* --- Theme & Palette (Delegation) --- */
  document.addEventListener('change', e => {
    const id = e.target?.id;
    if(id === 'themeSelect' || id === 'paletteSelect'){
      applyUI();
    }
  });
}

/* ============ UI settings (theme/palette) ============ */
function applyUI(){
  const theme   = $('themeSelect').value   || 'dark';
  const palette = $('paletteSelect').value || 'ocean';
  const html = document.documentElement;
  html.setAttribute('data-theme',   theme);
  html.setAttribute('data-palette', palette);
  html.style.colorScheme = (theme === 'light') ? 'light' : (theme === 'auto' ? 'light dark' : 'dark');
  saveUI();
  try{ redrawAllCharts(); }catch(e){}
}

/* ============ UI settings (theme/palette) ============ */
function applyUI(){
  const theme   = $('themeSelect').value   || 'dark';
  const palette = $('paletteSelect').value || 'ocean';
  const html = document.documentElement;
  html.setAttribute('data-theme',   theme);
  html.setAttribute('data-palette', palette);
  html.style.colorScheme = (theme === 'light') ? 'light'
                          : (theme === 'auto' ? 'light dark' : 'dark');
  saveUI();
  try{ redrawAllCharts(); }catch(e){}
}

function saveUI(){
  try{
    localStorage.setItem(UIKEY, JSON.stringify({
      theme:   $('themeSelect').value,
      palette: $('paletteSelect').value
    }));
  }catch(e){}
}

function setupSettings(){
  try{
    const v = JSON.parse(localStorage.getItem(UIKEY) || '{}');
    if(v.theme)   $('themeSelect').value   = v.theme;
    if(v.palette) $('paletteSelect').value = v.palette;
  }catch(e){}
  applyUI();
}