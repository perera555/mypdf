"use client";

/** A tiny store so any tool can hand its finished PDF to the shared result dialog. */
export interface Result {
  bytes: Uint8Array;
  name: string;
  note?: string;
}

let current: Result | null = null;
const listeners = new Set<() => void>();

export function showResult(bytes: Uint8Array, name: string, note?: string) {
  current = { bytes, name, note };
  listeners.forEach((l) => l());
}

export function clearResult() {
  current = null;
  listeners.forEach((l) => l());
}

export function subscribeResult(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function getResult() {
  return current;
}
