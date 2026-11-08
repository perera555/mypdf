"use client";

import { useEffect, useState } from "react";
import { Button, ErrorNote, Field, Input, Panel, Spinner, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName } from "@/lib/files";
import { loadPdfDoc } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

interface Meta {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}

export default function Metadata() {
  return <WithPdf>{(pdf, reset) => <Inner pdf={pdf} reset={reset} />}</WithPdf>;
}

function Inner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [info, setInfo] = useState<{ label: string; value: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const doc = await loadPdfDoc(pdf.bytes, pdf.password);
        setMeta({
          title: doc.getTitle() ?? "",
          author: doc.getAuthor() ?? "",
          subject: doc.getSubject() ?? "",
          keywords: doc.getKeywords() ?? "",
          creator: doc.getCreator() ?? "",
          producer: doc.getProducer() ?? "",
        });
        const p = doc.getPage(0).getSize();
        setInfo([
          { label: "Pages", value: String(doc.getPageCount()) },
          { label: "Page size", value: `${Math.round(p.width)} × ${Math.round(p.height)} pt (${Math.round((p.width / 72) * 25.4)} × ${Math.round((p.height / 72) * 25.4)} mm)` },
          { label: "Created", value: doc.getCreationDate()?.toLocaleString() ?? "—" },
          { label: "Modified", value: doc.getModificationDate()?.toLocaleString() ?? "—" },
          { label: "Encrypted", value: pdf.password !== undefined ? "Yes (password)" : "No" },
        ]);
      } catch (e) {
        setError(errorMessage(e));
      }
    })();
  }, [pdf]);

  const save = async () => {
    if (!meta) return;
    setBusy(true);
    setError(null);
    try {
      const doc = await loadPdfDoc(pdf.bytes, pdf.password);
      doc.setTitle(meta.title);
      doc.setAuthor(meta.author);
      doc.setSubject(meta.subject);
      doc.setKeywords(meta.keywords.split(/[,;]\s*/).filter(Boolean));
      doc.setCreator(meta.creator);
      doc.setProducer(meta.producer);
      doc.setModificationDate(new Date());
      showResult(await doc.save({ useObjectStreams: true }), `${baseName(pdf.file.name)}.pdf`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset} />
      <ErrorNote>{error}</ErrorNote>
      {!meta ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <Panel title="Properties">
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.keys(meta) as (keyof Meta)[]).map((k) => (
                <Field key={k} label={k[0].toUpperCase() + k.slice(1)} hint={k === "keywords" ? "Separate with commas" : undefined}>
                  <Input value={meta[k]} onChange={(e) => setMeta({ ...meta, [k]: e.target.value })} />
                </Field>
              ))}
            </div>
            <Button variant="primary" size="lg" className="mt-5" loading={busy} onClick={save}>
              Save properties
            </Button>
          </Panel>
          <Panel title="Document info">
            <dl className="flex flex-col gap-3 text-sm">
              {info.map((i) => (
                <div key={i.label}>
                  <dt className="text-xs text-muted">{i.label}</dt>
                  <dd className="font-medium">{i.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      )}
    </div>
  );
}
