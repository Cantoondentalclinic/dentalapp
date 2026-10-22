/*
 * 照会・返信文書 - オフラインキャッシュ用 Service Worker
 * 一度開けば電波がなくても起動・印刷・保管ができる（AI読み取りだけは通信が必要）。
 * キャッシュを先に返し、裏で最新版を取得して更新する（stale-while-revalidate）。
 */
const CACHE_NAME = 'shokai-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-180.png', './icon-512.png', './vendor/anthropic-sdk.min.js'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(APP_SHELL.map(function(url){ return cache.add(url).catch(function(){}); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k.indexOf('shokai-') === 0 && k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  // 同じサイトのGETだけをキャッシュする（Claude APIへの通信はそのまま通す）
  if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.match(event.request).then(function(cached){
        var networkFetch = fetch(event.request).then(function(response){
          if(response && response.status === 200) cache.put(event.request, response.clone());
          return response;
        }).catch(function(){ return cached; });
        return cached || networkFetch;
      });
    })
  );
});
