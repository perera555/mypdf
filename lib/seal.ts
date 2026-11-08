"use client";

export type SealShape = "circle" | "badge" | "oval" | "square" | "rectangle" | "company";
export type Emblem = "none" | "star" | "stars" | "check" | "flower" | "logo";
export type BorderStyle = "double" | "single" | "dotted" | "rope";

export interface SealOptions {
  shape: SealShape;
  topText: string;
  bottomText: string;
  centerText: string; // can contain line breaks
  regLabel: string;
  regNo: string;
  /** Any extra line, e.g. "Tel. 011 234 5678", "Serial No. 0042", "Index No. 12" */
  extraText: string;
  /** yyyy-mm-dd; empty = today (used when dateLine is on) */
  dateValue: string;
  /** Company details */
  personName: string;
  designation: string;
  address: string;
  phone: string;
  emblem: Emblem;
  logo?: HTMLImageElement | null;
  color: string;
  border: BorderStyle;
  font: "serif" | "sans";
  textScale: number; // 0.7 – 1.4
  grunge: boolean;
  dateLine: boolean;
  /** Solid ribbon behind the main centre line, with the text knocked out. */
  band: boolean;
  /** Fill the whole seal and knock the artwork out to transparent. */
  solid: boolean;
  /** Foil-like gradient instead of flat ink. */
  metallic: boolean;
}

export const DEFAULT_SEAL: SealOptions = {
  shape: "circle",
  topText: "YOUR COMPANY NAME",
  bottomText: "COLOMBO • SRI LANKA",
  centerText: "APPROVED",
  regLabel: "Reg. No.",
  regNo: "",
  extraText: "",
  dateValue: "",
  personName: "",
  designation: "",
  address: "",
  phone: "",
  emblem: "star",
  color: "#1d4ed8",
  border: "double",
  font: "serif",
  textScale: 1,
  grunge: false,
  dateLine: false,
  band: false,
  solid: false,
  metallic: false,
};

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Serrated certificate-seal edge. */
function badgePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const teeth = 36;
  ctx.beginPath();
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i * Math.PI) / teeth;
    const rad = i % 2 ? r * 0.93 : r;
    ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
  }
  ctx.closePath();
}

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

/** Lay text along an ellipse (radii a, b), centred at the top or bottom, letters upright and evenly spaced by arc length. */
function ellipseText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, a: number, b: number, top: boolean, spacing: number) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width + spacing);
  const total = widths.reduce((x, y) => x + y, 0);
  // walk from the centre point along the curve until the requested distance is covered
  const t0 = top ? (3 * Math.PI) / 2 : Math.PI / 2;
  const dir = top ? 1 : -1; // moving left-to-right as the reader sees it
  const at = (dist: number) => {
    const step = 0.002 * Math.sign(dist) * dir;
    let t = t0;
    let covered = 0;
    const target = Math.abs(dist);
    while (covered < target) {
      const nt = t + step;
      covered += Math.hypot(a * (Math.cos(nt) - Math.cos(t)), b * (Math.sin(nt) - Math.sin(t)));
      t = nt;
    }
    return t;
  };
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let acc = -total / 2;
  chars.forEach((c, i) => {
    const t = at(acc + widths[i] / 2);
    acc += widths[i];
    const x = cx + a * Math.cos(t);
    const y = cy + b * Math.sin(t);
    // tangent in the reading direction
    const angle = Math.atan2(dir * b * Math.cos(t), -dir * a * Math.sin(t));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
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

/**
 * Classic rectangular company stamp:
 * COMPANY NAME / address / Tel · Reg. No. / (For and on behalf of) / ........ / Name / Designation / date
 */
function drawCompanyBody(ctx: CanvasRenderingContext2D, o: SealOptions, W: number, H: number, fam: string, pad: number, lw: number) {
  const maxW = W - pad * 2;
  type Line = { text: string; size: number; bold?: boolean; italic?: boolean; gapBefore?: number; dotted?: boolean };
  const L: Line[] = [];
  const k = o.textScale;
  if (o.topText.trim()) L.push({ text: o.topText.trim().toUpperCase(), size: H * 0.12 * k, bold: true });
  if (o.address.trim()) L.push({ text: o.address.trim(), size: H * 0.06 * k });
  const contact = [o.phone.trim() && `Tel: ${o.phone.trim()}`, o.regNo.trim() && `${o.regLabel.trim()} ${o.regNo.trim()}`].filter(Boolean).join("   •   ");
  if (contact) L.push({ text: contact, size: H * 0.055 * k });
  if (o.extraText.trim()) L.push({ text: o.extraText.trim(), size: H * 0.055 * k });
  const signatory = o.personName.trim() || o.designation.trim();
  const center = o.centerText.trim();
  if (center) L.push({ text: center, size: H * 0.055 * k, italic: true, gapBefore: H * 0.05 });
  if (signatory) {
    L.push({ text: "", size: H * 0.1, dotted: true, gapBefore: center ? 0 : H * 0.05 });
    if (o.personName.trim()) L.push({ text: o.personName.trim(), size: H * 0.07 * k, bold: true });
    if (o.designation.trim()) L.push({ text: o.designation.trim(), size: H * 0.06 * k });
  }
  if (o.dateLine) {
    const d = o.dateValue ? new Date(`${o.dateValue}T00:00:00`) : new Date();
    L.push({ text: `Date: ${d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })}`, size: H * 0.055 * k, gapBefore: H * 0.02 });
  }
  if (!L.length) return;

  const lineH = (l: Line) => l.size * 1.3 + (l.gapBefore ?? 0);
  const total = L.reduce((s, l) => s + lineH(l), 0);
  // shrink everything if it doesn't fit
  const fit = Math.min(1, (H - pad * 2) / total);
  let y = (H - total * fit) / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const l of L) {
    y += (l.gapBefore ?? 0) * fit;
    const h = l.size * 1.3 * fit;
    if (l.dotted) {
      ctx.save();
      ctx.lineWidth = lw * 0.6;
      ctx.setLineDash([lw * 0.4, lw * 1.2]);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W / 2 - maxW * 0.32, y + h * 0.75);
      ctx.lineTo(W / 2 + maxW * 0.32, y + h * 0.75);
      ctx.stroke();
      ctx.restore();
    } else {
      let s = l.size * fit;
      do {
        ctx.font = `${l.italic ? "italic " : ""}${l.bold ? "bold " : ""}${s}px ${fam}`;
        if (ctx.measureText(l.text).width <= maxW) break;
        s -= 1;
      } while (s > 6);
      ctx.fillText(l.text, W / 2, y + h / 2);
    }
    y += h;
  }
}

/** Draw the seal onto a square canvas of `size` px with a transparent background. */
export function drawSeal(canvas: HTMLCanvasElement, o: SealOptions, size = 800) {
  const wide = o.shape === "oval" || o.shape === "rectangle" || o.shape === "company";
  canvas.width = size;
  canvas.height = o.shape === "company" ? Math.round(size * 0.62) : wide ? Math.round(size * 0.66) : size;
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

  const circ = o.shape === "circle" || o.shape === "badge";
  const shapePath = (inset: number, serrated = false) => {
    ctx.beginPath();
    if (serrated) badgePath(ctx, cx, cy, W / 2 - inset);
    else if (circ) ctx.arc(cx, cy, W / 2 - inset, 0, Math.PI * 2);
    else if (o.shape === "oval") ctx.ellipse(cx, cy, W / 2 - inset, H / 2 - inset, 0, 0, Math.PI * 2);
    else ctx.roundRect(inset, inset, W - inset * 2, H - inset * 2, size * 0.03);
  };
  const ring = (inset: number, width: number, dash?: number[], serrated = false) => {
    ctx.lineWidth = width;
    ctx.setLineDash(dash ?? []);
    ctx.lineJoin = "round";
    shapePath(inset, serrated);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // Borders
  const outer = lw * 1.2;
  if (o.shape === "badge") {
    ring(outer, lw * 1.2, undefined, true);
    ring(outer + lw * 3.2, lw * 1.2);
  } else ring(outer, lw * 1.6);
  if (o.border === "double") ring(outer + lw * 2.4, lw * 0.7);
  if (o.border === "dotted") ring(outer + lw * 2.6, lw * 0.9, [lw * 0.2, lw * 1.6]);
  if (o.border === "rope") ring(outer + lw * 2.6, lw * 1.4, [lw * 1.2, lw * 0.8]);

  if (o.shape === "company") {
    drawCompanyBody(ctx, o, W, H, fam, outer + lw * 3.4 + size * 0.025, lw);
  } else {
  const textBand = size * 0.1 * o.textScale;
  const badgeExtra = o.shape === "badge" ? lw * 2.6 : 0;
  const innerInset = outer + badgeExtra + lw * 2.4 + textBand + lw * 1.2;
  const round = circ || o.shape === "oval";

  // Inner ring that frames the centre
  if (o.topText || o.bottomText) ring(innerInset, lw * 0.7);

  // Outer band text
  const bandR = W / 2 - outer - badgeExtra - lw * 2.4 - textBand / 2 - lw * 0.6;
  const fontSize = textBand * 0.72;
  ctx.font = `bold ${fontSize}px ${fam}`;
  if (round) {
    const spacing = fontSize * (o.font === "sans" && o.shape !== "oval" ? 0.28 : 0.08);
    if (o.shape === "oval") {
      // Text follows the real oval band, centred between the outer and inner rings.
      const inset = outer + lw * 2.4 + textBand / 2 + lw * 0.6;
      const a = W / 2 - inset;
      const b = H / 2 - inset;
      if (o.topText) ellipseText(ctx, o.topText.toUpperCase(), cx, cy, a, b, true, spacing);
      if (o.bottomText) ellipseText(ctx, o.bottomText.toUpperCase(), cx, cy, a, b, false, spacing);
    } else {
      if (o.topText) arcText(ctx, o.topText.toUpperCase(), cx, cy, bandR, true, spacing);
      if (o.bottomText) arcText(ctx, o.bottomText.toUpperCase(), cx, cy, bandR, false, spacing);
    }
    // separators between top and bottom text
    if (o.topText && o.bottomText && circ) {
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
    circ ? (W / 2 - innerInset) * 1.5 : o.shape === "oval" ? (W / 2 - innerInset) * 1.4 : W - innerInset * 2 - size * 0.04;
  const lines = o.centerText.split("\n").filter((l) => l.trim());
  if (o.personName.trim()) lines.push(o.personName.trim());
  const centerCount = lines.length;
  if (o.designation.trim()) lines.push(o.designation.trim());
  if (o.regNo.trim()) lines.push(`${o.regLabel.trim()} ${o.regNo.trim()}`.trim());
  if (o.phone.trim()) lines.push(`Tel: ${o.phone.trim()}`);
  if (o.address.trim() && !round) lines.push(o.address.trim());
  if (o.extraText.trim()) lines.push(o.extraText.trim());
  if (o.dateLine) {
    const d = o.dateValue ? new Date(`${o.dateValue}T00:00:00`) : new Date();
    lines.push(d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }).toUpperCase());
  }
  const emblemR = (o.shape === "rectangle" || o.shape === "oval" ? H : W) * 0.07 * o.textScale;
  const hasEmblem = o.emblem !== "none" && !(o.emblem === "logo" && !o.logo);
  // Wide shapes (oval, rectangle) are shorter, so their centre lines must be tighter.
  const lineH = (wide ? H * 0.9 : W) * 0.085 * o.textScale;
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
    // The main centre line is large; registration number and date lines are smaller.
    const maxSize = i >= centerCount ? lineH * 0.6 : lines.length === 1 ? lineH * 0.95 : lineH * 0.8;
    if (i === 0 && o.band && centerCount > 0) {
      // Ribbon band clipped to the inner shape, with the text knocked out of it
      const s = fitFont(ctx, line, fam, innerW * 0.92, maxSize * 0.9);
      ctx.save();
      shapePath(o.topText || o.bottomText ? innerInset : outer + lw);
      ctx.clip();
      ctx.fillRect(0, y + lineH / 2 - s * 0.85, W, s * 1.7);
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillText(line, cx, y + lineH / 2 + s * 0.04);
      ctx.restore();
    } else {
      fitFont(ctx, line, fam, innerW, maxSize);
      ctx.fillText(line, cx, y + lineH / 2);
    }
    y += lineH;
  });
  }

  // Solid: fill the seal and cut the artwork out of it
  if (o.solid) {
    const art = document.createElement("canvas");
    art.width = W;
    art.height = H;
    art.getContext("2d")!.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, W, H);
    shapePath(outer - lw * 0.8, o.shape === "badge");
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    // keep the outermost border as the coloured edge
    ctx.save();
    shapePath(outer + lw * 0.9, o.shape === "badge");
    ctx.clip();
    ctx.drawImage(art, 0, 0);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  // Metallic foil finish
  if (o.metallic) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, shade(o.color, 0.55));
    g.addColorStop(0.35, o.color);
    g.addColorStop(0.55, shade(o.color, 0.4));
    g.addColorStop(0.8, shade(o.color, -0.35));
    g.addColorStop(1, shade(o.color, 0.25));
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = o.color;
  }

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
