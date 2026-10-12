'use strict';


function generatePlanSuggestion(){
  const max=Math.max(6,Math.min(24,n($('plannerMaxUnits').value)||18));
  const candidates=computed().remaining.filter(c=>checkPrereq(c).ready).sort((a,b)=>{
      const rank=t=>normalizeType(t)==='تخصصی'?0:normalizeType(t)==='اصلی'?1:normalizeType(t)==='پایه'?2:3;
      const ra=rank(a.type),rb=rank(b.type);
      
      if(ra!==rb)return ra-rb;
      return (a.suggestedTerm??99)-(b.suggestedTerm??99);
    });
    if(!candidates.length){
    $('plannerOutput').innerHTML =
      '<div class="empty priority">🎉 درسی برای برنامه‌ریزی باقی نمانده یا پیش‌نیاز هیچ‌کدام آماده نیست.</div>';
    $('plannerBadge').textContent='خالی';
    toast('دروس آماده‌ای یافت نشد','warning');
    return;
  }
  const chosen=[];let sum=0;
  for(const c of candidates){
    if(sum+n(c.units)<=max){chosen.push(c);sum+=n(c.units)}
  }
  const t8=[],t9=[];let s8=0,s9=0;
  chosen.forEach(c=>{
    if(s8+n(c.units)<=Math.ceil(max*0.55)&&t8.length<6){t8.push(c);s8+=n(c.units)}
    else{t9.push(c);s9+=n(c.units)}
  });
  plannerOutput={term8:{courses:t8,units:s8},term9:{courses:t9,units:s9}};

  const renderSlot=(title,slot,color)=>`<div class="planner-slot"><div class="planner-slot-head"><div class="planner-slot-title" style="color:${color}">📅 ${title}</div><div class="mini-badge">${fmt(slot.courses.length)} درس · ${fmt(slot.units)} واحد</div></div>${slot.courses.length?slot.courses.map(c=>`<div class="planner-course"><span class="pr-check">${checkPrereq(c).ready?'✅':'⚠️'}</span><span class="pill special type-${esc(normalizeType(c.type))}" style="font-size:10px">${esc(normalizeType(c.type))}</span><span>${esc(String(c.name).trim())}</span><span class="units">${fmt(c.units)} واحد</span></div>`).join(''):'<div class="muted" style="padding:12px;text-align:center">درسی برای این ترم پیدا نشد</div>'}</div>`;

  $('plannerOutput').innerHTML=renderSlot('پیشنهاد ترم ۸',plannerOutput.term8,'var(--accent2)')+renderSlot('پیشنهاد ترم ۹',plannerOutput.term9,'var(--purple)');
  $('plannerBadge').textContent='آماده اعمال';
  toast('پیشنهاد تولید شد','success');
  renderAchievements();
}

function applyPlannerToTerms(){
  if(!plannerOutput){toast('ابتدا پیشنهاد را تولید کن','warning');return}
  const existing=plan.map(p=>String(p.name).trim());
  let added=0;
  [['8',plannerOutput.term8],['9',plannerOutput.term9]].forEach(([t,slot])=>{
    slot.courses.forEach(c=>{
      if(!existing.includes(String(c.name).trim())){
        plan.push({id:'plan-auto-'+Date.now()+'-'+added,name:String(c.name).trim(),type:normalizeType(c.type),units:n(c.units),targetTerm:+t,status:'در حال برنامه‌ریزی'});
        added++;
      }
    });
  });
  renderAll();
  toast(fmt(added)+' درس به برنامه ترم‌ها اضافه شد','success');
}