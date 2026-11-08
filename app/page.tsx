import Link from "next/link";
import { ArrowRight, BadgeCheck, CloudOff, Download, FileUp, Heart, MousePointerClick, PenLine, ScanLine, ShieldCheck, Signature, Zap } from "lucide-react";
import { HeroPreview } from "@/components/HeroPreview";
import { RecentFiles } from "@/components/RecentFiles";
import { ToolGrid } from "@/components/ToolGrid";
import { TOOLS } from "@/lib/tools";

const FEATURED = [
  {
    href: "/tools/sign",
    title: "Fill & Sign",
    text: "Type anywhere, tick boxes, complete forms and add your signature.",
    icon: Signature,
    className: "from-fuchsia-600 via-pink-600 to-rose-500 sm:col-span-2 sm:row-span-2",
    big: true,
  },
  { href: "/tools/edit", title: "Edit PDF", text: "Text, images, shapes, highlights.", icon: PenLine, className: "from-violet-600 to-indigo-600" },
  { href: "/tools/scan", title: "Scan to PDF", text: "Phone or webcam becomes a scanner.", icon: ScanLine, className: "from-orange-500 to-red-500" },
  { href: "/tools/seal-creator", title: "Seal Creator", text: "Official seals with your reg. number.", icon: BadgeCheck, className: "from-blue-600 to-cyan-500 sm:col-span-2" },
];

const FEATURES = [
  { icon: ShieldCheck, title: "Private by design", text: "Every file is processed inside your browser. Nothing is uploaded to a server." },
  { icon: Zap, title: "Fast", text: "No waiting for uploads or downloads — results are ready in seconds." },
  { icon: CloudOff, title: "Works offline", text: "Install the app and keep working without an internet connection." },
  { icon: Heart, title: "Free forever", text: "No sign-up, no watermarks, no limits. Share it with anyone." },
];

const STEPS = [
  { icon: FileUp, title: "Open your PDF", text: "Drop a file or pick one from your computer or phone." },
  { icon: MousePointerClick, title: "Choose a tool", text: "Fill & sign, edit, merge, compress — whatever you need." },
  { icon: Download, title: "Download or print", text: "Save it, print it, or keep it in My Files." },
];

export default function Home() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr]">
          <div className="fade-up flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-medium text-muted shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {TOOLS.length} tools · 100% free · no sign-up
            </span>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
              The free PDF app that does <span className="brand-text">everything</span>.
            </h1>
            <p className="max-w-xl text-lg text-balance text-muted">
              Fill & sign, edit, scan, merge, compress, convert and protect PDFs — on your computer or phone. Your files never leave your device.
            </p>
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/tools/sign"
                className="brand-gradient group inline-flex h-12 items-center gap-2 rounded-xl px-6 font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:brightness-110"
              >
                <Signature className="h-5 w-5" /> Fill &amp; Sign a PDF
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link href="/tools/edit" className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-6 font-semibold transition hover:bg-surface-2">
                <PenLine className="h-5 w-5" /> Edit a PDF
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Private
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" /> Instant
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CloudOff className="h-4 w-4 text-sky-500" /> Works offline
              </span>
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 pb-16 sm:px-6">
        {/* Featured */}
        <section className="grid auto-rows-[minmax(150px,auto)] gap-4 sm:grid-cols-4">
          {FEATURED.map(({ href, title, text, icon: Icon, className, big }) => (
            <Link
              key={href}
              href={href}
              className={`group relative flex flex-col justify-end overflow-hidden rounded-3xl bg-linear-to-br p-6 text-white shadow-card transition hover:-translate-y-1 hover:shadow-2xl ${className}`}
            >
              <Icon className={`absolute -top-4 -right-4 opacity-15 transition group-hover:scale-110 group-hover:rotate-6 ${big ? "h-56 w-56" : "h-32 w-32"}`} />
              <span className="mb-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Icon className="h-6 w-6" />
              </span>
              <h2 className={`mt-6 font-bold ${big ? "text-3xl" : "text-xl"}`}>{title}</h2>
              <p className={`mt-1 text-white/85 ${big ? "max-w-sm text-base" : "text-sm"}`}>{text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </section>

        <RecentFiles />

        <section id="tools" className="flex scroll-mt-20 flex-col gap-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">All tools</h2>
            <p className="text-muted">Everything you need to work with PDFs, in one place.</p>
          </div>
          <ToolGrid />
        </section>

        {/* How it works */}
        <section className="rounded-3xl border border-line bg-surface p-8 shadow-card sm:p-10">
          <h2 className="text-center text-2xl font-bold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <span className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-xs font-bold">{i + 1}</span>
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="max-w-xs text-sm text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
