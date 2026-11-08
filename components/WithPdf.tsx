"use client";

import { FileText, KeyRound, X } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { FileDrop } from "./FileDrop";
import { Button, ErrorNote, Input, Spinner, errorMessage } from "./ui";
import { closePdf, openPdf, PasswordRequiredError } from "@/lib/pdfjs";
import { formatBytes, readFileBytes } from "@/lib/files";
import { takeHandoff } from "@/lib/library";

export interface LoadedPdf {
  file: File;
  bytes: Uint8Array;
  doc: PDFDocumentProxy;
  password?: string;
  pageCount: number;
}

/** Shows a drop zone, handles password-protected files, then renders children with the loaded PDF. */
export function WithPdf({
  children,
  dropLabel,
}: {
  children: (pdf: LoadedPdf, reset: () => void, replace: (bytes: Uint8Array, name?: string) => Promise<void>) => ReactNode;
  dropLabel?: string;
}) {
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needPassword, setNeedPassword] = useState<{ file: File; bytes: Uint8Array; incorrect: boolean } | null>(null);
  const [pw, setPw] = useState("");
  const docRef = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => () => closePdf(docRef.current), []);

  const open = useCallback(async (file: File, bytes: Uint8Array, password?: string) => {
    setLoading(true);
    setError(null);
    try {
      const doc = await openPdf(bytes, password);
      closePdf(docRef.current);
      docRef.current = doc;
      setNeedPassword(null);
      setPw("");
      setPdf({ file, bytes, doc, password, pageCount: doc.numPages });
    } catch (err) {
      if (err instanceof PasswordRequiredError) {
        setNeedPassword({ file, bytes, incorrect: err.incorrect });
      } else {
        setError(`Could not open "${file.name}": ${errorMessage(err)}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Pick up a file handed over from another page ("Open in Reader", My Files, etc.).
  useEffect(() => {
    const file = takeHandoff();
    if (file) void readFileBytes(file).then((bytes) => open(file, bytes));

    // Installed app: PDFs opened with "Open with → MyPDF" arrive through the launch queue.
    const lq = (window as unknown as { launchQueue?: { setConsumer: (fn: (p: { files?: FileSystemFileHandle[] }) => void) => void } }).launchQueue;
    lq?.setConsumer(async (params) => {
      const handle = params.files?.[0];
      if (!handle) return;
      const f = await handle.getFile();
      await open(f, await readFileBytes(f));
    });
  }, [open]);

  const replace = useCallback(
    async (bytes: Uint8Array, name?: string) => {
      const current = pdf?.file;
      const file = new File([bytes as BlobPart], name ?? current?.name ?? "document.pdf", { type: "application/pdf" });
      await open(file, bytes);
    },
    [open, pdf],
  );

  const reset = useCallback(() => {
    closePdf(docRef.current);
    docRef.current = null;
    setPdf(null);
    setError(null);
  }, []);

  if (pdf) return <>{children(pdf, reset, replace)}</>;

  if (needPassword) {
    return (
      <form
        className="fade-up mx-auto flex w-full max-w-md flex-col gap-4 rounded-3xl border border-line bg-surface p-8 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          void open(needPassword.file, needPassword.bytes, pw);
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">This PDF is password protected</h2>
            <p className="text-sm text-muted">{needPassword.file.name}</p>
          </div>
        </div>
        <Input type="password" autoFocus placeholder="Enter password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {needPassword.incorrect && <ErrorNote>That password is not correct. Try again.</ErrorNote>}
        <div className="flex gap-2">
          <Button type="button" onClick={() => setNeedPassword(null)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" loading={loading}>
            Open PDF
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <Spinner label="Opening PDF…" />
      ) : (
        <FileDrop
          label={dropLabel}
          onFiles={async ([file]) => {
            const bytes = await readFileBytes(file);
            await open(file, bytes);
          }}
        />
      )}
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}

export function FileBar({ pdf, onReset, children }: { pdf: LoadedPdf; onReset: () => void; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{pdf.file.name}</p>
        <p className="text-xs text-muted">
          {pdf.pageCount} page{pdf.pageCount === 1 ? "" : "s"} · {formatBytes(pdf.file.size)}
        </p>
      </div>
      {children}
      <Button variant="ghost" size="sm" onClick={onReset}>
        <X className="h-4 w-4" /> Change file
      </Button>
    </div>
  );
}
