"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Me } from "@/lib/me";
import { saveQuestions } from "@/lib/journal";
import { BUILT_IN, allQuestions, newQuestionKey, toStored, type Question, type ReflectionKind } from "@/lib/questions";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { Busy } from "@/components/ui/Busy";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { DeleteMark, EditMark, GripMark, PlusMark } from "@/components/art/PenMarks";
import { Glyph } from "@/components/art/Glyphs";
import { cn } from "@/lib/utils";

/*
 * Settings › Reflection questions: reword, hide, add, reorder or reset the questions Daily and
 * Weekly ask. Each change is saved straight away, sealed on this device. Answers are kept by
 * question, so past days still show theirs whatever changes here.
 */

export function QuestionsEditor({ me }: { me: Me }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ask = useConfirm();
  const kinds = (["daily", "weekly"] as const).filter((k) => me.features.includes(k));
  const [picked, setPicked] = useState<ReflectionKind>(kinds[0]);
  const kind = kinds.includes(picked) ? picked : kinds[0];
  // The question being reworded (its key), "new" while adding one, or null.
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const all = allQuestions(kind, me.questions);
  const listed = all.filter((x) => !x.removed);
  const asked = listed.filter((x) => !x.hidden);
  const builtIn = (key: string) => BUILT_IN[kind].some((b) => b.key === key);
  const original = JSON.stringify(toStored(listed)) === JSON.stringify(toStored(BUILT_IN[kind]));

  async function commit(next: Question[], done?: string) {
    const sets = { ...me.questions, [kind]: toStored(next) };
    setSaving(true);
    setEditing(null);
    qc.setQueryData<Me>(["me"], { ...me, questions: sets });
    try {
      await saveQuestions(sets);
      // Today counts the questions answered.
      qc.invalidateQueries({ queryKey: ["today"] });
      if (done) toast(done, "success", 1600);
    } catch {
      toast("Couldn't save. Please try again.", "error");
      await qc.invalidateQueries({ queryKey: ["me"] });
    }
    setSaving(false);
  }

  const change = (key: string, to: Partial<Question>) => all.map((x) => (x.key === key ? { ...x, ...to } : x));

  function rename(x: Question, q: string) {
    if (q === x.q) return setEditing(null);
    commit(change(x.key, { q }));
  }

  function toggle(x: Question) {
    if (!x.hidden && asked.length === 1) return toast("Keep at least one question.", "error");
    commit(change(x.key, { hidden: !x.hidden }));
  }

  async function remove(x: Question) {
    if (!x.hidden && asked.length === 1) return toast("Keep at least one question.", "error");
    if (!(await ask({ title: "Remove this question?", body: "Past answers to it stay.", confirmLabel: "Remove", tone: "danger" }))) return;
    commit(change(x.key, { removed: true }), "Question removed");
  }

  async function reset() {
    if (!(await ask({ title: "Go back to the original questions?", body: "Questions you added are removed. Past answers stay.", confirmLabel: "Reset" }))) return;
    // Added questions are kept, marked removed, so past answers still show them.
    commit([...BUILT_IN[kind], ...all.filter((x) => !builtIn(x.key)).map((x) => ({ ...x, removed: true }))], "Back to the original questions");
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const keys = listed.map((x) => x.key);
    commit([...arrayMove(listed, keys.indexOf(String(active.id)), keys.indexOf(String(over.id))), ...all.filter((x) => x.removed)]);
  }

  return (
    <div className="flex flex-col gap-4">
      {kinds.length > 1 && (
        <Segmented
          label="Reflection"
          value={kind}
          onChange={(k) => { setPicked(k); setEditing(null); }}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
          ]}
        />
      )}

      <Busy busy={saving}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={listed.map((x) => x.key)} strategy={verticalListSortingStrategy}>
            <ul className="rounded-[18px] bg-surface divide-y divide-line">
              {listed.map((x) => (
                <QuestionRow
                  key={x.key}
                  question={x}
                  number={x.hidden ? "" : String(asked.indexOf(x) + 1)}
                  editing={editing === x.key}
                  builtIn={builtIn(x.key)}
                  onEdit={() => setEditing(x.key)}
                  onRename={(q) => rename(x, q)}
                  onCancel={() => setEditing(null)}
                  onToggle={() => toggle(x)}
                  onRemove={() => remove(x)}
                />
              ))}
              {editing === "new" && (
                <li className="px-3 py-3">
                  <QuestionField label="New question" initial="" onSave={(q) => commit([...all, { key: newQuestionKey(), q }], "Question added")} onCancel={() => setEditing(null)} />
                </li>
              )}
            </ul>
          </SortableContext>
        </DndContext>
      </Busy>

      <div className="flex flex-wrap items-center gap-2">
        {editing !== "new" && (
          <button type="button" onClick={() => setEditing("new")} disabled={saving} className="press inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-surface font-ui text-[13.5px] font-semibold text-accent hover:bg-surface-2">
            <PlusMark size={17} /> Add a question
          </button>
        )}
        {!original && (
          <button type="button" onClick={reset} disabled={saving} className="press inline-flex items-center gap-1.5 h-10 px-4 rounded-full font-ui text-[13.5px] font-semibold text-ink-soft hover:text-ink hover:bg-surface">
            <Glyph k="returns" size={16} /> Reset to the original
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionRow({
  question,
  number,
  editing,
  builtIn,
  onEdit,
  onRename,
  onCancel,
  onToggle,
  onRemove,
}: {
  question: Question;
  number: string;
  editing: boolean;
  builtIn: boolean;
  onEdit: () => void;
  onRename: (q: string) => void;
  onCancel: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.key });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative flex items-start gap-1.5 px-2 py-2.5 bg-surface first:rounded-t-[18px] last:rounded-b-[18px]", isDragging && "z-10 shadow-lg rounded-[18px]")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Move: ${question.q}`}
        className="grid place-items-center w-9 h-9 shrink-0 rounded-[10px] text-ink-soft hover:text-ink hover:bg-surface-2 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripMark size={18} />
      </button>
      {editing ? (
        <div className="flex-1 min-w-0 py-0.5 pr-1">
          <QuestionField label="Question" initial={question.q} onSave={onRename} onCancel={onCancel} />
        </div>
      ) : (
        <>
          <span className="w-5 shrink-0 pt-2 font-ui text-[13px] font-semibold text-ink-soft/70 tabular">{number}</span>
          <span className={cn("flex-1 min-w-0 pt-[7px] pb-1", question.hidden && "opacity-55")}>
            <span className="block font-serif text-[15.5px] leading-[1.45] text-ink text-pretty">{question.q}</span>
            {question.hidden && <span className="block mt-0.5 font-ui text-[12.5px] text-ink-soft">Hidden</span>}
          </span>
          <button type="button" aria-label={`Edit: ${question.q}`} onClick={onEdit} className="press grid place-items-center w-9 h-9 shrink-0 rounded-full text-ink-soft hover:text-ink hover:bg-surface-2">
            <EditMark size={18} />
          </button>
          {builtIn ? (
            <button type="button" aria-label={`${question.hidden ? "Show" : "Hide"}: ${question.q}`} onClick={onToggle} className="press grid place-items-center w-9 h-9 shrink-0 rounded-full text-ink-soft hover:text-ink hover:bg-surface-2">
              <Glyph k={question.hidden ? "eye" : "eye-off"} size={18} />
            </button>
          ) : (
            <button type="button" aria-label={`Remove: ${question.q}`} onClick={onRemove} className="press grid place-items-center w-9 h-9 shrink-0 rounded-full text-ink-soft hover:text-danger hover:bg-danger/10">
              <DeleteMark size={18} />
            </button>
          )}
        </>
      )}
    </li>
  );
}

/** Writing a question: Enter saves, Shift+Enter starts a new line, Escape cancels. */
function QuestionField({ label, initial, onSave, onCancel }: { label: string; initial: string; onSave: (q: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  const q = text.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q) onSave(q);
      }}
      className="flex flex-col gap-2.5"
    >
      <textarea
        aria-label={label}
        autoFocus
        rows={2}
        maxLength={300}
        value={text}
        placeholder="Ask yourself…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
          if (e.key === "Escape") onCancel();
        }}
        className="w-full resize-none rounded-[12px] bg-surface-2 px-3.5 py-2.5 font-serif text-[16px] leading-[1.5] text-ink outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/70 placeholder:italic"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={!q}>Save</Button>
      </div>
    </form>
  );
}
