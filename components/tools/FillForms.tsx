"use client";

import { PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField } from "@cantoo/pdf-lib";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ErrorNote, Field, Input, Panel, Select, Spinner, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName } from "@/lib/files";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

type FieldInfo =
  | { type: "text"; name: string; value: string; multiline: boolean }
  | { type: "check"; name: string; value: boolean }
  | { type: "choice"; name: string; value: string; options: string[] }
  | { type: "radio"; name: string; value: string; options: string[] };

export default function FillForms() {
  return <WithPdf>{(pdf, reset) => <Inner pdf={pdf} reset={reset} />}</WithPdf>;
}

function Inner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [fields, setFields] = useState<FieldInfo[] | null>(null);
  const [flatten, setFlatten] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const doc = await loadPdfDoc(pdf.bytes, pdf.password);
        const out: FieldInfo[] = [];
        for (const f of doc.getForm().getFields()) {
          const name = f.getName();
          if (f instanceof PDFTextField) out.push({ type: "text", name, value: f.getText() ?? "", multiline: f.isMultiline() });
          else if (f instanceof PDFCheckBox) out.push({ type: "check", name, value: f.isChecked() });
          else if (f instanceof PDFDropdown || f instanceof PDFOptionList) out.push({ type: "choice", name, value: f.getSelected()[0] ?? "", options: f.getOptions() });
          else if (f instanceof PDFRadioGroup) out.push({ type: "radio", name, value: f.getSelected() ?? "", options: f.getOptions() });
        }
        setFields(out);
      } catch (e) {
        setError(errorMessage(e));
        setFields([]);
      }
    })();
  }, [pdf]);

  const set = (i: number, value: string | boolean) => setFields((fs) => fs!.map((f, j) => (j === i ? ({ ...f, value } as FieldInfo) : f)));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await loadPdfDoc(pdf.bytes, pdf.password);
      const form = doc.getForm();
      for (const f of fields!) {
        if (f.type === "text") form.getTextField(f.name).setText(f.value || undefined);
        else if (f.type === "check") {
          const cb = form.getCheckBox(f.name);
          if (f.value) cb.check();
          else cb.uncheck();
        } else if (f.type === "choice" && f.value) {
          const field = form.getField(f.name);
          if (field instanceof PDFDropdown || field instanceof PDFOptionList) field.select(f.value);
        } else if (f.type === "radio" && f.value) form.getRadioGroup(f.name).select(f.value);
      }
      if (flatten) form.flatten();
      showResult(await savePdf(doc), `${baseName(pdf.file.name)}-filled.pdf`);
    } catch (e) {
      setError(`${errorMessage(e)}. Tip: the standard PDF fonts only support Latin characters — for other languages use Fill & Sign.`);
    } finally {
      setBusy(false);
    }
  };

  const label = (n: string) => n.replace(/[_.]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset} />
      <ErrorNote>{error}</ErrorNote>
      {fields === null ? (
        <Spinner label="Reading form fields…" />
      ) : fields.length === 0 ? (
        <Panel className="text-center">
          <p className="font-medium">This PDF has no fillable form fields.</p>
          <p className="mt-1 text-sm text-muted">You can still type on it, tick boxes and sign anywhere with Fill & Sign.</p>
          <Link href="/tools/sign" className="brand-gradient mt-4 inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold text-white">
            Open Fill & Sign
          </Link>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Panel title={`${fields.length} fields`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f, i) => (
                <div key={f.name} className={f.type === "text" && f.multiline ? "sm:col-span-2" : ""}>
                  {f.type === "text" && (
                    <Field label={label(f.name)}>
                      {f.multiline ? (
                        <textarea value={f.value} onChange={(e) => set(i, e.target.value)} rows={4} className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-accent" />
                      ) : (
                        <Input value={f.value} onChange={(e) => set(i, e.target.value)} />
                      )}
                    </Field>
                  )}
                  {f.type === "check" && (
                    <label className="flex h-full items-center gap-2 pt-6 text-sm">
                      <input type="checkbox" checked={f.value} onChange={(e) => set(i, e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" /> {label(f.name)}
                    </label>
                  )}
                  {(f.type === "choice" || f.type === "radio") && (
                    <Field label={label(f.name)}>
                      <Select value={f.value} onChange={(e) => set(i, e.target.value)}>
                        <option value="">—</option>
                        {f.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </Select>
                    </Field>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Save">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
              <span>
                Flatten form <span className="block text-xs text-muted">Makes the answers part of the page so they can’t be changed.</span>
              </span>
            </label>
            <Button variant="primary" size="lg" className="mt-4 w-full" loading={busy} onClick={save}>
              Save filled PDF
            </Button>
          </Panel>
        </div>
      )}
    </div>
  );
}
