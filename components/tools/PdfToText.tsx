"use client";

import { Check, Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Panel, Spinner } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName, downloadBlob } from "@/lib/files";

export default function PdfToText() {
  return <WithPdf>{(pdf, reset) => <Inner pdf={pdf} reset={reset} />}</WithPdf>;
}

export async function extractText(pdf: LoadedPdf, onPage?: (n: number) => void): Promise<string[]> {
  const pages: string[] = [];
  for (let i = 1; i <= pdf.pageCount; i++) {
    onPage?.(i);
    const tc = await (await pdf.doc.getPage(i)).getTextContent();
    let s = "";
    for (const it of tc.items) {
      if (!("str" in it)) continue;
      s += it.str;
      if (it.hasEOL) s += "\n";
    }
    pages.push(s.replace(/[ \t]+\n/g, "\n").trim());
  }
  return pages;
}

function Inner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    void extractText(pdf, (n) => live && setProgress(n)).then((pages) => {
      if (live) setText(pages.map((p, i) => `--- Page ${i + 1} ---\n${p}`).join("\n\n"));
    });
    return () => {
      live = false;
    };
  }, [pdf]);

  const empty = text !== null && text.replace(/--- Page \d+ ---/g, "").trim() === "";

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset}>
        <Button
          size="sm"
          disabled={!text}
          onClick={async () => {
            await navigator.clipboard.writeText(text ?? "");
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" variant="primary" disabled={!text} onClick={() => downloadBlob(new Blob([text ?? ""], { type: "text/plain;charset=utf-8" }), `${baseName(pdf.file.name)}.txt`)}>
          <Download className="h-4 w-4" /> Download .txt
        </Button>
      </FileBar>
      <Panel>
        {text === null ? (
          <Spinner label={`Reading page ${progress} of ${pdf.pageCount}…`} />
        ) : (
          <>
            {empty && <p className="mb-3 text-sm text-amber-600">No text found — this looks like a scanned PDF. Try the OCR tool to recognize the text.</p>}
            <textarea value={text} onChange={(e) => setText(e.target.value)} className="h-[60vh] w-full rounded-xl border border-line bg-surface-2 p-4 font-mono text-sm leading-relaxed outline-none focus:border-accent" />
          </>
        )}
      </Panel>
    </div>
  );
}
