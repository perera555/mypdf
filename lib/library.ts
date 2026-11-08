"use client";

/** "My Files": PDFs saved in this browser's IndexedDB. Nothing leaves the device. */

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  savedAt: number;
  bytes: Uint8Array;
}

const DB = "mypdf";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Browser storage is unavailable"));
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

export async function saveToLibrary(bytes: Uint8Array, name: string): Promise<StoredFile> {
  const file: StoredFile = { id: crypto.randomUUID(), name, size: bytes.length, savedAt: Date.now(), bytes: bytes.slice() };
  await tx("readwrite", (s) => s.put(file));
  notify();
  return file;
}

export async function listLibrary(): Promise<StoredFile[]> {
  const all = await tx<StoredFile[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteFromLibrary(id: string) {
  await tx("readwrite", (s) => s.delete(id));
  notify();
}

export async function renameInLibrary(id: string, name: string) {
  const f = await tx<StoredFile | undefined>("readonly", (s) => s.get(id));
  if (!f) return;
  await tx("readwrite", (s) => s.put({ ...f, name }));
  notify();
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
export function onLibraryChange(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/* ---- Hand a file from one page to another (e.g. "Open in Reader") during client navigation ---- */
let handoff: File | null = null;
export function setHandoff(bytes: Uint8Array, name: string) {
  handoff = new File([bytes as BlobPart], name, { type: "application/pdf" });
}
export function takeHandoff(): File | null {
  const f = handoff;
  handoff = null;
  return f;
}
