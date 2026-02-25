/**
 * Offline Queue — IndexedDB-based queue for events and photos
 * when the device is offline. Syncs automatically when back online.
 */

const DB_NAME = "hopsvoir-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_requests";

export interface PendingRequest {
  id?: number; // auto-increment
  method: string;
  url: string;
  body: string; // JSON-stringified
  createdAt: number; // timestamp
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Enqueue a request for later sync */
export async function enqueueRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({
      method,
      url,
      body: data ? JSON.stringify(data) : "",
      createdAt: Date.now(),
      retries: 0,
    } as PendingRequest);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all pending requests */
export async function getPendingRequests(): Promise<PendingRequest[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Get count of pending requests */
export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Remove a pending request by id */
export async function removePendingRequest(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Increment retry count for a pending request */
export async function incrementRetry(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result as PendingRequest | undefined;
      if (record) {
        record.retries = (record.retries || 0) + 1;
        store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Process the offline queue — replay all pending requests.
 * Returns the number of successfully synced items.
 */
export async function syncPendingRequests(): Promise<number> {
  const pending = await getPendingRequests();
  let synced = 0;
  const MAX_RETRIES = 5;

  for (const req of pending) {
    if (req.retries >= MAX_RETRIES) {
      // Give up on this request
      await removePendingRequest(req.id!);
      continue;
    }

    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.body ? { "Content-Type": "application/json" } : {},
        body: req.body || undefined,
        credentials: "include",
      });

      if (response.ok) {
        await removePendingRequest(req.id!);
        synced++;
      } else if (response.status >= 500) {
        // Server error — retry later
        await incrementRetry(req.id!);
      } else {
        // Client error (4xx) — remove, won't succeed on retry
        await removePendingRequest(req.id!);
      }
    } catch {
      // Network error — retry later
      await incrementRetry(req.id!);
    }
  }

  return synced;
}

