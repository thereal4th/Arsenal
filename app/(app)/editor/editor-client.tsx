"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Three.js pulls in a large WebGL runtime and touches `window` during setup, so
// the whole editor is client-only. `ssr: false` is only legal inside a Client
// Component in Next.js 16, which is why this wrapper exists.
const EditorShell = dynamic(
  () => import("@/components/editor/editor-shell").then((m) => m.EditorShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-[var(--bg)]">
        <Loader2 className="size-6 animate-spin text-[var(--primary)]" aria-hidden />
        <p className="label-hud">Loading technique editor</p>
      </div>
    ),
  },
);

export function EditorClient() {
  return <EditorShell />;
}
