export const IDB_NAME = 'kilobyte.bundles.v1'
export const IDB_STORE = 'bundles'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveBundle(
  id: string,
  files: Record<string, { type: string; data: ArrayBuffer }>,
): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(IDB_STORE).put(files, id)
  })
  db.close()
}

export async function loadBundle(
  id: string,
): Promise<Record<string, { type: string; data: ArrayBuffer }> | undefined> {
  const db = await openDb()
  const files = await new Promise<Record<string, { type: string; data: ArrayBuffer }> | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(id)
      req.onsuccess = () => resolve(req.result as Record<string, { type: string; data: ArrayBuffer }> | undefined)
      req.onerror = () => reject(req.error)
    },
  )
  db.close()
  return files
}

export async function deleteBundle(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(IDB_STORE).delete(id)
  })
  db.close()
}

export async function ensureGameWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  await navigator.serviceWorker.register('/game-sw.js')
  await navigator.serviceWorker.ready
}
