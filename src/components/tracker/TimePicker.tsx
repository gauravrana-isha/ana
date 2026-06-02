"use client";

import { useState } from "react";
import { X, Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // HH:MM (24h)
  onChange: (time: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const displayTime = value ? formatTime12(value) : "Set time";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-line bg-surface-2 text-ink font-ui text-sm hover:border-accent transition-colors"
      >
        <Clock size={14} weight="thin" className="text-ink-soft" />
        <span>{displayTime}</span>
      </button>

      {open && (
        <TimePickerModal
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
          label={label}
        />
      )}
    </>
  );
}

function TimePickerModal({
  value,
  onChange,
  onClose,
  label,
}: {
  value: string;
  onChange: (time: string) => void;
  onClose: () => void;
  label?: string;
}) {
  // Parse initial value into 12h format
  const initial24h = value ? parseInt(value.split(":")[0]) : 5;
  const initialMin = value ? parseInt(value.split(":")[1]) : 0;

  const [hour12, setHour12] = useState(() => {
    const h = initial24h % 12;
    return h === 0 ? 12 : h;
  });
  const [minute, setMinute] = useState(initialMin);
  const [period, setPeriod] = useState<"AM" | "PM">(() => initial24h >= 12 ? "PM" : "AM");

  function handleSave() {
    // Convert back to 24h
    let h24 = hour12;
    if (period === "AM" && hour12 === 12) h24 = 0;
    else if (period === "PM" && hour12 !== 12) h24 = hour12 + 12;

    const h = String(h24).padStart(2, "0");
    const m = String(minute).padStart(2, "0");
    onChange(`${h}:${m}`);
    onClose();
  }

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-surface w-full sm:w-[360px] sm:rounded-20 rounded-t-[24px] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-line">
          <div>
            {label && <p className="font-ui text-[11px] text-ink-soft uppercase tracking-wider mb-1">{label}</p>}
            <p className="font-hand text-[40px] text-accent leading-none">
              {hour12}:{String(minute).padStart(2, "0")} <span className="text-[24px]">{period}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink p-2">
            <X size={20} weight="thin" />
          </button>
        </div>

        {/* AM / PM toggle */}
        <div className="flex justify-center gap-2 px-6 pt-5">
          {(["AM", "PM"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex-1 py-2.5 rounded-14 font-ui text-sm font-medium transition-all",
                period === p
                  ? "bg-accent text-bg"
                  : "bg-surface-2 border border-line text-ink-soft"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Hour grid */}
        <div className="px-6 pt-5">
          <p className="font-ui text-[10px] text-ink-soft uppercase tracking-wider mb-2">Hour</p>
          <div className="grid grid-cols-6 gap-2">
            {hours.map((h) => (
              <button
                key={h}
                onClick={() => setHour12(h)}
                className={cn(
                  "h-10 rounded-14 font-ui text-sm grid place-items-center transition-all",
                  hour12 === h
                    ? "bg-accent text-bg font-medium"
                    : "bg-surface-2 text-ink hover:bg-accent-soft"
                )}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Minute grid */}
        <div className="px-6 pt-4">
          <p className="font-ui text-[10px] text-ink-soft uppercase tracking-wider mb-2">Minute</p>
          <div className="grid grid-cols-6 gap-2">
            {minutes.map((m) => (
              <button
                key={m}
                onClick={() => setMinute(m)}
                className={cn(
                  "h-10 rounded-14 font-ui text-sm grid place-items-center transition-all",
                  minute === m
                    ? "bg-accent text-bg font-medium"
                    : "bg-surface-2 text-ink hover:bg-accent-soft"
                )}
              >
                {String(m).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pt-5 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-14 border border-line text-ink-soft font-ui text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-14 bg-accent text-bg font-ui text-sm font-medium"
          >
            Set time
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
