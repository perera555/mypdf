"use client";

import { LockOpen } from "lucide-react";
import { useState } from "react";
import { Button, ErrorNote, Panel, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName } from "@/lib/files";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

export default function Unlock() {
  return <WithPdf dropLabel="Choose a protected PDF">{(pdf, reset) => <Inner pdf={pdf} reset={reset} />}</WithPdf>;
}

function Inner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await loadPdfDoc(pdf.bytes, pdf.password);
      showResult(await savePdf(doc), `${baseName(pdf.file.name)}-unlocked.pdf`, "Password and restrictions removed.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset} />
      <Panel className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-600">
          <LockOpen className="h-7 w-7" />
        </div>
        <p className="max-w-md text-muted">
          {pdf.password
            ? "The password was accepted. Save an unlocked copy with no password or restrictions."
            : "This file opened without a password. Saving removes any copy, print or edit restrictions it has."}
        </p>
        <Button variant="primary" size="lg" loading={busy} onClick={run}>
          Unlock PDF
        </Button>
        <ErrorNote>{error}</ErrorNote>
        <p className="text-xs text-muted">Only unlock files you own or have permission to change.</p>
      </Panel>
    </div>
  );
}
