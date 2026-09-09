const DB_NAME = 'kilobyte.bundles.v1'
const STORE = 'bundles'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getBundle(id) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(id)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const match = url.pathname.match(/^\/local-game\/([^/]+)\/(.*)$/)
  if (!match) return
  const id = decodeURIComponent(match[1])
  let path = decodeURIComponent(match[2] || 'index.html')
  if (!path || path.endsWith('/')) path += 'index.html'
  event.respondWith(
    getBundle(id).then((bundle) => {
      if (!bundle) return new Response('Game bundle missing on this device.', { status: 404 })
      const file = bundle[path] ?? bundle[path.replace(/^\.\//, '')]
      if (!file) return new Response(`Missing ${path}`, { status: 404 })
      return new Response(file.data, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Cache-Control': 'no-store',
        },
      })
    }),
  )
})
