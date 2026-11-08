import Link from "next/link";
import { CloudOff, Heart, ShieldCheck, Zap } from "lucide-react";
import { RecentFiles } from "@/components/RecentFiles";
import { ToolGrid } from "@/components/ToolGrid";
import { TOOLS } from "@/lib/tools";

const FEATURES = [
  { icon: ShieldCheck, title: "Private by design", text: "Every file is processed inside your browser. Nothing is uploaded to a server." },
  { icon: Zap, title: "Fast", text: "No waiting for uploads or downloads — results are ready in seconds." },
  { icon: CloudOff, title: "No account", text: "No sign-up, no watermarks, no limits on files or pages." },
  { icon: Heart, title: "Free forever", text: "Open source and free for everyone. Share it with anyone." },
];

export default function Home() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {TOOLS.length} tools · 100% free
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            Every PDF tool you need, <span className="brand-text">free</span>.
          </h1>
          <p className="max-w-2xl text-lg text-balance text-muted">
            Read, edit, sign, merge, split, compress, convert and protect PDFs — all in your browser. Your files never leave your device.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/tools/sign" className="brand-gradient inline-flex h-12 items-center rounded-xl px-6 font-semibold text-white shadow-md transition hover:brightness-110">
              Fill &amp; Sign
            </Link>
            <Link href="/tools/edit" className="inline-flex h-12 items-center rounded-xl border border-line bg-surface px-6 font-semibold transition hover:bg-surface-2">
              Edit a PDF
            </Link>
            <Link href="#tools" className="inline-flex h-12 items-center rounded-xl border border-line bg-surface px-6 font-semibold transition hover:bg-surface-2">
              Browse all tools
            </Link>
          </div>
        </div>
      </section>

      <section id="tools" className="mx-auto flex w-full max-w-7xl scroll-mt-20 flex-col gap-10 px-4 pb-16 sm:px-6">
        <RecentFiles />
        <ToolGrid />
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col gap-2">
              <Icon className="h-6 w-6 text-accent" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
