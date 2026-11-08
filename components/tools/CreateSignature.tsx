"use client";

import { Download, FileSignature, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SignatureDialog } from "../SignatureDialog";
import { Button, Panel } from "../ui";
import { downloadBlob } from "@/lib/files";

export default function CreateSignature() {
  const [sig, setSig] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const download = async (bg: "transparent" | "white") => {
    if (!sig) return;
    if (bg === "transparent") {
      downloadBlob(await (await fetch(sig)).blob(), "my-signature.png", "image/png");
      return;
    }
    const img = new Image();
    img.src = sig;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth + 40;
    c.height = img.naturalHeight + 40;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 20, 20);
    c.toBlob((b) => b && downloadBlob(b, "my-signature.jpg", "image/jpeg"), "image/jpeg", 0.95);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <SignatureDialog key={key} inline title="Draw, type or upload your signature" doneLabel="Create signature" onDone={setSig} />
      <Panel title="Your signature">
        {sig ? (
          <div className="flex flex-col gap-4">
            <div
              className="flex h-40 items-center justify-center rounded-xl border border-line p-3"
              style={{ backgroundImage: "repeating-conic-gradient(#f1f3f9 0 25%, #fff 0 50%)", backgroundSize: "16px 16px" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sig} alt="Your signature" className="max-h-full max-w-full object-contain" />
            </div>
            <p className="text-sm text-muted">Saved on this device — it’s ready under “Saved” whenever you sign a PDF.</p>
            <Button variant="primary" onClick={() => download("transparent")}>
              <Download className="h-4 w-4" /> Download PNG (transparent)
            </Button>
            <Button onClick={() => download("white")}>
              <Download className="h-4 w-4" /> Download JPG (white background)
            </Button>
            <Link href="/tools/sign" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium hover:bg-surface-2">
              <FileSignature className="h-4 w-4" /> Sign a PDF with it
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setSig(null);
                setKey((k) => k + 1);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Create another
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Make a signature for yourself: draw it with your mouse, finger or stylus, type your name in a handwriting style, or upload a photo of
            your signature on paper. Then download it or use it to sign PDFs.
          </p>
        )}
      </Panel>
    </div>
  );
}
