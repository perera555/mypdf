"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  Bold,
  CalendarDays,
  Check,
  Circle,
  Copy,
  Eraser,
  EyeOff,
  Highlighter,
  ImagePlus,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Signature,
  Square,
  Stamp,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { SealDesigner } from "../SealDesigner";
import { SignatureDialog } from "../SignatureDialog";
import { Button, ErrorNote, IconButton, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { exportEdits, type FieldValue } from "../editor/export";
import { bbox, type BBox, type EditorObj, FONT_CSS, type FontName, STAMPS, type TextObj, type Tool, transform, type Widget } from "../editor/types";
import { getPdfjs } from "@/lib/pdfjs";
import { baseName, loadImage } from "@/lib/files";
import { showResult } from "@/lib/result";

type Mode = "edit" | "sign" | "redact";

export function EditTool() {
  return <Shell mode="edit" />;
}
export function SignTool() {
  return <Shell mode="sign" />;
}
export function RedactTool() {
  return <Shell mode="redact" />;
}

function Shell({ mode }: { mode: Mode }) {
  return <WithPdf>{(pdf, reset) => <Editor key={pdf.file.name + pdf.bytes.length} pdf={pdf} reset={reset} mode={mode} />}</WithPdf>;
}

const uid = () => crypto.randomUUID();
const COLORS = ["#111827", "#e11d48", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#ffffff"];
const HIGHLIGHTS = ["#fde047", "#86efac", "#93c5fd", "#f9a8d4", "#fdba74"];

interface Style {
  color: string;
  highlight: string;
  strokeWidth: number;
  fontSize: number;
  font: FontName;
  bold: boolean;
  opacity: number;
  fill: boolean;
  stamp: string;
}

interface Pending {
  src: string;
  w: number;
  h: number;
}

function Editor({ pdf, reset, mode }: { pdf: LoadedPdf; reset: () => void; mode: Mode }) {
  const [state, setState] = useState<{ objects: EditorObj[]; past: EditorObj[][]; future: EditorObj[][] }>({ objects: [], past: [], future: [] });
  const objects = state.objects;
  const [tool, setTool] = useState<Tool>(mode === "redact" ? "redact" : mode === "sign" ? "text" : "select");
  const [fields, setFields] = useState<Record<string, FieldValue>>({});
  const setField = useCallback((name: string, v: FieldValue) => setFields((f) => ({ ...f, [name]: v })), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>({
    color: mode === "sign" ? "#1d4ed8" : "#111827",
    highlight: HIGHLIGHTS[0],
    strokeWidth: 2,
    fontSize: 14,
    font: "Helvetica",
    bold: false,
    opacity: 1,
    fill: false,
    stamp: STAMPS[0],
  });
  const [pending, setPending] = useState<Pending | null>(null);
  const [sigDialog, setSigDialog] = useState<null | "signature" | "initials">(null);
  const [sealDialog, setSealDialog] = useState(false);
  const [sizes, setSizes] = useState<{ w: number; h: number }[] | null>(null);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  /* ---------- history ---------- */
  const begin = useCallback(() => setState((s) => ({ objects: s.objects, past: [...s.past.slice(-60), s.objects], future: [] })), []);
  const live = useCallback((fn: (o: EditorObj[]) => EditorObj[]) => setState((s) => ({ ...s, objects: fn(s.objects) })), []);
  const add = useCallback(
    (o: EditorObj) => {
      begin();
      live((list) => [...list, o]);
    },
    [begin, live],
  );
  const undo = () => setState((s) => (s.past.length ? { objects: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.objects, ...s.future] } : s));
  const redo = () => setState((s) => (s.future.length ? { objects: s.future[0], past: [...s.past, s.objects], future: s.future.slice(1) } : s));
  const remove = useCallback(
    (id: string) => {
      begin();
      live((l) => l.filter((o) => o.id !== id));
      setSelected(null);
      setEditing(null);
    },
    [begin, live],
  );

  const sel = objects.find((o) => o.id === selected) ?? null;

  /* ---------- page sizes ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const out: { w: number; h: number }[] = [];
      for (let i = 1; i <= pdf.pageCount; i++) {
        const vp = (await pdf.doc.getPage(i)).getViewport({ scale: 1 });
        out.push({ w: vp.width, h: vp.height });
      }
      if (!alive) return;
      setSizes(out);
      const avail = (scrollRef.current?.clientWidth ?? 900) - 32;
      setScale(Math.min(1.6, Math.max(0.35, avail / Math.max(...out.map((s) => s.w)))));
    })();
    return () => {
      alive = false;
    };
  }, [pdf]);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        remove(selected);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape") {
        setSelected(null);
        setEditing(null);
        setPending(null);
        setTool("select");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, remove]);

  /* ---------- style changes also restyle the selection ---------- */
  const changeStyle = (patch: Partial<Style>) => {
    setStyle((s) => ({ ...s, ...patch }));
    if (!sel) return;
    begin();
    live((list) =>
      list.map((o) => {
        if (o.id !== sel.id) return o;
        const n = { ...o } as EditorObj;
        if (patch.color !== undefined) {
          if (n.kind === "text") n.color = patch.color;
          else if (n.kind === "stamp") n.color = patch.color;
          else if (n.kind === "rect" || n.kind === "ellipse") {
            n.stroke = patch.color;
            if (n.fill) n.fill = patch.color;
          } else if ("stroke" in n) n.stroke = patch.color;
        }
        if (patch.highlight !== undefined && n.kind === "highlight") n.fill = patch.highlight;
        if (patch.strokeWidth !== undefined && "strokeWidth" in n) n.strokeWidth = patch.strokeWidth;
        if (patch.opacity !== undefined && "opacity" in n) n.opacity = patch.opacity;
        if (patch.fill !== undefined && (n.kind === "rect" || n.kind === "ellipse")) n.fill = patch.fill ? n.stroke : null;
        if (n.kind === "text") {
          if (patch.fontSize !== undefined) n.size = patch.fontSize;
          if (patch.font !== undefined) n.font = patch.font;
          if (patch.bold !== undefined) n.bold = patch.bold;
        }
        if (patch.stamp !== undefined && n.kind === "stamp") n.text = patch.stamp;
        return n;
      }),
    );
  };

  const choose = (t: Tool) => {
    setTool(t);
    setPending(null);
    setEditing(null);
    if (t !== "select") setSelected(null);
  };

  const startPlacing = async (src: string, width = 180) => {
    const img = await loadImage(src);
    setPending({ src, w: width, h: (width * img.naturalHeight) / img.naturalWidth });
    setTool("place");
    setSelected(null);
  };

  const onImageFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const src = file.type === "image/jpeg" ? c.toDataURL("image/jpeg", 0.9) : c.toDataURL("image/png");
      await startPlacing(src, 200);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSelected(null);
    setEditing(null);
    try {
      const out = await exportEdits(pdf.bytes, pdf.password, pdf.doc, objects, mode === "sign" ? fields : {});
      const suffix = mode === "sign" ? "signed" : mode === "redact" ? "redacted" : "edited";
      showResult(out, `${baseName(pdf.file.name)}-${suffix}.pdf`, objects.some((o) => o.kind === "redact") ? "Redacted pages were flattened so the hidden content is permanently removed." : undefined);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const T = ({ t, label, children }: { t: Tool; label: string; children: ReactNode }) => (
    <IconButton label={label} active={tool === t} onClick={() => choose(t)}>
      {children}
    </IconButton>
  );

  const showStroke = ["draw", "rect", "ellipse", "line", "arrow"].includes(sel?.kind ?? tool);
  const showText = (sel?.kind ?? tool) === "text" || (!sel && tool === "date");
  const showFill = ["rect", "ellipse"].includes(sel?.kind ?? tool);
  const isHighlight = (sel?.kind ?? tool) === "highlight";
  const showColor = !["image", "whiteout", "redact", "note", "place"].includes(sel?.kind ?? tool) && !isHighlight;

  const hint =
    tool === "place"
      ? "Tap on a page to place it."
      : mode === "sign" && sel
        ? "Drag to move · drag the corner or use Smaller / Bigger to resize."
        : mode === "sign" && tool === "text"
          ? "Click anywhere on the page to type. Blue boxes are form fields — just type in them. Press Sign to add your signature."
          : mode === "sign" && tool !== "select"
            ? "Click on the page to add it."
            : tool === "redact"
              ? "Drag over anything you want to permanently black out."
              : tool === "text"
                ? "Click on a page to type."
                : null;

  return (
    <div className="flex flex-col gap-4">
      <FileBar pdf={pdf} onReset={reset}>
        <IconButton label="Undo (Ctrl+Z)" disabled={!state.past.length} onClick={undo}>
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton label="Redo (Ctrl+Y)" disabled={!state.future.length} onClick={redo}>
          <Redo2 className="h-4 w-4" />
        </IconButton>
        <Button variant="primary" loading={busy} disabled={!objects.length && !Object.keys(fields).length} onClick={save}>
          Save PDF
        </Button>
      </FileBar>

      <div className="sticky top-14 z-30 flex flex-col gap-2 rounded-2xl border border-line bg-surface/95 p-2 shadow-card backdrop-blur">
        {/* Fill & Sign: simple labelled buttons */}
        {mode === "sign" && (
          <div className="thin-scroll flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSigDialog("signature")}
              className="brand-gradient inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm hover:brightness-110"
            >
              <Signature className="h-4 w-4" /> Sign
            </button>
            <SignBtn active={sigDialog === "initials"} onClick={() => setSigDialog("initials")}>
              <span className="text-xs font-bold">AB</span> Initials
            </SignBtn>
            <SignBtn active={tool === "text"} onClick={() => choose("text")}>
              <Type className="h-4 w-4" /> Text
            </SignBtn>
            <SignBtn active={tool === "date"} onClick={() => choose("date")}>
              <CalendarDays className="h-4 w-4" /> Date
            </SignBtn>
            <SignBtn active={tool === "check"} onClick={() => choose("check")}>
              <Check className="h-4 w-4" />
            </SignBtn>
            <SignBtn active={tool === "cross"} onClick={() => choose("cross")}>
              <X className="h-4 w-4" />
            </SignBtn>
            <SignBtn active={tool === "dot"} onClick={() => choose("dot")}>
              <span className="h-2.5 w-2.5 rounded-full bg-current" />
            </SignBtn>
            <SignBtn active={tool === "fillline"} onClick={() => choose("fillline")}>
              <Minus className="h-4 w-4" />
            </SignBtn>
            <SignBtn active={sealDialog} onClick={() => setSealDialog(true)}>
              <BadgeCheck className="h-4 w-4" /> Seal
            </SignBtn>
            <SignBtn active={tool === "select"} onClick={() => choose("select")}>
              <MousePointer2 className="h-4 w-4" /> Move
            </SignBtn>
            <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2">
              <IconButton label="Zoom out" onClick={() => setScale((s) => Math.max(0.3, s - 0.15))}>
                <Minus className="h-4 w-4" />
              </IconButton>
              <span className="w-11 text-center text-xs text-muted">{Math.round(scale * 100)}%</span>
              <IconButton label="Zoom in" onClick={() => setScale((s) => Math.min(4, s + 0.15))}>
                <Plus className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        )}
        {/* Tools */}
        <div className={`thin-scroll items-center gap-0.5 overflow-x-auto ${mode === "sign" ? "hidden" : "flex"}`}>
          <T t="select" label="Select & move">
            <MousePointer2 className="h-4 w-4" />
          </T>
          <T t="text" label="Add text">
            <Type className="h-4 w-4" />
          </T>
          <T t="draw" label="Draw">
            <Pencil className="h-4 w-4" />
          </T>
          <T t="highlight" label="Highlight">
            <Highlighter className="h-4 w-4" />
          </T>
          <Sep />
          <T t="rect" label="Rectangle">
            <Square className="h-4 w-4" />
          </T>
          <T t="ellipse" label="Ellipse">
            <Circle className="h-4 w-4" />
          </T>
          <T t="line" label="Line">
            <Minus className="h-4 w-4" />
          </T>
          <T t="arrow" label="Arrow">
            <ArrowUpRight className="h-4 w-4" />
          </T>
          <Sep />
          <T t="whiteout" label="White-out (cover text)">
            <Eraser className="h-4 w-4" />
          </T>
          <IconButton label="Add image" onClick={() => imageInput.current?.click()}>
            <ImagePlus className="h-4 w-4" />
          </IconButton>
          <IconButton label="Signature" active={sigDialog === "signature"} onClick={() => setSigDialog("signature")}>
            <Signature className="h-4 w-4" />
          </IconButton>
          <button
            onClick={() => setSigDialog("initials")}
            title="Initials"
            className="h-9 shrink-0 rounded-lg px-2 text-xs font-bold text-muted hover:bg-surface-2 hover:text-fg"
          >
            AB
          </button>
          <IconButton label="Seal" active={sealDialog} onClick={() => setSealDialog(true)}>
            <BadgeCheck className="h-4 w-4" />
          </IconButton>
          <T t="stamp" label="Stamp">
            <Stamp className="h-4 w-4" />
          </T>
          <T t="note" label="Sticky note">
            <StickyNote className="h-4 w-4" />
          </T>
          <Sep />
          <T t="check" label="Checkmark">
            <Check className="h-4 w-4" />
          </T>
          <T t="cross" label="Cross">
            <X className="h-4 w-4" />
          </T>
          <T t="date" label="Today’s date">
            <CalendarDays className="h-4 w-4" />
          </T>
          <T t="redact" label="Redact">
            <EyeOff className="h-4 w-4" />
          </T>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2">
            <IconButton label="Zoom out" onClick={() => setScale((s) => Math.max(0.3, s - 0.15))}>
              <Minus className="h-4 w-4" />
            </IconButton>
            <span className="w-11 text-center text-xs text-muted">{Math.round(scale * 100)}%</span>
            <IconButton label="Zoom in" onClick={() => setScale((s) => Math.min(4, s + 0.15))}>
              <Plus className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        {/* Properties */}
        <div className="thin-scroll flex min-h-9 items-center gap-3 overflow-x-auto border-t border-line px-1 pt-2 text-xs">
          {showColor && (
            <div className="flex shrink-0 items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Color ${c}`}
                  onClick={() => changeStyle({ color: c })}
                  className={`h-6 w-6 rounded-full border border-line ${style.color === c ? "ring-2 ring-accent ring-offset-1 ring-offset-[var(--surface)]" : ""}`}
                  style={{ background: c }}
                />
              ))}
              <input type="color" aria-label="Custom color" value={style.color} onChange={(e) => changeStyle({ color: e.target.value })} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" />
            </div>
          )}
          {isHighlight && (
            <div className="flex shrink-0 items-center gap-1">
              {HIGHLIGHTS.map((c) => (
                <button
                  key={c}
                  aria-label={`Highlight ${c}`}
                  onClick={() => changeStyle({ highlight: c })}
                  className={`h-6 w-6 rounded-full ${style.highlight === c ? "ring-2 ring-accent ring-offset-1 ring-offset-[var(--surface)]" : ""}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          )}
          {showStroke && (
            <label className="flex shrink-0 items-center gap-2 text-muted">
              Width
              <input type="range" min={0.5} max={16} step={0.5} value={"strokeWidth" in (sel ?? {}) ? (sel as { strokeWidth: number }).strokeWidth : style.strokeWidth} onChange={(e) => changeStyle({ strokeWidth: +e.target.value })} className="w-24 accent-[var(--accent)]" />
            </label>
          )}
          {showFill && (
            <label className="flex shrink-0 items-center gap-1.5 text-muted">
              <input type="checkbox" checked={sel && "fill" in sel ? !!sel.fill : style.fill} onChange={(e) => changeStyle({ fill: e.target.checked })} className="accent-[var(--accent)]" /> Fill
            </label>
          )}
          {(showStroke || isHighlight) && (
            <label className="flex shrink-0 items-center gap-2 text-muted">
              Opacity
              <input type="range" min={0.1} max={1} step={0.05} value={sel && "opacity" in sel ? sel.opacity : isHighlight ? 0.45 : style.opacity} onChange={(e) => changeStyle({ opacity: +e.target.value })} className="w-20 accent-[var(--accent)]" />
            </label>
          )}
          {showText && (
            <>
              <select value={sel?.kind === "text" ? sel.font : style.font} onChange={(e) => changeStyle({ font: e.target.value as FontName })} className="h-7 shrink-0 rounded-lg border border-line bg-surface px-1.5">
                <option value="Helvetica">Sans</option>
                <option value="Times">Serif</option>
                <option value="Courier">Mono</option>
              </select>
              <select value={sel?.kind === "text" ? Math.round(sel.size) : style.fontSize} onChange={(e) => changeStyle({ fontSize: +e.target.value })} className="h-7 shrink-0 rounded-lg border border-line bg-surface px-1.5">
                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72].map((n) => (
                  <option key={n} value={n}>
                    {n} pt
                  </option>
                ))}
              </select>
              <IconButton label="Bold" className="h-7 w-7" active={sel?.kind === "text" ? sel.bold : style.bold} onClick={() => changeStyle({ bold: !(sel?.kind === "text" ? sel.bold : style.bold) })}>
                <Bold className="h-3.5 w-3.5" />
              </IconButton>
            </>
          )}
          {(sel?.kind ?? tool) === "stamp" && (
            <select value={sel?.kind === "stamp" ? sel.text : style.stamp} onChange={(e) => changeStyle({ stamp: e.target.value })} className="h-7 shrink-0 rounded-lg border border-line bg-surface px-1.5">
              {STAMPS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          {hint && <span className="shrink-0 text-muted">{hint}</span>}
          {sel && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {(["smaller", "bigger"] as const).map((dir) => (
                <Button
                  key={dir}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const b = bbox(sel);
                    const k = dir === "bigger" ? 1.15 : 1 / 1.15;
                    const w = b.w * k;
                    const h = b.h * k;
                    begin();
                    live((l) => l.map((o) => (o.id === sel.id ? transform(o, b, { x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w, h }) : o)));
                  }}
                >
                  {dir === "bigger" ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />} {dir === "bigger" ? "Bigger" : "Smaller"}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const b = bbox(sel);
                  const copy = transform({ ...sel, id: uid() }, b, { ...b, x: b.x + 12, y: b.y + 12 });
                  add(copy);
                  setSelected(copy.id);
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(sel.id)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {mode === "redact" && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Redacted pages are converted to images when you save, so the text underneath is removed for good — it can’t be copied or searched afterwards.
        </p>
      )}
      <ErrorNote>{error}</ErrorNote>

      <div ref={scrollRef} className="checker thin-scroll overflow-auto rounded-2xl border border-line" style={{ maxHeight: "calc(100dvh - 15rem)" }}>
        <div className="flex min-w-fit flex-col items-center gap-5 p-4 sm:p-6">
          {sizes?.map((s, i) => (
            <EditorPage
              key={i}
              doc={pdf.doc}
              index={i}
              size={s}
              scale={scale}
              root={scrollRef}
              objects={objects.filter((o) => o.page === i)}
              tool={tool}
              style={style}
              selected={selected}
              editing={editing}
              pending={pending}
              setSelected={setSelected}
              setEditing={setEditing}
              setTool={setTool}
              setPending={setPending}
              add={add}
              begin={begin}
              live={live}
              remove={remove}
              fillMode={mode === "sign"}
              fields={fields}
              setField={setField}
            />
          ))}
        </div>
      </div>

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImageFile(f);
          e.target.value = "";
        }}
      />
      {sealDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSealDialog(false)}>
          <div className="fade-up thin-scroll max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add a seal</h2>
              <button onClick={() => setSealDialog(false)} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SealDesigner
              useLabel="Place on PDF"
              onUse={(url) => {
                setSealDialog(false);
                void startPlacing(url, 130);
              }}
            />
          </div>
        </div>
      )}
      {sigDialog && (
        <SignatureDialog
          title={sigDialog === "initials" ? "Create your initials" : "Create your signature"}
          onClose={() => setSigDialog(null)}
          onDone={(url) => {
            const kind = sigDialog;
            setSigDialog(null);
            void startPlacing(url, kind === "initials" ? 70 : 170);
          }}
        />
      )}
    </div>
  );
}

function SignBtn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition ${
        active ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface text-fg hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-line" />;
}

/* ================= Page ================= */

type Drag =
  | { mode: "move" | "resize"; id: string; start: [number, number]; box: BBox; origin: EditorObj }
  | { mode: "draw" | "box" | "line"; id: string; start: [number, number] };

function EditorPage(props: {
  doc: PDFDocumentProxy;
  index: number;
  size: { w: number; h: number };
  scale: number;
  root: React.RefObject<HTMLDivElement | null>;
  objects: EditorObj[];
  tool: Tool;
  style: Style;
  selected: string | null;
  editing: string | null;
  pending: Pending | null;
  setSelected: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  setTool: (t: Tool) => void;
  setPending: (p: Pending | null) => void;
  add: (o: EditorObj) => void;
  begin: () => void;
  live: (fn: (o: EditorObj[]) => EditorObj[]) => void;
  remove: (id: string) => void;
  fillMode: boolean;
  fields: Record<string, FieldValue>;
  setField: (name: string, v: FieldValue) => void;
}) {
  const { doc, index, size, scale, objects, tool, style, selected, editing, pending, fillMode } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const [visible, setVisible] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([]);

  // Fill & Sign: find the PDF's interactive form fields on this page.
  useEffect(() => {
    if (!fillMode || !visible) return;
    let live = true;
    (async () => {
      const page = await doc.getPage(index + 1);
      const vp = page.getViewport({ scale: 1 });
      const annots = await page.getAnnotations();
      const out: Widget[] = [];
      for (const a of annots) {
        if (a.subtype !== "Widget" || !a.fieldName || a.readOnly || a.hidden || a.pushButton) continue;
        const [x1, y1] = vp.convertToViewportPoint(a.rect[0], a.rect[1]) as [number, number];
        const [x2, y2] = vp.convertToViewportPoint(a.rect[2], a.rect[3]) as [number, number];
        const box = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
        if (a.fieldType === "Tx") out.push({ ...box, id: a.id, name: a.fieldName, kind: "text", multiline: !!a.multiLine, initial: a.fieldValue ?? "" });
        else if (a.fieldType === "Btn" && a.checkBox) out.push({ ...box, id: a.id, name: a.fieldName, kind: "check", initial: !!a.fieldValue && a.fieldValue !== "Off" });
        else if (a.fieldType === "Btn" && a.radioButton)
          out.push({ ...box, id: a.id, name: a.fieldName, kind: "radio", value: a.buttonValue, initial: a.fieldValue === a.buttonValue ? a.buttonValue : "" });
        else if (a.fieldType === "Ch")
          out.push({
            ...box,
            id: a.id,
            name: a.fieldName,
            kind: "choice",
            options: (a.options ?? []).map((o: { exportValue: string; displayValue: string }) => ({ value: o.exportValue, label: o.displayValue })),
            initial: Array.isArray(a.fieldValue) ? (a.fieldValue[0] ?? "") : (a.fieldValue ?? ""),
          });
      }
      if (live) setWidgets(out);
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [fillMode, visible, doc, index]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => setVisible(e[0].isIntersecting), { root: props.root.current, rootMargin: "1000px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [props.root]);

  useEffect(() => {
    if (!visible) return;
    let task: RenderTask | null = null;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(index + 1);
      const viewport = page.getViewport({ scale });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const off = document.createElement("canvas");
      off.width = Math.floor(viewport.width * ratio);
      off.height = Math.floor(viewport.height * ratio);
      // In Fill & Sign, form fields are drawn as live inputs instead of on the canvas.
      const { AnnotationMode } = await getPdfjs();
      task = page.render({
        canvas: off,
        viewport,
        transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
        annotationMode: fillMode ? AnnotationMode.ENABLE_FORMS : AnnotationMode.ENABLE,
      });
      await task.promise;
      const c = canvasRef.current;
      if (cancelled || !c) return;
      c.width = off.width;
      c.height = off.height;
      c.getContext("2d")!.drawImage(off, 0, 0);
    })().catch(() => {});
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, index, scale, fillMode]);

  const toPt =(e: React.PointerEvent): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  };

  const hitTest = (x: number, y: number) => {
    const pad = 6 / scale;
    for (let i = objects.length - 1; i >= 0; i--) {
      const b = bbox(objects[i]);
      if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) return objects[i];
    }
    return null;
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const [x, y] = toPt(e);
    const page = index;
    const s = style;
    const capture = () => svgRef.current?.setPointerCapture(e.pointerId);

    // Fill & Sign: clicking something already on the page selects it instead of adding another item.
    const onHandle = (() => {
      const cur = objects.find((o) => o.id === selected);
      if (!cur) return false;
      const b = bbox(cur);
      return Math.abs(x - (b.x + b.w)) < 16 / scale && Math.abs(y - (b.y + b.h)) < 16 / scale;
    })();
    const effective: Tool = fillMode && tool !== "place" && tool !== "select" && (onHandle || hitTest(x, y)) ? "select" : tool;

    switch (effective) {
      case "select": {
        const cur = objects.find((o) => o.id === selected);
        if (cur) {
          const b = bbox(cur);
          const hs = 16 / scale;
          if (Math.abs(x - (b.x + b.w)) < hs && Math.abs(y - (b.y + b.h)) < hs) {
            props.begin();
            drag.current = { mode: "resize", id: cur.id, start: [x, y], box: b, origin: cur };
            capture();
            return;
          }
        }
        const hit = hitTest(x, y);
        props.setSelected(hit?.id ?? null);
        if (hit?.id !== props.editing) props.setEditing(null);
        if (hit) {
          props.begin();
          drag.current = { mode: "move", id: hit.id, start: [x, y], box: bbox(hit), origin: hit };
          capture();
        }
        return;
      }
      case "draw": {
        const id = uid();
        props.add({ id, page, kind: "draw", strokes: [[[x, y]]], stroke: s.color, strokeWidth: s.strokeWidth, opacity: s.opacity });
        drag.current = { mode: "draw", id, start: [x, y] };
        capture();
        return;
      }
      case "rect":
      case "ellipse":
      case "highlight":
      case "whiteout":
      case "redact": {
        const id = uid();
        const fill = tool === "highlight" ? s.highlight : tool === "whiteout" ? "#ffffff" : tool === "redact" ? "#000000" : s.fill ? s.color : null;
        props.add({
          id,
          page,
          kind: effective,
          x,
          y,
          w: 0,
          h: 0,
          stroke: s.color,
          fill,
          strokeWidth: tool === "rect" || tool === "ellipse" ? s.strokeWidth : 0,
          opacity: tool === "highlight" ? 0.45 : tool === "rect" || tool === "ellipse" ? s.opacity : 1,
        });
        drag.current = { mode: "box", id, start: [x, y] };
        capture();
        return;
      }
      case "line":
      case "arrow": {
        const id = uid();
        props.add({ id, page, kind: effective, x1: x, y1: y, x2: x, y2: y, stroke: s.color, strokeWidth: s.strokeWidth, opacity: s.opacity });
        drag.current = { mode: "line", id, start: [x, y] };
        capture();
        return;
      }
      case "text":
      case "date": {
        const id = uid();
        const text = tool === "date" ? new Date().toLocaleDateString() : "";
        const o: TextObj = { id, page, kind: "text", x, y: y - s.fontSize * 0.6, text, size: s.fontSize, color: s.color, font: s.font, bold: s.bold };
        props.add(o);
        props.setSelected(id);
        if (tool === "text") {
          props.setEditing(id);
          if (!fillMode) props.setTool("select");
        }
        return;
      }
      case "dot":
        props.add({ id: uid(), page, kind: "draw", strokes: [[[x, y]]], stroke: s.color, strokeWidth: Math.max(4, s.fontSize * 0.45), opacity: 1 });
        return;
      case "fillline": {
        const id = uid();
        props.add({ id, page, kind: "line", x1: x - 40, y1: y, x2: x + 40, y2: y, stroke: s.color, strokeWidth: 1.2, opacity: 1 });
        props.setSelected(id);
        return;
      }
      case "note": {
        const id = uid();
        props.add({ id, page, kind: "note", x, y, w: 170, h: 110, text: "" });
        props.setSelected(id);
        props.setEditing(id);
        props.setTool("select");
        return;
      }
      case "stamp": {
        const id = uid();
        props.add({ id, page, kind: "stamp", x: x - 75, y: y - 22, w: 150, h: 44, text: s.stamp, color: s.color === "#111827" ? "#dc2626" : s.color });
        props.setSelected(id);
        props.setTool("select");
        return;
      }
      case "check":
      case "cross": {
        const k = s.fontSize;
        const strokes: [number, number][][] =
          tool === "check"
            ? [
                [
                  [x - k * 0.45, y],
                  [x - k * 0.1, y + k * 0.4],
                  [x + k * 0.5, y - k * 0.45],
                ],
              ]
            : [
                [
                  [x - k * 0.4, y - k * 0.4],
                  [x + k * 0.4, y + k * 0.4],
                ],
                [
                  [x + k * 0.4, y - k * 0.4],
                  [x - k * 0.4, y + k * 0.4],
                ],
              ];
        props.add({ id: uid(), page, kind: "draw", strokes, stroke: s.color, strokeWidth: Math.max(1.5, k / 7), opacity: 1 });
        return;
      }
      case "place": {
        if (!pending) return;
        const id = uid();
        props.add({ id, page, kind: "image", x: x - pending.w / 2, y: y - pending.h / 2, w: pending.w, h: pending.h, src: pending.src });
        props.setPending(null);
        props.setSelected(id);
        props.setTool(fillMode ? "text" : "select");
        return;
      }
    }
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toPt(e);
    props.live((list) =>
      list.map((o) => {
        if (o.id !== d.id) return o;
        switch (d.mode) {
          case "move": {
            const dx = x - d.start[0];
            const dy = y - d.start[1];
            return transform(d.origin, d.box, { ...d.box, x: d.box.x + dx, y: d.box.y + dy });
          }
          case "resize": {
            const w = Math.max(6 / scale, x - d.box.x);
            const keep = ["image", "stamp", "text"].includes(d.origin.kind);
            const h = keep ? (w * d.box.h) / d.box.w : Math.max(6 / scale, y - d.box.y);
            return transform(d.origin, d.box, { x: d.box.x, y: d.box.y, w, h });
          }
          case "draw":
            if (o.kind !== "draw") return o;
            return { ...o, strokes: [...o.strokes.slice(0, -1), [...o.strokes[o.strokes.length - 1], [x, y] as [number, number]]] };
          case "box":
            if (!("w" in o)) return o;
            return { ...o, x: Math.min(d.start[0], x), y: Math.min(d.start[1], y), w: Math.abs(x - d.start[0]), h: Math.abs(y - d.start[1]) };
          case "line":
            if (o.kind !== "line" && o.kind !== "arrow") return o;
            return { ...o, x2: x, y2: y };
        }
      }),
    );
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.mode === "box") {
      props.live((list) =>
        list.map((o) => {
          if (o.id !== d.id || !("w" in o) || o.w > 3 || o.h > 3) return o;
          const dh = o.kind === "highlight" ? 16 : 50;
          return { ...o, w: 120, h: dh };
        }),
      );
    } else if (d.mode === "line") {
      props.live((list) => list.map((o) => (o.id === d.id && (o.kind === "line" || o.kind === "arrow") && Math.hypot(o.x2 - o.x1, o.y2 - o.y1) < 3 ? { ...o, x2: o.x1 + 100 } : o)));
    }
  };

  const cursor = tool === "select" ? "default" : tool === "text" ? "text" : "crosshair";
  const editObj = objects.find((o) => o.id === editing && (o.kind === "text" || o.kind === "note"));

  return (
    <div ref={wrapRef} className="relative bg-white shadow-lg ring-1 ring-black/5" style={{ width: size.w * scale, height: size.h * scale }}>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size.w} ${size.h}`}
        className="absolute inset-0 h-full w-full select-none"
        style={{ cursor, touchAction: tool === "select" && !selected ? "pan-x pan-y" : "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={(e) => {
          const r = svgRef.current!.getBoundingClientRect();
          const hit = hitTest((e.clientX - r.left) / scale, (e.clientY - r.top) / scale);
          if (hit && (hit.kind === "text" || hit.kind === "note")) {
            props.setSelected(hit.id);
            props.setEditing(hit.id);
          }
        }}
      >
        {objects.map((o) => (
          <ObjView key={o.id} o={o} hidden={o.id === editing && o.kind === "text"} />
        ))}
        {(() => {
          const s = objects.find((o) => o.id === selected);
          if (!s) return null;
          const b = bbox(s);
          const p = 3 / scale;
          const hs = 12 / scale;
          return (
            <g pointerEvents="none">
              <rect x={b.x - p} y={b.y - p} width={b.w + p * 2} height={b.h + p * 2} fill="none" stroke="#e11d48" strokeWidth={1.2 / scale} strokeDasharray={`${4 / scale} ${3 / scale}`} />
              <circle cx={b.x + b.w} cy={b.y + b.h} r={hs / 2} fill="#e11d48" stroke="#fff" strokeWidth={2 / scale} />
              <path
                d={`M${b.x + b.w - hs * 0.22},${b.y + b.h + hs * 0.22} L${b.x + b.w + hs * 0.22},${b.y + b.h - hs * 0.22}`}
                stroke="#fff"
                strokeWidth={1.5 / scale}
              />
            </g>
          );
        })()}
        {tool === "place" && pending && <rect x={0} y={0} width={size.w} height={size.h} fill="rgba(225,29,72,0.04)" />}
      </svg>

      {fillMode &&
        widgets.map((wd) => {
          const style: React.CSSProperties = { left: wd.x * scale, top: wd.y * scale, width: wd.w * scale, height: wd.h * scale };
          const value = props.fields[wd.name];
          const cls = "absolute z-10 border border-sky-400/70 bg-sky-100/50 outline-none focus:border-sky-600 focus:bg-sky-50/80";
          if (wd.kind === "text") {
            const v = typeof value === "string" ? value : wd.initial;
            const fs = Math.max(8, Math.min(wd.h * 0.68, 13)) * scale;
            return wd.multiline ? (
              <textarea key={wd.id} aria-label={wd.name} value={v} onChange={(e) => props.setField(wd.name, e.target.value)} className={`${cls} resize-none p-0.5 text-black`} style={{ ...style, fontSize: fs }} />
            ) : (
              <input key={wd.id} aria-label={wd.name} value={v} onChange={(e) => props.setField(wd.name, e.target.value)} className={`${cls} px-0.5 text-black`} style={{ ...style, fontSize: fs }} />
            );
          }
          if (wd.kind === "check") {
            const v = typeof value === "boolean" ? value : wd.initial;
            return (
              <button key={wd.id} type="button" role="checkbox" aria-checked={v} aria-label={wd.name} onClick={() => props.setField(wd.name, !v)} className={`${cls} flex items-center justify-center text-black`} style={style}>
                {v && <Check style={{ width: wd.h * scale * 0.8, height: wd.h * scale * 0.8 }} strokeWidth={3} />}
              </button>
            );
          }
          if (wd.kind === "radio") {
            const v = typeof value === "string" ? value : wd.initial;
            const on = v === wd.value;
            return (
              <button key={wd.id} type="button" role="radio" aria-checked={on} aria-label={`${wd.name} ${wd.value}`} onClick={() => props.setField(wd.name, wd.value)} className={`${cls} flex items-center justify-center rounded-full`} style={style}>
                {on && <span className="rounded-full bg-black" style={{ width: wd.h * scale * 0.5, height: wd.h * scale * 0.5 }} />}
              </button>
            );
          }
          const v = typeof value === "string" ? value : wd.initial;
          return (
            <select key={wd.id} aria-label={wd.name} value={v} onChange={(e) => props.setField(wd.name, e.target.value)} className={`${cls} text-black`} style={{ ...style, fontSize: Math.max(8, Math.min(wd.h * 0.6, 12)) * scale }}>
              <option value="">—</option>
              {wd.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          );
        })}
      {editObj?.kind === "text" && (
        <textarea
          autoFocus
          value={editObj.text}
          placeholder="Type here"
          onFocus={() => props.begin()}
          onChange={(e) => props.live((l) => l.map((x) => (x.id === editObj.id ? { ...x, text: e.target.value } : x)))}
          onBlur={() => {
            props.setEditing(null);
            if (!editObj.text.trim()) props.live((l) => l.filter((x) => x.id !== editObj.id));
          }}
          rows={Math.max(1, editObj.text.split("\n").length)}
          className="absolute resize-none overflow-hidden border border-dashed border-accent bg-white/70 p-0 leading-[1.2] outline-none"
          style={{
            left: editObj.x * scale,
            top: editObj.y * scale,
            fontSize: editObj.size * scale,
            fontFamily: FONT_CSS[editObj.font],
            fontWeight: editObj.bold ? 700 : 400,
            color: editObj.color,
            minWidth: 140,
            width: Math.max(140, (Math.max(...editObj.text.split("\n").map((l) => l.length), 4) + 2) * editObj.size * scale * 0.55),
          }}
        />
      )}
      {editObj?.kind === "note" && (
        <textarea
          autoFocus
          value={editObj.text}
          placeholder="Write a comment…"
          onFocus={() => props.begin()}
          onChange={(e) => props.live((l) => l.map((x) => (x.id === editObj.id ? { ...x, text: e.target.value } : x)))}
          onBlur={() => props.setEditing(null)}
          className="absolute resize-none border border-amber-500 bg-amber-100 p-1.5 text-zinc-800 outline-none"
          style={{ left: editObj.x * scale, top: editObj.y * scale, width: editObj.w * scale, height: editObj.h * scale, fontSize: 10 * scale }}
        />
      )}
      <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-muted">{index + 1}</span>
    </div>
  );
}

function ObjView({ o, hidden }: { o: EditorObj; hidden?: boolean }) {
  switch (o.kind) {
    case "rect":
    case "whiteout":
      return <rect x={o.x} y={o.y} width={o.w} height={o.h} fill={o.fill ?? "none"} stroke={o.kind === "rect" ? o.stroke : "#e5e7eb"} strokeWidth={o.kind === "rect" ? o.strokeWidth : 0.5} opacity={o.opacity} />;
    case "highlight":
      return <rect x={o.x} y={o.y} width={o.w} height={o.h} fill={o.fill ?? "#fde047"} opacity={o.opacity} style={{ mixBlendMode: "multiply" }} />;
    case "redact":
      return <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="#000" stroke="#e11d48" strokeWidth={1} />;
    case "ellipse":
      return <ellipse cx={o.x + o.w / 2} cy={o.y + o.h / 2} rx={o.w / 2} ry={o.h / 2} fill={o.fill ?? "none"} stroke={o.stroke} strokeWidth={o.strokeWidth} opacity={o.opacity} />;
    case "line":
    case "arrow": {
      const a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1);
      const len = Math.max(8, o.strokeWidth * 4);
      const head = [Math.PI * 0.82, -Math.PI * 0.82].map((d) => `${o.x2 + len * Math.cos(a + d)},${o.y2 + len * Math.sin(a + d)}`);
      return (
        <g stroke={o.stroke} strokeWidth={o.strokeWidth} opacity={o.opacity} strokeLinecap="round" fill="none">
          <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} />
          {o.kind === "arrow" && <polyline points={`${head[0]} ${o.x2},${o.y2} ${head[1]}`} />}
        </g>
      );
    }
    case "draw":
      return (
        <g stroke={o.stroke} strokeWidth={o.strokeWidth} opacity={o.opacity} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {o.strokes.map((s, i) => (
            <path key={i} d={s.length === 1 ? `M${s[0][0]},${s[0][1]}l0.01,0` : `M${s.map((p) => p.join(",")).join("L")}`} />
          ))}
        </g>
      );
    case "text":
      if (hidden) return null;
      return (
        <text fontFamily={FONT_CSS[o.font]} fontSize={o.size} fontWeight={o.bold ? 700 : 400} fill={o.color} style={{ whiteSpace: "pre" }}>
          {(o.text || " ").split("\n").map((line, i) => (
            <tspan key={i} x={o.x} y={o.y + o.size * (0.85 + i * 1.2)}>
              {line || " "}
            </tspan>
          ))}
        </text>
      );
    case "image":
      return <image href={o.src} x={o.x} y={o.y} width={o.w} height={o.h} preserveAspectRatio="none" />;
    case "stamp": {
      const size = Math.min(o.h * 0.5, (o.w * 0.88) / (o.text.length * 0.68));
      return (
        <g opacity={0.85}>
          <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={o.h * 0.15} fill="none" stroke={o.color} strokeWidth={Math.max(1.5, o.h * 0.06)} />
          <text x={o.x + o.w / 2} y={o.y + o.h / 2 + size * 0.35} textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontWeight={700} fontSize={size} fill={o.color}>
            {o.text}
          </text>
        </g>
      );
    }
    case "note":
      return (
        <g>
          <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="#fff399" stroke="#d9b310" strokeWidth={1} />
          <foreignObject x={o.x} y={o.y} width={o.w} height={o.h}>
            <div style={{ padding: 6, fontSize: 10, lineHeight: 1.25, color: "#333", fontFamily: "Helvetica, Arial, sans-serif", whiteSpace: "pre-wrap", overflow: "hidden", height: "100%" }}>
              {o.text || "Double-click to write"}
            </div>
          </foreignObject>
        </g>
      );
  }
}
