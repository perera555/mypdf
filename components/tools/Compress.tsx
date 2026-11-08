"use client";

import { PDFDocument } from "@cantoo/pdf-lib";
import { useState } from "react";
import { Button, ErrorNote, Panel, SuccessNote, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName, canvasToBlob, formatBytes, readFileBytes } from "@/lib/files";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { renderPageToCanvas } from "@/lib/pdfjs";
import { showResult } from "@/lib/result";

type Level = "basic" | "medium" | "strong";

const LEVELS: { value: Level; title: string; text: string; dpi?: number; q?: number }[] = [
  { value: "basic", title: "Basic", text: "Lossless clean-up. Text stays selectable and quality is unchanged." },
  { value: "medium", title: "Recommended", text: "Good quality, much smaller. Pages are re-encoded as 150 dpi images.", dpi: 150, q: 0.72 },
  { value: "strong", title: "Extreme", text: "Smallest file, lower quality. 96 dpi images — best for email.", dpi: 96, q: 0.55 },
];

export default function Compress() {
  return <WithPdf>{(pdf, reset) => <Inner pdf={pdf} reset={reset} />}</WithPdf>;
}

function Inner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [level, setLevel] = useState<Level>("basic");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const L = LEVELS.find((l) => l.value === level)!;
      let out: Uint8Array;
      if (!L.dpi) {
        const doc = await loadPdfDoc(pdf.bytes, pdf.password);
        // Drop metadata streams and bulky extras
        doc.setKeywords([]);
        out = await savePdf(doc);
      } else {
        const doc = await PDFDocument.create();
        for (let i = 1; i <= pdf.pageCount; i++) {
          setProgress(i);
          const page = await pdf.doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const canvas = await renderPageToCanvas(page, L.dpi / 72);
          const jpg = await doc.embedJpg(await readFileBytes(await canvasToBlob(canvas, "image/jpeg", L.q)));
          canvas.width = canvas.height = 0;
          doc.addPage([vp.width, vp.height]).drawImage(jpg, { x: 0, y: 0, width: vp.width, height: vp.height });
        }
        out = await savePdf(doc);
      }
      const before = pdf.bytes.length;
      const saved = 1 - out.length / before;
      if (out.length >= before) {
        setNote(`This PDF is already well optimised — the result (${formatBytes(out.length)}) wasn’t smaller than the original (${formatBytes(before)}). Try a stronger level.`);
      } else {
        showResult(out, `${baseName(pdf.file.name)}-compressed.pdf`, `${formatBytes(before)} → ${formatBytes(out.length)} (${Math.round(saved * 100)}% smaller)`);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset} />
      <Panel title="Compression level">
        <div className="grid gap-3 md:grid-cols-3">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLevel(l.value)}
              className={`rounded-2xl border p-4 text-left transition ${level === l.value ? "border-accent bg-accent/5 ring-2 ring-[var(--ring)]" : "border-line hover:border-accent/50"}`}
            >
              <p className="font-semibold">{l.title}</p>
              <p className="mt-1 text-sm text-muted">{l.text}</p>
            </button>
          ))}
        </div>
        <Button variant="primary" size="lg" className="mt-5" loading={busy} onClick={run}>
          {busy && level !== "basic" ? `Compressing page ${progress} of ${pdf.pageCount}` : "Compress PDF"}
        </Button>
        <div className="mt-4 flex flex-col gap-2">
          <ErrorNote>{error}</ErrorNote>
          <SuccessNote>{note}</SuccessNote>
        </div>
      </Panel>
    </div>
  );
}
