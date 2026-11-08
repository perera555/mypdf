"use client";

import { Eraser, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Input, Segmented } from "./ui";
import { SIGNATURE_FONTS } from "@/lib/fonts";

const STORE_KEY = "mypdf.signatures";

export function loadSavedSignatures(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function storeSignatures(list: string[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 6)));
  } catch {
    /* storage unavailable */
  }
}

/** Crop a canvas to its non-transparent pixels and return a PNG data URL. */
function trimCanvas(src: HTMLCanvasElement): string | null {
  const ctx = src.getContext("2d")!;
  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) return null;
  const pad = 6;
  const out = document.createElement("canvas");
  out.width = maxX - minX + pad * 2;
  out.height = maxY - minY + pad * 2;
  out.getContext("2d")!.drawImage(src, minX - pad, minY - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

const INKS = ["#111827", "#1d4ed8", "#b91c1c"];

export function SignatureDialog({ onDone, onClose, title = "Create your signature" }: { onDone: (dataUrl: string) => void; onClose: () => void; title?: string }) {
  const [tab, setTab] = useState<"draw" | "type" | "upload" | "saved">(() => (loadSavedSignatures().length ? "saved" : "draw"));
  const [ink, setInk] = useState(INKS[0]);
  const [typed, setTyped] = useState("");
  const [fontIdx, setFontIdx] = useState(0);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [saved, setSaved] = useState<string[]>([]);
  const [remember, setRemember] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<[number, number] | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => setSaved(loadSavedSignatures()), []);

  useEffect(() => {
    if (tab !== "draw") return;
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    setHasInk(false);
  }, [tab]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const finish = (url: string | null) => {
    if (!url) return;
    if (remember && tab !== "saved") {
      const list = [url, ...saved.filter((s) => s !== url)];
      storeSignatures(list);
    }
    onDone(url);
  };

  const fromTyped = async () => {
    const f = SIGNATURE_FONTS[fontIdx].font;
    const family = f.style.fontFamily;
    await document.fonts.load(`96px ${family}`);
    const c = document.createElement("canvas");
    c.width = 1400;
    c.height = 300;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = ink;
    ctx.font = `110px ${family}`;
    ctx.textBaseline = "middle";
    ctx.fillText(typed, 30, 150);
    return trimCanvas(c);
  };

  const fromUpload = async (dataUrl: string) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const k = Math.min(1, 1200 / img.naturalWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    if (removeBg) {
      const d = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const lum = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
        if (lum > 200) d.data[i + 3] = 0;
      }
      ctx.putImageData(d, 0, 0);
    }
    return trimCanvas(c);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="fade-up w-full max-w-xl rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            ...(saved.length ? [{ value: "saved" as const, label: "Saved" }] : []),
            { value: "draw" as const, label: "Draw" },
            { value: "type" as const, label: "Type" },
            { value: "upload" as const, label: "Upload" },
          ]}
        />

        <div className="mt-4">
          {tab === "saved" && (
            <div className="grid grid-cols-2 gap-3">
              {saved.map((s) => (
                <div key={s} className="group relative">
                  <button onClick={() => finish(s)} className="flex h-24 w-full items-center justify-center rounded-xl border border-line bg-white p-2 hover:border-accent">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s} alt="Saved signature" className="max-h-full max-w-full object-contain" />
                  </button>
                  <button
                    aria-label="Delete saved signature"
                    onClick={() => {
                      const list = saved.filter((x) => x !== s);
                      storeSignatures(list);
                      setSaved(list);
                      if (!list.length) setTab("draw");
                    }}
                    className="absolute top-1 right-1 rounded-md bg-surface p-1 text-muted opacity-0 shadow group-hover:opacity-100 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "draw" && (
            <div className="flex flex-col gap-2">
              <canvas
                ref={canvasRef}
                className="h-48 w-full touch-none rounded-xl border border-dashed border-line bg-white"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drawing.current = true;
                  last.current = pos(e);
                }}
                onPointerMove={(e) => {
                  if (!drawing.current || !last.current) return;
                  const ctx = e.currentTarget.getContext("2d")!;
                  const p = pos(e);
                  ctx.strokeStyle = ink;
                  ctx.lineWidth = 2.6;
                  ctx.lineCap = "round";
                  ctx.lineJoin = "round";
                  ctx.beginPath();
                  ctx.moveTo(...last.current);
                  ctx.lineTo(...p);
                  ctx.stroke();
                  last.current = p;
                  setHasInk(true);
                }}
                onPointerUp={() => {
                  drawing.current = false;
                  last.current = null;
                }}
              />
              <div className="flex items-center justify-between">
                <InkPicker ink={ink} setInk={setInk} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const c = canvasRef.current!;
                    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
                    setHasInk(false);
                  }}
                >
                  <Eraser className="h-4 w-4" /> Clear
                </Button>
              </div>
            </div>
          )}

          {tab === "type" && (
            <div className="flex flex-col gap-3">
              <Input autoFocus placeholder="Type your name" value={typed} onChange={(e) => setTyped(e.target.value)} />
              <div className="grid gap-2">
                {SIGNATURE_FONTS.map((f, i) => (
                  <button
                    key={f.label}
                    onClick={() => setFontIdx(i)}
                    className={`flex h-16 items-center rounded-xl border bg-white px-4 text-3xl ${fontIdx === i ? "border-accent ring-2 ring-[var(--ring)]" : "border-line"}`}
                    style={{ fontFamily: f.font.style.fontFamily, color: ink }}
                  >
                    {typed || "Your Name"}
                  </button>
                ))}
              </div>
              <InkPicker ink={ink} setInk={setInk} />
            </div>
          )}

          {tab === "upload" && (
            <div className="flex flex-col gap-3">
              <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white text-sm text-zinc-500 hover:border-accent">
                {uploaded ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={uploaded} alt="Uploaded signature" className="max-h-36 max-w-full object-contain" />
                ) : (
                  <>
                    <Upload className="h-6 w-6" /> Choose an image of your signature
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setUploaded(r.result as string);
                    r.readAsDataURL(f);
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                Remove white background
              </label>
            </div>
          )}
        </div>

        {tab !== "saved" && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Remember on this device
            </label>
            <Button
              variant="primary"
              disabled={(tab === "draw" && !hasInk) || (tab === "type" && !typed.trim()) || (tab === "upload" && !uploaded)}
              onClick={async () => {
                if (tab === "draw") finish(trimCanvas(canvasRef.current!));
                else if (tab === "type") finish(await fromTyped());
                else if (uploaded) finish(await fromUpload(uploaded));
              }}
            >
              Use signature
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function InkPicker({ ink, setInk }: { ink: string; setInk: (s: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      {INKS.map((c) => (
        <button
          key={c}
          aria-label={`Ink ${c}`}
          onClick={() => setInk(c)}
          className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-[var(--surface)] ${ink === c ? "ring-2 ring-accent" : ""}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
