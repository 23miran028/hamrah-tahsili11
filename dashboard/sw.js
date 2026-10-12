'use strict';

/* ======================================================================
   Service Worker — همراه تحصیلی
   --------------------------------------------------------------------
   • Cache-First برای فایل‌های استاتیک
   • Network-First برای درخواست‌های خارجی (Google Fonts)
   • نسخه را با هر تغییر مهم عوض کن
   ====================================================================== */

const CACHE_VERSION = 'hamrah-tahsili-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',

  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/responsive.css',

  './js/data.js',
  './js/utils.js',
  './js/state.js',
  './js/prereq.js',
  './js/charts.js',
  './js/render.js',
  './js/gpa.js',
  './js/graph.js',
  './js/planner.js',
  './js/modals.js',
  './js/export.js',
  './js/cmdk.js',
  './js/share.js',
  './js/events.js',
  './js/main.js'
];

/* ---------- نصب: کش کردن فایل‌های اصلی ---------- */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    /* هر فایل جداگانه — اگر یکی نبود، بقیه کش شوند */
    await Promise.allSettled(
      CORE_ASSETS.map(url =>
        cache.add(url).catch(() => console.warn('SW: skip', url))
      )
    );
    self.skipWaiting();
  })());
});

/* ---------- فعال‌سازی: پاک‌کردن کش‌های قدیمی ---------- */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* ---------- Fetch ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;

  /* فقط GET */
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Google Fonts — Network-First + Cache */
  if(url.hostname.includes('fonts.googleapis.com') ||
     url.hostname.includes('fonts.gstatic.com')){
    event.respondWith(networkFirst(req));
    return;
  }

  /* فقط هم‌دامنه‌ای‌ها */
  if(url.origin !== self.location.origin) return;

  event.respondWith(cacheFirst(req));
});

/* ---------- استراتژی‌ها ---------- */
async function cacheFirst(req){
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(req, { ignoreSearch: true });
  if(cached) return cached;

  try{
    const res = await fetch(req);
    if(res.ok && res.type === 'basic'){
      cache.put(req, res.clone());
    }
    return res;
  }catch(e){
    /* اگر درخواست سند بود و آنلاین نبودیم → index.html */
    if(req.mode === 'navigate'){
      const fallback = await cache.match('./index.html');
      if(fallback) return fallback;
    }
    return new Response('آفلاین — منبع در دسترس نیست', {
      status: 503,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
  }
}

async function networkFirst(req){
  const cache = await caches.open(CACHE_VERSION);
  try{
    const res = await fetch(req);
    if(res.ok) cache.put(req, res.clone());
    return res;
  }catch(e){
    const cached = await cache.match(req);
    if(cached) return cached;
    throw e;
  }
}

/* ---------- پیام از صفحه (برای skipWaiting دستی) ---------- */
self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});