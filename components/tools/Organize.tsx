"use client";

import { degrees, PDFDocument } from "@cantoo/pdf-lib";
import { Copy, FilePlus2, RotateCcw, RotateCw, Trash2, Undo2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { PageThumb } from "../PageThumb";
import { FileDrop } from "../FileDrop";
import { Button, ErrorNote, IconButton, Panel, SuccessNote, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName, readFileBytes } from "@/lib/files";
import { closePdf, openPdf } from "@/lib/pdfjs";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

interface Source {
  bytes: Uint8Array;
  password?: string;
  doc: PDFDocumentProxy;
  name: string;
}

interface PageItem {
  id: string;
  /** index into sources, or -1 for a blank page */
  src: number;
  index: number;
  rotation: number;
}

export default function Organize() {
  return <WithPdf>{(pdf, reset) => <OrganizeInner pdf={pdf} reset={reset} />}</WithPdf>;
}

const initialPages = (count: number): PageItem[] =>
  Array.from({ length: count }, (_, i) => ({ id: crypto.randomUUID(), src: 0, index: i, rotation: 0 }));

function OrganizeInner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [sources, setSources] = useState<Source[]>([{ bytes: pdf.bytes, password: pdf.password, doc: pdf.doc, name: pdf.file.name }]);
  const [state, setState] = useState<{ pages: PageItem[]; history: PageItem[][] }>(() => ({
    pages: initialPages(pdf.pageCount),
    history: [],
  }));
  const { pages, history } = state;
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const extraDocs = useRef<PDFDocumentProxy[]>([]);
  const sourceCount = useRef(1);

  useEffect(() => () => extraDocs.current.forEach(closePdf), []);

  const update = (fn: (p: PageItem[]) => PageItem[]) => {
    setDone(null);
    setState((s) => ({ pages: fn(s.pages), history: [...s.history.slice(-30), s.pages] }));
  };
  const setPages = (fn: (p: PageItem[]) => PageItem[]) => setState((s) => ({ ...s, pages: fn(s.pages) }));
  const undo = () =>
    setState((s) => (s.history.length ? { pages: s.history[s.history.length - 1], history: s.history.slice(0, -1) } : s));

  const rotate = (id: string, by: number) =>
    update((p) => p.map((x) => (x.id === id ? { ...x, rotation: (x.rotation + by + 360) % 360 } : x)));
  const remove = (id: string) => update((p) => p.filter((x) => x.id !== id));
  const duplicate = (id: string) =>
    update((p) => {
      const i = p.findIndex((x) => x.id === id);
      const copy = [...p];
      copy.splice(i + 1, 0, { ...p[i], id: crypto.randomUUID() });
      return copy;
    });
  const insertBlank = (id: string) =>
    update((p) => {
      const i = p.findIndex((x) => x.id === id);
      const copy = [...p];
      copy.splice(i + 1, 0, { id: crypto.randomUUID(), src: -1, index: 0, rotation: 0 });
      return copy;
    });

  const move = (fromId: string, toId: string) => {
    setPages((prev) => {
      const from = prev.findIndex((i) => i.id === fromId);
      const to = prev.findIndex((i) => i.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const copy = [...prev];
      const [it] = copy.splice(from, 1);
      copy.splice(to, 0, it);
      return copy;
    });
  };

  const addPdf = async (files: File[]) => {
    setError(null);
    for (const file of files) {
      try {
        const bytes = await readFileBytes(file);
        const doc = await openPdf(bytes);
        extraDocs.current.push(doc);
        const srcIdx = sourceCount.current++;
        setSources((s) => [...s, { bytes, doc, name: file.name }]);
        update((p) => [
          ...p,
          ...Array.from({ length: doc.numPages }, (_, i) => ({ id: crypto.randomUUID(), src: srcIdx, index: i, rotation: 0 })),
        ]);
      } catch (err) {
        setError(`Could not add "${file.name}": ${errorMessage(err)}. Password-protected files must be unlocked first.`);
      }
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const loaded = await Promise.all(sources.map((s) => loadPdfDoc(s.bytes, s.password)));
      const out = await PDFDocument.create();
      let lastSize: [number, number] = [595.28, 841.89];
      for (const item of pages) {
        if (item.src === -1) {
          const page = out.addPage(lastSize);
          if (item.rotation) page.setRotation(degrees(item.rotation));
          continue;
        }
        const [page] = await out.copyPages(loaded[item.src], [item.index]);
        const added = out.addPage(page);
        const { width, height } = added.getSize();
        lastSize = [width, height];
        if (item.rotation) added.setRotation(degrees((added.getRotation().angle + item.rotation) % 360));
      }
      showResult(await savePdf(out), `${baseName(pdf.file.name)}-organized.pdf`);
      setDone(`Saved ${pages.length} pages.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset}>
        <Button
          size="sm"
          variant="ghost"
          disabled={history.length === 0}
          onClick={undo}
        >
          <Undo2 className="h-4 w-4" /> Undo
        </Button>
        <Button size="sm" variant="ghost" onClick={() => update((p) => p.map((x) => ({ ...x, rotation: (x.rotation + 90) % 360 })))}>
          <RotateCw className="h-4 w-4" /> Rotate all
        </Button>
        <FileDrop compact multiple onFiles={addPdf} label="Add PDF" />
        <Button variant="primary" loading={busy} disabled={pages.length === 0} onClick={save}>
          Save PDF
        </Button>
      </FileBar>
      <ErrorNote>{error}</ErrorNote>
      <SuccessNote>{done}</SuccessNote>
      <Panel className="checker">
        <p className="mb-4 text-sm text-muted">
          Drag pages to reorder. Hover a page for rotate, duplicate, insert blank and delete. {pages.length} pages.
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
          {pages.map((item, i) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, item.id);
              }}
              onDragEnd={() => setDragId(null)}
              className={`group relative flex cursor-grab flex-col items-center gap-2 rounded-xl p-3 transition active:cursor-grabbing ${
                dragId === item.id ? "opacity-40" : "hover:bg-surface"
              }`}
            >
              {item.src === -1 ? (
                <div
                  className="flex items-center justify-center rounded-md bg-white text-xs text-zinc-400 shadow-sm ring-1 ring-black/5"
                  style={{ width: item.rotation % 180 ? 182 : 130, height: item.rotation % 180 ? 130 : 182 }}
                >
                  Blank page
                </div>
              ) : (
                <PageThumb doc={sources[item.src].doc} pageIndex={item.index} width={130} rotation={item.rotation} />
              )}
              <span className="text-xs font-medium text-muted">
                {i + 1}
                {item.src > 0 && <span className="ml-1 text-accent-2">· {sources[item.src].name.slice(0, 14)}</span>}
              </span>
              <div className="absolute top-1 right-1 flex flex-col gap-0.5 rounded-lg border border-line bg-surface p-0.5 opacity-0 shadow-card transition group-hover:opacity-100 focus-within:opacity-100">
                <IconButton label="Rotate left" className="h-7 w-7" onClick={() => rotate(item.id, -90)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Rotate right" className="h-7 w-7" onClick={() => rotate(item.id, 90)}>
                  <RotateCw className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Duplicate" className="h-7 w-7" onClick={() => duplicate(item.id)}>
                  <Copy className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Insert blank page after" className="h-7 w-7" onClick={() => insertBlank(item.id)}>
                  <FilePlus2 className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Delete page" className="h-7 w-7 hover:text-red-500" onClick={() => remove(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
