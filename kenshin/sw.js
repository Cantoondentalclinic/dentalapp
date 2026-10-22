/*
 * 老健訪問歯科健診表 - オフラインキャッシュ用 Service Worker
 *
 * 目的：GitHub Pages等でネット経由で開いた場合でも、一度正常に読み込めれば
 * 以降は電波が入らない環境（施設内の電波が弱い場所等）でも起動できるようにする。
 *
 * 挙動：まずキャッシュを確認し、あればそれを返す（オフラインで即起動）。
 * 同時にネット接続があればバックグラウンドで最新版を取得しキャッシュを更新する
 * （stale-while-revalidate）ので、電波があるときは自動的に最新版に追従する。
 */
const CACHE_NAME = 'roken-checkup-v1';
const APP_SHELL = [
  './',
  './roken_checkup.html'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(APP_SHELL.map(function(url){
        return cache.add(url).catch(function(){ /* 存在しないURLは無視 */ });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.match(event.request).then(function(cached){
        var networkFetch = fetch(event.request).then(function(response){
          if(response && response.status === 200){
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(function(){ return cached; });
        // オフライン時は即キャッシュを返し、オンライン時は裏で更新（あれば次回起動時に反映）
        return cached || networkFetch;
      });
    })
  );
});
