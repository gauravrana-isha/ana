"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Me } from "@/lib/me";
import { saveQuestions } from "@/lib/journal";
import { BUILT_IN, HINT_MAX, QUESTION_MAX, allQuestions, newQuestionKey, toStored, type Question, type ReflectionKind } from "@/lib/questions";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { Busy } from "@/components/ui/Busy";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { DeleteMark, GripMark, PlusMark } from "@/components/art/PenMarks";
import { Glyph } from "@/components/art/Glyphs";
import { cn } from "@/lib/utils";

/*
 * Settings › Reflection questions: reword, describe, hide, add, reorder or reset the questions
 * Daily and Weekly ask. Tapping a question opens it in a sheet (its wording and the line shown
 * under it). Each change is saved straight away, sealed on this device. Answers are kept by
 * question, so past days still show theirs whatever changes here.
 */

export function QuestionsEditor({ me }: { me: Me }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ask = useConfirm();
  const kinds = (["daily", "weekly"] as const).filter((k) => me.features.includes(k));
  const [picked, setPicked] = useState<ReflectionKind>(kinds[0]);
  const kind = kinds.includes(picked) ? picked : kinds[0];
  // The question open in the sheet (its key), "new" while adding one, or null.
  const [editing, setEditing] = useState<string | null>(null);
  // What the sheet shows, kept while it slides away; a new id starts its fields afresh.
  const [sheet, setSheet] = useState<{ id: number; key: string } | null>(null);
  const openSheet = (key: string) => {
    setEditing(key);
    setSheet((s) => ({ id: (s?.id ?? 0) + 1, key }));
  };
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
  const original = JSON.stringify(toStored(kind, listed)) === JSON.stringify(toStored(kind, BUILT_IN[kind]));
  const open = sheet && sheet.key !== "new" ? listed.find((x) => x.key === sheet.key) ?? null : null;

  async function commit(next: Question[], done?: string) {
    const sets = { ...me.questions, [kind]: toStored(kind, next) };
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

  function edit(x: Question, q: string, hint: string) {
    if (q === x.q && hint === (x.hint ?? "")) return setEditing(null);
    commit(change(x.key, { q, hint }), "Question saved");
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
          onChange={(k) => { setPicked(k); setEditing(null); setSheet(null); }}
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
                  builtIn={builtIn(x.key)}
                  onEdit={() => openSheet(x.key)}
                  onToggle={() => toggle(x)}
                  onRemove={() => remove(x)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </Busy>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => openSheet("new")} disabled={saving} className="press inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-surface font-ui text-[13.5px] font-semibold text-accent hover:bg-surface-2">
          <PlusMark size={17} /> Add a question
        </button>
        {!original && (
          <button type="button" onClick={reset} disabled={saving} className="press inline-flex items-center gap-1.5 h-10 px-4 rounded-full font-ui text-[13.5px] font-semibold text-ink-soft hover:text-ink hover:bg-surface">
            <Glyph k="returns" size={16} /> Reset to the original
          </button>
        )}
      </div>

      <QuestionSheet
        key={sheet?.id ?? 0}
        open={editing !== null}
        question={open}
        original={open && builtIn(open.key) ? BUILT_IN[kind].find((b) => b.key === open.key) ?? null : null}
        onClose={() => setEditing(null)}
        onSave={(q, hint) => (open ? edit(open, q, hint) : commit([...all, { key: newQuestionKey(), q, hint }], "Question added"))}
      />
    </div>
  );
}

function QuestionRow({
  question,
  number,
  builtIn,
  onEdit,
  onToggle,
  onRemove,
}: {
  question: Question;
  number: string;
  builtIn: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.key });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative flex items-start gap-1 px-2 py-2 bg-surface first:rounded-t-[18px] last:rounded-b-[18px]", isDragging && "z-10 shadow-lg rounded-[18px]")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Move: ${question.q}`}
        className="grid place-items-center w-9 h-9 mt-0.5 shrink-0 rounded-[10px] text-ink-soft hover:text-ink hover:bg-surface-2 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripMark size={18} />
      </button>
      {/* The question (and its description): tap to open it. */}
      <button type="button" onClick={onEdit} aria-label={`Edit: ${question.q}`} className={cn("press flex-1 min-w-0 flex gap-2 text-left rounded-[12px] px-1.5 py-[7px] hover:bg-surface-2 transition-colors", question.hidden && "opacity-55")}>
        <span className="w-4 shrink-0 font-ui text-[13px] font-semibold leading-[1.75] text-ink-soft/70 tabular">{number}</span>
        <span className="min-w-0">
          <span className="block font-serif text-[15.5px] leading-[1.45] text-ink text-pretty">{question.q}</span>
          {question.hint && <span className="block mt-1 font-ui text-[12.5px] leading-[1.5] text-ink-soft text-pretty">{question.hint}</span>}
          {question.hidden && <span className="block mt-1 font-ui text-[12.5px] font-semibold text-ink-soft">Hidden</span>}
        </span>
      </button>
      {builtIn ? (
        <button type="button" aria-label={`${question.hidden ? "Show" : "Hide"}: ${question.q}`} onClick={onToggle} className="press grid place-items-center w-9 h-9 mt-0.5 shrink-0 rounded-full text-ink-soft hover:text-ink hover:bg-surface-2">
          <Glyph k={question.hidden ? "eye" : "eye-off"} size={18} />
        </button>
      ) : (
        <button type="button" aria-label={`Remove: ${question.q}`} onClick={onRemove} className="press grid place-items-center w-9 h-9 mt-0.5 shrink-0 rounded-full text-ink-soft hover:text-danger hover:bg-danger/10">
          <DeleteMark size={18} />
        </button>
      )}
    </li>
  );
}

const fieldClass =
  "mt-2 w-full resize-none rounded-[14px] bg-surface-2 px-4 py-3 text-ink outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/80";

/**
 * A question in a sheet (a centred dialog on wider screens): its wording and the description
 * shown under it. Enter in the question moves to the description; Enter there saves.
 */
function QuestionSheet({
  open,
  question,
  original,
  onClose,
  onSave,
}: {
  open: boolean;
  /** The question being changed, or null when adding one. */
  question: Question | null;
  /** A built-in's original wording and description, for putting them back. */
  original: Question | null;
  onClose: () => void;
  onSave: (q: string, hint: string) => void;
}) {
  const [text, setText] = useState(question?.q ?? "");
  const [hint, setHint] = useState(question?.hint ?? "");
  const hintRef = useRef<HTMLTextAreaElement>(null);
  const q = text.trim();
  const changed = !!original && (q !== original.q || hint.trim() !== (original.hint ?? ""));
  const save = () => q && onSave(q, hint.trim());

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={question ? "Edit question" : "New question"}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!q}>{question ? "Save" : "Add"}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <label className="block">
          <span className="font-ui text-[13px] font-semibold text-ink">Question</span>
          <textarea
            autoFocus
            rows={2}
            maxLength={QUESTION_MAX}
            value={text}
            placeholder="Ask yourself…"
            onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
            onChange={(e) => setText(e.target.value.replace(/\n/g, " "))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                hintRef.current?.focus();
              }
            }}
            className={cn(fieldClass, "font-serif text-[17px] leading-[1.45]")}
          />
        </label>
        <label className="block">
          <span className="font-ui text-[13px] font-semibold text-ink">Description <span className="font-normal text-ink-soft">(optional)</span></span>
          <textarea
            ref={hintRef}
            rows={3}
            maxLength={HINT_MAX}
            value={hint}
            placeholder="A line to help you answer"
            onChange={(e) => setHint(e.target.value.replace(/\n/g, " "))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            className={cn(fieldClass, "font-ui text-[16px] leading-[1.55]")}
          />
        </label>
        {changed && (
          <button
            type="button"
            onClick={() => { setText(original.q); setHint(original.hint ?? ""); }}
            className="press self-start inline-flex items-center gap-1.5 h-9 -ml-1 px-3 rounded-full font-ui text-[13px] font-semibold text-ink-soft hover:text-ink hover:bg-surface"
          >
            <Glyph k="returns" size={15} /> Use the original wording
          </button>
        )}
      </div>
    </Sheet>
  );
}
