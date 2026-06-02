"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  SmileyMelting,
  Smiley,
  SmileyMeh,
  SmileyNervous,
  SmileySad,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const MOODS = [
  { key: "low", icon: SmileySad, label: "Low" },
  { key: "agitated", icon: SmileyNervous, label: "Agitated" },
  { key: "neutral", icon: SmileyMeh, label: "Neutral" },
  { key: "content", icon: Smiley, label: "Content" },
  { key: "blissful", icon: SmileyMelting, label: "Blissful" },
];

interface MoodPickerProps {
  value: string | null;
  onChange: (mood: string | null) => void;
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [liveProgress, setLiveProgress] = useState<number | null>(null);

  const currentIdx = MOODS.findIndex((m) => m.key === value);
  const snappedProgress = currentIdx >= 0 ? (currentIdx / (MOODS.length - 1)) * 100 : -1;
  const displayProgress = liveProgress !== null ? liveProgress : snappedProgress;

  const liveIdx = liveProgress !== null
    ? Math.round((liveProgress / 100) * (MOODS.length - 1))
    : currentIdx;
  const SelectedIcon = liveIdx >= 0 ? MOODS[liveIdx].icon : null;
  const selectedLabel = liveIdx >= 0 ? MOODS[liveIdx].label : null;

  const getProgressFromX = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(100, (x / rect.width) * 100));
  }, []);

  const snapToMood = useCallback((progress: number) => {
    const idx = Math.round((progress / 100) * (MOODS.length - 1));
    const clamped = Math.max(0, Math.min(MOODS.length - 1, idx));
    onChange(MOODS[clamped].key);
    setLiveProgress(null);
  }, [onChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const p = getProgressFromX(e.clientX);
    setLiveProgress(p);
  }, [getProgressFromX]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const p = getProgressFromX(e.clientX);
      setLiveProgress(p);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const p = getProgressFromX(e.clientX);
      snapToMood(p);
      setDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, getProgressFromX, snapToMood]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setDragging(true);
    const p = getProgressFromX(e.touches[0].clientX);
    setLiveProgress(p);
  }, [getProgressFromX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const p = getProgressFromX(e.touches[0].clientX);
    setLiveProgress(p);
  }, [dragging, getProgressFromX]);

  const handleTouchEnd = useCallback(() => {
    if (liveProgress !== null) {
      snapToMood(liveProgress);
    }
    setDragging(false);
  }, [liveProgress, snapToMood]);

  return (
    <div className="rounded-16 p-6 bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="font-serif text-lg text-ink">How are you feeling?</p>
        {SelectedIcon && (
          <div className="flex items-center gap-2.5">
            <SelectedIcon size={34} weight="thin" className="text-accent" />
            <span className="font-serif text-base text-accent">{selectedLabel}</span>
          </div>
        )}
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        className="relative h-12 flex items-center cursor-pointer select-none touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="slider"
        aria-label="Mood"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={liveIdx >= 0 ? liveIdx : undefined}
        aria-valuetext={selectedLabel ?? "Not set"}
        tabIndex={0}
      >
        {/* Background track — clean rounded bar, no dots at edges */}
        <div className="absolute inset-x-0 h-[14px] rounded-full bg-surface-2 border border-line overflow-hidden">
          {/* Filled portion */}
          {displayProgress >= 0 && (
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent/50 via-accent/80 to-accent",
                !dragging && "transition-[width] duration-300 ease-out"
              )}
              style={{ width: `${displayProgress}%` }}
            />
          )}
        </div>

        {/* Middle snap indicators only (not at edges) */}
        {MOODS.slice(1, -1).map((_, i) => {
          const pos = ((i + 1) / (MOODS.length - 1)) * 100;
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-line/60"
              style={{ left: `${pos}%`, marginLeft: "-1.5px" }}
            />
          );
        })}

        {/* Thumb */}
        {displayProgress >= 0 && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_2px_12px_rgba(0,0,0,0.3),0_0_0_4px_var(--bg)]",
              dragging ? "w-9 h-9 scale-105" : "w-8 h-8",
              !dragging && "transition-all duration-300 ease-out"
            )}
            style={{ left: `calc(${displayProgress}% - ${dragging ? 18 : 16}px)` }}
          />
        )}
      </div>

      {/* Mood icons row */}
      <div className="flex justify-between mt-5 px-1">
        {MOODS.map((m) => {
          const Icon = m.icon;
          const isActive = value === m.key && !dragging;
          return (
            <button
              key={m.key}
              onClick={() => onChange(m.key)}
              className={cn(
                "flex flex-col items-center gap-2 transition-all duration-200 rounded-14 px-2 py-2",
                isActive
                  ? "scale-110 opacity-100 bg-accent-soft"
                  : "opacity-40 hover:opacity-70"
              )}
            >
              <Icon
                size={26}
                weight="thin"
                className={isActive ? "text-accent" : "text-ink-soft"}
              />
              <span className={cn(
                "font-ui text-[11px] leading-none",
                isActive ? "text-accent font-medium" : "text-ink-soft"
              )}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
