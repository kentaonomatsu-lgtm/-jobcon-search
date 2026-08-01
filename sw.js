/**
 * ジョブコン求人サーチ - Service Worker
 * data.json をキャッシュして2回目以降の表示を即時化
 */
const CACHE_NAME = "jcsearch-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./data.json"
];
const DATA_JSON = "./data.json";
// data.jsonのキャッシュ有効期間（1時間）
const DATA_MAX_AGE_MS = 60 * 60 * 1000;

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const isDataJson = url.pathname.endsWith("/data.json");
  const isGAS = url.hostname.includes("script.google.com");

  // GASリクエストはキャッシュしない（常にネットワーク）
  if(isGAS){
    e.respondWith(fetch(e.request));
    return;
  }

  // data.json: キャッシュ優先、バックグラウンドで更新
  if(isDataJson){
    e.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(e.request);
        if(cached){
          const dateHeader = cached.headers.get("date");
          const age = dateHeader ? Date.now() - new Date(dateHeader).getTime() : Infinity;
          // キャッシュが新鮮なら即返す
          if(age < DATA_MAX_AGE_MS) return cached;
          // 古ければネットワークから更新してキャッシュを返す
          fetch(e.request).then(res => {
            if(res.ok) cache.put(e.request, res.clone());
          }).catch(()=>{});
          return cached; // 古くても表示を止めない
        }
        // キャッシュなしならネットワーク
        const res = await fetch(e.request);
        if(res.ok) cache.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  // その他の静的アセット: キャッシュ優先
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
