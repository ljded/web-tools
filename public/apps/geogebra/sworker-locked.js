const CACHE_NAME = 'geogebra-local-5.4.925.3'
const CACHE_PATHS = [
  '/apps/geogebra/index.html',
  '/apps/geogebra/GeoGebra/deployggb.js',
  '/apps/geogebra/GeoGebra/HTML5/5.0/web3d/',
]

function shouldCache(request) {
  if (request.method !== 'GET') return false
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  return CACHE_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(path))
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names
      .filter((name) => name.startsWith('geogebra-local-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)),
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (!shouldCache(event.request)) return
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request)
      if (cached) return cached
      const response = await fetch(event.request)
      if (response.ok) await cache.put(event.request, response.clone())
      return response
    }),
  )
})
