'use strict';

function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function exportJSON(){
  const obj={format:'choice-unit-dashboard',version:2,exportedAt:new Date().toISOString(),courses,plan,termSummary,dashboardTerms,sourceSummary:originalSummary};
  downloadBlob(new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'}),'choice-unit-backup.json');
  toast('پشتیبان آماده شد');
}
function exportCSV(){
  const headers=['نام درس','وضعیت','نوع','واحد','ترم پیشنهادی','ترم انتخابی','نمره','پیش‌نیاز','یادداشت'];
  const rows=[headers,...courses.map(c=>[String(c.name).trim(),c.status,normalizeType(c.type),c.units,c.suggestedTerm??'',c.selectedTerm??'',c.grade??'',c.prereq||'',c.notes||''])]; 
  const csv='\uFEFF'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'courses.csv');
  toast('CSV آماده شد');
}
async function handleImport(file){
  try{
    const v=JSON.parse(await file.text());
    if(!Array.isArray(v.courses))throw Error('invalid');
    const ok=await confirmDialog('بازیابی',`${v.courses.length} درس جایگزین شود؟`,'بازیابی','↑');
    if(!ok)return;
    courses=v.courses.map((c,i)=>({...c,id:c.id||'import-'+i,units:Math.max(0,n(c.units))}));
    if(Array.isArray(v.plan))plan=v.plan;
    if(Array.isArray(v.termSummary))termSummary=v.termSummary;
    if(Array.isArray(v.dashboardTerms))dashboardTerms=v.dashboardTerms;
    if(v.sourceSummary)originalSummary=v.sourceSummary;
    renderAll();
    toast('بازیابی انجام شد');
  }catch(err){
    toast('فایل معتبر نیست','error');
  }
}