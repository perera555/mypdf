"use client";

import {
  BlendMode,
  degrees,
  PDFBool,
  PDFCheckBox,
  type PDFDocument,
  PDFDropdown,
  type PDFFont,
  PDFName,
  PDFOptionList,
  type PDFPage,
  PDFRadioGroup,
  PDFTextField,
  rgb,
  StandardFonts,
} from "@cantoo/pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { canvasToBlob, hexToRgb01, readFileBytes } from "@/lib/files";
import { visualFrame } from "@/lib/geometry";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { renderPageToCanvas } from "@/lib/pdfjs";
import { type EditorObj, FONT_CSS, type FontName, measureText, type TextObj } from "./types";

const color = (hex: string) => {
  const [r, g, b] = hexToRgb01(hex);
  return rgb(r, g, b);
};

async function dataUrlBytes(src: string) {
  return new Uint8Array(await (await fetch(src)).arrayBuffer());
}

/** Draw text that the standard PDF fonts cannot encode (e.g. Sinhala, Tamil, emoji) as a sharp image. */
function textToPng(o: TextObj): string {
  const scale = 4;
  const box = measureText(o);
  const c = document.createElement("canvas");
  c.width = Math.ceil(box.w * scale) + 8;
  c.height = Math.ceil(box.h * scale) + 8;
  const ctx = c.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = o.color;
  ctx.font = `${o.bold ? "bold " : ""}${o.size}px ${FONT_CSS[o.font]}`;
  ctx.textBaseline = "alphabetic";
  o.text.split("\n").forEach((line, i) => ctx.fillText(line, 0, o.size * (0.85 + i * 1.2)));
  return c.toDataURL("image/png");
}

export type FieldValue = string | boolean;

/** Write values into the PDF's own interactive form fields. Returns false if appearances couldn't be generated. */
function fillFields(doc: PDFDocument, values: Record<string, FieldValue>): boolean {
  const names = Object.keys(values);
  if (!names.length) return true;
  const form = doc.getForm();
  for (const name of names) {
    const f = form.getFieldMaybe(name);
    const v = values[name];
    try {
      if (f instanceof PDFTextField) f.setText(String(v) || undefined);
      else if (f instanceof PDFCheckBox) (v ? f.check() : f.uncheck());
      else if (f instanceof PDFRadioGroup && typeof v === "string" && v) f.select(v);
      else if ((f instanceof PDFDropdown || f instanceof PDFOptionList) && typeof v === "string" && v) f.select(v);
    } catch {
      /* value not allowed for this field — skip it */
    }
  }
  try {
    form.updateFieldAppearances();
    return true;
  } catch {
    // Characters outside the standard fonts (e.g. Sinhala): let the PDF viewer draw the field text itself.
    form.acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);
    return false;
  }
}

export async function exportEdits(
  bytes: Uint8Array,
  password: string | undefined,
  source: PDFDocumentProxy,
  objects: EditorObj[],
  fieldValues: Record<string, FieldValue> = {},
): Promise<Uint8Array> {
  const doc = await loadPdfDoc(bytes, password);
  const appearancesOk = fillFields(doc, fieldValues);
  const fonts = new Map<string, PDFFont>();
  const font = async (name: FontName, bold: boolean) => {
    const key = `${name}-${bold}`;
    if (!fonts.has(key)) {
      const sf =
        name === "Times"
          ? bold
            ? StandardFonts.TimesRomanBold
            : StandardFonts.TimesRoman
          : name === "Courier"
            ? bold
              ? StandardFonts.CourierBold
              : StandardFonts.Courier
            : bold
              ? StandardFonts.HelveticaBold
              : StandardFonts.Helvetica;
      fonts.set(key, await doc.embedFont(sf));
    }
    return fonts.get(key)!;
  };

  const pages = [...new Set(objects.map((o) => o.page))].sort((a, b) => a - b);
  for (const pageIdx of pages) {
    const objs = objects.filter((o) => o.page === pageIdx);
    let page = doc.getPage(pageIdx);

    // True redaction: flatten the page to an image with the boxes burned in, so the hidden content is gone.
    const redactions = objs.filter((o) => o.kind === "redact");
    if (redactions.length) {
      const k = 2;
      const canvas = await renderPageToCanvas(await source.getPage(pageIdx + 1), k);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#000";
      for (const r of redactions) if (r.kind === "redact") ctx.fillRect(r.x * k, r.y * k, r.w * k, r.h * k);
      const jpg = await doc.embedJpg(await readFileBytes(await canvasToBlob(canvas, "image/jpeg", 0.92)));
      const w = canvas.width / k;
      const h = canvas.height / k;
      doc.removePage(pageIdx);
      page = doc.insertPage(pageIdx, [w, h]);
      page.drawImage(jpg, { x: 0, y: 0, width: w, height: h });
    }

    const f = visualFrame(page);
    // Editor coordinates are visual, top-left origin; convert to page space.
    const P = (x: number, y: number) => f.toPage(x, f.height - y);
    const rot = degrees(f.rotation);

    for (const o of objs) {
      switch (o.kind) {
        case "redact":
          break;
        case "rect":
        case "whiteout":
        case "highlight": {
          const p = P(o.x, o.y + o.h);
          page.drawRectangle({
            x: p.x,
            y: p.y,
            width: o.w,
            height: o.h,
            rotate: rot,
            color: o.fill ? color(o.fill) : undefined,
            borderColor: o.kind === "rect" && o.strokeWidth > 0 ? color(o.stroke) : undefined,
            borderWidth: o.kind === "rect" ? o.strokeWidth : 0,
            opacity: o.fill ? o.opacity : undefined,
            borderOpacity: o.kind === "rect" ? o.opacity : undefined,
            blendMode: o.kind === "highlight" ? BlendMode.Multiply : undefined,
          });
          break;
        }
        case "ellipse": {
          const p = P(o.x + o.w / 2, o.y + o.h / 2);
          page.drawEllipse({
            x: p.x,
            y: p.y,
            xScale: o.w / 2,
            yScale: o.h / 2,
            rotate: rot,
            color: o.fill ? color(o.fill) : undefined,
            borderColor: o.strokeWidth > 0 ? color(o.stroke) : undefined,
            borderWidth: o.strokeWidth,
            opacity: o.opacity,
            borderOpacity: o.opacity,
          });
          break;
        }
        case "line":
        case "arrow": {
          const seg = (x1: number, y1: number, x2: number, y2: number) =>
            page.drawLine({ start: P(x1, y1), end: P(x2, y2), thickness: o.strokeWidth, color: color(o.stroke), opacity: o.opacity, lineCap: 1 });
          seg(o.x1, o.y1, o.x2, o.y2);
          if (o.kind === "arrow") {
            const a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1);
            const len = Math.max(8, o.strokeWidth * 4);
            for (const d of [Math.PI * 0.82, -Math.PI * 0.82]) seg(o.x2, o.y2, o.x2 + len * Math.cos(a + d), o.y2 + len * Math.sin(a + d));
          }
          break;
        }
        case "draw":
          for (const s of o.strokes) {
            for (let i = 1; i < s.length; i++) {
              page.drawLine({ start: P(...s[i - 1]), end: P(...s[i]), thickness: o.strokeWidth, color: color(o.stroke), opacity: o.opacity, lineCap: 1 });
            }
            if (s.length === 1) page.drawCircle({ ...P(...s[0]), size: o.strokeWidth / 2, color: color(o.stroke), opacity: o.opacity });
          }
          break;
        case "text": {
          if (!o.text.trim()) break;
          const pf = await font(o.font, o.bold);
          try {
            o.text.split("\n").forEach((line, i) => {
              if (!line) return;
              const p = P(o.x, o.y + o.size * (0.85 + i * 1.2));
              page.drawText(line, { x: p.x, y: p.y, size: o.size, font: pf, color: color(o.color), rotate: rot });
            });
          } catch {
            const png = await doc.embedPng(await dataUrlBytes(textToPng(o)));
            const box = measureText(o);
            const scale = 4;
            const w = png.width / scale;
            const h = png.height / scale;
            const p = P(box.x, box.y + h);
            page.drawImage(png, { x: p.x, y: p.y, width: w, height: h, rotate: rot });
          }
          break;
        }
        case "image": {
          const b = await dataUrlBytes(o.src);
          const img = o.src.startsWith("data:image/jpeg") ? await doc.embedJpg(b) : await doc.embedPng(b);
          const p = P(o.x, o.y + o.h);
          page.drawImage(img, { x: p.x, y: p.y, width: o.w, height: o.h, rotate: rot });
          break;
        }
        case "stamp": {
          const p = P(o.x, o.y + o.h);
          page.drawRectangle({ x: p.x, y: p.y, width: o.w, height: o.h, rotate: rot, borderColor: color(o.color), borderWidth: Math.max(1.5, o.h * 0.06), opacity: 0, borderOpacity: 0.85 });
          const pf = await font("Helvetica", true);
          const size = o.h * 0.5;
          const tw = pf.widthOfTextAtSize(o.text, size);
          const fit = Math.min(size, (size * (o.w * 0.88)) / tw);
          const tw2 = pf.widthOfTextAtSize(o.text, fit);
          const tp = P(o.x + (o.w - tw2) / 2, o.y + o.h / 2 + fit * 0.35);
          page.drawText(o.text, { x: tp.x, y: tp.y, size: fit, font: pf, color: color(o.color), opacity: 0.85, rotate: rot });
          break;
        }
        case "note": {
          const p = P(o.x, o.y + o.h);
          page.drawRectangle({ x: p.x, y: p.y, width: o.w, height: o.h, rotate: rot, color: rgb(1, 0.95, 0.6), borderColor: rgb(0.85, 0.7, 0.1), borderWidth: 1 });
          const pf = await font("Helvetica", false);
          const size = 10;
          const lines = wrap(o.text, pf, size, o.w - 12);
          lines.slice(0, Math.floor((o.h - 8) / (size * 1.25))).forEach((line, i) => {
            const tp = P(o.x + 6, o.y + 6 + size * (0.85 + i * 1.25));
            try {
              page.drawText(line, { x: tp.x, y: tp.y, size, font: pf, color: rgb(0.2, 0.2, 0.2), rotate: rot });
            } catch {
              /* unsupported characters in a note are skipped */
            }
          });
          break;
        }
      }
    }
  }
  return savePdf(doc, { updateFieldAppearances: appearancesOk });
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      let w = maxW + 1;
      try {
        w = font.widthOfTextAtSize(test, size);
      } catch {
        w = test.length * size * 0.5;
      }
      if (w > maxW && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export type { PDFDocument, PDFPage };
