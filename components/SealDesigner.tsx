"use client";

import { Download, FolderHeart, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Field, Input, Segmented, Select } from "./ui";
import { canvasToBlob, downloadBlob, loadImage } from "@/lib/files";
import { DEFAULT_SEAL, drawSeal, type Emblem, loadSeals, removeSeal, type SealOptions, storeSeal } from "@/lib/seal";

const INKS = ["#1d4ed8", "#b91c1c", "#15803d", "#7c3aed", "#111827", "#0e7490"];

const TEMPLATES: { label: string; o: Partial<SealOptions> }[] = [
  { label: "✨ Modern", o: { shape: "circle", font: "sans", topText: "YOUR COMPANY", bottomText: "SINCE 2024", centerText: "VERIFIED", regLabel: "Reg. No.", regNo: "PV 00000", emblem: "none", border: "single", band: true, color: "#0f172a" } },
  { label: "✨ Corporate ribbon", o: { shape: "circle", font: "sans", topText: "YOUR COMPANY (PVT) LTD", bottomText: "COLOMBO • SRI LANKA", centerText: "DIRECTOR", regLabel: "Reg. No.", regNo: "PV 00000", emblem: "star", border: "dotted", band: true, color: "#1d4ed8" } },
  { label: "✨ Gold certificate", o: { shape: "badge", font: "serif", topText: "CERTIFIED EXCELLENCE", bottomText: "AWARD OF MERIT", centerText: "2026", emblem: "stars", border: "single", solid: true, metallic: true, color: "#b8860b" } },
  { label: "✨ Minimal", o: { shape: "circle", font: "sans", topText: "YOUR BRAND", bottomText: "", centerText: "OFFICIAL", emblem: "none", border: "single", color: "#111827" } },
  { label: "✨ Solid badge", o: { shape: "circle", font: "sans", topText: "QUALITY ASSURED", bottomText: "100% GENUINE", centerText: "CERTIFIED", emblem: "check", border: "double", solid: true, color: "#047857" } },
  { label: "Company", o: { shape: "circle", topText: "YOUR COMPANY (PVT) LTD", bottomText: "COLOMBO • SRI LANKA", centerText: "DIRECTOR", regLabel: "Reg. No.", regNo: "PV 00000", emblem: "star", border: "double", color: "#1d4ed8" } },
  { label: "Approved", o: { shape: "rectangle", topText: "", bottomText: "", centerText: "APPROVED", emblem: "check", border: "double", color: "#15803d", dateLine: true } },
  { label: "Notary", o: { shape: "circle", topText: "NOTARY PUBLIC", bottomText: "COMMISSIONER FOR OATHS", centerText: "YOUR NAME", emblem: "stars", border: "rope", color: "#111827" } },
  { label: "School", o: { shape: "circle", topText: "YOUR SCHOOL NAME", bottomText: "EST. 1990", centerText: "PRINCIPAL", emblem: "flower", border: "dotted", color: "#7c3aed" } },
  { label: "Received", o: { shape: "oval", topText: "YOUR OFFICE", bottomText: "", centerText: "RECEIVED", emblem: "none", border: "double", color: "#b91c1c", dateLine: true } },
  { label: "Paid", o: { shape: "square", topText: "", bottomText: "", centerText: "PAID", emblem: "none", border: "single", color: "#b91c1c", grunge: true } },
];

export function SealDesigner({ onUse, useLabel = "Use this seal" }: { onUse?: (dataUrl: string) => void; useLabel?: string }) {
  const [o, setO] = useState<SealOptions>(DEFAULT_SEAL);
  const [saved, setSaved] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => setSaved(loadSeals()), []);
  useEffect(() => {
    if (canvasRef.current) drawSeal(canvasRef.current, o, 800);
  }, [o]);

  const set = (patch: Partial<SealOptions>) => setO((s) => ({ ...s, ...patch }));
  const export_ = async () => {
    const c = document.createElement("canvas");
    drawSeal(c, o, 1000);
    return c;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button key={t.label} onClick={() => setO({ ...DEFAULT_SEAL, ...t.o, logo: o.logo })} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-fg">
              {t.label}
            </button>
          ))}
        </div>
        <div
          className="flex items-center justify-center rounded-2xl border border-line p-6"
          style={{ backgroundImage: "repeating-conic-gradient(#f1f3f9 0 25%, #fff 0 50%)", backgroundSize: "20px 20px" }}
        >
          <canvas ref={canvasRef} className="h-auto max-h-[460px] w-full max-w-[460px] object-contain" />
        </div>
        <div className="flex flex-wrap gap-2">
          {onUse && (
            <Button
              variant="primary"
              onClick={async () => {
                const url = (await export_()).toDataURL("image/png");
                setSaved(storeSeal(url));
                onUse(url);
              }}
            >
              {useLabel}
            </Button>
          )}
          <Button
            variant={onUse ? "secondary" : "primary"}
            onClick={async () => downloadBlob(await canvasToBlob(await export_(), "image/png"), "seal.png", "image/png")}
          >
            <Download className="h-4 w-4" /> Download PNG
          </Button>
          <Button onClick={async () => setSaved(storeSeal((await export_()).toDataURL("image/png")))}>
            <FolderHeart className="h-4 w-4" /> Save for signing PDFs
          </Button>
        </div>
        {saved.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Saved seals</p>
            <div className="flex flex-wrap gap-3">
              {saved.map((s) => (
                <div key={s} className="group relative">
                  <button
                    onClick={() => onUse?.(s)}
                    disabled={!onUse}
                    className="flex h-20 w-20 items-center justify-center rounded-xl border border-line bg-white p-1.5 enabled:hover:border-accent"
                    title={onUse ? "Use this seal" : "Saved seal"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s} alt="Saved seal" className="max-h-full max-w-full" />
                  </button>
                  <button aria-label="Delete saved seal" onClick={() => setSaved(removeSeal(s))} className="absolute -top-1.5 -right-1.5 rounded-full bg-surface p-1 text-muted opacity-0 shadow group-hover:opacity-100 hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Field label="Shape">
          <Segmented
            value={o.shape}
            onChange={(shape) => set({ shape })}
            options={[
              { value: "circle", label: "Round" },
              { value: "badge", label: "Badge" },
              { value: "oval", label: "Oval" },
              { value: "square", label: "Square" },
              { value: "rectangle", label: "Rect" },
            ]}
          />
        </Field>
        <Field label="Top text">
          <Input value={o.topText} maxLength={48} onChange={(e) => set({ topText: e.target.value })} />
        </Field>
        <Field label="Bottom text">
          <Input value={o.bottomText} maxLength={48} onChange={(e) => set({ bottomText: e.target.value })} />
        </Field>
        <Field label="Centre text" hint="Press Enter for a new line">
          <textarea value={o.centerText} rows={2} onChange={(e) => set({ centerText: e.target.value })} className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-accent" />
        </Field>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Number label">
            <Input value={o.regLabel} maxLength={20} placeholder="Reg. No." onChange={(e) => set({ regLabel: e.target.value })} />
          </Field>
          <Field label="Company registration number">
            <Input value={o.regNo} maxLength={32} placeholder="e.g. PV 123456" onChange={(e) => set({ regNo: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Emblem">
            <Select value={o.emblem} onChange={(e) => set({ emblem: e.target.value as Emblem })}>
              <option value="none">None</option>
              <option value="star">Star</option>
              <option value="stars">Three stars</option>
              <option value="check">Tick</option>
              <option value="flower">Flower</option>
              <option value="logo">My logo</option>
            </Select>
          </Field>
          <Field label="Border">
            <Select value={o.border} onChange={(e) => set({ border: e.target.value as SealOptions["border"] })}>
              <option value="double">Double</option>
              <option value="single">Single</option>
              <option value="dotted">Dotted</option>
              <option value="rope">Rope</option>
            </Select>
          </Field>
          <Field label="Font">
            <Select value={o.font} onChange={(e) => set({ font: e.target.value as SealOptions["font"] })}>
              <option value="serif">Classic serif</option>
              <option value="sans">Modern sans</option>
            </Select>
          </Field>
          <Field label={`Text size ${Math.round(o.textScale * 100)}%`}>
            <input type="range" min={0.7} max={1.4} step={0.05} value={o.textScale} onChange={(e) => set({ textScale: +e.target.value })} className="mt-3 accent-[var(--accent)]" />
          </Field>
        </div>
        {o.emblem === "logo" && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line p-3 text-sm text-muted hover:border-accent">
            <Upload className="h-4 w-4" /> {o.logo ? "Change logo" : "Upload logo (PNG with transparent background works best)"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) set({ logo: await loadImage(URL.createObjectURL(f)) });
              }}
            />
          </label>
        )}
        <Field label="Ink colour">
          <div className="flex items-center gap-2">
            {INKS.map((c) => (
              <button key={c} aria-label={`Ink ${c}`} onClick={() => set({ color: c })} className={`h-8 w-8 rounded-full ${o.color === c ? "ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)]" : ""}`} style={{ background: c }} />
            ))}
            <input type="color" aria-label="Custom ink colour" value={o.color} onChange={(e) => set({ color: e.target.value })} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" />
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={o.dateLine} onChange={(e) => set({ dateLine: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" /> Add today’s date
        </label>
        <Field label="Style">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["band", "Ribbon band"],
                ["solid", "Solid fill"],
                ["metallic", "Metallic foil"],
                ["grunge", "Rubber-stamp ink"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => set({ [k]: !o[k] })}
                aria-pressed={o[k]}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${o[k] ? "border-accent bg-accent/10 font-medium text-accent" : "border-line text-muted hover:text-fg"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}
