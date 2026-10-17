"use client";

import { usePersistentState } from "@/lib/persist";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Ornament } from "@/components/art/Ornament";
import { Avatar } from "@/components/shell/Sidebar";
import { NavIcon } from "@/components/shell/NavIcon";
import { Button } from "@/components/ui/Button";
import { BusyBar } from "@/components/ui/Busy";
import { useToast } from "@/components/ui/Toast";
import { FEATURES, type FeatureKey } from "@/lib/features";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/Confirm";
import { Chevron } from "@/components/ui/Arrows";
import { TickMark } from "@/components/tracker/FieldInput";
import { Glyph } from "@/components/art/Glyphs";

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
  lastActiveAt: string | null;
}

const QUOTA = 200 * 1024 * 1024;

/** "Today", "Yesterday", "3 days ago", or a date: sign-in activity is known to the day. */
/** Calendar days in your own time: "Today, 4:12 pm", "Yesterday, 9:40 am", "Tue 13 Oct", then a full date. */
function activeLabel(iso: string | null) {
  if (!iso) return "Not signed in";
  const at = new Date(iso);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(new Date()) - day(at)) / 86_400_000);
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase();
  if (days <= 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  if (days < 7) return at.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return dateFmt.format(at);
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

  const { data, isPending: isLoading } = useQuery({
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
                    {u.role === "ADMIN" && <span role="img" aria-label="Admin" className="text-saffron shrink-0"><Glyph k="crown" size={16} /></span>}
                  </span>
                  <span className="block font-ui text-[13px] text-ink-soft truncate">
                    {u.email} · <span className="tabular">{dateFmt.format(new Date(u.createdAt))}</span>
                  </span>
                  {u.status === "PENDING" && !u.onboardedAt && (
                    <span className="sm:hidden mt-1 inline-flex items-center gap-1 font-ui text-[12px] font-semibold text-saffron">
                      <Glyph k="hourglass" size={15} /> Finishing onboarding
                    </span>
                  )}
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
                  <Chevron dir="down" size={19} className={cn("transition-transform duration-300", open && "rotate-180")} />
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
                        <div className="flex flex-wrap gap-1 sm:gap-1.5">
                          {FEATURES.map((f) => {
                            const on = allowed(f.key);
                            return (
                              <button
                                key={f.key}
                                type="button"
                                aria-pressed={on}
                                disabled={rowBusy(u.id)}
                                onClick={() => change.mutate({ id: u.id, body: { features: { [f.key]: !on } } })}
                                aria-label={`${f.label}: ${on ? (chose(f.key) ? "allowed" : "allowed, turned off by them") : "not allowed"}`}
                                title={`${f.label}${on && !chose(f.key) ? " (allowed, but they turned it off)" : on ? "" : " (not allowed)"}`}
                                className={cn(
                                  "press relative inline-flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:h-9 sm:pl-2.5 sm:pr-3 rounded-full font-ui text-[13px] font-semibold border transition-colors",
                                  on ? "bg-accent-soft border-accent/30 text-accent" : "bg-bg border-line text-ink-soft/60 sm:line-through decoration-1"
                                )}
                              >
                                <NavIcon k={f.key} size={16} weight={on ? "fill" : "regular"} />
                                <span className="hidden sm:inline">{f.label}</span>
                                {on && !chose(f.key) && <span className="hidden sm:inline font-normal text-ink-soft no-underline">(off)</span>}
                                {/* phones: a slash for "not allowed", a small dot for "they turned it off" */}
                                {!on && <span aria-hidden="true" className="sm:hidden absolute w-[26px] h-[1.5px] bg-ink-soft/60 rotate-[-40deg] rounded-full" />}
                                {on && !chose(f.key) && <span aria-hidden="true" className="sm:hidden absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-saffron ring-2 ring-surface" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <Fact icon={<Glyph k="clock" size={17} />} label="Last active" value={activeLabel(u.lastActiveAt)} />
                        <Fact icon={<Glyph k="calendar" size={17} />} label="Joined" value={dateFmt.format(new Date(u.createdAt))} />
                        <Fact icon={<Glyph k="storage" size={17} />} label="Storage" value={`${formatBytes(u.storageBytes)} of 200 MB`}>
                          <span className="mt-1.5 block h-1 rounded-full bg-line overflow-hidden">
                            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(u.storageBytes ? 2 : 0, Math.min(100, (u.storageBytes / QUOTA) * 100))}%` }} />
                          </span>
                        </Fact>
                      </dl>

                      <div className="flex flex-wrap items-center justify-end gap-3">
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
  const ask = useConfirm();
  if (isMe) return <span className="font-ui text-[12.5px] text-ink-soft px-2">You</span>;
  if (u.status === "PENDING") {
    if (!u.onboardedAt) {
      return (
        <>
          <span className="inline-flex items-center justify-center gap-1.5 h-9 min-w-[124px] px-3 rounded-[11px] bg-[color-mix(in_srgb,var(--saffron)_12%,var(--surface))] font-ui text-[12.5px] font-semibold text-saffron" title="They signed in but haven't finished the welcome steps yet">
            <Glyph k="hourglass" size={16} /> Onboarding
          </span>
          <Button size="sm" variant="danger" disabled={busy} onClick={() => onChange({ status: "SUSPENDED" })}>
            Decline
          </Button>
        </>
      );
    }
    return (
      <>
        <Button size="sm" disabled={busy} onClick={() => onChange({ status: "APPROVED" })} className="min-w-[124px]">
          <TickMark size={16} /> Approve
        </Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={() => onChange({ status: "SUSPENDED" })}>
          Decline
        </Button>
      </>
    );
  }
  if (u.status === "APPROVED") {
    return (
      <Button size="sm" variant="danger" disabled={busy} onClick={async () => (await ask({ title: `Pause access for ${u.name ?? u.email}?`, body: "They'll be signed out. Their journal stays as it is.", confirmLabel: "Pause", tone: "danger" })) && onChange({ status: "SUSPENDED" })}>
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

function Fact({ icon, label, value, sub, children }: { icon: React.ReactNode; label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-bg/70 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 font-ui text-[11.5px] font-semibold text-ink-soft">
        <span className="text-ink-soft/80">{icon}</span>
        {label}
      </dt>
      {/* Value (and any bar) line up with the label's text, past its 15px icon + 6px gap. */}
      <dd className="mt-0.5 pl-[21px] font-ui text-[13.5px] font-semibold text-ink tabular truncate">
        {value}
        {sub && <span className="font-normal text-ink-soft"> {sub}</span>}
      </dd>
      {children && <div className="pl-[21px]">{children}</div>}
    </div>
  );
}

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
