"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/files";
import { listLibrary, setHandoff, type StoredFile } from "@/lib/library";

/** "Recent" row on the home page, from files saved in My Files. */
export function RecentFiles() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const router = useRouter();
  useEffect(() => {
    listLibrary()
      .then((l) => setFiles(l.slice(0, 6)))
      .catch(() => {});
  }, []);
  if (!files.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent files</h2>
        <Link href="/files" className="text-sm text-accent hover:underline">
          See all
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setHandoff(f.bytes, f.name);
              router.push("/tools/view");
            }}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left shadow-card transition hover:border-accent/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{f.name}</span>
              <span className="text-xs text-muted">
                {formatBytes(f.size)} · {new Date(f.savedAt).toLocaleDateString()}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
