import type { Metadata } from "next";
import { FolderHeart } from "lucide-react";
import { MyFilesClient } from "./client";

export const metadata: Metadata = {
  title: "My Files",
  description: "Your saved PDFs — open, edit, print, download, rename or delete them. Stored privately on this device.",
};

export default function FilesPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-4">
        <div className="brand-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md">
          <FolderHeart className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Files</h1>
          <p className="text-muted">Saved PDFs stay on this device. Open, edit, print, download, rename or delete them.</p>
        </div>
      </div>
      <MyFilesClient />
    </div>
  );
}
