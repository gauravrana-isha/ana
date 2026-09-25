"use client";

import { usePersistentState } from "@/lib/persist";

import { useState, useCallback, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { PencilSimple, DotsSixVertical } from "@phosphor-icons/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DatePicker } from "@/components/ui/DatePicker";
import { PracticeRow } from "@/components/tracker/PracticeRow";
import { PracticeIcon } from "@/components/tracker/PracticeIcon";
import { WeeklyTable } from "@/components/tracker/WeeklyTable";
import { WeeklyEntryModal } from "@/components/tracker/WeeklyEntryModal";
import { AddPracticeDialog } from "@/components/tracker/AddPracticeDialog";
import { TrackerSkeleton } from "@/components/ui/Skeleton";
import { ButtonLoader } from "@/components/ui/Loader";
import { Busy } from "@/components/ui/Busy";
import { useToast } from "@/components/ui/Toast";
import { usePractices, useDayLog, useUpdateDayLog } from "@/lib/queries";
import { today, addDays, weekStart } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DayLogEntry, DayLogEntries, Practice } from "@/lib/types";

export default function TrackerPage() {
  const [date, setDate] = useState(today());
  const [view, setView] = usePersistentState("tracker.view", "daily", ["daily", "weekly"] as const);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [weeklyModal, setWeeklyModal] = useState<{ practice: Practice; date: string } | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: practices, isLoading: practicesLoading } = usePractices();
  const { data: dayLogData } = useDayLog(date);
  const updateDayLog = useUpdateDayLog(date);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const currentWeekStart = weekStart(date);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Fetch all 7 days for weekly view
  const { data: weekData, isFetching: weekFetching } = useQuery({
    queryKey: ["week", currentWeekStart],
    queryFn: async () => {
      const res = await fetch(`/api/days/week/${currentWeekStart}`);
      return res.json() as Promise<Record<string, DayLogEntries>>;
    },
    enabled: view === "weekly",
  });
  const weekLogs: Record<string, DayLogEntries> = (weekData ?? {}) as Record<string, DayLogEntries>;

  const entries: DayLogEntries = useMemo(() => dayLogData?.entries ?? {}, [dayLogData]);

  const handleChange = useCallback(
    (practiceId: string, entry: Partial<DayLogEntry>) => {
      // The row hands over the practice's whole entry for the day (a tick fills, an untick clears).
      const current = entries[practiceId];
      const updated: DayLogEntries = {
        [practiceId]: { done: entry.done ?? current?.done ?? false, values: entry.values ?? current?.values ?? {} },
      };
      updateDayLog.mutate(updated);
    },
    [entries, updateDayLog]
  );

  const practiceList: Practice[] = Array.isArray(practices) ? practices : [];
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  // Use local order if reordering, else use server order
  const orderedPractices = localOrder
    ? localOrder.map(id => practiceList.find(p => p.id === id)).filter(Boolean) as Practice[]
    : practiceList;

  const fixedPractices = orderedPractices.filter((p) => p.tier === "FIXED" && p.name !== "Mood");
  const customPractices = orderedPractices.filter((p) => p.tier === "CUSTOM");

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = orderedPractices.map(p => p.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    const newOrder = arrayMove(ids, oldIdx, newIdx);
    setLocalOrder(newOrder);

    // Save the new order; the list stays locked until it's stored.
    setSavingOrder(true);
    fetch("/api/practices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reorder: newOrder.map((id, i) => ({ id, order: i })),
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return qc.invalidateQueries({ queryKey: ["practices"] });
      })
      .catch(() => toast("Couldn't save the new order. Please try again.", "error"))
      .finally(() => setSavingOrder(false));
  }

  if (practicesLoading) {
    return <TrackerSkeleton />;
  }

  if (practiceList.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-serif text-base text-ink-soft">
          No practices yet. Visit <a href="/onboarding" className="text-accent underline">onboarding</a> to begin.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* View toggle + reorder toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex gap-0.5 p-[3px] rounded-[30px] bg-surface-2">
          <button
            className={cn(
              "font-ui text-[13px] font-medium px-4 py-1.5 rounded-[30px] transition-all",
              view === "daily" ? "text-ink bg-surface" : "text-ink-soft"
            )}
            onClick={() => setView("daily")}
          >
            Daily
          </button>
          <button
            className={cn(
              "font-ui text-[13px] font-medium px-4 py-1.5 rounded-[30px] transition-all",
              view === "weekly" ? "text-ink bg-surface" : "text-ink-soft"
            )}
            onClick={() => setView("weekly")}
          >
            Weekly
          </button>
        </div>

        {view === "daily" && (
          <button
            onClick={async () => {
              if (reordering) {
                setSavingOrder(true);
                await qc.invalidateQueries({ queryKey: ["practices"] });
                setLocalOrder(null);
                setReordering(false);
                setSavingOrder(false);
              } else {
                setLocalOrder(practiceList.map(p => p.id));
                setReordering(true);
              }
            }}
            disabled={savingOrder}
            className={cn(
              "font-ui text-[11px] px-3 py-1.5 rounded-[20px] border transition-all",
              reordering
                ? "border-accent text-accent bg-accent-soft"
                : "border-line text-ink-soft"
            )}
          >
            {savingOrder ? <ButtonLoader /> : reordering ? "Done" : "Reorder"}
          </button>
        )}
      </div>

      <DatePicker
        value={view === "weekly" ? currentWeekStart : date}
        onChange={(d) => setDate(d)}
        mode={view === "weekly" ? "week" : "day"}
      />

      {view === "weekly" ? (
        <>
          <div className="relative">
            {weekFetching && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/50 backdrop-blur-[1px] rounded-14">
                <ButtonLoader />
              </div>
            )}
            <WeeklyTable
              practices={practiceList}
              weekDays={weekDays}
              dayLogs={weekLogs}
              onCellTap={(practice, day) => setWeeklyModal({ practice, date: day })}
            />
          </div>
          {weeklyModal && (
            <WeeklyEntryModal
              open={true}
              onClose={() => setWeeklyModal(null)}
              practice={weeklyModal.practice}
              date={weeklyModal.date}
              entry={weekLogs[weeklyModal.date]?.[weeklyModal.practice.id]}
              onSave={async (practiceId, entry) => {
                const res = await fetch(`/api/days/${weeklyModal.date}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ entries: { [practiceId]: entry } }),
                });
                if (!res.ok) throw new Error("save failed");
                await Promise.all([
                  qc.invalidateQueries({ queryKey: ["week", currentWeekStart] }),
                  qc.invalidateQueries({ queryKey: ["day"] }),
                ]);
              }}
            />
          )}
        </>
      ) : (
        <>
          {reordering ? (
            /* Reorder mode with drag handles */
            <Busy busy={savingOrder}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedPractices.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <p className="font-ui text-[13px] text-ink-soft mt-2 mb-2.5">Drag to reorder. Each move is saved.</p>
                {orderedPractices.filter(p => p.name !== "Mood").map((practice) => (
                  <SortablePracticeItem key={practice.id} practice={practice} />
                ))}
              </SortableContext>
            </DndContext>
            </Busy>
          ) : (
            <>
              {fixedPractices.map((practice) => (
                <PracticeRow
                  key={practice.id}
                  practice={practice}
                  entry={entries[practice.id]}
                  onChange={handleChange}
                />
              ))}

              {customPractices.length > 0 && (
                <>
                  <h2 className="font-display text-[17px] font-semibold text-ink mt-6 mb-2.5">My own practices</h2>
                  {customPractices.map((practice) => (
                    <PracticeRow
                      key={practice.id}
                      practice={practice}
                      entry={entries[practice.id]}
                      onChange={handleChange}
                    />
                  ))}
                </>
              )}
            </>
          )}

          <button
            onClick={() => setDialogOpen(true)}
            className="font-ui text-[13px] text-accent mt-3 inline-flex items-center gap-1.5"
          >
            <PencilSimple size={14} />
            Edit practices
          </button>
        </>
      )}

      <AddPracticeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

// Sortable practice item for reorder mode
function SortablePracticeItem({ practice }: { practice: Practice }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: practice.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-[14px_16px] bg-surface rounded-14 mb-2",
        isDragging && "shadow-lg"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="grid place-items-center w-9 h-9 -ml-1 rounded-[10px] text-ink-soft hover:text-ink hover:bg-surface-2 cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Drag ${practice.name} to reorder`}
      >
        <DotsSixVertical size={20} weight="bold" />
      </button>
      <PracticeIcon name={practice.name} iconName={practice.iconName} catalogId={practice.catalogId} size={32} />
      <span className="font-serif text-base text-ink">{practice.name}</span>
    </div>
  );
}

