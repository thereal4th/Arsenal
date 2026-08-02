"use client";

import { useId } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
  /** Shown when the value differs from this; clicking reset returns to it. */
  resetValue?: number;
}

/**
 * Range + numeric entry for a single joint axis.
 *
 * The number box matters as much as the slider: coaches want to reproduce an
 * exact angle across notes, and dragging alone can never be precise enough.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "°",
  disabled,
  onChange,
  resetValue = 0,
}: SliderProps) {
  const id = useId();
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const isDirty = Math.abs(value - resetValue) > 0.01;

  return (
    <div className={cn("group/slider", disabled && "opacity-45")}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs text-[var(--fg-muted)]">
          {label}
        </label>

        <div className="flex items-center gap-1">
          {isDirty && !disabled && (
            <button
              type="button"
              onClick={() => onChange(resetValue)}
              aria-label={`Reset ${label}`}
              title={`Reset ${label}`}
              className="rounded p-1 text-[var(--fg-subtle)] opacity-0 transition-opacity hover:text-[var(--fg)] focus-visible:opacity-100 group-hover/slider:opacity-100"
            >
              <RotateCcw className="size-3" aria-hidden />
            </button>
          )}
          <input
            type="number"
            aria-label={`${label} value`}
            value={Math.round(value * 10) / 10}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) onChange(next);
            }}
            className={cn(
              "w-14 rounded-[5px] border border-[var(--border)] bg-[var(--bg-inset)]",
              "px-1.5 py-0.5 text-right font-mono text-[0.6875rem] text-[var(--fg)]",
              "focus:border-[var(--primary)] focus:outline-none",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
            )}
          />
          <span className="w-2 font-mono text-[0.6875rem] text-[var(--fg-subtle)]">
            {unit}
          </span>
        </div>
      </div>

      <input
        id={id}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="arsenal-range h-4 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed"
        style={{ ["--fill" as string]: `${percent}%` }}
      />

      <style jsx>{`
        .arsenal-range::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            var(--primary) 0%,
            var(--primary) var(--fill),
            rgba(255, 255, 255, 0.1) var(--fill),
            rgba(255, 255, 255, 0.1) 100%
          );
        }
        .arsenal-range::-moz-range-track {
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
        }
        .arsenal-range::-moz-range-progress {
          height: 4px;
          border-radius: 999px;
          background: var(--primary);
        }
        .arsenal-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          margin-top: -5px;
          border-radius: 999px;
          background: #f2f4f8;
          border: 2px solid var(--bg-elev-2);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
          transition: transform 150ms var(--ease-out-expo);
        }
        .arsenal-range::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #f2f4f8;
          border: 2px solid var(--bg-elev-2);
        }
        .arsenal-range:hover::-webkit-slider-thumb {
          transform: scale(1.15);
        }
        .arsenal-range:focus-visible::-webkit-slider-thumb {
          outline: 2px solid var(--ring);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
