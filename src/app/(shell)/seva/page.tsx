"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MicButton } from "@/components/reflection/MicButton";

const SEVA_PROMPTS = [
  { key: "s1", q: "What is my current level of intensity in seva?" },
  { key: "s2", q: "What is holding me back from being more intense in seva?" },
  { key: "s3", q: "What can I do to enhance my intensity?" },
];

export default function SevaPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ s1: "", s2: "", s3: "" });

  const { data: entries } = useQuery({
    queryKey: ["seva"],
    queryFn: async () => {
      const res = await fetch("/api/seva");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/seva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seva"] });
      setForm({ s1: "", s2: "", s3: "" });
    },
  });

  const canSave = form.s1.trim() || form.s2.trim() || form.s3.trim();

  const handleChange = useCallback((key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
  }, []);

  return (
    <div>
      {/* Questions */}
      {SEVA_PROMPTS.map((prompt, i) => (
        <div key={prompt.key} className="rounded-16 p-5 mb-3.5 bg-surface">
          <div className="flex gap-3 items-start">
            <span className="font-hand text-2xl leading-none text-accent shrink-0 min-w-[22px]">
              {i + 1}
            </span>
            <p className="font-serif text-lg font-medium leading-[1.4] text-ink">
              {prompt.q}
            </p>
          </div>
          <div className="flex gap-2 mt-3.5 ml-[34px]">
            <textarea
              className="flex-1 font-serif text-base w-full border-none resize-none text-ink leading-[1.7] outline-none min-h-[38px] bg-surface-2 rounded-[10px] p-[11px_13px] placeholder:text-ink-soft placeholder:opacity-70 placeholder:italic"
              placeholder="Reflect…"
              value={form[prompt.key as keyof typeof form]}
              onChange={(e) => handleChange(prompt.key, e.target.value)}
              maxLength={2000}
              rows={2}
            />
            <MicButton
              onTranscript={(text) =>
                handleChange(prompt.key, form[prompt.key as keyof typeof form] + text)
              }
            />
          </div>
        </div>
      ))}

      {/* Save button */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={!canSave}
        className="w-full py-3 rounded-14 bg-accent text-bg font-ui text-sm font-medium
                   disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        Save
      </button>

      {/* Past entries */}
      {Array.isArray(entries) && entries.length > 0 && (
        <div className="mt-8">
          <div className="font-ui text-[11px] tracking-[0.12em] uppercase text-ink-soft mb-3">
            Past reflections
          </div>
          {entries.map((entry: { id: string; date: string; s1: string; s2: string; s3: string }) => (
            <div
              key={entry.id}
              className="rounded-14 p-4 bg-surface mb-2 cursor-pointer hover:bg-surface-2 transition-colors"
              onClick={() => setForm({ s1: entry.s1, s2: entry.s2, s3: entry.s3 })}
            >
              <div className="font-ui text-xs text-ink-soft">
                {new Date(entry.date).toLocaleDateString()}
              </div>
              <p className="font-serif text-sm text-ink mt-1 line-clamp-2">
                {entry.s1 || entry.s2 || entry.s3}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
