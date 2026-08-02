"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  ChevronLeft,
  Grid3x3,
  Move,
  PanelLeft,
  PanelRight,
  Redo2,
  RotateCw,
  Shapes,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/lib/mannequin/store";
import type { CaptureFn } from "@/components/mannequin/viewport";
import { MannequinViewport } from "@/components/mannequin/viewport";
import { JointPanel } from "./joint-panel";
import { PresetPanel } from "./preset-panel";
import { CaptureDialog } from "./capture-dialog";

export function EditorShell() {
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const past = useEditor((s) => s.past.length);
  const future = useEditor((s) => s.future.length);
  const gizmoMode = useEditor((s) => s.gizmoMode);
  const setGizmoMode = useEditor((s) => s.setGizmoMode);
  const moveWholeFigure = useEditor((s) => s.moveWholeFigure);
  const showHandles = useEditor((s) => s.showHandles);
  const showGrid = useEditor((s) => s.showGrid);
  const collisionsEnabled = useEditor((s) => s.collisionsEnabled);
  const toggle = useEditor((s) => s.toggle);
  const loadedPresetName = useEditor((s) => s.loadedPresetName);
  const selectedBone = useEditor((s) => s.selectedBone);

  const captureRef = useRef<CaptureFn | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const onCaptureReady = useCallback((fn: CaptureFn) => {
    captureRef.current = fn;
  }, []);

  const capture = useCallback(() => captureRef.current?.() ?? null, []);

  // Keyboard shortcuts. Ignored while typing so they never eat form input.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key.toLowerCase() === "g") {
        toggle("showGrid");
      } else if (event.key.toLowerCase() === "h") {
        toggle("showHandles");
      } else if (event.key.toLowerCase() === "r") {
        setGizmoMode("rotate");
      } else if (event.key.toLowerCase() === "t") {
        setGizmoMode("translate");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, toggle, setGizmoMode]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg)]">
      {/* ------------------------------------------------------------ toolbar */}
      <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-elev-1)] px-3">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="inline-flex size-9 items-center justify-center rounded-[8px] text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Link>

        <div className="mr-1 hidden min-w-0 sm:block">
          <p className="truncate font-display text-[0.8125rem] tracking-[0.08em] uppercase text-[var(--fg)]">
            {loadedPresetName ?? "Untitled position"}
          </p>
          <p className="label-hud">Technique editor</p>
        </div>

        <div className="mx-1 h-6 w-px bg-[var(--border)]" aria-hidden />

        <ToolbarButton
          label="Undo"
          onClick={undo}
          disabled={past === 0}
          icon={<Undo2 className="size-4" />}
        />
        <ToolbarButton
          label="Redo"
          onClick={redo}
          disabled={future === 0}
          icon={<Redo2 className="size-4" />}
        />

        <div className="mx-1 h-6 w-px bg-[var(--border)]" aria-hidden />

        <ToolbarButton
          label="Rotate tool"
          active={gizmoMode === "rotate"}
          onClick={() => setGizmoMode("rotate")}
          icon={<RotateCw className="size-4" />}
        />
        <ToolbarButton
          label="Move tool"
          active={gizmoMode === "translate"}
          disabled={!moveWholeFigure}
          onClick={() => setGizmoMode("translate")}
          icon={<Move className="size-4" />}
        />

        <div className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" aria-hidden />

        <ToolbarButton
          label="Show joint handles"
          active={showHandles}
          onClick={() => toggle("showHandles")}
          icon={<Shapes className="size-4" />}
          className="hidden sm:inline-flex"
        />
        <ToolbarButton
          label="Show grid"
          active={showGrid}
          onClick={() => toggle("showGrid")}
          icon={<Grid3x3 className="size-4" />}
          className="hidden sm:inline-flex"
        />
        <ToolbarButton
          label="Contact physics"
          active={collisionsEnabled}
          onClick={() => toggle("collisionsEnabled")}
          icon={<Sparkles className="size-4" />}
          className="hidden sm:inline-flex"
        />

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => setCaptureOpen(true)}>
            <Camera className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Capture to note</span>
          </Button>

          <ToolbarButton
            label="Toggle positions panel"
            onClick={() => setLeftOpen((v) => !v)}
            icon={<PanelLeft className="size-4" />}
            className="lg:hidden"
          />
          <ToolbarButton
            label="Toggle joints panel"
            onClick={() => setRightOpen((v) => !v)}
            icon={<PanelRight className="size-4" />}
            className="lg:hidden"
          />
        </div>
      </header>

      {/* --------------------------------------------------------------- body */}
      <div className="relative flex min-h-0 flex-1">
        {/* Presets */}
        <aside
          className={cn(
            "w-72 shrink-0 border-r border-[var(--border)] bg-[var(--bg-elev-1)]",
            "absolute inset-y-0 left-0 z-30 lg:static lg:z-auto",
            leftOpen ? "block" : "hidden lg:block",
          )}
        >
          <MobileClose onClose={() => setLeftOpen(false)} />
          <PresetPanel capture={capture} />
        </aside>

        {/* Viewport */}
        <main className="relative min-w-0 flex-1">
          <MannequinViewport className="h-full w-full" onCaptureReady={onCaptureReady} />

          {/* Contextual hint bar */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
            <p className="glass rounded-full px-3 py-1.5 text-[0.6875rem] text-[var(--fg-muted)]">
              {moveWholeFigure
                ? "Drag the gizmo to move the whole figure · click a limb to go back to joints"
                : selectedBone
                  ? "Drag the rings to rotate this joint · or use the sliders on the right"
                  : "Click a joint to select it · drag a cyan marker to pose a whole limb"}
            </p>
          </div>
        </main>

        {/* Joints */}
        <aside
          className={cn(
            "w-80 shrink-0 border-l border-[var(--border)] bg-[var(--bg-elev-1)]",
            "absolute inset-y-0 right-0 z-30 lg:static lg:z-auto",
            rightOpen ? "block" : "hidden lg:block",
          )}
        >
          <MobileClose onClose={() => setRightOpen(false)} />
          <JointPanel />
        </aside>

        {/* Scrim behind mobile drawers */}
        {(leftOpen || rightOpen) && (
          <div
            className="absolute inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
            }}
            aria-hidden
          />
        )}
      </div>

      <CaptureDialog
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        capture={capture}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ToolbarButton({
  label,
  icon,
  active,
  disabled,
  onClick,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[8px]",
        "transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40",
        active
          ? "bg-[var(--primary-soft)] text-[#ff8080]"
          : "text-[var(--fg-muted)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)]",
        className,
      )}
    >
      {icon}
    </button>
  );
}

function MobileClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close panel"
      className="absolute right-2 top-2 z-10 rounded p-1.5 text-[var(--fg-subtle)] hover:text-[var(--fg)] lg:hidden"
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}
