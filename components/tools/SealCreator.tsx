"use client";

import Link from "next/link";
import { SealDesigner } from "../SealDesigner";
import { Panel } from "../ui";

export default function SealCreator() {
  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SealDesigner />
      </Panel>
      <p className="text-sm text-muted">
        Saved seals appear under the <b>Seal</b> button in{" "}
        <Link href="/tools/sign" className="text-accent hover:underline">
          Fill &amp; Sign
        </Link>{" "}
        and{" "}
        <Link href="/tools/edit" className="text-accent hover:underline">
          Edit PDF
        </Link>
        , so you can stamp them on any document.
      </p>
    </div>
  );
}
