"use client";

/** Talks to the optional MyPDF Device Helper running on the user's Windows PC (see public/helper). */
const BASE = "http://127.0.0.1:47615";

export interface Scanner {
  id: string;
  name: string;
  manufacturer: string;
}
export interface Printer {
  name: string;
  default: boolean;
  status: string;
  type: string;
  driver: string;
  shared: boolean;
}

async function call(path: string, timeout = 2500): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    return await fetch(`${BASE}${path}`, { signal: ctl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

export async function helperAvailable(): Promise<boolean> {
  try {
    const r = await call("/status", 5000);
    return r.ok && (await r.json()).app === "mypdf-device-helper";
  } catch {
    return false;
  }
}

export async function listDevices(): Promise<{ scanners: Scanner[]; printers: Printer[] }> {
  const r = await call("/devices", 60000);
  const j = await r.json();
  // PowerShell serialises single-item arrays as objects
  const arr = <T,>(v: T | T[] | null | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
  return { scanners: arr(j.scanners), printers: arr(j.printers) };
}

export async function scanPage(id: string, dpi: number, mode: "color" | "gray" | "bw"): Promise<Blob> {
  const r = await call(`/scan?id=${encodeURIComponent(id)}&dpi=${dpi}&mode=${mode}`, 180000);
  if (!r.ok) {
    let msg = `Scan failed (${r.status})`;
    try {
      msg = (await r.json()).error ?? msg;
    } catch {
      /* not JSON */
    }
    throw new Error(msg);
  }
  return r.blob();
}

export const isWindows = () => typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent);
