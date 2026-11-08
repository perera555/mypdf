"use client";

import { ArrowDownAZ, FileText, GripVertical, Trash2 } from "lucide-react";
import { PDFDocument } from "@cantoo/pdf-lib";
import { useState } from "react";
import { FileDrop } from "../FileDrop";
import { Button, ErrorNote, Panel, SuccessNote, errorMessage } from "../ui";
import { formatBytes, readFileBytes } from "@/lib/files";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

interface Item {
  id: string;
  file: File;
  pages?: number;
  password?: string;
  error?: string;
}

export default function Merge() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const add = async (files: File[]) => {
    setDone(null);
    const next: Item[] = await Promise.all(
      files.map(async (file) => {
        const item: Item = { id: crypto.randomUUID(), file };
        try {
          const bytes = await readFileBytes(file);
          const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          item.pages = doc.getPageCount();
          if (doc.isEncrypted) {
            // Files with only permission restrictions open with an empty password.
            try {
              await PDFDocument.load(bytes, { password: "" });
            } catch {
              item.error = "Password protected — unlock it first with the Unlock tool";
            }
          }
        } catch {
          item.error = "Not a valid PDF";
        }
        return item;
      }),
    );
    setItems((prev) => [...prev, ...next]);
  };

  const move = (fromId: string, toId: string) => {
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === fromId);
      const to = prev.findIndex((i) => i.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const copy = [...prev];
      const [it] = copy.splice(from, 1);
      copy.splice(to, 0, it);
      return copy;
    });
  };

  const merge = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const out = await PDFDocument.create();
      for (const item of items) {
        const src = await loadPdfDoc(await readFileBytes(item.file), item.password);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const bytes = await savePdf(out);
      showResult(bytes, "merged.pdf");
      setDone(`Merged ${items.length} files into one PDF with ${out.getPageCount()} pages (${formatBytes(bytes.length)}).`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (items.length === 0) return <FileDrop multiple onFiles={add} label="Choose PDF files" />;

  const valid = items.filter((i) => !i.error);
  const totalPages = valid.reduce((n, i) => n + (i.pages ?? 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">Drag files to change the order.</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setItems((p) => [...p].sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true })))}
            >
              <ArrowDownAZ className="h-4 w-4" /> Sort by name
            </Button>
            <FileDrop compact multiple onFiles={add} label="Add more" />
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {items.map((item, idx) => (
            <li
              key={item.id}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, item.id);
              }}
              onDragEnd={() => setDragId(null)}
              className={`flex items-center gap-3 rounded-xl border bg-surface-2 px-3 py-2.5 transition ${
                dragId === item.id ? "border-accent opacity-60" : "border-line"
              }`}
            >
              <GripVertical className="h-4 w-4 cursor-grab text-muted" />
              <span className="w-6 text-center text-xs font-semibold text-muted">{idx + 1}</span>
              <FileText className="h-5 w-5 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className={`text-xs ${item.error ? "text-red-500" : "text-muted"}`}>
                  {item.error ?? `${item.pages} pages · ${formatBytes(item.file.size)}`}
                </p>
              </div>
              <button
                aria-label={`Remove ${item.file.name}`}
                onClick={() => setItems((p) => p.filter((i) => i.id !== item.id))}
                className="rounded-lg p-2 text-muted hover:bg-surface hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="flex flex-col gap-4">
        <Panel title="Summary">
          <p className="text-sm text-muted">
            {valid.length} file{valid.length === 1 ? "" : "s"} · {totalPages} pages in total
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-4 w-full"
            loading={busy}
            disabled={valid.length < 2 || valid.length !== items.length}
            onClick={merge}
          >
            Merge PDFs
          </Button>
          {valid.length !== items.length && <p className="mt-2 text-xs text-red-500">Remove the files with errors to continue.</p>}
          {valid.length < 2 && valid.length === items.length && <p className="mt-2 text-xs text-muted">Add at least two PDFs.</p>}
        </Panel>
        <ErrorNote>{error}</ErrorNote>
        <SuccessNote>{done}</SuccessNote>
      </div>
    </div>
  );
}
