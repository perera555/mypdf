import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ToolLoader } from "@/components/ToolLoader";
import { getTool, TOOLS } from "@/lib/tools";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata(props: PageProps<"/tools/[tool]">): Promise<Metadata> {
  const { tool: slug } = await props.params;
  const tool = getTool(slug);
  if (!tool) return {};
  return { title: tool.name, description: tool.description };
}

export default async function ToolPage(props: PageProps<"/tools/[tool]">) {
  const { tool: slug } = await props.params;
  const tool = getTool(slug);
  if (!tool) notFound();
  const Icon = tool.icon;
  const wide = slug === "edit" || slug === "sign" || slug === "redact" || slug === "view";

  return (
    <div className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 sm:px-6 ${wide ? "max-w-[1600px]" : "max-w-5xl"}`}>
      <div className="flex flex-col gap-3">
        <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> All tools
        </Link>
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
          {/* soft glow in the tool's own colours */}
          <div className={`pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-linear-to-br opacity-20 blur-3xl ${tool.color}`} />
          <Icon className="pointer-events-none absolute -right-4 -bottom-6 h-32 w-32 text-fg opacity-[0.04]" />
          <div className="relative flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg ${tool.color}`}>
              <Icon className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{tool.category}</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{tool.name}</h1>
              <p className="mt-0.5 text-sm text-muted sm:text-base">{tool.description}</p>
            </div>
          </div>
        </div>
      </div>
      <ToolLoader slug={slug} />
    </div>
  );
}
