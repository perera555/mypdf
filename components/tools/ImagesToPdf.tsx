"use client";

import { GripVertical, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FileDrop } from "../FileDrop";
import { Button, ErrorNote, Field, Input, Panel, Select, errorMessage } from "../ui";
import { imagesToPdf, type Orientation, type PageSize } from "@/lib/images-pdf";
import { showResult } from "@/lib/result";

interface Item {
  id: string;
  file: File;
  url: string;
}

export default function ImagesToPdf() {
  const [items, setItems] = useState<Item[]>([]);
  const [size, setSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [margin, setMargin] = useState(20);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (files: File[]) => setItems((p) => [...p, ...files.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))]);

  const move = (fromId: string, toId: string) =>
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === fromId);
      const to = prev.findIndex((i) => i.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const c = [...prev];
      const [it] = c.splice(from, 1);
      c.splice(to, 0, it);
      return c;
    });

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      showResult(await imagesToPdf(items.map((i) => i.file), { size, orientation, margin }), "images.pdf");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!items.length) return <FileDrop multiple accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp" label="Choose images" onFiles={add} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel className="checker">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted">{items.length} images · drag to reorder</p>
          <FileDrop compact multiple accept="image/*" label="Add images" onFiles={add} />
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4">
          {items.map((it, i) => (
            <div
              key={it.id}
              draggable
              onDragStart={() => setDragId(it.id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, it.id);
              }}
              onDragEnd={() => setDragId(null)}
              className={`group relative flex cursor-grab flex-col items-center gap-1.5 rounded-xl bg-surface p-2 shadow-sm ${dragId === it.id ? "opacity-40" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt={it.file.name} className="h-36 w-full rounded-md object-contain" />
              <span className="flex w-full items-center gap-1 text-xs text-muted">
                <GripVertical className="h-3 w-3" /> {i + 1}
                <span className="truncate">{it.file.name}</span>
              </span>
              <button
                aria-label="Remove"
                onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Page setup">
        <div className="flex flex-col gap-4">
          <Field label="Page size">
            <Select value={size} onChange={(e) => setSize(e.target.value as PageSize)}>
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
              <option value="fit">Same as image</option>
            </Select>
          </Field>
          {size !== "fit" && (
            <Field label="Orientation">
              <Select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
                <option value="auto">Automatic</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </Select>
            </Field>
          )}
          <Field label="Margin (pt)">
            <Input type="number" min={0} max={100} value={margin} onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <Button variant="primary" size="lg" loading={busy} onClick={run}>
            Convert to PDF
          </Button>
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Panel>
    </div>
  );
}
