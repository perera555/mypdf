"use client";

export type InkMode = "original" | "black" | "blue";

const INK_RGB: Record<Exclude<InkMode, "original">, [number, number, number]> = {
  black: [17, 24, 39],
  blue: [22, 45, 140],
};

/**
 * Pull a handwritten signature out of a photo or scan of paper.
 * The paper brightness is estimated locally (a large box blur), so shadows and uneven lighting
 * are ignored and only strokes darker than their surroundings are kept, with soft edges.
 * Returns a cropped PNG data URL with a transparent background, or null if no ink was found.
 */
export type Clarity = "normal" | "clear" | "bold";

export function extractSignature(img: HTMLImageElement, sensitivity = 0.5, ink: InkMode = "original", clarity: Clarity = "clear"): string | null {
  const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k));
  const h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Luminance + integral image for a fast large box blur (local paper brightness)
  const lum = new Float32Array(w * h);
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
      lum[i] = l;
      row += l;
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
    }
  }
  const r = Math.max(8, Math.round(Math.max(w, h) / 24));
  const localMean = (x: number, y: number) => {
    const x0 = Math.max(0, x - r);
    const y0 = Math.max(0, y - r);
    const x1 = Math.min(w, x + r + 1);
    const y1 = Math.min(h, y + r + 1);
    const sum = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
    return sum / ((x1 - x0) * (y1 - y0));
  };

  // Higher sensitivity keeps fainter strokes.
  const t0 = 34 - sensitivity * 26; // below this darkness difference → fully transparent
  const t1 = t0 + 38; // above this → fully opaque
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // Pen strokes are thin compared with the blur window, so the local mean ≈ the paper brightness here.
      const diff = localMean(x, y) - lum[i];
      let a = (diff - t0) / (t1 - t0);
      a = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a); // smoothstep
      // "Clear" lifts faint strokes to solid ink; keeps soft edges.
      if (clarity !== "normal" && a > 0) a = Math.min(1, Math.pow(a, 0.45) * 1.15);
      const o = i * 4;
      if (a === 0) {
        px[o + 3] = 0;
        continue;
      }
      if (ink === "original") {
        // Deepen the original ink colour so it doesn't look washed out
        const f = clarity === "normal" ? 0.75 : 0.55;
        px[o] *= f;
        px[o + 1] *= f;
        px[o + 2] *= f;
      } else {
        const [R, G, B] = INK_RGB[ink];
        px[o] = R;
        px[o + 1] = G;
        px[o + 2] = B;
      }
      px[o + 3] = Math.round(a * 255);
      if (a > 0.35) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  ctx.putImageData(data, 0, 0);

  // "Bold" thickens thin or broken strokes by stamping the ink a pixel or two in every direction.
  if (clarity === "bold") {
    const copy = document.createElement("canvas");
    copy.width = w;
    copy.height = h;
    copy.getContext("2d")!.drawImage(c, 0, 0);
    const d = Math.max(1, Math.round(Math.max(w, h) / 600));
    for (const [dx, dy] of [
      [d, 0],
      [-d, 0],
      [0, d],
      [0, -d],
      [d, d],
      [-d, -d],
      [d, -d],
      [-d, d],
    ])
      ctx.drawImage(copy, dx, dy);
  }

  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")!.drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
