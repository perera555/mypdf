"use client";

export type SealShape = "circle" | "oval" | "square" | "rectangle";
export type Emblem = "none" | "star" | "stars" | "check" | "flower" | "logo";
export type BorderStyle = "double" | "single" | "dotted" | "rope";

export interface SealOptions {
  shape: SealShape;
  topText: string;
  bottomText: string;
  centerText: string; // can contain line breaks
  emblem: Emblem;
  logo?: HTMLImageElement | null;
  color: string;
  border: BorderStyle;
  font: "serif" | "sans";
  textScale: number; // 0.7 – 1.4
  grunge: boolean;
  dateLine: boolean;
}

export const DEFAULT_SEAL: SealOptions = {
  shape: "circle",
  topText: "YOUR COMPANY NAME",
  bottomText: "COLOMBO • SRI LANKA",
  centerText: "APPROVED",
  emblem: "star",
  color: "#1d4ed8",
  border: "double",
  font: "serif",
  textScale: 1,
  grunge: false,
  dateLine: false,
};

const FONTS = { serif: "Georgia, 'Times New Roman', serif", sans: "Arial, Helvetica, sans-serif" };

/** Small deterministic PRNG so the "worn ink" texture doesn't flicker between renders. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.42 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
}

function flower(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.45, r * 0.2, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
  ctx.globalCompositeOperation = "destination-out";
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, top: boolean, spacing: number, unsquash = 1) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0);
  const totalAngle = Math.min(total / r, Math.PI * 0.95);
  const k = totalAngle / (total / r || 1);
  let acc = 0;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  chars.forEach((c, i) => {
    const mid = ((acc + widths[i] / 2) / r) * k;
    acc += widths[i];
    const a = top ? -Math.PI / 2 - totalAngle / 2 + mid : Math.PI / 2 + totalAngle / 2 - mid;
    ctx.save();
    ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2);
    if (unsquash !== 1) ctx.scale(1, unsquash);
    ctx.fillText(c, 0, 0);
    ctx.restore();
  });
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, maxW: number, start: number, bold = true) {
  let size = start;
  do {
    ctx.font = `${bold ? "bold " : ""}${size}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 1;
  } while (size > 6);
  return size;
}

/** Draw the seal onto a square canvas of `size` px with a transparent background. */
export function drawSeal(canvas: HTMLCanvasElement, o: SealOptions, size = 800) {
  const wide = o.shape === "oval" || o.shape === "rectangle";
  canvas.width = size;
  canvas.height = wide ? Math.round(size * 0.66) : size;
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const fam = FONTS[o.font];
  const lw = size * 0.016;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = o.color;
  ctx.strokeStyle = o.color;

  const ring = (inset: number, width: number, dash?: number[]) => {
    ctx.lineWidth = width;
    ctx.setLineDash(dash ?? []);
    ctx.beginPath();
    if (o.shape === "circle") ctx.arc(cx, cy, W / 2 - inset, 0, Math.PI * 2);
    else if (o.shape === "oval") ctx.ellipse(cx, cy, W / 2 - inset, H / 2 - inset, 0, 0, Math.PI * 2);
    else ctx.roundRect(inset, inset, W - inset * 2, H - inset * 2, size * 0.03);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // Borders
  const outer = lw * 1.2;
  ring(outer, lw * 1.6);
  if (o.border === "double") ring(outer + lw * 2.4, lw * 0.7);
  if (o.border === "dotted") ring(outer + lw * 2.6, lw * 0.9, [lw * 0.2, lw * 1.6]);
  if (o.border === "rope") ring(outer + lw * 2.6, lw * 1.4, [lw * 1.2, lw * 0.8]);

  const textBand = size * 0.1 * o.textScale;
  const innerInset = outer + lw * 2.4 + textBand + lw * 1.2;
  const round = o.shape === "circle" || o.shape === "oval";

  // Inner ring that frames the centre
  if (o.topText || o.bottomText) {
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    if (o.shape === "circle") ctx.arc(cx, cy, W / 2 - innerInset, 0, Math.PI * 2);
    else if (o.shape === "oval") ctx.ellipse(cx, cy, W / 2 - innerInset, H / 2 - innerInset, 0, 0, Math.PI * 2);
    else ctx.roundRect(innerInset, innerInset, W - innerInset * 2, H - innerInset * 2, size * 0.02);
    ctx.stroke();
  }

  // Outer band text
  const bandR = W / 2 - outer - lw * 2.4 - textBand / 2 - lw * 0.6;
  const fontSize = textBand * 0.72;
  ctx.font = `bold ${fontSize}px ${fam}`;
  if (round) {
    ctx.save();
    if (o.shape === "oval") {
      ctx.translate(cx, cy);
      ctx.scale(1, H / W);
      ctx.translate(-cx, -cy);
    }
    // For ovals the context is squashed vertically, so a circle becomes the ellipse band.
    // Size the radius from the vertical band position, and stretch glyphs back so letters aren't flattened.
    const k = W / H;
    const r = o.shape === "oval" ? (H / 2 - outer - lw * 2.4 - textBand / 2 - lw * 0.6) * k : bandR;
    const unsquash = o.shape === "oval" ? k : 1;
    if (o.topText) arcText(ctx, o.topText.toUpperCase(), cx, cy, r, true, fontSize * 0.12, unsquash);
    if (o.bottomText) arcText(ctx, o.bottomText.toUpperCase(), cx, cy, r, false, fontSize * 0.12, unsquash);
    ctx.restore();
    // separators between top and bottom text
    if (o.topText && o.bottomText && o.shape === "circle") {
      star(ctx, cx - bandR, cy, fontSize * 0.35);
      star(ctx, cx + bandR, cy, fontSize * 0.35);
    }
  } else {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const maxW = W - (outer + lw * 3) * 2 - size * 0.04;
    if (o.topText) {
      fitFont(ctx, o.topText.toUpperCase(), fam, maxW, fontSize);
      ctx.fillText(o.topText.toUpperCase(), cx, outer + lw * 2.4 + textBand / 2 + lw * 0.6);
    }
    if (o.bottomText) {
      fitFont(ctx, o.bottomText.toUpperCase(), fam, maxW, fontSize);
      ctx.fillText(o.bottomText.toUpperCase(), cx, H - (outer + lw * 2.4 + textBand / 2 + lw * 0.6));
    }
  }

  // Centre content
  const innerW =
    o.shape === "circle" ? (W / 2 - innerInset) * 1.5 : o.shape === "oval" ? (W / 2 - innerInset) * 1.4 : W - innerInset * 2 - size * 0.04;
  const lines = o.centerText.split("\n").filter((l) => l.trim());
  if (o.dateLine) lines.push(new Date().toLocaleDateString());
  const emblemR = (o.shape === "rectangle" || o.shape === "oval" ? H : W) * 0.07 * o.textScale;
  const hasEmblem = o.emblem !== "none" && !(o.emblem === "logo" && !o.logo);
  const lineH = size * 0.085 * o.textScale;
  const blockH = lines.length * lineH + (hasEmblem ? emblemR * 2.4 : 0);
  let y = cy - blockH / 2;

  if (hasEmblem) {
    const ey = y + emblemR;
    if (o.emblem === "star") star(ctx, cx, ey, emblemR);
    if (o.emblem === "stars") [-1.3, 0, 1.3].forEach((d, i) => star(ctx, cx + d * emblemR * 1.1, ey + (i === 1 ? -emblemR * 0.2 : emblemR * 0.1), emblemR * (i === 1 ? 0.75 : 0.55)));
    if (o.emblem === "flower") flower(ctx, cx, ey, emblemR);
    if (o.emblem === "check") {
      ctx.lineWidth = emblemR * 0.35;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(cx - emblemR * 0.8, ey);
      ctx.lineTo(cx - emblemR * 0.2, ey + emblemR * 0.6);
      ctx.lineTo(cx + emblemR * 0.9, ey - emblemR * 0.6);
      ctx.stroke();
    }
    if (o.emblem === "logo" && o.logo) {
      const s = (emblemR * 2.2) / Math.max(o.logo.naturalWidth, o.logo.naturalHeight);
      const lw2 = o.logo.naturalWidth * s;
      const lh2 = o.logo.naturalHeight * s;
      // Tint the logo with the ink colour
      const t = document.createElement("canvas");
      t.width = Math.max(1, Math.round(lw2));
      t.height = Math.max(1, Math.round(lh2));
      const tc = t.getContext("2d")!;
      tc.drawImage(o.logo, 0, 0, t.width, t.height);
      tc.globalCompositeOperation = "source-in";
      tc.fillStyle = o.color;
      tc.fillRect(0, 0, t.width, t.height);
      ctx.drawImage(t, cx - lw2 / 2, ey - lh2 / 2);
    }
    y += emblemR * 2.4;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    const maxSize = i === 0 && !o.dateLine ? lineH * 0.95 : lineH * 0.7;
    fitFont(ctx, line, fam, innerW, maxSize);
    ctx.fillText(line, cx, y + lineH / 2);
    y += lineH;
  });

  // Worn rubber-stamp texture
  if (o.grunge) {
    const rand = rng(42);
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < size * 1.2; i++) {
      const r = rand() * size * 0.006 + 0.5;
      ctx.globalAlpha = 0.3 + rand() * 0.7;
      ctx.beginPath();
      ctx.arc(rand() * W, rand() * H, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  return canvas;
}

/* ---- saved seals, shared with the editor ---- */
const KEY = "mypdf.seals";
export function loadSeals(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
export function storeSeal(dataUrl: string) {
  try {
    const list = [dataUrl, ...loadSeals().filter((s) => s !== dataUrl)].slice(0, 8);
    localStorage.setItem(KEY, JSON.stringify(list));
    return list;
  } catch {
    return loadSeals();
  }
}
export function removeSeal(dataUrl: string) {
  try {
    const list = loadSeals().filter((s) => s !== dataUrl);
    localStorage.setItem(KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}
