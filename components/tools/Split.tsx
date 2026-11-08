"use client";

import { PDFDocument } from "@cantoo/pdf-lib";
import JSZip from "jszip";
import { useMemo, useState } from "react";
import { PageThumb } from "../PageThumb";
import { Button, ErrorNote, Field, Input, Panel, Segmented, SuccessNote, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName, downloadBlob, parseRanges } from "@/lib/files";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

type Mode = "ranges" | "select" | "every";

export default function Split() {
  return <WithPdf>{(pdf, reset) => <SplitInner pdf={pdf} reset={reset} />}</WithPdf>;
}

function SplitInner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [mode, setMode] = useState<Mode>("ranges");
  const [ranges, setRanges] = useState(pdf.pageCount > 1 ? `1-${Math.ceil(pdf.pageCount / 2)}, ${Math.ceil(pdf.pageCount / 2) + 1}-${pdf.pageCount}` : "1");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [mergeRanges, setMergeRanges] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const rangeError = useMemo(() => {
    if (mode !== "ranges") return null;
    try {
      parseRanges(ranges, pdf.pageCount);
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }, [mode, ranges, pdf.pageCount]);

  const run = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const src = await loadPdfDoc(pdf.bytes, pdf.password);
      let groups: number[][];
      if (mode === "every") groups = src.getPageIndices().map((i) => [i]);
      else if (mode === "select") groups = [[...selected].sort((a, b) => a - b)];
      else {
        groups = parseRanges(ranges, pdf.pageCount);
        if (mergeRanges) groups = [groups.flat()];
      }

      const name = baseName(pdf.file.name);
      const outputs: { name: string; bytes: Uint8Array }[] = [];
      for (const g of groups) {
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, g);
        pages.forEach((p) => out.addPage(p));
        const label = g.length === 1 ? `page-${g[0] + 1}` : `pages-${g[0] + 1}-${g[g.length - 1] + 1}`;
        outputs.push({ name: `${name}-${label}.pdf`, bytes: await savePdf(out) });
      }

      if (outputs.length === 1) {
        showResult(outputs[0].bytes, outputs[0].name);
      } else {
        const zip = new JSZip();
        outputs.forEach((o) => zip.file(o.name, o.bytes));
        downloadBlob(await zip.generateAsync({ type: "blob" }), `${name}-split.zip`, "application/zip");
      }
      setDone(outputs.length === 1 ? "Your PDF is ready." : `Created ${outputs.length} PDFs, downloaded as a ZIP.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (i: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel>
          {mode === "select" && <p className="mb-4 text-sm text-muted">Click pages to select them ({selected.size} selected).</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
            {Array.from({ length: pdf.pageCount }, (_, i) => {
              const isSel = mode === "select" && selected.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={mode !== "select"}
                  onClick={() => toggle(i)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition ${
                    isSel ? "bg-accent/10 ring-2 ring-accent" : mode === "select" ? "hover:bg-surface-2" : ""
                  }`}
                >
                  <PageThumb doc={pdf.doc} pageIndex={i} width={110} />
                  <span className="text-xs text-muted">{i + 1}</span>
                </button>
              );
            })}
          </div>
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Split options">
            <div className="flex flex-col gap-4">
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "ranges", label: "Ranges" },
                  { value: "select", label: "Pick pages" },
                  { value: "every", label: "Every page" },
                ]}
              />
              {mode === "ranges" && (
                <>
                  <Field label="Page ranges" hint="Separate with commas, e.g. 1-3, 5, 8-12. Each range becomes its own file.">
                    <Input value={ranges} onChange={(e) => setRanges(e.target.value)} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={mergeRanges} onChange={(e) => setMergeRanges(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                    Put all ranges into one PDF
                  </label>
                  <ErrorNote>{rangeError}</ErrorNote>
                </>
              )}
              {mode === "select" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setSelected(new Set(Array.from({ length: pdf.pageCount }, (_, i) => i)))}>
                    Select all
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                </div>
              )}
              {mode === "every" && <p className="text-sm text-muted">Each of the {pdf.pageCount} pages becomes a separate PDF (downloaded as a ZIP).</p>}
              <Button
                variant="primary"
                size="lg"
                loading={busy}
                disabled={!!rangeError || (mode === "select" && selected.size === 0)}
                onClick={run}
              >
                {mode === "select" ? "Extract pages" : "Split PDF"}
              </Button>
            </div>
          </Panel>
          <ErrorNote>{error}</ErrorNote>
          <SuccessNote>{done}</SuccessNote>
        </div>
      </div>
    </div>
  );
}
