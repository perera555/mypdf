"use client";

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/** Lazily load pdf.js in the browser only and point it at our self-hosted worker. */
export function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}

export class PasswordRequiredError extends Error {
  constructor(public incorrect: boolean) {
    super(incorrect ? "Incorrect password" : "Password required");
  }
}

/** Open a PDF for rendering. The bytes are copied because pdf.js transfers the buffer to its worker. */
export async function openPdf(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  try {
    return await pdfjs.getDocument({ data: bytes.slice(), password }).promise;
  } catch (err) {
    if (err instanceof pdfjs.PasswordException) {
      throw new PasswordRequiredError(err.code === pdfjs.PasswordResponses.INCORRECT_PASSWORD);
    }
    throw err;
  }
}

/** Release a document's worker resources. */
export function closePdf(doc: PDFDocumentProxy | null | undefined) {
  if (doc) void doc.loadingTask.destroy().catch(() => {});
}

/** Render a page into a canvas at the given scale (CSS px per PDF pt). Handles device pixel ratio. */
export async function renderPage(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
  opts: { rotation?: number; hiDpi?: boolean } = {},
) {
  const viewport = page.getViewport({ scale, rotation: (page.rotate + (opts.rotation ?? 0)) % 360 });
  const ratio = opts.hiDpi === false ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  const task = page.render({
    canvas,
    viewport,
    transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
  });
  await task.promise;
  return viewport;
}

/** Render a page to a standalone canvas at an exact pixel scale (no DPR handling) — for exporting. */
export async function renderPageToCanvas(page: PDFPageProxy, scale: number) {
  const canvas = document.createElement("canvas");
  const viewport = page.getViewport({ scale });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, viewport }).promise;
  return canvas;
}
