// TechNest service worker: installable app shell + offline catalog.
//
// - Navigations: network first, falling back to the cached app shell so the
//   SPA still boots offline.
// - Built assets (/assets/*, hashed by Vite), product images and icons:
//   cache first. Hashed assets change URL with content; for /icons and
//   /products files, bump VERSION below when replacing them in place.
// - Public catalog API reads (products, categories, banners, reviews):
//   network first, falling back to the last good response. Private data
//   (users, orders, messages) is never cached.

const VERSION = 'v2'
const SHELL_CACHE = `technest-shell-${VERSION}`
const STATIC_CACHE = `technest-static-${VERSION}`
const API_CACHE = `technest-api-${VERSION}`
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.png', '/icons/icon-192.png']
const CATALOG_API = /^\/(products|categories|banners|reviews|supportSettings)(\/|\?|$)/

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, STATIC_CACHE, API_CACHE])
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(fallbackUrl || request, response.clone())
    return response
  } catch (err) {
    const cached = await cache.match(fallbackUrl || request)
    if (cached) return cached
    throw err
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/index.html'))
    return
  }

  // Production API lives under /api on the same origin; a custom
  // VITE_API_URL may point elsewhere, so match on the path either way.
  const apiPath = url.origin === self.location.origin ? url.pathname.replace(/^\/api(?=\/)/, '') : url.pathname
  const isApi = url.origin !== self.location.origin || url.pathname.startsWith('/api/')
  if (isApi) {
    if (CATALOG_API.test(apiPath + url.search)) event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  if (/^\/(assets|products|icons)\//.test(url.pathname) || /\.(png|jpe?g|webp|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request))
  }
})
