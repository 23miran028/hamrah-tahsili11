'use strict';

/* پیدا کردن درس با نرمال‌سازی نام (اعداد فارسی، ی/ك عربی، کلمات عمومی) */
function findCourseByName(name){
  if(!name) return null;
  const clean = normalizeName(name);
  // ۱) تطابق دقیق
  let hit = courses.find(c=>normalizeName(c.name)===clean);
  if(hit) return hit;
  // ۲) تطابق با حذف کلمات عمومی
  const strip = s=>normalizeName(s).replace(/\b(عمومی|پایه|پیشرفته)\b/g,'').replace(/\s+/g,' ').trim();
  const target = strip(clean);
  hit = courses.find(c=>strip(c.name)===target);
  return hit || null;
}

function checkPrereq(course){
  if(!course.prereq || course.prereq==='_') return {ready:true,reasons:[]};
  const parts = normalizeDigits(String(course.prereq))
    .split(/[+,]/).map(s=>s.trim()).filter(Boolean);
  const missing=[];
  parts.forEach(p=>{
    if(/هم\s*نیاز|ترم \d|گذراندن \d+|_\s*$/i.test(p)) return;
    const found = findCourseByName(p);
    if(!found) return;
    if(found.status!=='پاس شده') missing.push(p);
  });
  return {ready:missing.length===0, reasons:missing};
}