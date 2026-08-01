/**
 * ジョブコン求人サーチ - Service Worker v2
 * data.json は5分キャッシュ。更新があればページに通知して自動リロード。
 */
const CACHE_NAME = "jcsearch-v2";
const DATA_JSON_PATH = "./data.json";
const DATA_MAX_AGE_MS = 5 * 60 * 1000; // 5分

// インストール：静的アセットをキャッシュ
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(["./", "./index.html", "./data.json"]))
      .then(() => self.skipWaiting())
  );
});

// 古いキャッシュを削除
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const isDataJson = url.pathname.endsWith("/data.json");
  const isGAS = url.hostname.includes("script.google.com");

  // GASはキャッシュしない
  if (isGAS) {
    e.respondWith(fetch(e.request));
    return;
  }

  // data.json：キャッシュ優先 + バックグラウンド更新
  if (isDataJson) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(e.request);
        const dateHeader = cached && cached.headers.get("date");
        const age = dateHeader ? Date.now() - new Date(dateHeader).getTime() : Infinity;
        const isFresh = cached && age < DATA_MAX_AGE_MS;

        if (isFresh) return cached;

        // キャッシュが古い or なし → ネットワークから取得
        try {
          const res = await fetch(e.request.url + "?t=" + Date.now(), { cache: "no-store" });
          if (res.ok) {
            // 古いキャッシュと中身を比較して変化があればページに通知
            if (cached) {
              const oldText = await cached.clone().text();
              const newText = await res.clone().text();
              if (oldText !== newText) {
                notifyClients("DATA_UPDATED");
              }
            }
            cache.put(e.request, res.clone());
            return res;
          }
        } catch (err) {}

        // ネットワーク失敗 → 古いキャッシュをそのまま返す
        return cached || new Response('{"error":"offline"}', { headers: { "Content-Type": "application/json" } });
      })
    );
    return;
  }

  // その他：キャッシュ優先
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// 全クライアントにメッセージを送る
function notifyClients(type) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage({ type }));
  });
}
