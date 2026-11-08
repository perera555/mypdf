"use client";

import { PDFDocument, rgb, StandardFonts } from "@cantoo/pdf-lib";
import { ExternalLink, Printer, ScanLine, Settings, Usb, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, ErrorNote, Panel, errorMessage } from "./ui";
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
      "Click “Open Printers & scanners” below (or Settings → Bluetooth & devices → Printers & scanners).",
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
  page.drawText("MyPDF — printer test page", { x: 60, y: 760, size: 22, font: bold });
  page.drawText(`Printed ${new Date().toLocaleString()}`, { x: 60, y: 730, size: 11, font, color: rgb(0.35, 0.35, 0.4) });
  const colors = [rgb(0, 0, 0), rgb(0.88, 0.11, 0.28), rgb(0.49, 0.23, 0.93), rgb(0, 0.6, 0.9), rgb(1, 0.85, 0)];
  colors.forEach((c, i) => page.drawRectangle({ x: 60 + i * 95, y: 600, width: 80, height: 80, color: c }));
  page.drawText("If you can read this and see five colour squares, your printer works.", { x: 60, y: 560, size: 12, font });
  return doc.save();
}

export function DevicesPanel({ focus = "both" }: { focus?: "printer" | "scanner" | "both" }) {
  const [os, setOs] = useState<OS>("other");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setOs(detectOS()), []);
  const steps = STEPS[os];

  return (
    <Panel title="Printers & scanners">
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted">
          Your device finds wired <Usb className="inline h-3.5 w-3.5" /> and wireless <Wifi className="inline h-3.5 w-3.5" /> printers
          automatically. Every printer it knows appears when you press <b className="text-fg">Print</b>.
        </p>
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
            <Printer className="h-4 w-4" /> Find printers / test print
          </Button>
          {os === "windows" && (
            <>
              <a href="ms-settings:printers" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-xs font-medium hover:bg-surface-2">
                <Settings className="h-4 w-4" /> Open Printers & scanners
              </a>
              <a
                href="ms-windows-store://pdp/?productid=9WZDNCRFJ3PV"
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-xs font-medium hover:bg-surface-2"
              >
                <ScanLine className="h-4 w-4" /> Get Windows Scan <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>
        <ErrorNote>{error}</ErrorNote>
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
            <h3 className="mb-1.5 font-medium">Using a scanner</h3>
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              {steps.scanner.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-muted">
              Web browsers don’t let websites control scanners directly, so the scan is done by your device and the images come here.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
