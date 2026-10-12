'use strict';

/* ======================================================================
   شبیه‌ساز معدل — What-if GPA Simulator
   --------------------------------------------------------------------
   • از دروس «پاس شده» برای محاسبه معدل فعلی استفاده می‌کند
   • از لیست انتخابی کاربر برای شبیه‌سازی معدل ترم آینده
   • معدل کل پیش‌بینی‌شده = (مجموع (نمره×واحد)) / (مجموع واحدها)
   ====================================================================== */

/* ردیف‌های شبیه‌سازی: {name, units, type, simGrade}
   در state ذخیره می‌شوند با کلید gpaSim در localStorage */

/* ---------- محاسبه معدل ---------- */
function calcAvg(list){
  // list: [{grade, units}]
  let sumW = 0, sumU = 0;
  list.forEach(r=>{
    const g = Number(r.grade);
    const u = Number(r.units);
    if(!Number.isFinite(g) || !Number.isFinite(u) || u<=0) return;
    sumW += g * u;
    sumU += u;
  });
  return sumU > 0 ? sumW / sumU : null;
}

/* معدل فعلی از دروس پاس‌شده با نمره */
function currentGPA(){
  const list = courses
    .filter(c=>c.status==='پاس شده' && c.grade!=null && c.grade!=='')
    .map(c=>({grade:Number(c.grade), units:Number(c.units)||0}));
  return {avg:calcAvg(list), units:list.reduce((s,x)=>s+x.units,0), count:list.length};
}

/* معدل ترم فرضی از ردیف‌های شبیه‌سازی */
function termGPA(){
  const list = gpaRows
    .filter(r=>r.simGrade!=null && r.simGrade!=='')
    .map(r=>({grade:Number(r.simGrade), units:Number(r.units)||0}));
  return {avg:calcAvg(list), units:list.reduce((s,x)=>s+x.units,0), count:list.length};
}

/* معدل کل پیش‌بینی‌شده = ترکیب پاس‌شده‌ها + شبیه‌سازی */
function projectedGPA(){
  const passed = courses
    .filter(c=>c.status==='پاس شده' && c.grade!=null && c.grade!=='')
    .map(c=>({grade:Number(c.grade), units:Number(c.units)||0}));
  const sim = gpaRows
    .filter(r=>r.simGrade!=null && r.simGrade!=='')
    .map(r=>({grade:Number(r.simGrade), units:Number(r.units)||0}));
  const all = [...passed, ...sim];
  return {avg:calcAvg(all), units:all.reduce((s,x)=>s+x.units,0)};
}

/* تأثیر هر درس بر معدل: چقدر معدل را بالا/پایین می‌برد نسبت به معدل فعلی */
function impactOf(row, baseAvg){
  if(baseAvg==null) return null;
  if(row.simGrade==null || row.simGrade==='') return null;
  const g = Number(row.simGrade);
  if(!Number.isFinite(g)) return null;
  // تأثیر تخمینی: (نمره - معدل فعلی) × (واحد / مجموع واحدها)
  const delta = (g - baseAvg);
  return delta;
}

/* ---------- رندر ---------- */
function renderGPA(){
  const cur = currentGPA();
  const term = termGPA();
  const proj = projectedGPA();

  /* KPIها */
  $('gpaCurrent').textContent = cur.avg!=null ? fmt(cur.avg.toFixed(2)) : '—';
  $('gpaCurrentMeta').textContent = cur.count
    ? `از ${fmt(cur.count)} درس با نمره · ${fmt(cur.units)} واحد`
    : 'نمره‌ای ثبت نشده';

  $('gpaTerm').textContent = term.avg!=null ? fmt(term.avg.toFixed(2)) : '—';
  $('gpaTermMeta').textContent = term.count
    ? `${fmt(term.count)} درس · ${fmt(term.units)} واحد فرضی`
    : 'نمره فرضی وارد نشده';

  $('gpaProjected').textContent = proj.avg!=null ? fmt(proj.avg.toFixed(2)) : '—';
  if(cur.avg!=null && proj.avg!=null){
    const delta = proj.avg - cur.avg;
    const sign = delta>0 ? '+' : '';
    $('gpaProjectedMeta').innerHTML =
      `<span class="gpa-impact ${delta>0?'up':delta<0?'down':''}">${sign}${fmt(delta.toFixed(2))} نسبت به معدل فعلی</span>`;
  }else{
    $('gpaProjectedMeta').textContent = '—';
  }

  /* Badge */
  const fillCount = gpaRows.filter(r=>r.simGrade!=null && r.simGrade!=='').length;
  $('gpaBadge').textContent = fillCount ? `${fmt(fillCount)} از ${fmt(gpaRows.length)} پرشده` : 'آماده';

  /* جدول */
  $('gpaEmpty').hidden = gpaRows.length>0;
  $('gpaBody').innerHTML = gpaRows.map((row,i)=>{
    const g = row.simGrade;
    const gNum = Number(g);
    const cls = (g===''||g==null) ? '' : (gNum>=17 ? 'high' : (gNum<12 ? 'low' : ''));
    const pct = (g===''||g==null) ? 0 : Math.max(0, Math.min(100, gNum/20*100));
    const impact = impactOf(row, cur.avg);
    const impactHtml = impact==null
      ? '<span class="gpa-impact">—</span>'
      : `<span class="gpa-impact ${impact>0?'up':impact<0?'down':''}">${impact>0?'+':''}${fmt(impact.toFixed(2))}</span>`;
    return `<tr data-gpa-row="${i}">
      <td><b>${esc(row.name)}</b></td>
      <td><span class="pill special type-${esc(normalizeType(row.type))}">${esc(normalizeType(row.type))}</span></td>
      <td>${fmt(row.units)}</td>
      <td><input class="gpa-input ${cls}" type="number" min="0" max="20" step="0.25" value="${g==null?'':esc(g)}" data-gpa-input="${i}" placeholder="—"></td>
      <td><div class="gpa-bar" title="${pct?fmt(pct)+'٪':''}"><span style="width:${pct}%"></span></div></td>
      <td>${impactHtml} <button class="btn sm" type="button" data-gpa-remove="${i}" title="حذف">✕</button></td>
    </tr>`;
  }).join('');
}

/* ---------- عملیات ---------- */
function gpaLoadFromPlan(){
  const items = plan.filter(p=>p.status!=='انجام شد');
  if(!items.length){toast('برنامه‌ای برای بارگذاری نیست','warning');return}
  /* اگر همان نام قبلاً وجود دارد، دوباره اضافه نکن */
  const existing = new Set(gpaRows.map(r=>normalizeName(r.name)));
  let added = 0;
  items.forEach(p=>{
    if(existing.has(normalizeName(p.name))) return;
    gpaRows.push({name:p.name, units:n(p.units), type:normalizeType(p.type), simGrade:null});
    added++;
  });
  persist();
  renderGPA();
  toast(added ? `${fmt(added)} درس اضافه شد` : 'همه دروس قبلاً اضافه شده‌اند','success');
}

function gpaLoadFromRemaining(){
  const remaining = computed().remaining;
  if(!remaining.length){toast('درسی باقی نمانده','warning');return}
  const existing = new Set(gpaRows.map(r=>normalizeName(r.name)));
  let added = 0;
  remaining.forEach(c=>{
    const nm = String(c.name).trim();
    if(existing.has(normalizeName(nm))) return;
    gpaRows.push({name:nm, units:n(c.units), type:normalizeType(c.type), simGrade:null});
    added++;
  });
  persist();
  renderGPA();
  toast(added ? `${fmt(added)} درس اضافه شد` : 'همه دروس قبلاً اضافه شده‌اند','success');
}

function gpaClear(){
  if(!gpaRows.length) return;
  gpaRows.forEach(r=>r.simGrade=null);
  persist();
  renderGPA();
  toast('نمرات فرضی پاک شد','warning');
}

function gpaAddRow(){
  const name = prompt('نام درس:');
  if(!name) return;
  const u = prompt('تعداد واحد:', '3');
  const units = Math.max(0, Math.round(n(u)));
  if(!units){toast('واحد نامعتبر','error');return}
  gpaRows.push({name:name.trim(), units, type:'سایر', simGrade:null});
  persist();
  renderGPA();
  toast('درس اضافه شد','success');
}

/* برای به‌روزرسانی فقط KPIها هنگام تایپ، تا input focus از دست نرود */
function updateGPAKPIsOnly(){
  const cur = currentGPA();
  const term = termGPA();
  const proj = projectedGPA();

  $('gpaCurrent').textContent = cur.avg!=null ? fmt(cur.avg.toFixed(2)) : '—';
  $('gpaTerm').textContent = term.avg!=null ? fmt(term.avg.toFixed(2)) : '—';
  $('gpaProjected').textContent = proj.avg!=null ? fmt(proj.avg.toFixed(2)) : '—';

  if(cur.avg!=null && proj.avg!=null){
    const delta = proj.avg - cur.avg;
    const sign = delta>0 ? '+' : '';
    $('gpaProjectedMeta').innerHTML =
      `<span class="gpa-impact ${delta>0?'up':delta<0?'down':''}">${sign}${fmt(delta.toFixed(2))} نسبت به معدل فعلی</span>`;
  }

  const fillCount = gpaRows.filter(r=>r.simGrade!=null && r.simGrade!=='').length;
  $('gpaBadge').textContent = fillCount ? `${fmt(fillCount)} از ${fmt(gpaRows.length)} پرشده` : 'آماده';
}