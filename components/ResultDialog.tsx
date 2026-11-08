"use client";

import { BookOpen, Check, Download, FolderHeart, PenLine, Printer, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, ErrorNote, errorMessage } from "./ui";
import { downloadBlob, formatBytes } from "@/lib/files";
import { saveToLibrary, setHandoff } from "@/lib/library";
import { printPdf } from "@/lib/print";
import { clearResult, getResult, subscribeResult } from "@/lib/result";

export function ResultDialog() {
  const result = useSyncExternalStore(subscribeResult, getResult, () => null);
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(false);
    setError(null);
    if (result) downloadBlob(result.bytes, result.name);
  }, [result]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && clearResult();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!result) return null;

  const open = (tool: string) => {
    setHandoff(result.bytes, result.name);
    clearResult();
    router.push(`/tools/${tool}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={clearResult}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className="fade-up w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
            <Check className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="result-title" className="text-lg font-semibold">
              Your PDF is ready
            </h2>
            <p className="truncate text-sm text-muted">
              {result.name} · {formatBytes(result.bytes.length)}
            </p>
            {result.note && <p className="mt-1 text-sm text-muted">{result.note}</p>}
            <p className="mt-1 text-xs text-muted">The download has started automatically.</p>
          </div>
          <button onClick={clearResult} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={() => downloadBlob(result.bytes, result.name)}>
            <Download className="h-4 w-4" /> Download again
          </Button>
          <Button
            loading={printing}
            onClick={async () => {
              setPrinting(true);
              try {
                await printPdf(result.bytes);
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setPrinting(false);
              }
            }}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button
            disabled={saved}
            onClick={async () => {
              try {
                await saveToLibrary(result.bytes, result.name);
                setSaved(true);
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            {saved ? <Check className="h-4 w-4" /> : <FolderHeart className="h-4 w-4" />} {saved ? "Saved" : "Save to My Files"}
          </Button>
          <Button onClick={() => open("view")}>
            <BookOpen className="h-4 w-4" /> Open in Reader
          </Button>
          <Button variant="ghost" className="col-span-2" onClick={() => open("edit")}>
            <PenLine className="h-4 w-4" /> Continue editing this PDF
          </Button>
        </div>
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </div>
    </div>
  );
}
