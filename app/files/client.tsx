"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";

export const MyFilesClient = dynamic(() => import("@/components/MyFiles").then((m) => m.MyFiles), {
  ssr: false,
  loading: () => <Spinner />,
});
