"use client";

export async function readFileBytes(file: File | Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function downloadBlob(data: Blob | Uint8Array, filename: string, type = "application/pdf") {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

/**
 * Parse a page range string like "1-3, 5, 8-" into groups of 0-based page indices.
 * Each comma-separated part becomes its own group. Throws on invalid input.
 */
export function parseRanges(input: string, pageCount: number): number[][] {
  const groups: number[][] = [];
  for (const raw of input.split(",")) {
    const part = raw.trim();
    if (!part) continue;
    const m = part.match(/^(\d*)\s*(-)?\s*(\d*)$/);
    if (!m || (!m[1] && !m[3])) throw new Error(`"${part}" is not a valid page or range`);
    const start = m[1] ? parseInt(m[1], 10) : 1;
    const end = m[2] ? (m[3] ? parseInt(m[3], 10) : pageCount) : start;
    if (start < 1 || end > pageCount || start > end) {
      throw new Error(`"${part}" is outside 1–${pageCount}`);
    }
    const group: number[] = [];
    for (let i = start; i <= end; i++) group.push(i - 1);
    groups.push(group);
  }
  if (groups.length === 0) throw new Error("Enter at least one page or range");
  return groups;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), type, quality),
  );
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Convert any browser-decodable image (e.g. WebP, GIF) to PNG or JPEG bytes that pdf-lib can embed. */
export async function imageFileToEmbeddable(file: File): Promise<{ bytes: Uint8Array; kind: "png" | "jpg"; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (file.type === "image/jpeg") return { bytes: await readFileBytes(file), kind: "jpg", width, height };
    if (file.type === "image/png") return { bytes: await readFileBytes(file), kind: "png", width, height };
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, "image/png");
    return { bytes: await readFileBytes(blob), kind: "png", width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
