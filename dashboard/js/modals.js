'use strict';

function openCourse(c=null){
  $('courseForm').reset();
  $('courseId').value=c?.id||'';
  $('courseModalTitle').textContent=c?'ویرایش درس':'افزودن درس';
  $('deleteCourse').hidden=!c;
  $('courseName').value=c?String(c.name).trim():'';
  $('courseStatus').value=c?.status||'پاس نشده';
  $('courseType').innerHTML=typeOptions(c?.type||'تخصصی');
  $('courseUnits').value=c?.units??3;
  $('courseSuggested').innerHTML=termOptions(c?.suggestedTerm);
  $('courseSelected').innerHTML=termOptions(c?.selectedTerm);
  $('courseGrade').value=c?.grade??'';
  $('courseNotes2').value=c?.notes||'';
  $('coursePrereq').value=c?.prereq||'';
  $('courseModal').classList.add('open');
  lockBody();
  setTimeout(()=>$('courseName').focus(),60);
}
function closeCourse(){$('courseModal').classList.remove('open');unlockBody()}

function openPlan(p=null){
  $('planForm').reset();
  $('planId').value=p?.id||'';
  $('planModalTitle').textContent=p?'ویرایش':'افزودن';
  $('deletePlan').hidden=!p;
  $('planName').value=p?.name||'';
  $('planType').innerHTML=typeOptions(p?.type||'تخصصی');
  $('planUnits').value=p?.units??3;
  $('planTarget').innerHTML=termOptions(p?.targetTerm);
  $('planStatus').value=p?.status||'باقی‌مانده';
  $('planModal').classList.add('open');
  lockBody();
  setTimeout(()=>$('planName').focus(),60);
}
function closePlan(){$('planModal').classList.remove('open');unlockBody()}

function getTerm(id){const v=$(id).value;return v===''?null:Number(v)}

let confirmResolve=null;
function confirmDialog(title,text,okLabel='تأیید',icon='⚠️'){
  return new Promise(res=>{
    confirmResolve=res;
    $('confirmIcon').textContent=icon;
    $('confirmTitle').textContent=title;
    $('confirmText').textContent=text;
    $('confirmOk').textContent=okLabel;
    $('confirmModal').classList.add('open');
    lockBody();
    setTimeout(()=>$('confirmOk').focus(),60);
  });
}
function wireConfirm(){
  $('confirmOk').onclick=()=>{$('confirmModal').classList.remove('open');unlockBody();confirmResolve&&confirmResolve(true)};
  $('confirmCancel').onclick=()=>{$('confirmModal').classList.remove('open');unlockBody();confirmResolve&&confirmResolve(false)};
}

function openDrawer(id){
  const c=courses.find(x=>x.id===id);
  if(!c)return;
  const t=normalizeType(c.type);
  const pr=checkPrereq(c);
  const badge=pr.ready?'<span class="pill ready">✅ پیش‌نیاز آماده</span>':`<span class="pill blocked">⚠️ ناقص: ${esc(pr.reasons.join('، '))}</span>`;
  $('drawerTitle').textContent=String(c.name).trim();
  $('drawerBody').innerHTML=`
    <div style="display:grid;grid-template-columns:100px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:11.5px">وضعیت</span><span>${statusPill(c.status)}</span></div>
    <div style="display:grid;grid-template-columns:100px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:11.5px">نوع</span><span><span class="pill special type-${esc(t)}">${esc(t)}</span></span></div>
    <div style="display:grid;grid-template-columns:100px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:11.5px">واحد</span><span>${fmt(c.units)} واحد</span></div>
    <div style="display:grid;grid-template-columns:100px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:11.5px">ترم پیشنهادی</span><span>${termLabel(c.suggestedTerm)}</span></div>
    <div style="display:grid;grid-template-columns:100px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:11.5px">ترم انتخابی</span><span>${termLabel(c.selectedTerm)}</span></div>
    ${c.grade!=null?`<div style="display:grid;grid-template-columns:100px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:11.5px">نمره</span><span>${fmt(c.grade)}</span></div>`:''}
    <div style="display:grid;grid-template-columns:100px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:11.5px">پیش‌نیاز</span><span>${esc(c.prereq||'ندارد')}</span></div>
    <div style="padding:10px 0;border-bottom:1px solid var(--line)">${badge}</div>
    ${c.notes?`<div style="padding:10px 0"><span class="muted" style="display:block;font-size:11.5px;margin-bottom:6px">یادداشت</span><div style="color:var(--text)">${esc(c.notes)}</div></div>`:''}
    <div style="display:flex;gap:8px;margin-top:18px"><button class="btn primary" type="button" data-edit-course="${esc(c.id)}">✎ ویرایش</button><button class="btn" type="button" onclick="document.getElementById('closeDrawer').click()">بستن</button></div>
  `;
  $('drawer').style.transform='translateX(0)';
  $('drawerBg').style.display='block';
  lockBody();
}
function closeDrawer(){
  $('drawer').style.transform='translateX(100%)';
  $('drawerBg').style.display='none';
  unlockBody();
}