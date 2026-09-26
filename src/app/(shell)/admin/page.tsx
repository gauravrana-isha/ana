"use client";

import { usePersistentState } from "@/lib/persist";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDown, Check, Crown } from "@phosphor-icons/react";
import { Ornament } from "@/components/art/Ornament";
import { Avatar } from "@/components/shell/Sidebar";
import { NavIcon } from "@/components/shell/NavIcon";
import { Button } from "@/components/ui/Button";
import { BusyBar } from "@/components/ui/Busy";
import { useToast } from "@/components/ui/Toast";
import { FEATURES, type FeatureKey } from "@/lib/features";
import { cn } from "@/lib/utils";

type Status = "PENDING" | "APPROVED" | "SUSPENDED";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "MEMBER" | "ADMIN";
  status: Status;
  onboardedAt: string | null;
  createdAt: string;
  features: { feature: string; allowed: boolean; enabled: boolean }[];
  storageBytes: number;
}

const TABS: { key: Status | "ALL"; label: string }[] = [
  { key: "PENDING", label: "Waiting" },
  { key: "APPROVED", label: "Active" },
  { key: "SUSPENDED", label: "Paused" },
  { key: "ALL", label: "All" },
];

const dateFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function AdminPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = usePersistentState<Status | "ALL">("admin.tab", "PENDING", ["PENDING", "APPROVED", "SUSPENDED", "ALL"] as const);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<{ users: AdminUser[]; me: string }> => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const change = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't save");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Couldn't save", "error"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const users = useMemo(() => data?.users ?? [], [data]);
  const rowBusy = (id: string) => change.isPending && change.variables?.id === id;
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: users.length, PENDING: 0, APPROVED: 0, SUSPENDED: 0 };
    users.forEach((u) => c[u.status]++);
    return c;
  }, [users]);
  const shown = tab === "ALL" ? users : users.filter((u) => u.status === tab);

  return (
    <div>
      <div role="tablist" aria-label="Filter people" className="flex gap-1 p-1 rounded-full bg-surface w-fit max-w-full overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "press relative h-9 px-3 sm:px-4 rounded-full font-ui text-[13px] sm:text-[13.5px] font-semibold whitespace-nowrap transition-colors",
              tab === t.key ? "text-ink" : "text-ink-soft hover:text-ink"
            )}
          >
            {tab === t.key && (
              <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-full bg-bg shadow-[var(--shadow-soft)]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
            )}
            <span className="relative">
              {t.label}
              <span className={cn("ml-1.5 tabular", t.key === "PENDING" && counts.PENDING > 0 ? "text-saffron" : "text-ink-soft")}>
                {counts[t.key]}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[76px] rounded-[18px] bg-surface animate-pulse" />)}

        {!isLoading && shown.length === 0 && (
          <div className="flex flex-col items-center text-center py-16">
            <Ornament name="kolam" width={150} className="text-accent/50" />
            <p className="mt-3 font-ui text-[14.5px] text-ink-soft max-w-[280px]">
              {tab === "PENDING" ? "No one is waiting. New sign-ups will appear here." : "No one here yet."}
            </p>
          </div>
        )}

        {shown.map((u) => {
          const open = openId === u.id;
          const isMe = u.id === data?.me;
          const allowed = (k: FeatureKey) => u.features.find((f) => f.feature === k)?.allowed !== false;
          const chose = (k: FeatureKey) => u.features.find((f) => f.feature === k)?.enabled !== false;
          const name = u.name ?? u.email ?? "Unnamed";
          return (
            <article key={u.id} aria-busy={rowBusy(u.id) || undefined} className="relative rounded-[18px] bg-surface overflow-hidden">
              <BusyBar show={rowBusy(u.id)} className="absolute top-0 inset-x-5" />
              <div className="flex items-center gap-3 p-4">
                <Avatar name={name} image={u.image} size={40} />
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : u.id)}
                  aria-expanded={open}
                  className="flex-1 min-w-0 text-left rounded-lg"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="font-ui text-[14.5px] font-semibold text-ink truncate">{name}</span>
                    {u.role === "ADMIN" && <Crown size={14} weight="fill" className="text-saffron shrink-0" aria-label="Admin" />}
                  </span>
                  <span className="block font-ui text-[13px] text-ink-soft truncate">
                    {u.email} · <span className="tabular">{dateFmt.format(new Date(u.createdAt))}</span>
                  </span>
                </button>

                <div className="hidden sm:flex items-center gap-1.5">
                  <StatusActions u={u} isMe={isMe} busy={rowBusy(u.id)} onChange={(body) => change.mutate({ id: u.id, body })} />
                </div>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : u.id)}
                  aria-label={open ? "Hide details" : "Show details"}
                  className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:bg-surface-2"
                >
                  <CaretDown size={18} className={cn("transition-transform duration-300", open && "rotate-180")} />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="px-4 pb-4 space-y-4">
                      <div className="flex sm:hidden gap-1.5 flex-wrap border-t border-line pt-4">
                        <StatusActions u={u} isMe={isMe} busy={rowBusy(u.id)} onChange={(body) => change.mutate({ id: u.id, body })} />
                      </div>

                      <div>
                        <h3 className="font-ui text-[13px] font-semibold text-ink mb-2">Can use</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {FEATURES.map((f) => {
                            const on = allowed(f.key);
                            return (
                              <button
                                key={f.key}
                                type="button"
                                aria-pressed={on}
                                disabled={rowBusy(u.id)}
                                onClick={() => change.mutate({ id: u.id, body: { features: { [f.key]: !on } } })}
                                className={cn(
                                  "press inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-full font-ui text-[13px] font-semibold border transition-colors",
                                  on ? "bg-accent-soft border-accent/30 text-accent" : "bg-bg border-line text-ink-soft line-through decoration-1"
                                )}
                                title={on && !chose(f.key) ? "Allowed, but they turned it off" : undefined}
                              >
                                <NavIcon k={f.key} size={15} weight={on ? "fill" : "regular"} />
                                {f.label}
                                {on && !chose(f.key) && <span className="font-normal text-ink-soft no-underline">(off)</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="font-ui text-[12.5px] text-ink-soft tabular">
                          Storage used: {formatBytes(u.storageBytes)} of 2 GB
                        </span>
                        {!isMe && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={rowBusy(u.id)}
                            onClick={() => change.mutate({ id: u.id, body: { role: u.role === "ADMIN" ? "MEMBER" : "ADMIN" } })}
                          >
                            {u.role === "ADMIN" ? "Remove admin" : "Make admin"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StatusActions({ u, isMe, busy, onChange }: { u: AdminUser; isMe: boolean; busy: boolean; onChange: (body: { status: Status }) => void }) {
  if (isMe) return <span className="font-ui text-[12.5px] text-ink-soft px-2">You</span>;
  if (u.status === "PENDING") {
    if (!u.onboardedAt) {
      return (
        <>
          <span className="font-ui text-[12.5px] text-ink-soft px-1">Finishing onboarding</span>
          <Button size="sm" variant="danger" disabled={busy} onClick={() => onChange({ status: "SUSPENDED" })}>
            Decline
          </Button>
        </>
      );
    }
    return (
      <>
        <Button size="sm" disabled={busy} onClick={() => onChange({ status: "APPROVED" })}>
          <Check size={15} weight="bold" /> Approve
        </Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={() => onChange({ status: "SUSPENDED" })}>
          Decline
        </Button>
      </>
    );
  }
  if (u.status === "APPROVED") {
    return (
      <Button size="sm" variant="danger" disabled={busy} onClick={() => confirm(`Pause access for ${u.name ?? u.email}? They'll be signed out.`) && onChange({ status: "SUSPENDED" })}>
        Pause
      </Button>
    );
  }
  return (
    <Button size="sm" variant="ghost" disabled={busy} onClick={() => onChange({ status: "APPROVED" })}>
      Restore
    </Button>
  );
}

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
