"use client";

import { degrees, rgb, StandardFonts } from "@cantoo/pdf-lib";
import { useState } from "react";
import { PageThumb } from "../PageThumb";
import { Button, ErrorNote, Field, Input, Panel, Select, SuccessNote, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName, hexToRgb01 } from "@/lib/files";
import { visualFrame } from "@/lib/geometry";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

type V = "top" | "bottom";
type H = "left" | "center" | "right";

const FORMATS = {
  n: (n: number) => `${n}`,
  page: (n: number) => `Page ${n}`,
  pageOf: (n: number, t: number) => `Page ${n} of ${t}`,
  slash: (n: number, t: number) => `${n} / ${t}`,
  dash: (n: number) => `- ${n} -`,
} as const;

export default function PageNumbers() {
  return <WithPdf>{(pdf, reset) => <Inner pdf={pdf} reset={reset} />}</WithPdf>;
}

function Inner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [v, setV] = useState<V>("bottom");
  const [h, setH] = useState<H>("center");
  const [format, setFormat] = useState<keyof typeof FORMATS>("pageOf");
  const [size, setSize] = useState(11);
  const [margin, setMargin] = useState(28);
  const [start, setStart] = useState(1);
  const [skipFirst, setSkipFirst] = useState(false);
  const [color, setColor] = useState("#333333");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const doc = await loadPdfDoc(pdf.bytes, pdf.password);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const numbered = skipFirst ? pages.length - 1 : pages.length;
      const total = numbered + start - 1;
      const [r, g, b] = hexToRgb01(color);
      pages.forEach((page, i) => {
        if (skipFirst && i === 0) return;
        const n = start + (skipFirst ? i - 1 : i);
        const text = FORMATS[format](n, total);
        const tw = font.widthOfTextAtSize(text, size);
        const f = visualFrame(page);
        const vx = h === "left" ? margin : h === "right" ? f.width - margin - tw : (f.width - tw) / 2;
        const vy = v === "bottom" ? margin : f.height - margin - size;
        const p = f.toPage(vx, vy);
        page.drawText(text, { x: p.x, y: p.y, size, font, color: rgb(r, g, b), rotate: degrees(f.rotation) });
      });
      showResult(await savePdf(doc), `${baseName(pdf.file.name)}-numbered.pdf`);
      setDone("Page numbers added — your PDF has been downloaded.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const positions: [V, H][] = [
    ["top", "left"],
    ["top", "center"],
    ["top", "right"],
    ["bottom", "left"],
    ["bottom", "center"],
    ["bottom", "right"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset} />
      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <Panel className="checker flex items-center justify-center">
          <div className="relative">
            <PageThumb doc={pdf.doc} pageIndex={0} width={280} />
            <span
              className="absolute rounded bg-accent/15 px-1 text-[10px] font-medium text-accent"
              style={{
                [v]: 10,
                ...(h === "center" ? { left: "50%", transform: "translateX(-50%)" } : { [h]: 10 }),
              }}
            >
              {FORMATS[format](skipFirst ? start : start, pdf.pageCount)}
            </span>
          </div>
        </Panel>
        <Panel title="Options">
          <div className="flex flex-col gap-4">
            <Field label="Position">
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-surface-2 p-1.5">
                {positions.map(([pv, ph]) => (
                  <button
                    key={pv + ph}
                    type="button"
                    aria-label={`${pv} ${ph}`}
                    onClick={() => {
                      setV(pv);
                      setH(ph);
                    }}
                    className={`h-8 rounded-lg text-xs capitalize transition ${v === pv && h === ph ? "bg-accent text-white" : "bg-surface text-muted hover:text-fg"}`}
                  >
                    {pv[0]}-{ph}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Format">
              <Select value={format} onChange={(e) => setFormat(e.target.value as keyof typeof FORMATS)}>
                <option value="n">1</option>
                <option value="page">Page 1</option>
                <option value="pageOf">Page 1 of N</option>
                <option value="slash">1 / N</option>
                <option value="dash">- 1 -</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Font size">
                <Input type="number" min={6} max={48} value={size} onChange={(e) => setSize(Number(e.target.value) || 11)} />
              </Field>
              <Field label="Margin (pt)">
                <Input type="number" min={0} max={200} value={margin} onChange={(e) => setMargin(Number(e.target.value) || 0)} />
              </Field>
              <Field label="Start at">
                <Input type="number" min={0} value={start} onChange={(e) => setStart(Number(e.target.value) || 1)} />
              </Field>
              <Field label="Color">
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="p-1" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={skipFirst} onChange={(e) => setSkipFirst(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Don’t number the first page (cover)
            </label>
            <Button variant="primary" size="lg" loading={busy} onClick={save}>
              Add page numbers
            </Button>
            <ErrorNote>{error}</ErrorNote>
            <SuccessNote>{done}</SuccessNote>
          </div>
        </Panel>
      </div>
    </div>
  );
}
