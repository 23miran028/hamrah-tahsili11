'use strict';

/* ======================================================================
   اشتراک‌گذاری پلن با لینک — نسخه فشرده
   --------------------------------------------------------------------
   • فقط تغییرات نسبت به SOURCE ذخیره می‌شود (diff)
   • فشرده‌سازی gzip با CompressionStream
   • Base64 URL-safe
   • اگر مرورگر از فشرده‌سازی پشتیبانی نکند، به حالت plain برمی‌گردد
   ====================================================================== */

const SHARE_HASH_PREFIX = '#share=';

/* ============ Base64 URL-safe helpers ============ */
function bytesToB64(bytes){
  let bin = '';
  const CHUNK = 0x8000;
  for(let i = 0; i < bytes.length; i += CHUNK){
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64ToBytes(b64){
  let s = b64.replace(/-/g, '+').replace(/_/g, '/');
  while(s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/* ============ Encode / Decode با فشرده‌سازی ============ */
async function encodeData(str){
  /* اگر CompressionStream موجود بود: 'z' + gzip */
  if(typeof CompressionStream === 'function'){
    try{
      const blob = new Blob([str]);
      const compressed = blob.stream().pipeThrough(new CompressionStream('gzip'));
      const buf = await new Response(compressed).arrayBuffer();
      return 'z' + bytesToB64(new Uint8Array(buf));
    }catch(e){ /* بی‌صدا، برو به fallback */ }
  }
  /* fallback: 'p' + plain UTF-8 */
  return 'p' + bytesToB64(new TextEncoder().encode(str));
}

async function decodeData(encoded){
  if(!encoded || encoded.length < 2) throw new Error('empty');
  const type = encoded[0];
  const b64 = encoded.slice(1);
  const bytes = b64ToBytes(b64);

  if(type === 'z'){
    if(typeof DecompressionStream !== 'function') throw new Error('no-decompress');
    const blob = new Blob([bytes]);
    const decompressed = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(decompressed).text();
  }
  /* 'p' = plain */
  return new TextDecoder().decode(bytes);
}

/* ============ ساخت Payload فشرده (Diff از SOURCE) ============ */
function buildSharePayload(){
  const srcMap = new Map(SOURCE.courses.map(c => [c.sourceRow, c]));
  const seenIds = new Set();

  const c = [];   /* changes: [sourceRow, {delta}] */
  const n = [];   /* new courses */
  const d = [];   /* deleted sourceRow numbers */

  courses.forEach(course => {
    seenIds.add(course.id);
    const src = course.sourceRow != null ? srcMap.get(course.sourceRow) : null;

    /* --- درس جدید (اضافه‌شده توسط کاربر) --- */
    if(!src){
      n.push([
        course.name,
        course.type,
        course.units,
        course.status === 'پاس شده' ? 1 : 0,
        course.suggestedTerm ?? 0,
        course.selectedTerm ?? 0,
        course.grade ?? 0,
        course.prereq || ''
      ]);
      return;
    }

    /* --- درس از SOURCE — فقط تغییرات را بگیر --- */
    const delta = {};
    if(course.status !== src.status)
      delta.s = course.status === 'پاس شده' ? 1 : 0;
    if(course.suggestedTerm !== src.suggestedTerm)
      delta.st = course.suggestedTerm ?? 0;
    if(course.selectedTerm !== src.selectedTerm)
      delta.t = course.selectedTerm ?? 0;
    if(course.grade !== src.grade)
      delta.g = course.grade ?? 0;
    if(course.name !== src.name)
      delta.n = course.name;
    if(course.type !== src.type)
      delta.ty = course.type;
    if(course.units !== src.units)
      delta.u = course.units;
    if(course.prereq !== src.prereq)
      delta.p = course.prereq || '';

    if(Object.keys(delta).length > 0){
      c.push([course.sourceRow, delta]);
    }
  });

  /* --- دروس حذف‌شده --- */
  SOURCE.courses.forEach(src => {
    if(!seenIds.has(src.id)) d.push(src.sourceRow);
  });

  /* --- plan و gpaRows — با کلیدهای کوتاه --- */
  const p = (plan || []).map(x => [
    x.name, x.type, x.units, x.targetTerm ?? 0, x.status || 'باقی‌مانده'
  ]);

  const g = (gpaRows || []).map(x => [
    x.name, x.units, x.type, x.simGrade ?? 0
  ]);

  return { v: 3, c, n, d, p, g };
}

/* ============ بازیابی از Payload ============ */
function restoreSharePayload(payload){
  /* ۱) از SOURCE شروع کن */
  const restored = clone(SOURCE.courses);
  const byRow = new Map(restored.map(x => [x.sourceRow, x]));

  /* ۲) تغییرات را اعمال کن */
  (payload.c || []).forEach(([row, delta]) => {
    const x = byRow.get(row);
    if(!x) return;
    if('s'  in delta) x.status        = delta.s === 1 ? 'پاس شده' : 'پاس نشده';
    if('st' in delta) x.suggestedTerm = delta.st || null;
    if('t'  in delta) x.selectedTerm  = delta.t  || null;
    if('g'  in delta) x.grade         = delta.g  || null;
    if('n'  in delta) x.name          = delta.n;
    if('ty' in delta) x.type          = delta.ty;
    if('u'  in delta) x.units         = delta.u;
    if('p'  in delta) x.prereq        = delta.p || null;
  });

  /* ۳) حذف‌شده‌ها را حذف کن */
  const delSet = new Set(payload.d || []);
  const finalCourses = restored.filter(x => !delSet.has(x.sourceRow));

  /* ۴) دروس جدید را اضافه کن */
  (payload.n || []).forEach((arr, i) => {
    const [name, type, units, passed, st, t, g, prereq] = arr;
    finalCourses.push({
      id: 'shared-' + Date.now() + '-' + i,
      sourceRow: null,
      name, type, units,
      status: passed === 1 ? 'پاس شده' : 'پاس نشده',
      suggestedTerm: st || null,
      selectedTerm:  t  || null,
      grade:         g  || null,
      prereq:        prereq || null,
      notes: ''
    });
  });

  /* ۵) plan */
  const restoredPlan = (payload.p && payload.p.length)
    ? payload.p.map((arr, i) => {
        const [name, type, units, targetTerm, status] = arr;
        return {
          id: 'plan-share-' + Date.now() + '-' + i,
          name, type, units,
          targetTerm: targetTerm || null,
          status: status || 'باقی‌مانده'
        };
      })
    : clone(SOURCE.plan);

  /* ۶) gpaRows */
  const restoredGpa = (payload.g || []).map(arr => {
    const [name, units, type, simGrade] = arr;
    return {
      name, units, type,
      simGrade: simGrade || null
    };
  });

  return { courses: finalCourses, plan: restoredPlan, gpaRows: restoredGpa };
}

/* ============ ساخت لینک و کپی ============ */
async function shareLink(){
  const payload = buildSharePayload();
  const json = JSON.stringify(payload);
  const encoded = await encodeData(json);

  const url = location.origin + location.pathname + SHARE_HASH_PREFIX + encoded;
  const bytes = new Blob([json]).size;
  const compressedBytes = Math.round(encoded.length * 0.75);
  const sizeTxt = `${(compressedBytes / 1024).toFixed(1)}KB (از ${(bytes / 1024).toFixed(1)}KB)`;

  const done = () => toast(`🔗 لینک کپی شد · ${sizeTxt}`, 'success');
  const fallback = () => prompt('لینک را کپی کن:', url);

  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(url).then(done).catch(fallback);
  } else {
    fallback();
  }
}

/* ============ بررسی URL هنگام باز شدن ============ */
async function checkSharedLink(){
  const hash = location.hash || '';
  if(!hash.startsWith(SHARE_HASH_PREFIX)) return;

  const encoded = hash.slice(SHARE_HASH_PREFIX.length);

  let payload;
  try{
    const json = await decodeData(encoded);
    payload = JSON.parse(json);
  }catch(e){
    toast('لینک نامعتبر یا خراب است', 'error');
    history.replaceState(null, '', location.pathname + location.search);
    return;
  }

  if(!payload || payload.v !== 3){
    toast('نسخه لینک پشتیبانی نمی‌شود', 'error');
    history.replaceState(null, '', location.pathname + location.search);
    return;
  }

  const changeCount = (payload.c || []).length;
  const newCount    = (payload.n || []).length;
  const delCount    = (payload.d || []).length;
  const planCount   = (payload.p || []).length;

  const summary = [];
  if(changeCount) summary.push(`${changeCount} تغییر درس`);
  if(newCount)    summary.push(`${newCount} درس جدید`);
  if(delCount)    summary.push(`${delCount} حذف`);
  if(planCount)   summary.push(`${planCount} برنامه`);

  const detail = summary.length ? summary.join(' · ') : 'فقط برنامه';

  const ok = await confirmDialog(
    '🔗 بازیابی از لینک',
    `${detail}\nداده‌های فعلی جایگزین می‌شوند. مطمئنی؟`,
    'بارگذاری',
    '🔗'
  );

  /* hash را پاک کن — اگر انصراف داد، دفعه بعد دوباره نپرسد */
  history.replaceState(null, '', location.pathname + location.search);

  if(!ok) return;

  const restored = restoreSharePayload(payload);
  courses  = restored.courses;
  plan     = restored.plan;
  gpaRows  = restored.gpaRows;

  renderAll();
  toast('✅ داده از لینک بازیابی شد', 'success');
}