"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flower, Plus } from "@phosphor-icons/react";
import { TiptapEditor } from "@/components/expressions/TiptapEditor";
import { ExpressionsListSkeleton } from "@/components/ui/Skeleton";
import { ButtonLoader } from "@/components/ui/Loader";
import { today } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface ExpressionItem {
  id: string;
  title: string;
  date: string;
  kind: string;
  body: string;
  refDates: string[];
}

export default function ExpressionsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    kind: "moment" as "moment" | "writing",
    body: "",
    refDates: [] as string[],
  });

  const [page, setPage] = useState(1);

  const { data: expressionsData, isLoading } = useQuery({
    queryKey: ["expressions", page],
    queryFn: async () => {
      const res = await fetch(`/api/expressions?page=${page}`);
      const data = await res.json();
      // Handle both old array format and new paginated format
      if (Array.isArray(data)) return { items: data, total: data.length, hasMore: false };
      return data as { items: ExpressionItem[]; total: number; hasMore: boolean };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editingId ? `/api/expressions?id=${editingId}` : "/api/expressions";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date: today() }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expressions"] });
      setEditing(false);
      setEditingId(null);
      setPage(1);
      setForm({ title: "", kind: "moment", body: "", refDates: [] });
    },
  });

  if (editing) {
    return (
      <div>
        {/* Title */}
        <input
          className="w-full font-hand text-[32px] text-ink bg-transparent outline-none border-none mb-3 placeholder:text-ink-soft"
          placeholder="Title…"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 150) }))}
          maxLength={150}
        />

        {/* Kind toggle */}
        <div className="inline-flex gap-0.5 p-[3px] rounded-[30px] bg-surface-2 mb-4">
          {(["moment", "writing"] as const).map((k) => (
            <button
              key={k}
              className={cn(
                "font-ui text-[13px] font-medium px-4 py-1.5 rounded-[30px] capitalize transition-all",
                form.kind === k ? "text-ink bg-surface" : "text-ink-soft"
              )}
              onClick={() => setForm((f) => ({ ...f, kind: k }))}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Body — Tiptap editor */}
        <div className="mb-4">
          <TiptapEditor
            content={form.body}
            onChange={(json) => setForm((f) => ({ ...f, body: json }))}
            placeholder="Write…"
            minHeight={form.kind === "moment" ? "120px" : "240px"}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!form.body.trim() || form.body === "" || saveMutation.isPending}
            className="flex-1 py-3 rounded-14 bg-accent text-bg font-ui text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saveMutation.isPending ? <ButtonLoader /> : (editingId ? "Update" : "Save")}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-6 py-3 rounded-14 border border-line text-ink-soft font-ui text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // List view
  const list = Array.isArray(expressionsData?.items) ? expressionsData.items : [];
  const isEmpty = list.length === 0 && page === 1;

  if (isLoading) return <ExpressionsListSkeleton />;

  return (
    <div>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Flower size={56} weight="thin" className="text-accent" />
          <p className="font-serif italic text-base text-ink-soft text-center max-w-[260px]">
            Nothing here yet. When something touches you, give it a place.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((expr) => (
            <div key={expr.id} className="rounded-14 p-4 bg-surface relative group">
              {/* Edit/Delete — always visible on mobile, hover on desktop */}
              <div className="absolute top-3 right-3 flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity">
                <button
                  onClick={() => {
                    setForm({ title: expr.title, kind: expr.kind as "moment" | "writing", body: expr.body, refDates: expr.refDates });
                    setEditingId(expr.id);
                    setEditing(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-ink-soft hover:text-accent font-ui text-[10px]"
                >
                  Edit
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Delete this entry?")) {
                      await fetch("/api/expressions", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: expr.id }),
                      });
                      qc.invalidateQueries({ queryKey: ["expressions"] });
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-ink-soft hover:text-accent font-ui text-[10px]"
                >
                  Delete
                </button>
              </div>
              <div className="font-hand text-lg text-ink">
                {expr.title || "Untitled"}
              </div>
              <div className="font-ui text-[11px] tracking-[0.12em] uppercase text-ink-soft mt-0.5">
                {new Date(expr.date).toLocaleDateString()}
              </div>
              <p className="font-serif text-sm text-ink-soft mt-2 line-clamp-2">
                {extractTextFromBody(expr.body)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {expressionsData && (expressionsData.hasMore || page > 1) && (
        <div className="flex justify-center gap-3 mt-4">
          {page > 1 && (
            <button
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-14 border border-line text-ink-soft font-ui text-xs hover:text-accent"
            >
              ← Newer
            </button>
          )}
          {expressionsData.hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-14 border border-line text-ink-soft font-ui text-xs hover:text-accent"
            >
              Older →
            </button>
          )}
        </div>
      )}

      {/* New entry button */}
      <button
        onClick={() => setEditing(true)}
        className="fixed bottom-[88px] right-6 lg:bottom-8 lg:right-8
                   w-12 h-12 rounded-full bg-accent text-bg grid place-items-center
                   shadow-[0_6px_16px_var(--accent-soft)]"
        aria-label="New expression"
      >
        <Plus size={22} weight="thin" />
      </button>
    </div>
  );
}

function extractTextFromBody(body: string): string {
  try {
    const parsed = JSON.parse(body);
    // Extract text from Tiptap JSON
    if (parsed?.content) {
      const texts: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function walk(node: any) {
        if (node.text) texts.push(node.text);
        if (Array.isArray(node.content)) node.content.forEach(walk);
      }
      walk(parsed);
      return texts.join(" ").slice(0, 200) || "Empty";
    }
    return body.slice(0, 200);
  } catch {
    // Plain text fallback
    return body.slice(0, 200);
  }
}
