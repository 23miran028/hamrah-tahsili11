'use strict';
const $ = id => document.getElementById(id);

const TYPE_CODE={'پایه':'1پایه','اصلی':'2اصلی','تخصصی':'3تخصصی','عمومی':'4عمومی','معارف':'5معارف','اختیاری':'6اختیاری','سایر':'7سایر'};
const TYPE_NAMES=['پایه','اصلی','تخصصی','عمومی','معارف','اختیاری','سایر'];
const TYPE_COLORS={'پایه':'#54c8ff','اصلی':'#9564f5','تخصصی':'#22d3c5','عمومی':'#f6c747','معارف':'#ec4899','اختیاری':'#a9c0dd','سایر':'#7d94b3'};
const PALETTE_COLORS=['var(--accent)','var(--success)','var(--warning)','var(--purple)','var(--danger)','var(--teal)','var(--pink)'];
const CHART_FONT='Estedad,Tahoma,sans-serif';

const DIGIT_MAP={'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
                 '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};

function clone(x){return JSON.parse(JSON.stringify(x))}
function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function fmt(v){return new Intl.NumberFormat('fa-IR',{maximumFractionDigits:1}).format(v||0)}
function percent(v){return fmt(v)+'٪'}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function normalizeType(t){const s=String(t??'').trim();return s.replace(/^\d+\s*/,'')||'سایر'}
function rawType(t){const n2=normalizeType(t);return TYPE_CODE[n2]||t||'7سایر'}
function normalizeDigits(s){return String(s??'').replace(/[۰-۹٠-٩]/g,d=>DIGIT_MAP[d]||d)}
function normalizeName(s){
  return normalizeDigits(s)
    .replace(/ي/g,'ی').replace(/ك/g,'ک')
    .replace(/\s+/g,' ')
    .trim();
}
function termLabel(t){return t===null||t===undefined||t===''?'—':'ترم '+fmt(t)}
function statusPill(s){return `<span class="pill ${s==='پاس شده'?'passed':'notpassed'}">${s==='پاس شده'?'✓':'◷'} ${esc(s||'پاس نشده')}</span>`}
function termOptions(sel,empty='بدون انتخاب'){let h=`<option value="">${empty}</option>`;for(let i=1;i<=10;i++)h+=`<option value="${i}" ${String(sel??'')===String(i)?'selected':''}>ترم ${fmt(i)}</option>`;return h}
function typeOptions(sel=''){return TYPE_NAMES.map(t=>`<option value="${esc(t)}" ${normalizeType(sel)===t?'selected':''}>${esc(t)}</option>`).join('')}

function lockBody(){document.body.style.overflow='hidden'}
function unlockBody(){document.body.style.overflow=''}

/* toast */
let toastTimer;
function toast(msg,type='success',action){
  const t=$('toast');
  $('toastMsg').textContent=msg;
  t.className='toast show '+type;
  $('toastIcon').textContent=type==='success'?'✓':type==='error'?'✕':'⚠';
  const a=$('toastAction');
  if(action){a.hidden=false;a.textContent=action.label;a.onclick=()=>{action.fn();hideToast()}}
  else a.hidden=true;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(hideToast,action?6000:3200);
}
function hideToast(){$('toast').classList.remove('show')}