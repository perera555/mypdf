"use client";

import { FileUp, ShieldCheck } from "lucide-react";
import { useId, useRef, useState } from "react";

export function FileDrop({
  onFiles,
  accept = "application/pdf,.pdf",
  multiple = false,
  label,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const isPdf = accept.includes("pdf");
  const text = label ?? (multiple ? `Choose ${isPdf ? "PDF files" : "files"}` : `Choose a ${isPdf ? "PDF" : "file"}`);

  const accepts = (f: File) => {
    const parts = accept.split(",").map((s) => s.trim().toLowerCase());
    const name = f.name.toLowerCase();
    return parts.some((p) =>
      p.startsWith(".") ? name.endsWith(p) : p.endsWith("/*") ? f.type.startsWith(p.slice(0, -1)) : f.type === p,
    );
  };

  const handle = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list).filter(accepts);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 text-sm font-medium text-fg transition hover:border-accent hover:text-accent"
        >
          <FileUp className="h-4 w-4" /> {text}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            handle(e.target.files);
            e.target.value = "";
          }}
        />
      </>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      className={`fade-up relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-16 text-center transition ${
        dragging ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-accent/50"
      }`}
    >
      <div className="brand-gradient flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg">
        <FileUp className="h-8 w-8" />
      </div>
      <div>
        <label htmlFor={id} className="brand-gradient inline-flex h-12 cursor-pointer items-center rounded-xl px-7 font-semibold text-white shadow-md transition hover:brightness-110">
          {text}
        </label>
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            handle(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="mt-3 text-sm text-muted">or drop {multiple ? "them" : "it"} here</p>
      </div>
      <p className="inline-flex items-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Processed on your device — nothing is uploaded
      </p>
    </div>
  );
}
