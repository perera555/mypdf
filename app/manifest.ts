import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MyPDF — Free PDF tools",
    short_name: "MyPDF",
    description: "Read, edit, sign, scan, print, merge, split, compress, convert and protect PDFs. Free, private and offline.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#0b0d12",
    theme_color: "#e11d48",
    categories: ["productivity", "utilities", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Edit PDF", url: "/tools/edit" },
      { name: "Scan to PDF", url: "/tools/scan" },
      { name: "Merge PDF", url: "/tools/merge" },
      { name: "My Files", url: "/files" },
    ],
    file_handlers: [{ action: "/tools/view", accept: { "application/pdf": [".pdf"] } }],
  } as MetadataRoute.Manifest;
}
