'use strict';

const cmdkCmds=[
  {icon:'▦',label:'نمای کلی',run:()=>setView('dashboard')},
  {icon:'🧠',label:'برنامه‌ریز هوشمند',run:()=>setView('planner')},
  {icon:'▤',label:'فهرست درس‌ها',run:()=>setView('courses')},
  {icon:'◫',label:'برنامه ترم‌ها',run:()=>setView('planning')},
  {icon:'▥',label:'بار ترم‌ها',run:()=>setView('terms')},
  {icon:'📊',label:'آمار تحلیلی',run:()=>setView('stats')},
  {icon:'🏆',label:'دستاوردها',run:()=>setView('achievements')},
  {icon:'ⓘ',label:'داده منبع',run:()=>setView('source')},
  {icon:'＋',label:'افزودن درس',run:()=>openCourse()},
  {icon:'🧮',label:'شبیه‌ساز معدل',run:()=>setView('gpa')},
  {icon:'🌳',label:'نقشه پیش‌نیازها',run:()=>setView('graph')},
  {icon:'↑',label:'بازیابی پشتیبان',run:()=>$('importFile').click()},
  {icon:'↓',label:'پشتیبان JSON',run:exportJSON},
  {icon:'▤',label:'خروجی CSV',run:exportCSV},
  {icon:'🔗',label:'اشتراک‌گذاری لینک',run:shareLink},
  {icon:'📲',label:'نصب اپ روی دستگاه',run:()=>{ if(deferredInstallPrompt) $('installBtn')?.click(); else toast('مرورگر از نصب پشتیبانی نمی‌کند','warning'); }},
  {icon:'⎙',label:'چاپ / PDF',run:()=>window.print()}
];

function openCmdk(){
  $('cmdk').classList.add('open');
  lockBody();
  $('cmdkInput').value='';
  renderCmdk('');
  $('cmdkInput').focus();
}
function closeCmdk(){$('cmdk').classList.remove('open');unlockBody()}

function renderCmdk(q){
  const query=q.trim().toLocaleLowerCase();
  let items=[];
  if(!query) items=cmdkCmds.slice();
  else{
    const cmds=cmdkCmds.filter(c=>c.label.toLocaleLowerCase().includes(query));
    const cm=courses.filter(c=>String(c.name).toLocaleLowerCase().includes(query)).slice(0,8)
      .map(c=>({icon:'📘',label:String(c.name).trim(),hint:'ترم '+(c.selectedTerm??'—')+' · '+n(c.units)+' واحد',run:()=>{closeCmdk();openDrawer(c.id)}}));
    items=[...cmds,...cm];
  }
  cmdkItems=items;
  cmdkIndex=0;
  $('cmdkList').innerHTML=items.length
    ? items.map((it,i)=>`<div class="cmdk-item ${i===0?'active':''}" data-cmdk="${i}"><span class="cmdk-icon">${it.icon}</span><span class="cmdk-label">${esc(it.label)}</span><span class="cmdk-hint">${esc(it.hint||'')}</span></div>`).join('')
    : '<div class="cmdk-empty">نتیجه‌ای یافت نشد</div>';
}
function runCmdk(i){
  const it=cmdkItems[i];
  if(it){it.run();if($('cmdk').classList.contains('open'))closeCmdk()}
}
function updateCmdkSelection(){
  document.querySelectorAll('.cmdk-item').forEach((el,i)=>el.classList.toggle('active',i===cmdkIndex));
  const el=document.querySelector('.cmdk-item.active');
  if(el)el.scrollIntoView({block:'nearest'});
}