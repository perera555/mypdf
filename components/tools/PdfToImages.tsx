"use client";

import JSZip from "jszip";
import { useState } from "react";
import { PageThumb } from "../PageThumb";
import { Button, ErrorNote, Field, Panel, Segmented, Select, SuccessNote, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName, canvasToBlob, downloadBlob } from "@/lib/files";
import { renderPageToCanvas } from "@/lib/pdfjs";

export default function PdfToImages() {
  return <WithPdf>{(pdf, reset) => <Inner pdf={pdf} reset={reset} />}</WithPdf>;
}

function Inner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [dpi, setDpi] = useState(150);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const zip = new JSZip();
      const ext = format === "jpeg" ? "jpg" : "png";
      const name = baseName(pdf.file.name);
      let single: Blob | null = null;
      for (let i = 1; i <= pdf.pageCount; i++) {
        setProgress(i);
        const canvas = await renderPageToCanvas(await pdf.doc.getPage(i), dpi / 72);
        const blob = await canvasToBlob(canvas, `image/${format}`, 0.92);
        canvas.width = canvas.height = 0;
        if (pdf.pageCount === 1) single = blob;
        else zip.file(`${name}-page-${String(i).padStart(3, "0")}.${ext}`, blob);
      }
      if (single) downloadBlob(single, `${name}.${ext}`, single.type);
      else downloadBlob(await zip.generateAsync({ type: "blob" }), `${name}-images.zip`, "application/zip");
      setDone(`Exported ${pdf.pageCount} image${pdf.pageCount === 1 ? "" : "s"}.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel className="checker">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
            {Array.from({ length: Math.min(pdf.pageCount, 60) }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <PageThumb doc={pdf.doc} pageIndex={i} width={110} />
                <span className="text-xs text-muted">{i + 1}</span>
              </div>
            ))}
          </div>
          {pdf.pageCount > 60 && <p className="mt-4 text-center text-sm text-muted">…and {pdf.pageCount - 60} more pages</p>}
        </Panel>
        <Panel title="Export options">
          <div className="flex flex-col gap-4">
            <Segmented
              value={format}
              onChange={setFormat}
              options={[
                { value: "jpeg", label: "JPG" },
                { value: "png", label: "PNG" },
              ]}
            />
            <Field label="Quality">
              <Select value={dpi} onChange={(e) => setDpi(+e.target.value)}>
                <option value={72}>Screen (72 dpi)</option>
                <option value={150}>Standard (150 dpi)</option>
                <option value={220}>High (220 dpi)</option>
                <option value={300}>Print (300 dpi)</option>
              </Select>
            </Field>
            <Button variant="primary" size="lg" loading={busy} onClick={run}>
              {busy ? `Page ${progress} of ${pdf.pageCount}` : "Convert to images"}
            </Button>
            <ErrorNote>{error}</ErrorNote>
            <SuccessNote>{done}</SuccessNote>
          </div>
        </Panel>
      </div>
    </div>
  );
}
