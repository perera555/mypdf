"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderHeart,
  Maximize,
  PanelLeft,
  Printer,
  RotateCw,
  Search,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageThumb } from "../PageThumb";
import { ErrorNote, IconButton, errorMessage } from "../ui";
import { WithPdf, type LoadedPdf } from "../WithPdf";
import { downloadBlob } from "@/lib/files";
import { saveToLibrary } from "@/lib/library";
import { getPdfjs } from "@/lib/pdfjs";
import { loadPdfDoc, savePdf } from "@/lib/pdfdoc";
import { printPdf } from "@/lib/print";

export default function Viewer() {
  return (
    <WithPdf dropLabel="Open a PDF">
      {(pdf, reset, replace) => <ViewerInner key={pdf.file.name + pdf.bytes.length} pdf={pdf} reset={reset} replace={replace} />}
    </WithPdf>
  );
}

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

function ViewerInner({
  pdf,
  reset,
  replace,
}: {
  pdf: LoadedPdf;
  reset: () => void;
  replace: (bytes: Uint8Array, name?: string) => Promise<void>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [sizes, setSizes] = useState<{ w: number; h: number }[] | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [sidebar, setSidebar] = useState(true);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [hits, setHits] = useState<number[] | null>(null);
  const [hitIdx, setHitIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Measure all pages once, then fit to width.
  useEffect(() => {
    let live = true;
    (async () => {
      const out: { w: number; h: number }[] = [];
      for (let i = 1; i <= pdf.pageCount; i++) {
        const vp = (await pdf.doc.getPage(i)).getViewport({ scale: 1 });
        out.push({ w: vp.width, h: vp.height });
      }
      if (!live) return;
      setSizes(out);
      const avail = (scrollRef.current?.clientWidth ?? 800) - 48;
      setScale(Math.min(1.5, Math.max(0.4, avail / Math.max(...out.map((s) => s.w)))));
    })();
    setSidebar(window.innerWidth >= 1024);
    return () => {
      live = false;
    };
  }, [pdf]);

  const goTo = useCallback((n: number) => {
    const el = pageRefs.current[n - 1];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Track which page is in view.
  const onScroll = () => {
    const box = scrollRef.current;
    if (!box) return;
    const mid = box.scrollTop + box.clientHeight / 3;
    let n = 1;
    pageRefs.current.forEach((el, i) => {
      if (el && el.offsetTop <= mid) n = i + 1;
    });
    if (n !== current) {
      setCurrent(n);
      setPageInput(String(n));
    }
  };

  const fitWidth = () => {
    if (!sizes) return;
    const avail = (scrollRef.current?.clientWidth ?? 800) - 48;
    const w = Math.max(...sizes.map((s) => (rotation % 180 ? s.h : s.w)));
    setScale(Math.max(0.25, avail / w));
  };

  const zoom = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOMS.find((z) => z > scale + 0.01) : [...ZOOMS].reverse().find((z) => z < scale - 0.01);
    setScale(next ?? scale);
  };

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) {
      setHits(null);
      setActiveQuery("");
      return;
    }
    setSearching(true);
    const found: number[] = [];
    for (let i = 1; i <= pdf.pageCount; i++) {
      const tc = await (await pdf.doc.getPage(i)).getTextContent();
      const text = tc.items.map((it) => ("str" in it ? it.str : "")).join(" ").toLowerCase();
      if (text.includes(q)) found.push(i);
    }
    setSearching(false);
    setHits(found);
    setHitIdx(0);
    setActiveQuery(q);
    if (found.length) goTo(found[0]);
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const deleteCurrent = () =>
    run("delete", async () => {
      if (pdf.pageCount <= 1) throw new Error("A PDF needs at least one page.");
      if (!window.confirm(`Delete page ${current} of ${pdf.pageCount}?`)) return;
      const doc = await loadPdfDoc(pdf.bytes, pdf.password);
      doc.removePage(current - 1);
      await replace(await savePdf(doc));
    });

  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card md:h-[calc(100dvh-14rem)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
        <IconButton label="Toggle thumbnails" active={sidebar} onClick={() => setSidebar((s) => !s)}>
          <PanelLeft className="h-4 w-4" />
        </IconButton>
        <div className="mx-1 h-6 w-px bg-line" />
        <IconButton label="Previous page" disabled={current <= 1} onClick={() => goTo(current - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Math.min(pdf.pageCount, Math.max(1, parseInt(pageInput, 10) || 1));
            goTo(n);
          }}
          className="flex items-center gap-1 text-sm"
        >
          <input
            aria-label="Page number"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="h-8 w-12 rounded-lg border border-line bg-surface-2 text-center text-sm outline-none focus:border-accent"
          />
          <span className="text-muted">/ {pdf.pageCount}</span>
        </form>
        <IconButton label="Next page" disabled={current >= pdf.pageCount} onClick={() => goTo(current + 1)}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
        <div className="mx-1 h-6 w-px bg-line" />
        <IconButton label="Zoom out" onClick={() => zoom(-1)}>
          <ZoomOut className="h-4 w-4" />
        </IconButton>
        <button onClick={fitWidth} className="h-8 min-w-14 rounded-lg px-2 text-xs font-medium text-muted hover:bg-surface-2 hover:text-fg" title="Fit to width">
          {Math.round(scale * 100)}%
        </button>
        <IconButton label="Zoom in" onClick={() => zoom(1)}>
          <ZoomIn className="h-4 w-4" />
        </IconButton>
        <IconButton label="Rotate view" onClick={() => setRotation((r) => (r + 90) % 360)}>
          <RotateCw className="h-4 w-4" />
        </IconButton>
        <IconButton
          label="Full screen"
          className="hidden sm:inline-flex"
          onClick={() => scrollRef.current?.parentElement?.parentElement?.requestFullscreen?.().catch(() => {})}
        >
          <Maximize className="h-4 w-4" />
        </IconButton>

        <form onSubmit={search} className="relative order-last w-full sm:order-none sm:ml-auto sm:w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searching ? "Searching…" : "Search text"}
            aria-label="Search in document"
            className="h-8 w-full rounded-lg border border-line bg-surface-2 pr-16 pl-8 text-sm outline-none focus:border-accent"
          />
          {hits && (
            <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5 text-xs text-muted">
              {hits.length ? (
                <>
                  <button
                    type="button"
                    aria-label="Previous match"
                    onClick={() => {
                      const i = (hitIdx - 1 + hits.length) % hits.length;
                      setHitIdx(i);
                      goTo(hits[i]);
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {hitIdx + 1}/{hits.length}
                  <button
                    type="button"
                    aria-label="Next match"
                    onClick={() => {
                      const i = (hitIdx + 1) % hits.length;
                      setHitIdx(i);
                      goTo(hits[i]);
                    }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                "0"
              )}
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setHits(null);
                  setActiveQuery("");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </form>

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <IconButton label="Print" disabled={busy === "print"} onClick={() => run("print", () => printPdf(pdf.bytes))}>
          <Printer className="h-4 w-4" />
        </IconButton>
        <IconButton label="Download" onClick={() => downloadBlob(pdf.bytes, pdf.file.name)}>
          <Download className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={saved ? "Saved to My Files" : "Save to My Files"}
          active={saved}
          onClick={() =>
            run("save", async () => {
              await saveToLibrary(pdf.bytes, pdf.file.name);
              setSaved(true);
            })
          }
        >
          {saved ? <Check className="h-4 w-4" /> : <FolderHeart className="h-4 w-4" />}
        </IconButton>
        <IconButton label={`Delete page ${current}`} className="hover:text-red-500" disabled={busy === "delete"} onClick={deleteCurrent}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
        <IconButton label="Close file" onClick={reset}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      {error && (
        <div className="border-b border-line p-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {sidebar && (
          <aside className="thin-scroll w-36 shrink-0 overflow-y-auto border-r border-line bg-surface-2 p-3">
            <div className="flex flex-col items-center gap-3">
              {Array.from({ length: pdf.pageCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i + 1)}
                  className={`flex flex-col items-center gap-1 rounded-lg p-1.5 transition ${current === i + 1 ? "bg-accent/15 ring-2 ring-accent" : "hover:bg-surface"}`}
                >
                  <PageThumb doc={pdf.doc} pageIndex={i} width={96} rotation={rotation} />
                  <span className={`text-[11px] ${hits?.includes(i + 1) ? "font-bold text-amber-500" : "text-muted"}`}>{i + 1}</span>
                </button>
              ))}
            </div>
          </aside>
        )}
        <div ref={scrollRef} onScroll={onScroll} className="thin-scroll checker flex-1 overflow-auto">
          <div className="flex min-w-fit flex-col items-center gap-4 p-6">
            {sizes?.map((s, i) => (
              <div key={i} ref={(el) => void (pageRefs.current[i] = el)} className="scroll-mt-4">
                <PageView
                  doc={pdf.doc}
                  index={i}
                  scale={scale}
                  rotation={rotation}
                  width={(rotation % 180 ? s.h : s.w) * scale}
                  height={(rotation % 180 ? s.w : s.h) * scale}
                  query={activeQuery}
                  root={scrollRef}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageView({
  doc,
  index,
  scale,
  rotation,
  width,
  height,
  query,
  root,
}: {
  doc: PDFDocumentProxy;
  index: number;
  scale: number;
  rotation: number;
  width: number;
  height: number;
  query: string;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => setVisible(e[0].isIntersecting), { root: root.current, rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (!visible) return;
    let task: RenderTask | null = null;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(index + 1);
      const canvas = canvasRef.current;
      const textDiv = textRef.current;
      if (cancelled || !canvas || !textDiv) return;
      const viewport = page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const off = document.createElement("canvas");
      off.width = Math.floor(viewport.width * ratio);
      off.height = Math.floor(viewport.height * ratio);
      task = page.render({ canvas: off, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
      await task.promise;
      if (cancelled) return;
      canvas.width = off.width;
      canvas.height = off.height;
      canvas.getContext("2d")!.drawImage(off, 0, 0);

      // Selectable text layer
      const { TextLayer } = await getPdfjs();
      textDiv.replaceChildren();
      textDiv.style.setProperty("--total-scale-factor", String(scale));
      const tl = new TextLayer({ textContentSource: page.streamTextContent(), container: textDiv, viewport });
      await tl.render();
      if (query && !cancelled) {
        textDiv.querySelectorAll("span").forEach((sp) => {
          if (sp.textContent?.toLowerCase().includes(query)) sp.classList.add("search-hit");
        });
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, index, scale, rotation, query]);

  return (
    <div ref={wrapRef} className="relative bg-white shadow-lg ring-1 ring-black/5" style={{ width, height }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div ref={textRef} className="textLayer" />
    </div>
  );
}
