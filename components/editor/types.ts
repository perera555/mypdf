export type FontName = "Helvetica" | "Times" | "Courier";

interface Base {
  id: string;
  page: number;
}

export interface BoxObj extends Base {
  kind: "rect" | "ellipse" | "highlight" | "whiteout" | "redact";
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  fill: string | null;
  strokeWidth: number;
  opacity: number;
}

export interface LineObj extends Base {
  kind: "line" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface DrawObj extends Base {
  kind: "draw";
  strokes: [number, number][][];
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface TextObj extends Base {
  kind: "text";
  x: number;
  y: number;
  text: string;
  size: number;
  color: string;
  font: FontName;
  bold: boolean;
}

export interface ImageObj extends Base {
  kind: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
}

export interface StampObj extends Base {
  kind: "stamp";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
}

export interface NoteObj extends Base {
  kind: "note";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
}

export type EditorObj = BoxObj | LineObj | DrawObj | TextObj | ImageObj | StampObj | NoteObj;

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Tool =
  | "select"
  | "text"
  | "draw"
  | "highlight"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "whiteout"
  | "redact"
  | "note"
  | "stamp"
  | "check"
  | "cross"
  | "date"
  | "place";

export const FONT_CSS: Record<FontName, string> = {
  Helvetica: "Helvetica, Arial, sans-serif",
  Times: "'Times New Roman', Times, serif",
  Courier: "'Courier New', Courier, monospace",
};

let measureCtx: CanvasRenderingContext2D | null = null;
export function measureText(o: TextObj): BBox {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  const lines = (o.text || " ").split("\n");
  measureCtx!.font = `${o.bold ? "bold " : ""}${o.size}px ${FONT_CSS[o.font]}`;
  const w = Math.max(o.size * 0.6, ...lines.map((l) => measureCtx!.measureText(l).width));
  return { x: o.x, y: o.y, w, h: lines.length * o.size * 1.2 };
}

export function bbox(o: EditorObj): BBox {
  switch (o.kind) {
    case "text":
      return measureText(o);
    case "line":
    case "arrow": {
      const x = Math.min(o.x1, o.x2);
      const y = Math.min(o.y1, o.y2);
      return { x, y, w: Math.max(1, Math.abs(o.x2 - o.x1)), h: Math.max(1, Math.abs(o.y2 - o.y1)) };
    }
    case "draw": {
      const pts = o.strokes.flat();
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, w: Math.max(1, Math.max(...xs) - x), h: Math.max(1, Math.max(...ys) - y) };
    }
    default:
      return { x: o.x, y: o.y, w: o.w, h: o.h };
  }
}

/** Map an object from one bounding box to another (used for both moving and resizing). */
export function transform(o: EditorObj, from: BBox, to: BBox): EditorObj {
  const sx = to.w / from.w;
  const sy = to.h / from.h;
  const mx = (x: number) => to.x + (x - from.x) * sx;
  const my = (y: number) => to.y + (y - from.y) * sy;
  switch (o.kind) {
    case "text":
      return { ...o, x: mx(o.x), y: my(o.y), size: Math.max(4, o.size * sy) };
    case "line":
    case "arrow":
      return { ...o, x1: mx(o.x1), y1: my(o.y1), x2: mx(o.x2), y2: my(o.y2) };
    case "draw":
      return { ...o, strokes: o.strokes.map((s) => s.map(([x, y]) => [mx(x), my(y)] as [number, number])) };
    default:
      return { ...o, x: mx(o.x), y: my(o.y), w: Math.max(4, o.w * sx), h: Math.max(4, o.h * sy) };
  }
}

export const STAMPS = ["APPROVED", "REJECTED", "DRAFT", "CONFIDENTIAL", "FINAL", "PAID", "RECEIVED", "COPY"];
