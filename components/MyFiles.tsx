"use client";

import { BookOpen, Check, Download, FileText, Pencil, PenLine, Printer, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DevicesPanel } from "./DevicesPanel";
import { FileDrop } from "./FileDrop";
import { ErrorNote, IconButton, Input, Panel, Spinner, errorMessage } from "./ui";
import { downloadBlob, formatBytes, readFileBytes } from "@/lib/files";
import { deleteFromLibrary, listLibrary, onLibraryChange, renameInLibrary, saveToLibrary, setHandoff, type StoredFile } from "@/lib/library";
import { printPdf } from "@/lib/print";

export function MyFiles() {
  const router = useRouter();
  const [files, setFiles] = useState<StoredFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [usage, setUsage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setFiles(await listLibrary());
      const est = await navigator.storage?.estimate?.();
      if (est?.usage != null && est.quota) setUsage(`${formatBytes(est.usage)} used of ${formatBytes(est.quota)} available`);
    } catch (e) {
      setError(errorMessage(e));
      setFiles([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return onLibraryChange(() => void refresh());
  }, [refresh]);

  const open = (f: StoredFile, tool: string) => {
    setHandoff(f.bytes, f.name);
    router.push(`/tools/${tool}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{usage ?? "Files are stored privately in this browser on this device."}</p>
          <FileDrop
            compact
            multiple
            label="Add PDFs"
            onFiles={async (list) => {
              for (const f of list) await saveToLibrary(await readFileBytes(f), f.name);
            }}
          />
        </div>
        <ErrorNote>{error}</ErrorNote>
        {files === null ? (
          <Spinner />
        ) : files.length === 0 ? (
          <Panel className="flex flex-col items-center gap-3 py-14 text-center">
            <FileText className="h-10 w-10 text-muted" />
            <p className="font-medium">No saved files yet</p>
            <p className="max-w-sm text-sm text-muted">
              After using any tool, press <b>Save to My Files</b> — or add PDFs here to keep them handy, even offline.
            </p>
          </Panel>
        ) : (
          <ul className="flex flex-col gap-2">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card sm:flex-nowrap">
                <button onClick={() => open(f, "view")} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    {renaming?.id === f.id ? null : <p className="truncate text-sm font-medium">{f.name}</p>}
                    <p className="text-xs text-muted">
                      {formatBytes(f.size)} · saved {new Date(f.savedAt).toLocaleString()}
                    </p>
                  </div>
                </button>
                {renaming?.id === f.id && (
                  <form
                    className="flex w-full items-center gap-1 sm:w-auto"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const name = renaming.name.trim();
                      if (name) await renameInLibrary(f.id, name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`);
                      setRenaming(null);
                    }}
                  >
                    <Input autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: f.id, name: e.target.value })} className="h-9" />
                    <IconButton label="Save name" type="submit">
                      <Check className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Cancel" onClick={() => setRenaming(null)}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  </form>
                )}
                <div className="flex items-center gap-0.5">
                  <IconButton label="Open in Reader" onClick={() => open(f, "view")}>
                    <BookOpen className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Edit" onClick={() => open(f, "edit")}>
                    <PenLine className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Print" onClick={() => void printPdf(f.bytes).catch((e) => setError(errorMessage(e)))}>
                    <Printer className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Download" onClick={() => downloadBlob(f.bytes, f.name)}>
                    <Download className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Rename" onClick={() => setRenaming({ id: f.id, name: f.name })}>
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  {confirmId === f.id ? (
                    <button
                      onClick={async () => {
                        await deleteFromLibrary(f.id);
                        setConfirmId(null);
                      }}
                      className="h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white"
                    >
                      Delete?
                    </button>
                  ) : (
                    <IconButton label="Delete" className="hover:text-red-500" onClick={() => setConfirmId(f.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DevicesPanel />
    </div>
  );
}
