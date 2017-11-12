// this file will contain a reference
// to a top level Bundle constant
// which is an object with at least two properties:
// Bundle.assets, an Array with all bundled assets
// Bundle.hash, the unique hash of all asssets (content)

// You can use this reference to cache all files
// or just the first bundled file.

// You can also use such bundle to grant a unique
// cache on your Service Worker storage.

// @flow

declare var Bundle: { assets: $ReadOnlyArray<string>, hash: string };

const openCache = caches.open(Bundle.hash);
self.addEventListener('install', e => {
  // all JS files plus the site root
  const assets = Bundle.assets.concat('/');
  e.waitUntil(openCache.then(cache => cache.addAll(assets)));
});

// simple utility to resolve whatever comes first
// or reject if all of them fails
const any = <T>($: $ReadOnlyArray<Promise<T> | T>): Promise<T> => {
  return new Promise((d, e, a = [], l = 0) => {
    // eslint-disable-next-line no-param-reassign
    l = $.map((p, i) =>
      // eslint-disable-next-line no-param-reassign
      Promise.resolve(p).then(d, o => ((a[i] = o), --l) || e(a)),
    ).length;
  });
};

self.addEventListener('fetch', e => {
  const { request } = e;
  e.respondWith(
    openCache.then(cache =>
      cache.match(request).then(response => {
        const remote = fetch(request).then(response_ => {
          if (response_.status > 199 && response_.status < 400) {
            cache.put(request, response_.clone());
          }
          return response_;
        });
        return any([response || remote, remote]);
      }),
    ),
  );
});
