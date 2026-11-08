import { BadgeCheck, Check, PenLine, Signature, Type } from "lucide-react";

/** Decorative mock of the Fill & Sign workspace for the home page hero (pure markup, no JS). */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md select-none" aria-hidden="true">
      {/* glow */}
      <div className="brand-gradient absolute -inset-6 -z-10 rounded-[2.5rem] opacity-25 blur-3xl" />

      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
        {/* window bar */}
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 truncate text-xs text-muted">agreement.pdf</span>
        </div>
        {/* toolbar */}
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
          <span className="brand-gradient inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white">
            <Signature className="h-3 w-3" /> Sign
          </span>
          {[Type, Check, PenLine, BadgeCheck].map((Icon, i) => (
            <span key={i} className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-line text-muted">
              <Icon className="h-3 w-3" />
            </span>
          ))}
        </div>
        {/* page */}
        <div className="checker p-5">
          <div className="relative rounded-md bg-white p-5 text-zinc-800 shadow-md">
            <div className="h-2.5 w-2/3 rounded bg-zinc-800/80" />
            <div className="mt-3 space-y-1.5">
              {[100, 92, 96, 70].map((w, i) => (
                <div key={i} className="h-1.5 rounded bg-zinc-200" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
              <div>
                <p className="text-zinc-400">Full name</p>
                <p className="border-b border-sky-400 bg-sky-50 px-1 font-medium">Dhanushka Perera</p>
              </div>
              <div>
                <p className="text-zinc-400">Date</p>
                <p className="border-b border-sky-400 bg-sky-50 px-1 font-medium">08/11/2026</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px]">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-zinc-400">
                <Check className="h-3 w-3 text-zinc-800" strokeWidth={3} />
              </span>
              I agree to the terms
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div className="relative">
                <svg viewBox="0 0 160 50" className="h-11 w-36 text-indigo-900">
                  <path
                    d="M6 34c8-22 18-28 20-10s-6 22 2 6 10-20 16-4-2 14 6 0 8-10 12 2 6 6 12-4 10-8 16 2 30 4 50-10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M40 44 150 26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span className="absolute -inset-1 rounded border border-dashed border-accent" />
                <span className="absolute -right-2 -bottom-2 h-3 w-3 rounded-full border-2 border-white bg-accent" />
              </div>
              <div className="flex h-16 w-16 rotate-[-12deg] items-center justify-center rounded-full border-[3px] border-double border-blue-700 text-center text-[7px] leading-tight font-bold text-blue-700">
                OFFICIAL
                <br />
                SEAL
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="absolute -top-4 -left-6 hidden rotate-[-6deg] items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 text-xs font-semibold shadow-xl sm:flex">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
          <Check className="h-3.5 w-3.5" />
        </span>
        Signed in seconds
      </div>
      <div className="absolute -right-5 bottom-10 hidden rotate-[5deg] items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 text-xs font-semibold shadow-xl sm:flex">
        🔒 Never uploaded
      </div>
    </div>
  );
}
