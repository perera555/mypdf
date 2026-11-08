"use client";

import { Camera, ImagePlus, RotateCw, SwitchCamera, Trash2, Wand2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DevicesPanel } from "../DevicesPanel";
import { Button, ErrorNote, Field, Panel, Select, errorMessage } from "../ui";
import { canvasToBlob, loadImage } from "@/lib/files";
import { imagesToPdf, type PageSize } from "@/lib/images-pdf";
import { showResult } from "@/lib/result";

type Filter = "auto" | "color" | "gray" | "bw";

interface Shot {
  id: string;
  original: Blob;
  url: string;
  rotation: number;
}

/** Enhance a scanned photo: rotate, then whiten the paper and boost contrast. */
async function processShot(shot: Shot, filter: Filter): Promise<Blob> {
  const src = URL.createObjectURL(shot.original);
  try {
    const img = await loadImage(src);
    const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * k);
    const h = Math.round(img.naturalHeight * k);
    const swap = shot.rotation % 180 !== 0;
    const c = document.createElement("canvas");
    c.width = swap ? h : w;
    c.height = swap ? w : h;
    const ctx = c.getContext("2d")!;
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((shot.rotation * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (filter !== "color") {
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const px = d.data;
      // Estimate paper brightness from the 90th percentile luminance.
      const hist = new Uint32Array(256);
      for (let i = 0; i < px.length; i += 16) hist[Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2])]++;
      const total = hist.reduce((a, b) => a + b, 0);
      let acc = 0,
        white = 255;
      for (let v = 0; v < 256; v++) {
        acc += hist[v];
        if (acc > total * 0.9) {
          white = Math.max(120, v);
          break;
        }
      }
      for (let i = 0; i < px.length; i += 4) {
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        if (filter === "bw") {
          const v = lum / white > 0.72 ? 255 : 0;
          px[i] = px[i + 1] = px[i + 2] = v;
        } else if (filter === "gray") {
          const v = Math.min(255, Math.pow(lum / white, 1.4) * 255);
          px[i] = px[i + 1] = px[i + 2] = v;
        } else {
          for (let j = 0; j < 3; j++) px[i + j] = Math.min(255, Math.pow(px[i + j] / white, 1.3) * 255);
        }
      }
      ctx.putImageData(d, 0, 0);
    }
    return await canvasToBlob(c, "image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(src);
  }
}

export default function Scan() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [filter, setFilter] = useState<Filter>("auto");
  const [size, setSize] = useState<PageSize>("a4");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };
  useEffect(() => () => stop(), []);

  const listCameras = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === "videoinput");
    setCameras(cams);
    return cams;
  };

  const start = async (id?: string) => {
    setError(null);
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: id ? { deviceId: { exact: id }, width: { ideal: 3840 }, height: { ideal: 2160 } } : { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      // Labels are only available after permission is granted.
      await listCameras();
      setCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? "");
    } catch (e) {
      setError(`Camera unavailable: ${errorMessage(e)}. You can still add photos or scanner images with “Add images”.`);
    }
  };

  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    const blob = await canvasToBlob(c, "image/jpeg", 0.92);
    setShots((s) => [...s, { id: crypto.randomUUID(), original: blob, url: URL.createObjectURL(blob), rotation: 0 }]);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setShots((s) => [...s, ...list.map((f) => ({ id: crypto.randomUUID(), original: f, url: URL.createObjectURL(f), rotation: 0 }))]);
  };

  const build = async () => {
    setBusy(true);
    setError(null);
    try {
      const processed = [];
      for (const s of shots) processed.push(await processShot(s, filter));
      const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
      showResult(await imagesToPdf(processed, { size, orientation: "auto", margin: 0 }), `scan-${stamp}.pdf`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <Panel className="overflow-hidden p-0">
          <div className="relative flex aspect-[4/3] items-center justify-center bg-black sm:aspect-video">
            <video ref={videoRef} playsInline muted className={`h-full w-full object-contain ${streaming ? "" : "hidden"}`} />
            {flash && <div className="absolute inset-0 bg-white/70" />}
            {!streaming && (
              <div className="flex flex-col items-center gap-4 p-6 text-center text-white">
                <Camera className="h-10 w-10 opacity-70" />
                <p className="max-w-sm text-sm text-white/70">Use your phone or computer camera as a scanner, or add images saved by your scanner.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="primary" onClick={() => start()}>
                    <Camera className="h-4 w-4" /> Start camera
                  </Button>
                  <Button onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" /> Add images
                  </Button>
                </div>
              </div>
            )}
            {streaming && (
              <>
                <div className="pointer-events-none absolute inset-[6%] rounded-lg border-2 border-white/60" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 p-4">
                  <Button size="sm" onClick={stop}>
                    <X className="h-4 w-4" /> Stop
                  </Button>
                  <button aria-label="Capture page" onClick={capture} className="h-16 w-16 rounded-full border-4 border-white bg-white/30 transition active:scale-90" />
                  <Button size="sm" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" /> Images
                  </Button>
                </div>
              </>
            )}
          </div>
          {cameras.length > 0 && (
            <div className="flex items-center gap-2 border-t border-line p-3">
              <SwitchCamera className="h-4 w-4 shrink-0 text-muted" />
              <Select
                aria-label="Camera"
                value={cameraId}
                onChange={(e) => {
                  setCameraId(e.target.value);
                  void start(e.target.value);
                }}
                className="h-9"
              >
                {cameras.map((c, i) => (
                  <option key={c.deviceId || i} value={c.deviceId}>
                    {c.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </Select>
              <span className="shrink-0 text-xs text-muted">{cameras.length} found</span>
            </div>
          )}
        </Panel>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {/* Phone fallback: opens the native camera app directly */}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-muted hover:border-accent md:hidden">
          <Camera className="h-4 w-4" /> Open phone camera app
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        </label>

        {shots.length > 0 && (
          <Panel title={`${shots.length} page${shots.length === 1 ? "" : "s"} scanned`}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
              {shots.map((s, i) => (
                <div key={s.id} className="group relative overflow-hidden rounded-lg border border-line bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.url} alt={`Scan ${i + 1}`} className="h-36 w-full object-contain transition" style={{ transform: `rotate(${s.rotation}deg)` }} />
                  <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 text-xs text-white">{i + 1}</span>
                  <div className="absolute right-1 bottom-1 flex gap-1">
                    <button aria-label="Rotate" onClick={() => setShots((l) => l.map((x) => (x.id === s.id ? { ...x, rotation: (x.rotation + 90) % 360 } : x)))} className="rounded-md bg-black/60 p-1.5 text-white">
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button aria-label="Remove" onClick={() => setShots((l) => l.filter((x) => x.id !== s.id))} className="rounded-md bg-black/60 p-1.5 text-white">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
        <ErrorNote>{error}</ErrorNote>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Scan settings">
          <div className="flex flex-col gap-4">
            <Field label="Enhance">
              <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
                <option value="auto">Auto (whiter paper, crisper text)</option>
                <option value="gray">Grayscale document</option>
                <option value="bw">Black & white</option>
                <option value="color">Original colour</option>
              </Select>
            </Field>
            <Field label="Page size">
              <Select value={size} onChange={(e) => setSize(e.target.value as PageSize)}>
                <option value="a4">A4</option>
                <option value="letter">US Letter</option>
                <option value="fit">Same as photo</option>
              </Select>
            </Field>
            <Button variant="primary" size="lg" loading={busy} disabled={!shots.length} onClick={build}>
              <Wand2 className="h-4 w-4" /> Save as PDF
            </Button>
          </div>
        </Panel>
        <DevicesPanel
          focus="scanner"
          onScanned={(blob) => setShots((s) => [...s, { id: crypto.randomUUID(), original: blob, url: URL.createObjectURL(blob), rotation: 0 }])}
        />
      </div>
    </div>
  );
}
