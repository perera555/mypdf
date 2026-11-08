"use client";

import { degrees, rgb, StandardFonts } from "@cantoo/pdf-lib";
import { useState } from "react";
import { PageThumb } from "../PageThumb";
import { Button, ErrorNote, Field, Input, Panel, Select, errorMessage } from "../ui";
import { FileBar, WithPdf, type LoadedPdf } from "../WithPdf";
import { baseName, hexToRgb01 } from "@/lib/files";
import { rotateVec, visualFrame } from "@/lib/geometry";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { showResult } from "@/lib/result";

export default function Watermark() {
  return <WithPdf>{(pdf, reset) => <Inner pdf={pdf} reset={reset} />}</WithPdf>;
}

function Inner({ pdf, reset }: { pdf: LoadedPdf; reset: () => void }) {
  const [text, setText] = useState("CONFIDENTIAL");
  const [size, setSize] = useState(60);
  const [opacity, setOpacity] = useState(0.2);
  const [angle, setAngle] = useState(45);
  const [color, setColor] = useState("#e11d48");
  const [font, setFont] = useState<"HelveticaBold" | "Helvetica" | "TimesRomanBold" | "Courier">("HelveticaBold");
  const [tile, setTile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await loadPdfDoc(pdf.bytes, pdf.password);
      const f = await doc.embedFont(StandardFonts[font]);
      const [r, g, b] = hexToRgb01(color);
      const tw = f.widthOfTextAtSize(text, size);
      const th = f.heightAtSize(size, { descender: false });
      for (const page of doc.getPages()) {
        const fr = visualFrame(page);
        const centers: [number, number][] = [];
        if (tile) {
          const stepX = tw + size * 2;
          const stepY = size * 4;
          for (let y = -fr.height; y < fr.height * 2; y += stepY)
            for (let x = -fr.width; x < fr.width * 2; x += stepX) centers.push([x, y]);
        } else centers.push([fr.width / 2, fr.height / 2]);
        for (const [cx, cy] of centers) {
          // anchor = center minus half the rotated text box
          const off = rotateVec(tw / 2, th / 2, angle);
          const p = fr.toPage(cx - off.x, cy - off.y);
          page.drawText(text, {
            x: p.x,
            y: p.y,
            size,
            font: f,
            color: rgb(r, g, b),
            opacity,
            rotate: degrees(angle + fr.rotation),
          });
        }
      }
      showResult(await savePdf(doc), `${baseName(pdf.file.name)}-watermarked.pdf`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FileBar pdf={pdf} onReset={reset} />
      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <Panel className="checker flex items-center justify-center">
          <div className="relative overflow-hidden rounded-md">
            <PageThumb doc={pdf.doc} pageIndex={0} width={300} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className="font-bold whitespace-nowrap"
                style={{ color, opacity, fontSize: size * 0.5, transform: `rotate(${-angle}deg)` }}
              >
                {text}
              </span>
            </div>
          </div>
        </Panel>
        <Panel title="Watermark">
          <div className="flex flex-col gap-4">
            <Field label="Text">
              <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={80} />
            </Field>
            <Field label="Font">
              <Select value={font} onChange={(e) => setFont(e.target.value as typeof font)}>
                <option value="HelveticaBold">Sans bold</option>
                <option value="Helvetica">Sans</option>
                <option value="TimesRomanBold">Serif bold</option>
                <option value="Courier">Monospace</option>
              </Select>
            </Field>
            <Field label={`Size: ${size}pt`}>
              <input type="range" min={12} max={150} value={size} onChange={(e) => setSize(+e.target.value)} className="accent-[var(--accent)]" />
            </Field>
            <Field label={`Opacity: ${Math.round(opacity * 100)}%`}>
              <input type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="accent-[var(--accent)]" />
            </Field>
            <Field label={`Angle: ${angle}°`}>
              <input type="range" min={-90} max={90} value={angle} onChange={(e) => setAngle(+e.target.value)} className="accent-[var(--accent)]" />
            </Field>
            <Field label="Color">
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="p-1" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={tile} onChange={(e) => setTile(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Repeat across the page
            </label>
            <Button variant="primary" size="lg" loading={busy} disabled={!text.trim()} onClick={save}>
              Add watermark
            </Button>
            <ErrorNote>{error}</ErrorNote>
          </div>
        </Panel>
      </div>
    </div>
  );
}
