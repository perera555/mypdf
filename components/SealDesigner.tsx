"use client";

import { Download, FolderHeart, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Field, Input, Segmented, Select } from "./ui";
import { canvasToBlob, downloadBlob, loadImage } from "@/lib/files";
import { DEFAULT_SEAL, drawSeal, type Emblem, loadSeals, removeSeal, type SealOptions, storeSeal } from "@/lib/seal";

const INKS = ["#1d4ed8", "#b91c1c", "#15803d", "#7c3aed", "#111827", "#0e7490"];

const TEMPLATES: { label: string; o: Partial<SealOptions> }[] = [
  // Paid stamps
  { label: "Paid", o: { shape: "rectangle", font: "sans", topText: "", bottomText: "", centerText: "PAID", emblem: "none", border: "double", color: "#dc2626", grunge: true, dateLine: true } },
  { label: "Paid · modern", o: { shape: "circle", font: "sans", topText: "THANK YOU FOR YOUR PAYMENT", bottomText: "", centerText: "PAID", emblem: "check", border: "single", band: true, color: "#16a34a", dateLine: true } },
  { label: "Paid · solid", o: { shape: "rectangle", font: "sans", topText: "", bottomText: "", centerText: "PAID IN FULL", emblem: "none", border: "single", solid: true, color: "#dc2626", dateLine: true } },
  { label: "Paid · bank", o: { shape: "oval", font: "serif", topText: "YOUR BANK / CASHIER", bottomText: "", centerText: "PAID", regLabel: "Ref.", regNo: "000000", emblem: "none", border: "double", color: "#1e3a8a", dateLine: true } },
  // Modern
  { label: "Modern", o: { shape: "circle", font: "sans", topText: "YOUR COMPANY", bottomText: "SINCE 2024", centerText: "VERIFIED", regLabel: "Reg. No.", regNo: "PV 00000", emblem: "none", border: "single", band: true, color: "#0f172a" } },
  { label: "Corporate ribbon", o: { shape: "circle", font: "sans", topText: "YOUR COMPANY (PVT) LTD", bottomText: "COLOMBO • SRI LANKA", centerText: "DIRECTOR", regLabel: "Reg. No.", regNo: "PV 00000", emblem: "star", border: "dotted", band: true, color: "#1d4ed8" } },
  { label: "Verified badge", o: { shape: "badge", font: "sans", topText: "OFFICIALLY VERIFIED", bottomText: "AUTHENTIC", centerText: "VERIFIED", emblem: "check", border: "single", solid: true, color: "#0284c7" } },
  { label: "Gold certificate", o: { shape: "badge", font: "serif", topText: "CERTIFIED EXCELLENCE", bottomText: "AWARD OF MERIT", centerText: "2026", emblem: "stars", border: "single", solid: true, metallic: true, color: "#b8860b" } },
  { label: "Premium", o: { shape: "badge", font: "serif", topText: "PREMIUM QUALITY", bottomText: "GUARANTEED", centerText: "BEST", emblem: "star", border: "dotted", metallic: true, color: "#7c3aed" } },
  { label: "Solid badge", o: { shape: "circle", font: "sans", topText: "QUALITY ASSURED", bottomText: "100% GENUINE", centerText: "CERTIFIED", emblem: "check", border: "double", solid: true, color: "#047857" } },
  { label: "Minimal", o: { shape: "circle", font: "sans", topText: "YOUR BRAND", bottomText: "", centerText: "OFFICIAL", emblem: "none", border: "single", color: "#111827" } },
  { label: "Eco", o: { shape: "circle", font: "sans", topText: "100% NATURAL", bottomText: "ECO FRIENDLY", centerText: "ORGANIC", emblem: "flower", border: "dotted", band: true, color: "#15803d" } },
  // Office
  { label: "Approved", o: { shape: "rectangle", topText: "", bottomText: "", centerText: "APPROVED", emblem: "check", border: "double", color: "#15803d", dateLine: true } },
  { label: "Received", o: { shape: "oval", topText: "YOUR OFFICE", bottomText: "", centerText: "RECEIVED", emblem: "none", border: "double", color: "#b91c1c", dateLine: true } },
  { label: "Confidential", o: { shape: "rectangle", font: "sans", topText: "", bottomText: "", centerText: "CONFIDENTIAL", emblem: "none", border: "double", color: "#b91c1c", grunge: true } },
  { label: "Urgent", o: { shape: "rectangle", font: "sans", topText: "", bottomText: "", centerText: "URGENT", emblem: "none", border: "single", solid: true, color: "#ea580c" } },
  { label: "Original", o: { shape: "oval", font: "sans", topText: "", bottomText: "", centerText: "ORIGINAL", emblem: "none", border: "double", band: true, color: "#1d4ed8" } },
  { label: "Cancelled", o: { shape: "rectangle", font: "sans", topText: "", bottomText: "", centerText: "CANCELLED", emblem: "none", border: "single", color: "#6b7280", grunge: true, dateLine: true } },
  // Company
  { label: "Company signatory", o: { shape: "company", font: "sans", topText: "YOUR COMPANY (PVT) LTD", address: "No. 12, Main Street, Colombo 03", phone: "011 234 5678", regLabel: "Reg. No.", regNo: "PV 00000", centerText: "For and on behalf of", personName: "Your Name", designation: "Managing Director", emblem: "none", border: "double", color: "#1d4ed8" } },
  { label: "Company address", o: { shape: "company", font: "serif", topText: "YOUR COMPANY (PVT) LTD", address: "No. 12, Main Street, Colombo 03, Sri Lanka", phone: "011 234 5678", regLabel: "Reg. No.", regNo: "PV 00000", centerText: "", emblem: "none", border: "single", color: "#111827" } },
  { label: "Director seal", o: { shape: "circle", font: "serif", topText: "YOUR COMPANY (PVT) LTD", bottomText: "COLOMBO • SRI LANKA", centerText: "", personName: "YOUR NAME", designation: "DIRECTOR", regLabel: "Reg. No.", regNo: "PV 00000", emblem: "star", border: "double", color: "#1e3a8a" } },
  { label: "Modern company", o: { shape: "circle", font: "sans", topText: "YOUR COMPANY", bottomText: "", centerText: "", personName: "YOUR NAME", designation: "CEO", phone: "077 123 4567", emblem: "none", border: "single", band: true, color: "#0f766e" } },
  // School
  { label: "Class teacher", o: { shape: "circle", font: "serif", topText: "YOUR SCHOOL NAME", bottomText: "COLOMBO", centerText: "CLASS TEACHER", extraText: "GRADE 10 - A", emblem: "star", border: "double", color: "#1d4ed8" } },
  { label: "Grade / class", o: { shape: "rectangle", font: "sans", topText: "YOUR SCHOOL NAME", bottomText: "", centerText: "GRADE 6 - B", extraText: "Class No. 12", emblem: "none", border: "double", band: true, color: "#7c3aed" } },
  { label: "Principal", o: { shape: "circle", font: "serif", topText: "YOUR SCHOOL NAME", bottomText: "EST. 1990", centerText: "PRINCIPAL", extraText: "School No. 0000", emblem: "flower", border: "rope", color: "#15803d" } },
  { label: "Examination", o: { shape: "oval", font: "sans", topText: "YOUR SCHOOL NAME", bottomText: "", centerText: "EXAMINATION", extraText: "Index No. ______", emblem: "none", border: "double", color: "#b91c1c", dateLine: true } },
  // Classic
  { label: "Company", o: { shape: "circle", font: "sans", topText: "YOUR COMPANY", bottomText: "SINCE 2024", centerText: "VERIFIED", regLabel: "Reg. No.", regNo: "PV 00000", emblem: "none", border: "single", band: true, color: "#0f172a" } },
  { label: "✨ Corporate ribbon", o: { shape: "circle", font: "sans", topText: "YOUR COMPANY (PVT) LTD", bottomText: "COLOMBO • SRI LANKA", centerText: "DIRECTOR", regLabel: "Reg. No.", regNo: "PV 00000", emblem: "star", border: "dotted", band: true, color: "#1d4ed8" } },
  { label: "✨ Gold certificate", o: { shape: "badge", font: "serif", topText: "CERTIFIED EXCELLENCE", bottomText: "AWARD OF MERIT", centerText: "2026", emblem: "stars", border: "single", solid: true, metallic: true, color: "#b8860b" } },
  { label: "✨ Minimal", o: { shape: "circle", font: "sans", topText: "YOUR BRAND", bottomText: "", centerText: "OFFICIAL", emblem: "none", border: "single", color: "#111827" } },
  { label: "✨ Solid badge", o: { shape: "circle", font: "sans", topText: "QUALITY ASSURED", bottomText: "100% GENUINE", centerText: "CERTIFIED", emblem: "check", border: "double", solid: true, color: "#047857" } },
  { label: "Company", o: { shape: "circle", topText: "YOUR COMPANY (PVT) LTD", bottomText: "COLOMBO • SRI LANKA", centerText: "DIRECTOR", regLabel: "Reg. No.", regNo: "PV 00000", emblem: "star", border: "double", color: "#1d4ed8" } },
  { label: "Approved", o: { shape: "rectangle", topText: "", bottomText: "", centerText: "APPROVED", emblem: "check", border: "double", color: "#15803d", dateLine: true } },
  { label: "Notary", o: { shape: "circle", topText: "NOTARY PUBLIC", bottomText: "COMMISSIONER FOR OATHS", centerText: "YOUR NAME", emblem: "stars", border: "rope", color: "#111827" } },
  { label: "School", o: { shape: "circle", topText: "YOUR SCHOOL NAME", bottomText: "EST. 1990", centerText: "PRINCIPAL", emblem: "flower", border: "dotted", color: "#7c3aed" } },
  { label: "Notary gold", o: { shape: "circle", font: "serif", topText: "NOTARY PUBLIC", bottomText: "SRI LANKA", centerText: "YOUR NAME", emblem: "stars", border: "rope", metallic: true, color: "#b8860b" } },
];

/** Index ranges into TEMPLATES for each section of the design list. */
const GROUPS = [
  { name: "Paid stamps", from: 0, to: 4 },
  { name: "Modern seals & badges", from: 4, to: 12 },
  { name: "Office stamps", from: 12, to: 18 },
  { name: "Company stamps — name, designation, address & phone", from: 18, to: 22 },
  { name: "School & class seals", from: 22, to: 26 },
  { name: "Classic seals", from: 26, to: 99 },
];

export function SealDesigner({ onUse, useLabel = "Use this seal" }: { onUse?: (dataUrl: string) => void; useLabel?: string }) {
  const [o, setO] = useState<SealOptions>(DEFAULT_SEAL);
  const [saved, setSaved] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [thumbs, setThumbs] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => setSaved(loadSeals()), []);
  // Thumbnail gallery of every template
  useEffect(() => {
    setThumbs(
      TEMPLATES.map((t) => {
        const c = document.createElement("canvas");
        drawSeal(c, { ...DEFAULT_SEAL, ...t.o }, 220);
        return c.toDataURL("image/png");
      }),
    );
  }, []);
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-2/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Design list · {TEMPLATES.length} designs</p>
            <p className="text-xs text-muted">Pick one, then change any text or colour</p>
          </div>
          {GROUPS.map((g) => (
          <div key={g.name}>
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{g.name}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {TEMPLATES.map((t, i) => i < g.from || i >= g.to ? null : (
              <button
                key={t.label}
                onClick={() => {
                  setO({ ...DEFAULT_SEAL, ...t.o, logo: o.logo });
                  setActive(t.label);
                }}
                aria-pressed={active === t.label}
                className={`flex flex-col items-center gap-1 rounded-xl border bg-white p-2 transition hover:-translate-y-0.5 hover:shadow-md ${
                  active === t.label ? "border-accent ring-2 ring-[var(--ring)]" : "border-line"
                }`}
              >
                <span className="flex h-16 w-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumbs[i] && <img src={thumbs[i]} alt="" className="max-h-full max-w-full object-contain" />}
                </span>
                <span className="w-full truncate text-center text-[10px] font-medium text-zinc-600">{t.label}</span>
              </button>
            ))}
          </div>
          </div>
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
              { value: "company", label: "Company" },
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
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2/50 p-3">
          <p className="text-sm font-semibold">Company details</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={o.personName} maxLength={40} placeholder="e.g. D. Perera" onChange={(e) => set({ personName: e.target.value })} />
            </Field>
            <Field label="Designation">
              <Input value={o.designation} maxLength={40} placeholder="e.g. Director" onChange={(e) => set({ designation: e.target.value })} />
            </Field>
          </div>
          <Field label="Address">
            <Input value={o.address} maxLength={80} placeholder="e.g. No. 12, Main Street, Colombo 03" onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <Field label="Phone number">
            <Input value={o.phone} maxLength={30} inputMode="tel" placeholder="e.g. 011 234 5678" onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <p className="text-xs text-muted">Tip: the <b>Company</b> shape lays these out as a classic company rubber stamp with a signature line.</p>
        </div>
        <Field label="Extra line (optional)" hint="Any other number or text — Tel. No., Serial No., Index No., Class No., address…">
          <Input value={o.extraText} maxLength={40} placeholder="e.g. Tel. 011 234 5678" onChange={(e) => set({ extraText: e.target.value })} />
        </Field>
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
          <input type="checkbox" checked={o.dateLine} onChange={(e) => set({ dateLine: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" /> Add a date
        </label>
        {o.dateLine && (
          <div className="flex items-center gap-2 pl-6">
            <Input type="date" value={o.dateValue} onChange={(e) => set({ dateValue: e.target.value })} className="h-9" aria-label="Seal date" />
            <Button size="sm" variant="ghost" onClick={() => set({ dateValue: "" })} disabled={!o.dateValue}>
              Today
            </Button>
          </div>
        )}
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
