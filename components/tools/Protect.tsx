"use client";

import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button, ErrorNote, Field, Input, Panel, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName } from "@/lib/files";
import { loadPdfDoc } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

export default function Protect() {
  return <WithPdf>{(pdf, reset) => <Inner pdf={pdf} reset={reset} />}</WithPdf>;
}

function Inner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [owner, setOwner] = useState("");
  const [show, setShow] = useState(false);
  const [perm, setPerm] = useState({ printing: true, copying: false, modifying: false, annotating: true, fillingForms: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = pw2.length > 0 && pw !== pw2;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await loadPdfDoc(pdf.bytes, pdf.password);
      const ownerPassword = owner || pw + "-" + crypto.randomUUID();
      doc.encrypt({
        userPassword: pw,
        ownerPassword,
        permissions: {
          printing: perm.printing ? "highResolution" : false,
          copying: perm.copying,
          modifying: perm.modifying,
          annotating: perm.annotating,
          fillingForms: perm.fillingForms,
        },
      });
      const bytes = await doc.save({ useObjectStreams: true });
      showResult(bytes, `${baseName(pdf.file.name)}-protected.pdf`, "Encrypted with AES-256. Keep your password safe — it can’t be recovered.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (k: keyof typeof perm, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={perm[k]} onChange={(e) => setPerm({ ...perm, [k]: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
      {label}
    </label>
  );

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset} />
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Password">
          <div className="flex flex-col gap-4">
            <Field label="Password to open the PDF">
              <div className="relative">
                <Input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Repeat password">
              <Input type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            </Field>
            {mismatch && <ErrorNote>The passwords don’t match.</ErrorNote>}
            <Field label="Owner password (optional)" hint="Lets you change permissions later. Leave empty to generate a random one.">
              <Input type={show ? "text" : "password"} value={owner} onChange={(e) => setOwner(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
        </Panel>
        <Panel title="Permissions">
          <div className="flex flex-col gap-3">
            {toggle("printing", "Allow printing")}
            {toggle("copying", "Allow copying text and images")}
            {toggle("modifying", "Allow editing")}
            {toggle("annotating", "Allow comments")}
            {toggle("fillingForms", "Allow filling forms")}
            <p className="flex items-center gap-1.5 pt-2 text-xs text-muted">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> AES-256 encryption, done entirely on your device.
            </p>
            <Button variant="primary" size="lg" className="mt-2" loading={busy} disabled={pw.length < 1 || pw !== pw2} onClick={run}>
              Protect PDF
            </Button>
            <ErrorNote>{error}</ErrorNote>
          </div>
        </Panel>
      </div>
    </div>
  );
}
