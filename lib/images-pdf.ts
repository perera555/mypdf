"use client";

import { PDFDocument } from "@cantoo/pdf-lib";
import { imageFileToEmbeddable } from "./files";
import { savePdf } from "./pdfdoc";

export type PageSize = "fit" | "a4" | "letter";
export type Orientation = "auto" | "portrait" | "landscape";

const SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const;

/** Build a PDF with one image per page. */
export async function imagesToPdf(
  images: (File | Blob)[],
  opts: { size: PageSize; orientation: Orientation; margin: number },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const file of images) {
    const f = file instanceof File ? file : new File([file], "scan.jpg", { type: file.type });
    const { bytes, kind, width, height } = await imageFileToEmbeddable(f);
    const img = kind === "jpg" ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
    let pw: number, ph: number;
    if (opts.size === "fit") {
      // 1 image pixel = 0.75pt (96 dpi), capped to a sensible page size
      const k = Math.min(0.75, 1600 / Math.max(width, height));
      pw = width * k + opts.margin * 2;
      ph = height * k + opts.margin * 2;
    } else {
      const [a, b] = SIZES[opts.size];
      const landscape = opts.orientation === "landscape" || (opts.orientation === "auto" && width > height);
      [pw, ph] = landscape ? [b, a] : [a, b];
    }
    const page = doc.addPage([pw, ph]);
    const aw = pw - opts.margin * 2;
    const ah = ph - opts.margin * 2;
    const s = Math.min(aw / width, ah / height);
    const w = width * s;
    const h = height * s;
    page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }
  return savePdf(doc);
}
