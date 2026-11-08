"use client";

import { PDFDocument } from "@cantoo/pdf-lib";

/**
 * Load a PDF for modification with pdf-lib.
 * Encrypted files (including ones with only an owner password / permission restrictions)
 * are decrypted and copied into a fresh, unencrypted document so the result saves cleanly.
 */
export async function loadPdfDoc(bytes: Uint8Array, password?: string): Promise<PDFDocument> {
  let encrypted = false;
  try {
    const probe = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    encrypted = probe.isEncrypted;
    if (!encrypted) return probe;
  } catch {
    // fall through to the password path
    encrypted = true;
  }
  const src = await PDFDocument.load(bytes, { password: password ?? "", updateMetadata: false });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => out.addPage(p));
  const title = src.getTitle();
  if (title) out.setTitle(title);
  const author = src.getAuthor();
  if (author) out.setAuthor(author);
  return out;
}

export async function savePdf(doc: PDFDocument, opts: { updateFieldAppearances?: boolean } = {}): Promise<Uint8Array> {
  doc.setProducer("MyPDF");
  doc.setModificationDate(new Date());
  return doc.save({ useObjectStreams: true, updateFieldAppearances: opts.updateFieldAppearances ?? true });
}
