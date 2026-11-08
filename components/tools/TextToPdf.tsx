"use client";

import { PDFDocument, type PDFFont, rgb, StandardFonts } from "@cantoo/pdf-lib";
import { useState } from "react";
import { Button, ErrorNote, Field, Input, Panel, Select, errorMessage } from "../ui";
import { canvasToBlob, readFileBytes } from "@/lib/files";
import { savePdf } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

const PAGE = { a4: [595.28, 841.89], letter: [612, 792] } as const;
type FontKey = "Helvetica" | "TimesRoman" | "Courier";
const CSS_FONT: Record<FontKey, string> = { Helvetica: "Arial, Helvetica, sans-serif", TimesRoman: "'Times New Roman', serif", Courier: "'Courier New', monospace" };

function wrapLines(text: string, maxW: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r/g, "").split("\n")) {
    if (!para) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      const test = line + word;
      if (measure(test) > maxW && line.trim()) {
        out.push(line.trimEnd());
        line = word.trimStart();
        // break very long words
        while (measure(line) > maxW && line.length > 1) {
          let cut = line.length - 1;
          while (cut > 1 && measure(line.slice(0, cut)) > maxW) cut--;
          out.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      } else line = test;
    }
    out.push(line.trimEnd());
  }
  return out;
}

export default function TextToPdf() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [font, setFont] = useState<FontKey>("Helvetica");
  const [size, setSize] = useState(12);
  const [page, setPage] = useState<keyof typeof PAGE>("a4");
  const [margin, setMargin] = useState(56);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const build = async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await PDFDocument.create();
      if (title) doc.setTitle(title);
      const [pw, ph] = PAGE[page];
      const maxW = pw - margin * 2;
      const lh = size * 1.45;
      const pdfFont = await doc.embedFont(StandardFonts[font]);
      const bold = await doc.embedFont(font === "Helvetica" ? StandardFonts.HelveticaBold : font === "Courier" ? StandardFonts.CourierBold : StandardFonts.TimesRomanBold);

      let supported = true;
      try {
        pdfFont.encodeText(title + body);
      } catch {
        supported = false;
      }

      if (supported) {
        drawVector(doc, pdfFont, bold, { title, body, size, margin, lh, pw, ph, maxW });
      } else {
        // Text in scripts the standard PDF fonts can't encode (e.g. Sinhala, Tamil, Hindi) is drawn with your system fonts.
        await drawRaster(doc, { title, body, size, margin, lh, pw, ph, maxW, cssFont: CSS_FONT[font] });
      }
      showResult(await savePdf(doc), `${(title || "document").replace(/[^\w\- ]+/g, "").trim() || "document"}.pdf`, supported ? undefined : "Your text uses characters outside the standard PDF fonts, so pages were drawn as high-resolution images.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <Panel>
        <div className="flex flex-col gap-3">
          <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 text-lg font-semibold" />
          <textarea
            placeholder="Start typing or paste your text here…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[55vh] w-full rounded-xl border border-line bg-surface p-4 leading-relaxed outline-none focus:border-accent"
            style={{ fontFamily: CSS_FONT[font], fontSize: Math.max(13, size) }}
          />
          <p className="text-xs text-muted">
            {body.trim() ? body.trim().split(/\s+/).length : 0} words · {body.length} characters
          </p>
        </div>
      </Panel>
      <Panel title="Document">
        <div className="flex flex-col gap-4">
          <Field label="Font">
            <Select value={font} onChange={(e) => setFont(e.target.value as FontKey)}>
              <option value="Helvetica">Sans serif</option>
              <option value="TimesRoman">Serif</option>
              <option value="Courier">Monospace</option>
            </Select>
          </Field>
          <Field label="Font size">
            <Select value={size} onChange={(e) => setSize(+e.target.value)}>
              {[9, 10, 11, 12, 13, 14, 16, 18, 20, 24].map((n) => (
                <option key={n} value={n}>
                  {n} pt
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Page size">
            <Select value={page} onChange={(e) => setPage(e.target.value as keyof typeof PAGE)}>
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
            </Select>
          </Field>
          <Field label="Margins">
            <Select value={margin} onChange={(e) => setMargin(+e.target.value)}>
              <option value={36}>Narrow</option>
              <option value={56}>Normal</option>
              <option value={80}>Wide</option>
            </Select>
          </Field>
          <Button variant="primary" size="lg" loading={busy} disabled={!body.trim() && !title.trim()} onClick={build}>
            Create PDF
          </Button>
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Panel>
    </div>
  );
}

interface Layout {
  title: string;
  body: string;
  size: number;
  margin: number;
  lh: number;
  pw: number;
  ph: number;
  maxW: number;
}

function drawVector(doc: PDFDocument, font: PDFFont, bold: PDFFont, L: Layout) {
  let page = doc.addPage([L.pw, L.ph]);
  let y = L.ph - L.margin;
  const newPage = () => {
    page = doc.addPage([L.pw, L.ph]);
    y = L.ph - L.margin;
  };
  if (L.title) {
    const ts = L.size * 1.8;
    for (const line of wrapLines(L.title, L.maxW, (s) => bold.widthOfTextAtSize(s, ts))) {
      y -= ts;
      page.drawText(line, { x: L.margin, y, size: ts, font: bold, color: rgb(0.07, 0.07, 0.1) });
      y -= ts * 0.3;
    }
    y -= L.size;
  }
  for (const line of wrapLines(L.body, L.maxW, (s) => font.widthOfTextAtSize(s, L.size))) {
    if (y - L.lh < L.margin) newPage();
    y -= L.lh;
    if (line) page.drawText(line, { x: L.margin, y, size: L.size, font, color: rgb(0.1, 0.1, 0.12) });
  }
}

async function drawRaster(doc: PDFDocument, L: Layout & { cssFont: string }) {
  const k = 3; // render at 216 dpi
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(L.pw * k);
  canvas.height = Math.round(L.ph * k);
  const ctx = canvas.getContext("2d")!;
  const measure = (font: string) => (s: string) => {
    ctx.font = font;
    return ctx.measureText(s).width;
  };
  const bodyFont = `${L.size}px ${L.cssFont}`;
  const titleSize = L.size * 1.8;
  const titleFont = `bold ${titleSize}px ${L.cssFont}`;

  const lines: { text: string; font: string; size: number; gapAfter: number }[] = [];
  if (L.title) {
    for (const t of wrapLines(L.title, L.maxW, measure(titleFont))) lines.push({ text: t, font: titleFont, size: titleSize, gapAfter: titleSize * 0.3 });
    lines[lines.length - 1].gapAfter += L.size;
  }
  for (const t of wrapLines(L.body, L.maxW, measure(bodyFont))) lines.push({ text: t, font: bodyFont, size: L.size, gapAfter: L.lh - L.size });

  const flush = async () => {
    const jpg = await doc.embedJpg(await readFileBytes(await canvasToBlob(canvas, "image/jpeg", 0.9)));
    doc.addPage([L.pw, L.ph]).drawImage(jpg, { x: 0, y: 0, width: L.pw, height: L.ph });
  };
  const reset = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(k, k);
    ctx.fillStyle = "#1a1a1f";
    ctx.textBaseline = "alphabetic";
  };
  reset();
  let y = L.margin;
  for (const ln of lines) {
    if (y + ln.size > L.ph - L.margin) {
      await flush();
      reset();
      y = L.margin;
    }
    y += ln.size;
    ctx.font = ln.font;
    if (ln.text) ctx.fillText(ln.text, L.margin, y);
    y += ln.gapAfter;
  }
  await flush();
}
