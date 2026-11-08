"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { ResultDialog } from "./ResultDialog";
import { Spinner } from "./ui";

const loading = () => <Spinner label="Loading tool…" />;

// next/dynamic needs its options as an inline object literal.
const TOOL_COMPONENTS: Record<string, ComponentType> = {
  view: dynamic(() => import("./tools/Viewer"), { ssr: false, loading }),
  edit: dynamic(() => import("./tools/Editor").then((m) => m.EditTool), { ssr: false, loading }),
  sign: dynamic(() => import("./tools/Editor").then((m) => m.SignTool), { ssr: false, loading }),
  redact: dynamic(() => import("./tools/Editor").then((m) => m.RedactTool), { ssr: false, loading }),
  "create-signature": dynamic(() => import("./tools/CreateSignature"), { ssr: false, loading }),
  "seal-creator": dynamic(() => import("./tools/SealCreator"), { ssr: false, loading }),
  "fill-forms": dynamic(() => import("./tools/FillForms"), { ssr: false, loading }),
  merge: dynamic(() => import("./tools/Merge"), { ssr: false, loading }),
  split: dynamic(() => import("./tools/Split"), { ssr: false, loading }),
  organize: dynamic(() => import("./tools/Organize"), { ssr: false, loading }),
  rotate: dynamic(() => import("./tools/Rotate"), { ssr: false, loading }),
  crop: dynamic(() => import("./tools/Crop"), { ssr: false, loading }),
  "page-numbers": dynamic(() => import("./tools/PageNumbers"), { ssr: false, loading }),
  watermark: dynamic(() => import("./tools/Watermark"), { ssr: false, loading }),
  scan: dynamic(() => import("./tools/Scan"), { ssr: false, loading }),
  "images-to-pdf": dynamic(() => import("./tools/ImagesToPdf"), { ssr: false, loading }),
  "pdf-to-images": dynamic(() => import("./tools/PdfToImages"), { ssr: false, loading }),
  "pdf-to-text": dynamic(() => import("./tools/PdfToText"), { ssr: false, loading }),
  "text-to-pdf": dynamic(() => import("./tools/TextToPdf"), { ssr: false, loading }),
  compress: dynamic(() => import("./tools/Compress"), { ssr: false, loading }),
  protect: dynamic(() => import("./tools/Protect"), { ssr: false, loading }),
  unlock: dynamic(() => import("./tools/Unlock"), { ssr: false, loading }),
  metadata: dynamic(() => import("./tools/Metadata"), { ssr: false, loading }),
};

export function ToolLoader({ slug }: { slug: string }) {
  const Tool = TOOL_COMPONENTS[slug];
  if (!Tool) return null;
  return (
    <>
      <Tool />
      <ResultDialog />
    </>
  );
}
