"use client";

import { type ReactNode, useEffect, useState } from "react";
import { PageThumb } from "../PageThumb";
import { Button, ErrorNote, Field, Input, Panel, Select, SuccessNote, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName } from "@/lib/files";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

const UNITS = { mm: 72 / 25.4, in: 72, pt: 1 } as const;
type Unit = keyof typeof UNITS;

export default function Crop() {
  return <WithPdf>{(pdf, reset) => <CropInner pdf={pdf} reset={reset} />}</WithPdf>;
}

function CropInner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [unit, setUnit] = useState<Unit>("mm");
  const [m, setM] = useState({ top: 10, right: 10, bottom: 10, left: 10 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const previewW = 260;

  const save = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const doc = await loadPdfDoc(pdf.bytes, pdf.password);
      const k = UNITS[unit];
      for (const page of doc.getPages()) {
        const box = page.getCropBox();
        const w = box.width - (m.left + m.right) * k;
        const h = box.height - (m.top + m.bottom) * k;
        if (w < 10 || h < 10) throw new Error("The margins are larger than the page.");
        page.setCropBox(box.x + m.left * k, box.y + m.bottom * k, w, h);
        page.setMediaBox(box.x + m.left * k, box.y + m.bottom * k, w, h);
      }
      showResult(await savePdf(doc), `${baseName(pdf.file.name)}-cropped.pdf`);
      setDone("Your cropped PDF has been downloaded.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WithPreview pdf={pdf} reset={reset} previewW={previewW} margins={m} unit={unit}>
      <Panel title="Margins to remove">
        <div className="flex flex-col gap-4">
          <Field label="Unit">
            <Select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="mm">Millimetres</option>
              <option value="in">Inches</option>
              <option value="pt">Points</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {(["top", "bottom", "left", "right"] as const).map((side) => (
              <Field key={side} label={side[0].toUpperCase() + side.slice(1)}>
                <Input
                  type="number"
                  min={0}
                  step={unit === "in" ? 0.1 : 1}
                  value={m[side]}
                  onChange={(e) => setM({ ...m, [side]: Math.max(0, Number(e.target.value) || 0) })}
                />
              </Field>
            ))}
          </div>
          <Button variant="primary" size="lg" loading={busy} onClick={save}>
            Crop PDF
          </Button>
          <ErrorNote>{error}</ErrorNote>
          <SuccessNote>{done}</SuccessNote>
        </div>
      </Panel>
    </WithPreview>
  );
}

function WithPreview({
  pdf,
  reset,
  previewW,
  margins,
  unit,
  children,
}: {
  pdf: LoadedPdf;
  reset: () => void;
  previewW: number;
  margins: { top: number; right: number; bottom: number; left: number };
  unit: Unit;
  children: ReactNode;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    let live = true;
    void pdf.doc.getPage(1).then((p) => {
      const vp = p.getViewport({ scale: 1 });
      if (live) setSize({ w: vp.width, h: vp.height });
    });
    return () => {
      live = false;
    };
  }, [pdf.doc]);
  const s = size ? previewW / size.w : 0;
  const k = UNITS[unit] * s;

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset} />
      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <Panel className="checker flex items-center justify-center">
          <div className="relative overflow-hidden rounded-md">
            <PageThumb doc={pdf.doc} pageIndex={0} width={previewW} />
            {size && (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                style={{
                  top: margins.top * k,
                  left: margins.left * k,
                  right: margins.right * k,
                  bottom: margins.bottom * k,
                }}
              />
            )}
          </div>
        </Panel>
        {children}
      </div>
    </div>
  );
}
