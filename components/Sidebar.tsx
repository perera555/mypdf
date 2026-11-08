"use client";

import { FolderHeart, House, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES, TOOLS } from "@/lib/tools";

export function Sidebar() {
  const path = usePathname();
  const item = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-accent/10 font-semibold text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"}`;

  return (
    <aside className="thin-scroll sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-line bg-surface px-3 py-4 lg:block">
      <nav className="flex flex-col gap-0.5">
        <Link href="/" className={item(path === "/")}>
          <House className="h-4 w-4" /> Home
        </Link>
        <Link href="/files" className={item(path === "/files")}>
          <FolderHeart className="h-4 w-4" /> My Files
        </Link>
        <Link href="/#tools" className={item(false)}>
          <LayoutGrid className="h-4 w-4" /> All tools
        </Link>
      </nav>
      {CATEGORIES.map((cat) => (
        <div key={cat} className="mt-5">
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-muted/80 uppercase">{cat}</p>
          <nav className="flex flex-col gap-0.5">
            {TOOLS.filter((t) => t.category === cat).map((t) => {
              const Icon = t.icon;
              const active = path === `/tools/${t.slug}`;
              return (
                <Link key={t.slug} href={`/tools/${t.slug}`} className={item(active)}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md bg-linear-to-br text-white ${t.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {t.name}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </aside>
  );
}
