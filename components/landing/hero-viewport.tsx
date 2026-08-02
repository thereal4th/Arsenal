"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { loadDefaultScene, startingScene } from "@/lib/mannequin/presets";

const MannequinViewport = dynamic(
  () => import("@/components/mannequin/viewport").then((m) => m.MannequinViewport),
  {
    ssr: false,
    loading: () => (
      <div className="size-full animate-pulse bg-[var(--bg-inset)]" aria-hidden />
    ),
  },
);

/**
 * Live, auto-rotating hero. Purely decorative — the surrounding section carries
 * the accessible copy, so this is hidden from assistive tech.
 */
export function HeroViewport({ preset = "closed-guard" }: { preset?: string }) {
  const scene = useMemo(() => loadDefaultScene(preset) ?? startingScene(), [preset]);

  return (
    <div
      aria-hidden
      className="size-full overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-inset)]"
    >
      <MannequinViewport preview scene={scene} className="size-full" />
    </div>
  );
}
