"use client";

import { useState } from "react";
import { X, Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // HH:MM
  onChange: (time: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(() => value ? parseInt(value.split(":")[0]) : 4);
  const [minute, setMinute] = useState(() => value ? parseInt(value.split(":")[1]) : 30);

  const displayTime = value
    ? formatTime12(value)
    : "Set time";

  function handleSave() {
    const h = String(hour).padStart(2, "0");
    const m = String(minute).padStart(2, "0");
    onChange(`${h}:${m}`);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => {
          if (value) {
            setHour(parseInt(value.split(":")[0]));
            setMinute(parseInt(value.split(":")[1]));
          }
          setOpen(true);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-line bg-surface-2 text-ink font-ui text-sm hover:border-accent transition-colors"
      >
        <Clock size={14} weight="thin" className="text-ink-soft" />
        <span>{displayTime}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative bg-surface rounded-20 p-6 w-full max-w-[280px] shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-ink-soft hover:text-ink"
            >
              <X size={18} weight="thin" />
            </button>

            {label && <p className="font-serif text-base text-ink mb-4">{label}</p>}

            {/* Time display */}
            <div className="text-center font-hand text-[42px] text-accent mb-6">
              {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
            </div>

            {/* Hour picker */}
            <div className="mb-4">
              <label className="font-ui text-[10px] text-ink-soft uppercase tracking-wider mb-1.5 block">Hour</label>
              <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
                {Array.from({ length: 24 }).map((_, h) => (
                  <button
                    key={h}
                    onClick={() => setHour(h)}
                    className={cn(
                      "shrink-0 w-9 h-9 rounded-full grid place-items-center font-ui text-xs transition-all",
                      hour === h
                        ? "bg-accent text-bg"
                        : "text-ink-soft hover:bg-surface-2"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minute picker */}
            <div className="mb-5">
              <label className="font-ui text-[10px] text-ink-soft uppercase tracking-wider mb-1.5 block">Minute</label>
              <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMinute(m)}
                    className={cn(
                      "shrink-0 w-9 h-9 rounded-full grid place-items-center font-ui text-xs transition-all",
                      minute === m
                        ? "bg-accent text-bg"
                        : "text-ink-soft hover:bg-surface-2"
                    )}
                  >
                    {String(m).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-14 bg-accent text-bg font-ui text-sm font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
