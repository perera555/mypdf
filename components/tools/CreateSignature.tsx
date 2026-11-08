"use client";

import { Check, Download, FileSignature, FolderHeart, PenLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SignatureDialog, rememberSignature } from "../SignatureDialog";
import { Button, Input, Panel, Segmented } from "../ui";
import { canvasToBlob, downloadBlob } from "@/lib/files";
import { type Flourish, INKS, inkCss, initialsOf, renderSignature, type SignatureOptions } from "@/lib/signature-render";
import { SIGNATURE_STYLES } from "@/lib/signature-styles";

const CHECKER = { backgroundImage: "repeating-conic-gradient(#f1f3f9 0 25%, #fff 0 50%)", backgroundSize: "16px 16px" };

export default function CreateSignature() {
  const [mode, setMode] = useState<"styles" | "draw">("styles");
  const [name, setName] = useState("Your Name");
  const [styleId, setStyleId] = useState(SIGNATURE_STYLES[0].id);
  const [inkId, setInkId] = useState("navy");
  const [custom, setCustom] = useState("#0f172a");
  const [slant, setSlant] = useState(0);
  const [weight, setWeight] = useState(0);
  const [flourish, setFlourish] = useState<Flourish>("swoosh");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [fontsReady, setFontsReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [drawn, setDrawn] = useState<string | null>(null);

  const colors = inkId === "custom" ? [custom] : INKS.find((i) => i.id === inkId)!.colors;
  const style = SIGNATURE_STYLES.find((s) => s.id === styleId)!;
  const opts = (text: string, s = style): SignatureOptions => ({ text, family: s.family, scale: s.scale, colors, slant, weight, flourish });

  // Load every handwriting font once, then draw previews.
  useEffect(() => {
    Promise.all(SIGNATURE_STYLES.map((s) => document.fonts.load(`60px ${s.family}`, name || "Aa"))).finally(() => setFontsReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = `${name}|${inkId}|${custom}|${slant}|${weight}|${flourish}|${fontsReady}`;
  useEffect(() => {
    if (!fontsReady) return;
    const t = setTimeout(() => {
      const next: Record<string, string> = {};
      for (const s of SIGNATURE_STYLES) {
        const c = renderSignature({ text: name, family: s.family, scale: s.scale, colors, slant, weight, flourish: flourish === "none" ? "none" : flourish }, 0.6);
        if (c) next[s.id] = c.toDataURL("image/png");
      }
      setPreviews(next);
      setSaved(false);
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const main = previews[styleId];
  const initialsPreview = useMemo(() => {
    if (!fontsReady || !name.trim()) return null;
    return renderSignature({ ...opts(initialsOf(name)), flourish: "none" }, 0.6)?.toDataURL("image/png") ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, styleId]);

  const fileBase = (name.trim() || "signature").replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").toLowerCase();

  const download = async (what: "png" | "jpg" | "initials") => {
    const c = renderSignature(what === "initials" ? { ...opts(initialsOf(name)), flourish: "none" } : opts(name), 3);
    if (!c) return;
    if (what === "jpg") {
      const bg = document.createElement("canvas");
      bg.width = c.width + 80;
      bg.height = c.height + 80;
      const ctx = bg.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, bg.width, bg.height);
      ctx.drawImage(c, 40, 40);
      downloadBlob(await canvasToBlob(bg, "image/jpeg", 0.95), `${fileBase}-signature.jpg`, "image/jpeg");
    } else {
      downloadBlob(await canvasToBlob(c, "image/png"), `${fileBase}-${what === "initials" ? "initials" : "signature"}.png`, "image/png");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "styles", label: <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Signature styles</span> },
          { value: "draw", label: <span className="inline-flex items-center gap-1.5"><PenLine className="h-4 w-4" /> Draw or upload</span> },
        ]}
      />

      {mode === "draw" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <SignatureDialog inline title="Draw, type or upload your signature" doneLabel="Create signature" onDone={setDrawn} />
          <Panel title="Your signature">
            {drawn ? (
              <div className="flex flex-col gap-3">
                <div className="flex h-40 items-center justify-center rounded-xl border border-line p-3" style={CHECKER}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={drawn} alt="Your signature" className="max-h-full max-w-full object-contain" />
                </div>
                <Button variant="primary" onClick={async () => downloadBlob(await (await fetch(drawn)).blob(), "my-signature.png", "image/png")}>
                  <Download className="h-4 w-4" /> Download PNG
                </Button>
                <Link href="/tools/sign" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium hover:bg-surface-2">
                  <FileSignature className="h-4 w-4" /> Sign a PDF with it
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted">Draw it with your mouse or finger, or upload a photo of your signature on paper — only the handwriting is kept.</p>
            )}
          </Panel>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-5">
            <Panel>
              <div className="flex flex-col gap-5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Your name</span>
                  <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Type your full name" className="h-12 text-lg" />
                </label>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Ink colour</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {INKS.map((ink) => (
                      <button
                        key={ink.id}
                        title={ink.label}
                        aria-label={ink.label}
                        aria-pressed={inkId === ink.id}
                        onClick={() => setInkId(ink.id)}
                        className={`h-8 w-8 rounded-full shadow-sm ring-offset-2 ring-offset-[var(--surface)] transition hover:scale-110 ${inkId === ink.id ? "ring-2 ring-accent" : ""}`}
                        style={{ background: inkCss(ink.colors) }}
                      />
                    ))}
                    <label
                      title="Custom colour"
                      className={`relative h-8 w-8 cursor-pointer overflow-hidden rounded-full shadow-sm ring-offset-2 ring-offset-[var(--surface)] ${inkId === "custom" ? "ring-2 ring-accent" : ""}`}
                      style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
                    >
                      <input
                        type="color"
                        aria-label="Custom colour"
                        value={custom}
                        onChange={(e) => {
                          setCustom(e.target.value);
                          setInkId("custom");
                        }}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted">{inkId === "custom" ? "Custom colour" : INKS.find((i) => i.id === inkId)?.label}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Slant {slant > 0 ? `+${slant}` : slant}°</span>
                    <input type="range" min={-12} max={20} value={slant} onChange={(e) => setSlant(+e.target.value)} className="accent-[var(--accent)]" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Thickness</span>
                    <input type="range" min={0} max={3} step={0.5} value={weight} onChange={(e) => setWeight(+e.target.value)} className="accent-[var(--accent)]" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Flourish</span>
                    <select value={flourish} onChange={(e) => setFlourish(e.target.value as Flourish)} className="h-9 rounded-xl border border-line bg-surface px-2 text-sm">
                      <option value="none">None</option>
                      <option value="underline">Underline</option>
                      <option value="swoosh">Swoosh</option>
                      <option value="double">Double line</option>
                      <option value="loop">Loop</option>
                    </select>
                  </label>
                </div>
              </div>
            </Panel>

            <div>
              <p className="mb-3 text-sm font-medium">Choose a style ({SIGNATURE_STYLES.length})</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {SIGNATURE_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyleId(s.id)}
                    aria-pressed={styleId === s.id}
                    className={`group relative flex h-28 flex-col rounded-2xl border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                      styleId === s.id ? "border-accent ring-2 ring-[var(--ring)]" : "border-line"
                    }`}
                  >
                    <span className="flex min-h-0 flex-1 items-center justify-center">
                      {previews[s.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previews[s.id]} alt={`${s.label} style`} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="h-6 w-3/4 animate-pulse rounded bg-zinc-100" />
                      )}
                    </span>
                    <span className="mt-1 text-[11px] font-medium text-zinc-500">{s.label}</span>
                    {styleId === s.id && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="xl:sticky xl:top-20 xl:self-start">
            <Panel title="Your signature">
              <div className="flex flex-col gap-4">
                <div className="flex h-44 items-center justify-center rounded-2xl border border-line p-4" style={CHECKER}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {main ? <img src={main} alt="Selected signature" className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-zinc-400">Type your name</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-24 items-center justify-center rounded-xl border border-line p-2" style={CHECKER}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {initialsPreview && <img src={initialsPreview} alt="Initials" className="max-h-full max-w-full object-contain" />}
                  </div>
                  <p className="text-xs text-muted">
                    Initials <b className="text-fg">{initialsOf(name)}</b> in the same style
                  </p>
                </div>
                <Button variant="primary" size="lg" disabled={!main} onClick={() => download("png")}>
                  <Download className="h-4 w-4" /> Download PNG (transparent)
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button disabled={!main} onClick={() => download("jpg")}>
                    JPG (white)
                  </Button>
                  <Button disabled={!initialsPreview} onClick={() => download("initials")}>
                    Initials PNG
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  disabled={!main || saved}
                  onClick={() => {
                    const c = renderSignature(opts(name), 2);
                    if (c) {
                      rememberSignature(c.toDataURL("image/png"));
                      setSaved(true);
                    }
                  }}
                >
                  {saved ? <Check className="h-4 w-4" /> : <FolderHeart className="h-4 w-4" />} {saved ? "Saved — find it under “Saved” in Fill & Sign" : "Save for signing PDFs"}
                </Button>
                <Link href="/tools/sign" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium text-accent hover:bg-surface-2">
                  <FileSignature className="h-4 w-4" /> Sign a PDF now
                </Link>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
