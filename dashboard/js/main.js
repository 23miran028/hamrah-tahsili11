'use strict';

(function init(){
  /* پر کردن سلکت‌های نوع و ترم */
  $('filterType').innerHTML='<option value="">همه نوع‌ها</option>'+TYPE_NAMES.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
  $('courseType').innerHTML=typeOptions('تخصصی');
  $('planType').innerHTML=typeOptions('تخصصی');
  $('courseSuggested').innerHTML=termOptions(null);
  $('courseSelected').innerHTML=termOptions(null);
  $('planTarget').innerHTML=termOptions(null);

  /* نرمال‌سازی داده legacy */
  courses=courses.map(c=>({
    ...c,
    id:c.id||'legacy-'+Math.random().toString(36).slice(2),
    grade:c.grade??null,
    status:(c.status==='پاس شده'||c.status==='پاس نشده')?c.status:(c.status==='خوانده شده'?'پاس شده':'پاس نشده')
  }))/* بازیابی ردیف‌های شبیه‌ساز معدل */
if(Array.isArray(state.gpaRows)) gpaRows = state.gpaRows;

  setupSettings();
  wireConfirm();
  wireEvents();
  renderAll();
  /* ─────────── تم و پالت — مستقل و مطمئن ─────────── */
  ['themeSelect','paletteSelect'].forEach(id => {
    const el = document.getElementById(id);
    if(el){
      el.addEventListener('change', applyUI);
      el.onchange = applyUI;   // پشتیبان (backup)
    }
  });

  try{
    const v=sessionStorage.getItem('choiceUnit.activeView');
    if(v&&document.getElementById('view-'+v))setView(v);
  }catch(e){}

    /* بررسی لینک اشتراک */
  checkSharedLink();
  /* ---------- PWA ---------- */
  registerServiceWorker();
  setupInstallPrompt();
})();

/* ============ ثبت Service Worker ============ */
function registerServiceWorker(){
  /* از file:// کار نمی‌کند — فقط http/https */
  if(!('serviceWorker' in navigator)) return;
  if(location.protocol === 'file:') return;

  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(reg => {
      /* اگر SW جدید منتظر فعال‌سازی است */
      if(reg.waiting){
        reg.waiting.postMessage({ type:'SKIP_WAITING' });
      }
      reg.addEventListener('updatefound', ()=>{
        const sw = reg.installing;
        if(!sw) return;
        sw.addEventListener('statechange', ()=>{
          if(sw.state === 'installed' && navigator.serviceWorker.controller){
            console.log('[PWA] نسخه جدید آماده است — رفرش کن');
          }
        });
      });
    })
    .catch(err => console.warn('[PWA] ثبت SW ناموفق:', err));

  /* اگر SW کنترل صفحه را به دست گرفت، یک‌بار رفرش */
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{
    if(refreshing) return;
    refreshing = true;
    location.reload();
  });
}

/* ============ دکمه «نصب اپ» ============ */
let deferredInstallPrompt = null;

function setupInstallPrompt(){
  /* اگر همین حالا نصب‌شده هستیم، دکمه را نشان نده */
  if(window.matchMedia('(display-mode: standalone)').matches) return;
  if(window.navigator.standalone === true) return;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideInstallButton();
    toast('اپ نصب شد 🎉','success');
  });
}

function showInstallButton(){
  if($('installBtn')) return;
  const exportBtn = $('exportBtn');
  if(!exportBtn || !exportBtn.parentElement) return;

  const btn = document.createElement('button');
  btn.className = 'btn primary';
  btn.id = 'installBtn';
  btn.type = 'button';
  btn.innerHTML = '📲 نصب اپ';
  btn.style.background = 'linear-gradient(135deg,var(--purple),color-mix(in srgb,var(--purple) 70%,#000))';
  btn.style.color = '#fff';
  btn.style.borderColor = 'transparent';

  btn.addEventListener('click', async () => {
    if(!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if(choice.outcome === 'accepted'){
      toast('در حال نصب...','success');
    }
    deferredInstallPrompt = null;
    hideInstallButton();
  });

  exportBtn.parentElement.insertBefore(btn, exportBtn);
}

function hideInstallButton(){
  $('installBtn')?.remove();
}