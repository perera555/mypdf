"use client";

import { degrees } from "@cantoo/pdf-lib";
import { RotateCcw, RotateCw } from "lucide-react";
import { useState } from "react";
import { PageThumb } from "../PageThumb";
import { Button, ErrorNote, Panel, SuccessNote, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName } from "@/lib/files";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

export default function Rotate() {
  return <WithPdf>{(pdf, reset) => <RotateInner pdf={pdf} reset={reset} />}</WithPdf>;
}

function RotateInner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [rot, setRot] = useState<number[]>(() => Array(pdf.pageCount).fill(0));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const apply = (by: number) => {
    setDone(null);
    setRot((r) => r.map((v, i) => (selected.size === 0 || selected.has(i) ? (v + by + 360) % 360 : v)));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await loadPdfDoc(pdf.bytes, pdf.password);
      doc.getPages().forEach((p, i) => {
        if (rot[i]) p.setRotation(degrees((p.getRotation().angle + rot[i]) % 360));
      });
      showResult(await savePdf(doc), `${baseName(pdf.file.name)}-rotated.pdf`);
      setDone("Your rotated PDF has been downloaded.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const target = selected.size === 0 ? "all pages" : `${selected.size} selected`;

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset}>
        <Button size="sm" onClick={() => apply(-90)}>
          <RotateCcw className="h-4 w-4" /> Left ({target})
        </Button>
        <Button size="sm" onClick={() => apply(90)}>
          <RotateCw className="h-4 w-4" /> Right ({target})
        </Button>
        <Button variant="primary" loading={busy} disabled={rot.every((r) => r === 0)} onClick={save}>
          Save PDF
        </Button>
      </FileBar>
      <ErrorNote>{error}</ErrorNote>
      <SuccessNote>{done}</SuccessNote>
      <Panel className="checker">
        <div className="mb-4 flex items-center justify-between text-sm text-muted">
          <span>Click pages to select them, or rotate everything.</span>
          {selected.size > 0 && (
            <button className="text-accent hover:underline" onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
          {rot.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                setSelected((s) => {
                  const n = new Set(s);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                })
              }
              className={`flex flex-col items-center gap-2 rounded-xl p-3 transition ${selected.has(i) ? "bg-accent/10 ring-2 ring-accent" : "hover:bg-surface"}`}
            >
              <PageThumb doc={pdf.doc} pageIndex={i} width={130} rotation={r} />
              <span className="text-xs text-muted">
                {i + 1}
                {r ? ` · ${r}°` : ""}
              </span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
