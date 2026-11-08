"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { renderPage } from "@/lib/pdfjs";

/** Lazily renders a single page thumbnail once it scrolls into view. */
export function PageThumb({
  doc,
  pageIndex,
  width = 140,
  rotation = 0,
  className = "",
}: {
  doc: PDFDocumentProxy;
  pageIndex: number;
  width?: number;
  rotation?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageIndex + 1);
      if (cancelled || !canvasRef.current) return;
      const vp = page.getViewport({ scale: 1, rotation: (page.rotate + rotation) % 360 });
      // Render offscreen, then copy, so overlapping renders never share a canvas.
      const off = document.createElement("canvas");
      await renderPage(page, off, width / vp.width, { rotation });
      const target = canvasRef.current;
      if (cancelled || !target) return;
      target.width = off.width;
      target.height = off.height;
      target.style.width = off.style.width;
      target.style.height = off.style.height;
      target.getContext("2d")!.drawImage(off, 0, 0);
      setReady(true);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, doc, pageIndex, width, rotation]);

  return (
    <div
      ref={wrapRef}
      className={`relative flex items-center justify-center overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5 ${className}`}
      style={{ width, minHeight: ready ? undefined : width * 1.3 }}
    >
      <canvas ref={canvasRef} className={`block transition-opacity ${ready ? "opacity-100" : "opacity-0"}`} />
      {!ready && <div className="absolute inset-0 animate-pulse bg-zinc-200/60" />}
    </div>
  );
}
