"use client";

import { Camera, Eraser, Trash2, Upload, X } from "lucide-react";
import { type Clarity, extractSignature, type InkMode } from "@/lib/extract-signature";
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

export function SignatureDialog({
  onDone,
  onClose,
  title = "Create your signature",
  inline = false,
  doneLabel = "Use signature",
}: {
  onDone: (dataUrl: string) => void;
  onClose?: () => void;
  title?: string;
  inline?: boolean;
  doneLabel?: string;
}) {
  const [tab, setTab] = useState<"draw" | "type" | "upload" | "saved">(() => (loadSavedSignatures().length ? "saved" : "draw"));
  const [ink, setInk] = useState(INKS[0]);
  const [typed, setTyped] = useState("");
  const [fontIdx, setFontIdx] = useState(0);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [extracted, setExtracted] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [inkMode, setInkMode] = useState<InkMode>("original");
  const [clarity, setClarity] = useState<Clarity>("clear");
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

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    setSource(img);
  };

  // Re-extract the ink whenever the photo or settings change (live preview).
  useEffect(() => {
    if (!source) {
      setExtracted(null);
      return;
    }
    const t = setTimeout(() => setExtracted(extractSignature(source, sensitivity, inkMode, clarity)), 60);
    return () => clearTimeout(t);
  }, [source, sensitivity, inkMode, clarity]);

  const card = (
      <div
        className={inline ? "w-full rounded-3xl border border-line bg-surface p-5 shadow-card" : "fade-up w-full max-w-xl rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          {onClose && (
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
              <X className="h-5 w-5" />
            </button>
          )}
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
              {!source ? (
                <div className="flex flex-col gap-2">
                  <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white px-4 text-center text-sm text-zinc-500 hover:border-accent">
                    <Upload className="h-6 w-6" />
                    Choose a photo or scan of your signature on paper
                    <span className="text-xs text-zinc-400">Only the ink is kept — the paper is removed automatically</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface p-2.5 text-sm font-medium hover:bg-surface-2 sm:hidden">
                    <Camera className="h-4 w-4" /> Take a photo
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
                  </label>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                    <span>Your photo</span>
                    <span>Signature only</span>
                    <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl border border-line bg-white p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={source.src} alt="Original photo" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div
                      className="flex h-28 items-center justify-center overflow-hidden rounded-xl border border-accent p-1"
                      style={{ backgroundImage: "repeating-conic-gradient(#eef0f5 0 25%, #fff 0 50%)", backgroundSize: "14px 14px" }}
                    >
                      {extracted ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={extracted} alt="Extracted signature" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span>No ink found — raise sensitivity</span>
                      )}
                    </div>
                  </div>
                  <label className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 text-muted">Sensitivity</span>
                    <input type="range" min={0} max={1} step={0.05} value={sensitivity} onChange={(e) => setSensitivity(+e.target.value)} className="flex-1 accent-[var(--accent)]" />
                  </label>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 text-muted">Clarity</span>
                    <Segmented
                      value={clarity}
                      onChange={setClarity}
                      options={[
                        { value: "normal", label: "Normal" },
                        { value: "clear", label: "Clear" },
                        { value: "bold", label: "Bold" },
                      ]}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 text-muted">Ink colour</span>
                    <Segmented
                      value={inkMode}
                      onChange={setInkMode}
                      options={[
                        { value: "original", label: "Original" },
                        { value: "blue", label: "Blue" },
                        { value: "black", label: "Black" },
                      ]}
                    />
                  </div>
                  <button onClick={() => setSource(null)} className="self-start text-xs text-accent hover:underline">
                    Choose a different photo
                  </button>
                </>
              )}
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
              disabled={(tab === "draw" && !hasInk) || (tab === "type" && !typed.trim()) || (tab === "upload" && !extracted)}
              onClick={async () => {
                if (tab === "draw") finish(trimCanvas(canvasRef.current!));
                else if (tab === "type") finish(await fromTyped());
                else if (extracted) finish(extracted);
              }}
            >
              {doneLabel}
            </Button>
          </div>
        )}
      </div>
  );

  if (inline) return card;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      {card}
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
