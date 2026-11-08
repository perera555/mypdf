"use client";

export type Flourish = "none" | "underline" | "swoosh" | "double" | "loop";

export interface Ink {
  id: string;
  label: string;
  /** one colour = solid ink; several = gradient ink */
  colors: string[];
}

export const INKS: Ink[] = [
  { id: "black", label: "Classic black", colors: ["#111111"] },
  { id: "graphite", label: "Graphite", colors: ["#374151"] },
  { id: "navy", label: "Navy", colors: ["#1e3a8a"] },
  { id: "royal", label: "Royal blue", colors: ["#1d4ed8"] },
  { id: "ocean", label: "Ocean", colors: ["#0369a1"] },
  { id: "teal", label: "Teal", colors: ["#0f766e"] },
  { id: "forest", label: "Forest", colors: ["#166534"] },
  { id: "emerald", label: "Emerald", colors: ["#059669"] },
  { id: "purple", label: "Purple", colors: ["#6d28d9"] },
  { id: "plum", label: "Plum", colors: ["#86198f"] },
  { id: "burgundy", label: "Burgundy", colors: ["#881337"] },
  { id: "red", label: "Red", colors: ["#b91c1c"] },
  { id: "pink", label: "Pink", colors: ["#db2777"] },
  { id: "brown", label: "Brown", colors: ["#78350f"] },
  { id: "sepia", label: "Sepia", colors: ["#92400e"] },
  { id: "gold", label: "Gold", colors: ["#a67c00", "#f5d76e", "#b8860b"] },
  { id: "rose-gold", label: "Rose gold", colors: ["#a45a52", "#eacdc0", "#b76e79"] },
  { id: "ocean-glow", label: "Ocean glow", colors: ["#0ea5e9", "#6366f1"] },
  { id: "sunset", label: "Sunset", colors: ["#f43f5e", "#f59e0b"] },
  { id: "royal-glow", label: "Royal glow", colors: ["#7c3aed", "#2563eb"] },
];

export interface SignatureOptions {
  text: string;
  family: string;
  scale: number; // per-font size correction
  colors: string[];
  slant: number; // degrees, positive leans right
  weight: number; // 0–3 extra stroke thickness
  flourish: Flourish;
}

export function inkCss(colors: string[]) {
  return colors.length === 1 ? colors[0] : `linear-gradient(135deg, ${colors.join(", ")})`;
}

/** Draw a signature on a transparent canvas, cropped tight. `res` multiplies the resolution. */
export function renderSignature(o: SignatureOptions, res = 1): HTMLCanvasElement | null {
  const text = o.text.trim();
  if (!text) return null;
  const size = 120 * o.scale * res;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.font = `${size}px ${o.family}`;
  const tw = ctx.measureText(text).width;
  const pad = size * 1.2;
  c.width = Math.ceil(tw + pad * 2);
  c.height = Math.ceil(size * 3);
  const base = size * 1.75;
  const x0 = pad;
  const x1 = pad + tw;

  ctx.font = `${size}px ${o.family}`;
  ctx.textBaseline = "alphabetic";
  const fill: string | CanvasGradient = (() => {
    if (o.colors.length === 1) return o.colors[0];
    const g = ctx.createLinearGradient(x0, base - size, x1, base + size * 0.3);
    o.colors.forEach((col, i) => g.addColorStop(i / (o.colors.length - 1), col));
    return g;
  })();
  ctx.fillStyle = fill;
  ctx.strokeStyle = fill;

  ctx.save();
  // Slant around the baseline
  ctx.transform(1, 0, -Math.tan((o.slant * Math.PI) / 180), 1, Math.tan((o.slant * Math.PI) / 180) * base, 0);
  ctx.fillText(text, x0, base);
  if (o.weight > 0) {
    ctx.lineWidth = o.weight * 1.2 * res;
    ctx.lineJoin = "round";
    ctx.strokeText(text, x0, base);
  }
  ctx.restore();

  // Flourish under the name
  const lw = (2.2 + o.weight * 0.6) * res * o.scale;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const u = base + size * 0.22;
  const path = (fn: () => void) => {
    ctx.beginPath();
    fn();
    ctx.stroke();
  };
  switch (o.flourish) {
    case "underline":
      path(() => {
        ctx.moveTo(x0 + tw * 0.04, u + size * 0.04);
        ctx.quadraticCurveTo(x0 + tw * 0.5, u + size * 0.16, x1 + size * 0.1, u - size * 0.02);
      });
      break;
    case "swoosh":
      path(() => {
        ctx.moveTo(x0 - size * 0.05, u + size * 0.12);
        ctx.bezierCurveTo(x0 + tw * 0.35, u + size * 0.38, x1 - tw * 0.25, u - size * 0.05, x1 + size * 0.35, u - size * 0.35);
      });
      break;
    case "double":
      path(() => {
        ctx.moveTo(x0 + tw * 0.06, u);
        ctx.quadraticCurveTo(x0 + tw * 0.5, u + size * 0.12, x1, u - size * 0.02);
      });
      path(() => {
        ctx.moveTo(x0 + tw * 0.2, u + size * 0.14);
        ctx.quadraticCurveTo(x0 + tw * 0.6, u + size * 0.24, x1 - tw * 0.05, u + size * 0.1);
      });
      break;
    case "loop":
      path(() => {
        ctx.moveTo(x0 - size * 0.1, u + size * 0.05);
        ctx.bezierCurveTo(x0 + tw * 0.3, u + size * 0.3, x0 + tw * 0.62, u + size * 0.25, x0 + tw * 0.7, u);
        ctx.bezierCurveTo(x0 + tw * 0.76, u - size * 0.22, x0 + tw * 0.58, u - size * 0.2, x0 + tw * 0.6, u + size * 0.02);
        ctx.bezierCurveTo(x0 + tw * 0.64, u + size * 0.2, x1, u + size * 0.1, x1 + size * 0.4, u - size * 0.12);
      });
      break;
  }
  return trim(c, Math.round(10 * res));
}

function trim(src: HTMLCanvasElement, pad: number): HTMLCanvasElement | null {
  const ctx = src.getContext("2d", { willReadFrequently: true })!;
  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      if (data[row + x * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1 + pad * 2;
  out.height = maxY - minY + 1 + pad * 2;
  out.getContext("2d")!.drawImage(src, minX, minY, maxX - minX + 1, maxY - minY + 1, pad, pad, maxX - minX + 1, maxY - minY + 1);
  return out;
}

export function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 3)
    .join("");
}
