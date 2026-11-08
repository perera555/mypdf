"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, TOOLS } from "@/lib/tools";

export function ToolGrid() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return TOOLS.filter(
      (t) =>
        (cat === "All" || t.category === cat) &&
        (!s || t.name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s)),
    );
  }, [q, cat]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                cat === c ? "bg-fg text-bg" : "border border-line bg-surface text-muted hover:text-fg"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tools…"
            aria-label="Search tools"
            className="h-10 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-1 hover:border-transparent hover:shadow-xl"
            >
              <span className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r opacity-0 transition group-hover:opacity-100 ${t.color}`} />
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-md transition group-hover:scale-105 ${t.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t.short}</p>
              </div>
              <ArrowRight className="absolute top-5 right-5 h-4 w-4 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          );
        })}
        {filtered.length === 0 && <p className="col-span-full py-10 text-center text-muted">No tools match “{q}”.</p>}
      </div>
    </div>
  );
}
