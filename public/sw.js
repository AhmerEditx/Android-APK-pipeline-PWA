/* IronTrack service worker — app shell + asset + data caching. */
const SHELL = 'irontrack-shell-v4'
const DATA = 'irontrack-data-v4'

const APP_ROUTES = [
  '/',
  '/today',
  '/exercises',
  '/plans',
  '/history',
  '/progress',
  '/achievements',
  '/messages',
  '/profile',
  '/about',
  '/feedback',
  '/login',
  '/signup',
]

const PRECACHE_STATIC = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then(async (cache) => {
        // Static assets must not fail the whole install.
        await Promise.allSettled(PRECACHE_STATIC.map((url) => cache.add(url)))
        // App routes are dynamic (auth + user data). Cache whatever the server
        // returns for the current visitor so navigation works offline.
        await Promise.allSettled(
          APP_ROUTES.map((url) =>
            fetch(url, { credentials: 'same-origin' }).then((res) => {
              if (res.ok) cache.put(url, res)
            })
          )
        )
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL && k !== DATA)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

const SUPABASE_ORIGIN = 'https://jkhrugylttahqasieylp.supabase.co'

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
    )
  )
}

function networkFirst(request, cacheName, fallback) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => cache.put(request, response.clone()))
      }
      return response
    })
    .catch(() =>
      caches.match(request).then((hit) => hit || fallback() || Response.error())
    )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Supabase data reads: use the network while online, fall back to the last
  // cached response when offline.
  if (url.origin === SUPABASE_ORIGIN && url.pathname.startsWith('/rest/v1/')) {
    event.respondWith(networkFirst(request, DATA, () => null))
    return
  }

  if (url.origin !== self.location.origin) return

  // Build assets, icons, fonts, manifest: cache-first, network fallback + store.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(cacheFirst(request, SHELL))
    return
  }

  // App pages: network-first, fall back to a cached copy, then the shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL, () => caches.match('/') || Promise.resolve(undefined))
    )
  }
})