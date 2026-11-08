"use client";

import { PDFDocument, rgb, StandardFonts } from "@cantoo/pdf-lib";
import { ChevronDown, Printer, RefreshCw, ScanLine, Settings, Usb, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ErrorNote, Panel, errorMessage } from "./ui";
import { helperAvailable, listDevices, type Printer as PrinterInfo, type Scanner, scanPage } from "@/lib/device-helper";
import { printPdf } from "@/lib/print";

type OS = "windows" | "mac" | "android" | "ios" | "linux" | "other";

function detectOS(): OS {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  if (/Android/i.test(ua)) return "android";
  if (/Linux/i.test(ua)) return "linux";
  return "other";
}

const STEPS: Record<OS, { printer: string[]; scanner: string[] }> = {
  windows: {
    printer: [
      "Click “Add a printer or scanner” (or Settings → Bluetooth & devices → Printers & scanners).",
      "Windows automatically finds USB printers and Wi-Fi printers on the same network.",
      "Not listed? Click “Add device”, then “Add manually” to enter its IP address.",
    ],
    scanner: [
      "Scanners are added in the same Printers & scanners page — most all-in-one printers appear automatically.",
      "Scan with the free “Windows Scan” app, save as JPG/PNG, then drop the files into Scan to PDF.",
    ],
  },
  mac: {
    printer: [
      "Open System Settings → Printers & Scanners.",
      "Click “Add Printer, Scanner or Fax…” — USB and AirPrint Wi-Fi printers are found automatically.",
      "Not listed? Use the IP tab to add it manually by address.",
    ],
    scanner: ["Open the Image Capture app, pick your scanner, scan to JPG/PNG, then drop the files into Scan to PDF."],
  },
  android: {
    printer: [
      "Open Settings → Connected devices → Printing (or search “Printing”).",
      "Turn on Default Print Service — Wi-Fi printers on your network are found automatically.",
      "Use “Add printer” to add one by IP address.",
    ],
    scanner: ["Use the Scan to PDF tool with your phone camera — it works as a scanner."],
  },
  ios: {
    printer: ["iPhone and iPad find AirPrint printers on the same Wi-Fi automatically — just tap Print, then “Printer”."],
    scanner: ["Use the Scan to PDF tool with your camera — it works as a scanner."],
  },
  linux: {
    printer: ["Open Settings → Printers and click “Add Printer” — network and USB printers are detected automatically."],
    scanner: ["Use “Document Scanner” (Simple Scan), save as images, then drop them into Scan to PDF."],
  },
  other: {
    printer: ["Add your printer in your device’s system settings. It will then appear in the print dialog."],
    scanner: ["Scan with your scanner’s software, then drop the images into Scan to PDF — or use your camera."],
  },
};

async function testPage(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawRectangle({ x: 40, y: 40, width: 515.28, height: 761.89, borderColor: rgb(0.88, 0.11, 0.28), borderWidth: 2 });
  page.drawText("MyPDF - printer test page", { x: 60, y: 760, size: 22, font: bold });
  page.drawText(`Printed ${new Date().toLocaleString()}`, { x: 60, y: 730, size: 11, font, color: rgb(0.35, 0.35, 0.4) });
  const colors = [rgb(0, 0, 0), rgb(0.88, 0.11, 0.28), rgb(0.49, 0.23, 0.93), rgb(0, 0.6, 0.9), rgb(1, 0.85, 0)];
  colors.forEach((c, i) => page.drawRectangle({ x: 60 + i * 95, y: 600, width: 80, height: 80, color: c }));
  page.drawText("If you can read this and see five colour squares, your printer works.", { x: 60, y: 560, size: 12, font });
  return doc.save();
}

type HelperState = "checking" | "connected" | "missing";

const STATUS_DOT: Record<string, string> = { Normal: "bg-emerald-500", Offline: "bg-zinc-400", Error: "bg-red-500", PaperJam: "bg-red-500", PaperOut: "bg-amber-500" };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="brand-gradient flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white">{n}</span>
      <span>{children}</span>
    </li>
  );
}

export function DevicesPanel({
  focus = "both",
  onScanned,
}: {
  focus?: "printer" | "scanner" | "both";
  /** When given, shows scan controls and passes each scanned page here. */
  onScanned?: (page: Blob) => void;
}) {
  const [os, setOs] = useState<OS>("other");
  const [helper, setHelper] = useState<HelperState>("checking");
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [scannerId, setScannerId] = useState("");
  const [dpi, setDpi] = useState(200);
  const [mode, setMode] = useState<"color" | "gray" | "bw">("color");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const running = useRef(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const detect = useCallback(async () => {
    // The helper answers one request at a time, so never run two detections at once.
    if (running.current) return;
    running.current = true;
    setHelper("checking");
    setError(null);
    try {
      if (!(await helperAvailable())) {
        setHelper("missing");
        return;
      }
      setHelper("connected");
      setLoadingDevices(true);
      const d = await listDevices();
      setScanners(d.scanners);
      setPrinters([...d.printers].sort((a, b) => Number(b.default) - Number(a.default)));
      setScannerId((cur) => cur || d.scanners[0]?.id || "");
    } catch (e) {
      setError(`Could not read devices: ${errorMessage(e)}`);
    } finally {
      setLoadingDevices(false);
      running.current = false;
    }
  }, []);

  useEffect(() => {
    const o = detectOS();
    setOs(o);
    if (o === "windows") void detect();
    else setHelper("missing");
  }, [detect]);

  const steps = STEPS[os];
  const realPrinters = printers.filter((p) => p.type !== "Virtual");
  const virtualPrinters = printers.filter((p) => p.type === "Virtual");

  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-semibold">Scanners &amp; printers</h2>
          <p className="text-xs text-muted">
            {helper === "connected" && loadingDevices
              ? "Helper connected · reading your devices…"
              : helper === "connected"
              ? `${scanners.length} scanner${scanners.length === 1 ? "" : "s"} · ${realPrinters.length} printer${realPrinters.length === 1 ? "" : "s"} found`
              : helper === "checking"
                ? "Looking for devices…"
                : "Wired (USB) and wireless (Wi-Fi) devices"}
          </p>
        </div>
        {os === "windows" && (
          <Button size="sm" variant="ghost" loading={helper === "checking" || loadingDevices} onClick={detect}>
            <RefreshCw className="h-4 w-4" /> Detect
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-5 p-5 text-sm">
        {helper === "connected" && (
          <>
            {focus !== "printer" && (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Scanners</h3>
                {scanners.length === 0 ? (
                  <p className="rounded-xl bg-surface-2 p-3 text-muted">No scanner found. Switch it on, connect USB or Wi-Fi, then press Detect.</p>
                ) : (
                  scanners.map((s) => (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${scannerId === s.id ? "border-accent bg-accent/5" : "border-line hover:bg-surface-2"}`}
                    >
                      <input type="radio" name="scanner" checked={scannerId === s.id} onChange={() => setScannerId(s.id)} className="accent-[var(--accent)]" />
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600">
                        <ScanLine className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{s.name}</span>
                        <span className="text-xs text-muted">{s.manufacturer || "Scanner"} · ready</span>
                      </span>
                    </label>
                  ))
                )}
                {onScanned && scanners.length > 0 && (
                  <div className="mt-1 flex flex-col gap-3 rounded-xl bg-surface-2 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select value={dpi} onChange={(e) => setDpi(+e.target.value)} aria-label="Resolution" className="h-9 rounded-lg border border-line bg-surface px-2">
                        <option value={150}>150 dpi · fast</option>
                        <option value={200}>200 dpi · standard</option>
                        <option value={300}>300 dpi · high</option>
                      </select>
                      <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} aria-label="Colour" className="h-9 rounded-lg border border-line bg-surface px-2">
                        <option value="color">Colour</option>
                        <option value="gray">Grayscale</option>
                        <option value="bw">Black &amp; white</option>
                      </select>
                    </div>
                    <Button
                      variant="primary"
                      loading={scanning}
                      onClick={async () => {
                        setScanning(true);
                        setError(null);
                        try {
                          onScanned(await scanPage(scannerId, dpi, mode));
                        } catch (e) {
                          setError(errorMessage(e));
                        } finally {
                          setScanning(false);
                        }
                      }}
                    >
                      <ScanLine className="h-4 w-4" /> {scanning ? "Scanning… keep the lid closed" : "Scan page"}
                    </Button>
                    <p className="text-xs text-muted">Put the page face-down on the glass. Scan again for more pages.</p>
                  </div>
                )}
              </section>
            )}

            {focus !== "scanner" || !onScanned ? (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Printers</h3>
                {realPrinters.map((p) => (
                  <div key={p.name} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600">
                      {p.type === "USB" ? <Usb className="h-4 w-4" /> : /Network|Wireless/.test(p.type) ? <Wifi className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{p.name}</span>
                        {p.default && <span className="shrink-0 rounded-full bg-accent/10 px-1.5 text-[10px] font-semibold text-accent">Default</span>}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[p.status] ?? "bg-amber-500"}`} />
                        {p.status === "Normal" ? "Ready" : p.status} · {p.type}
                      </span>
                    </span>
                  </div>
                ))}
                {virtualPrinters.length > 0 && <p className="text-xs text-muted">Also available: {virtualPrinters.map((p) => p.name).join(", ")}</p>}
                <p className="text-xs text-muted">When you press Print, choose one of these printers in the print window.</p>
              </section>
            ) : null}
          </>
        )}

        {helper === "missing" && os === "windows" && (
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-4">
            <p className="font-semibold">Connect your scanner &amp; printers</p>
            <ol className="flex flex-col gap-2 text-muted">
              <Step n={1}>
                <a href="/helper/MyPDF-Device-Helper.cmd" download className="font-medium text-accent hover:underline">
                  Download MyPDF Device Helper
                </a>{" "}
                (Windows, free, 8 KB).
              </Step>
              <Step n={2}>
                Open it. If Windows warns you, choose <b className="text-fg">More info → Run anyway</b>. Keep its window open.
              </Step>
              <Step n={3}>
                Press <b className="text-fg">Detect</b>. If your browser asks to access devices on your network, choose <b className="text-fg">Allow</b>.
              </Step>
            </ol>
            <Button size="sm" variant="primary" className="self-start" onClick={detect}>
              <RefreshCw className="h-4 w-4" /> Detect devices
            </Button>
          </div>
        )}

        {helper === "missing" && os !== "windows" && (
          <p className="rounded-xl bg-surface-2 p-3 text-muted">
            Use your camera as a scanner, or scan with your device’s scanner app and add the images. Printing uses your device’s print window, which lists every
            printer it has found.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await printPdf(await testPage());
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Printer className="h-4 w-4" /> Test print
          </Button>
          {os === "windows" && (
            <a href="ms-settings:printers" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-xs font-medium hover:bg-surface-2">
              <Settings className="h-4 w-4" /> Add a printer or scanner
            </a>
          )}
        </div>
        <ErrorNote>{error}</ErrorNote>

        <button onClick={() => setShowManual((s) => !s)} className="flex items-center gap-1 self-start text-xs font-medium text-muted hover:text-fg">
          <ChevronDown className={`h-3.5 w-3.5 transition ${showManual ? "rotate-180" : ""}`} /> Manual setup help
        </button>
        {showManual && (
          <div className="flex flex-col gap-3">
            {focus !== "scanner" && (
              <div>
                <h3 className="mb-1.5 font-medium">Add a printer manually</h3>
                <ol className="list-decimal space-y-1 pl-5 text-muted">
                  {steps.printer.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
            {focus !== "printer" && (
              <div>
                <h3 className="mb-1.5 font-medium">Scanning without the helper</h3>
                <ol className="list-decimal space-y-1 pl-5 text-muted">
                  {steps.scanner.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
