const DB_NAME = 'web-tools'
const DB_VERSION = 1
const HISTORY_STORE = 'history'

export interface HistoryRecord<T = unknown> {
  compoundId: string
  storageKey: string
  id: string
  timestamp: number
  label: string
  data: T
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const store = db.createObjectStore(HISTORY_STORE, { keyPath: 'compoundId' })
        store.createIndex('storageKey', 'storageKey', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(HISTORY_STORE, mode)
        const request = action(tx.objectStore(HISTORY_STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        tx.onerror = () => reject(tx.error)
      }),
  )
}

export async function getHistoryRecords<T>(storageKey: string): Promise<HistoryRecord<T>[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE, 'readonly')
    const index = tx.objectStore(HISTORY_STORE).index('storageKey')
    const request = index.getAll(storageKey)
    request.onsuccess = () => {
      resolve((request.result as HistoryRecord<T>[]).sort((a, b) => b.timestamp - a.timestamp))
    }
    request.onerror = () => reject(request.error)
  })
}

export function putHistoryRecords<T>(storageKey: string, records: Omit<HistoryRecord<T>, 'compoundId' | 'storageKey'>[]) {
  return openDatabase().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(HISTORY_STORE, 'readwrite')
        const store = tx.objectStore(HISTORY_STORE)
        for (const record of records) {
          store.put({ ...record, storageKey, compoundId: `${storageKey}:${record.id}` })
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

export function deleteHistoryRecord(storageKey: string, id: string) {
  return transact('readwrite', (store) => store.delete(`${storageKey}:${id}`)).then(() => undefined)
}

export async function clearHistoryRecords(storageKey: string) {
  const records = await getHistoryRecords(storageKey)
  const db = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE, 'readwrite')
    const store = tx.objectStore(HISTORY_STORE)
    for (const record of records) store.delete(record.compoundId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
