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
      <div className="flex flex-col gap-4">
        <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> All tools
        </Link>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-md ${tool.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{tool.name}</h1>
            <p className="text-muted">{tool.description}</p>
          </div>
        </div>
      </div>
      <ToolLoader slug={slug} />
    </div>
  );
}
