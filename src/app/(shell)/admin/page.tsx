"use client";

import { usePersistentState } from "@/lib/persist";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { PlusMark, SearchMark } from "@/components/art/PenMarks";

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
  lastActiveAt: string | null;
  /** Days in the last 30 with any entry (dates only, never content). */
  activeDays: number;
}


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
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = usePersistentState<Status | "ALL">("admin.tab", "PENDING", ["PENDING", "APPROVED", "SUSPENDED", "ALL"] as const);
  const [openId, setOpenId] = useState<string | null>(null);

  // A page at a time, for the chosen tab and search (searching runs on the server).
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);
  const list = useInfiniteQuery({
    queryKey: ["admin-users", tab, q],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<{ users: AdminUser[]; me: string; counts: Record<string, number>; nextCursor: string | null }> => {
      const sp = new URLSearchParams();
      if (tab !== "ALL") sp.set("status", tab);
      if (q) sp.set("q", q);
      if (pageParam) sp.set("cursor", pageParam);
      const res = await fetch(`/api/admin/users?${sp}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: (prev) => prev,
  });
  const isLoading = list.isPending;
  const data = list.data?.pages[0];

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

  const shown = useMemo(() => list.data?.pages.flatMap((p) => p.users) ?? [], [list.data]);
  const rowBusy = (id: string) => change.isPending && change.variables?.id === id;
  const counts = data?.counts ?? { ALL: 0, PENDING: 0, APPROVED: 0, SUSPENDED: 0 };

  return (
    <div>
      {/* Access is the one page that needs a connection: approving, inviting and pausing
          happen on the server. What's shown offline may be out of date. */}
      {!online && (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-[16px] border border-danger/30 bg-danger/10 px-4 py-3">
          <Glyph k="offline" size={20} className="text-danger shrink-0 mt-0.5" />
          <span className="font-ui text-[14px] leading-snug">
            <span className="block font-semibold text-danger">You&rsquo;re offline</span>
            <span className="block text-ink-soft">Access needs a connection. Approvals, invites and changes work once you&rsquo;re back online.</span>
          </span>
        </div>
      )}
      <div className="max-w-full overflow-x-auto no-scrollbar">
        <Segmented
          label="Filter people"
          value={tab}
          onChange={setTab}
          options={TABS.map((t) => ({
            value: t.key,
            name: `${t.label}, ${counts[t.key]}`,
            label: (
              <>
                {t.label}
                <span className={cn("tabular", t.key === "PENDING" && counts.PENDING > 0 ? "text-saffron" : "text-ink-soft")}>{counts[t.key]}</span>
              </>
            ),
          }))}
        />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
        <label className="relative flex-1">
          <span className="sr-only">Search people</span>
          <SearchMark size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full h-11 pl-10 pr-4 rounded-[14px] bg-surface text-ink font-ui text-[15px] outline-none border border-transparent focus:border-accent transition-colors placeholder:text-ink-soft/80"
          />
        </label>
        <Invites />
      </div>

      <RecentErrors />

      <div className="mt-6 flex flex-col gap-2">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[76px] rounded-[18px] bg-surface animate-pulse" />)}

        {!isLoading && shown.length === 0 && (
          <div className="flex flex-col items-center text-center py-16">
            <Ornament name="kolam" width={150} className="text-accent/50" />
            <p className="mt-3 font-ui text-[14.5px] text-ink-soft max-w-[280px]">
              {q ? `No one matches “${q}”.` : tab === "PENDING" ? "No one is waiting. New sign-ups will appear here." : "No one here yet."}
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

                {(u.status === "PENDING" || isMe) && (
                  <div className="hidden sm:flex items-center gap-1.5">
                    <StatusActions u={u} isMe={isMe} busy={rowBusy(u.id)} onChange={(body) => change.mutate({ id: u.id, body })} />
                  </div>
                )}
                {u.status === "SUSPENDED" && (
                  <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-danger/10 font-ui text-[12px] font-semibold text-danger">Paused</span>
                )}
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
                      {u.status === "PENDING" && !isMe && (
                        <div className="flex sm:hidden gap-1.5 flex-wrap border-t border-line pt-4">
                          <StatusActions u={u} isMe={isMe} busy={rowBusy(u.id)} onChange={(body) => change.mutate({ id: u.id, body })} />
                        </div>
                      )}

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

                      <dl className="grid grid-cols-2 gap-2">
                        <Fact icon={<Glyph k="clock" size={17} />} label="Last active" value={activeLabel(u.lastActiveAt)} />
                        <Fact icon={<Glyph k="sunrise" size={17} />} label="Active days" value={`${u.activeDays} of 30`}>
                          <span className="mt-1.5 block h-1 rounded-full bg-line overflow-hidden">
                            <span className="block h-full rounded-full bg-saffron" style={{ width: `${(u.activeDays / 30) * 100}%` }} />
                          </span>
                        </Fact>
                      </dl>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {!isMe && u.status !== "PENDING" && (
                          <StatusActions u={u} isMe={isMe} busy={rowBusy(u.id)} onChange={(body) => change.mutate({ id: u.id, body })} />
                        )}
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

        {list.hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button variant="ghost" onClick={() => list.fetchNextPage()} loading={list.isFetchingNextPage}>
              Show more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** The latest errors from the app and server (technical details only), newest first. */
function RecentErrors() {
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["admin-errors"],
    queryFn: async (): Promise<{ id: string; at: string; source: string; message: string; path: string | null }[]> => {
      const res = await fetch("/api/errors", { cache: "no-store" });
      return res.ok ? res.json() : [];
    },
    refetchInterval: open ? 15_000 : false,
  });
  if (!data.length) return null;
  const time = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <div className="mt-3 rounded-[16px] bg-surface">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="press w-full flex items-center gap-3 px-4 py-3 text-left">
        <Glyph k="info" size={20} className="text-danger shrink-0" />
        <span className="flex-1 font-ui text-[13.5px] text-ink">
          <span className="font-semibold tabular">{data.length}</span> recent {data.length === 1 ? "error" : "errors"}
        </span>
        <span className="font-ui text-[13px] font-semibold text-accent">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul className="border-t border-line divide-y divide-line max-h-[420px] overflow-y-auto">
          {data.map((e) => (
            <li key={e.id} className="px-4 py-2.5">
              <p className="font-ui text-[12px] text-ink-soft tabular">
                {time.format(new Date(e.at))} · {e.source}
                {e.path ? ` · ${e.path}` : ""}
              </p>
              <p className="mt-0.5 font-ui text-[13px] leading-[1.45] text-ink break-words">{e.message}</p>
            </li>
          ))}
        </ul>
      )}
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

interface Invite {
  id: string;
  code: string;
  note: string | null;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

const USES = [
  { value: "1", name: "One person", label: "1" },
  { value: "5", name: "Five people", label: "5" },
  { value: "25", name: "Twenty-five people", label: "25" },
  { value: "any", name: "No limit", label: "Any" },
] as const;
const DAYS = [
  { value: "7", name: "A week", label: "7 days" },
  { value: "30", name: "A month", label: "30 days" },
  { value: "never", name: "No end", label: "No end" },
] as const;

/** Invites: links that let people in as soon as they've set up, without waiting for approval. */
function Invites() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ask = useConfirm();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [uses, setUses] = useState<(typeof USES)[number]["value"]>("1");
  const [days, setDays] = useState<(typeof DAYS)[number]["value"]>("7");
  const [made, setMade] = useState<Invite | null>(null);
  const { data: invites = [] } = useQuery({
    queryKey: ["admin-invites"],
    queryFn: async (): Promise<Invite[]> => {
      const res = await fetch("/api/admin/invites");
      return res.ok ? res.json() : [];
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined, maxUses: uses === "any" ? null : Number(uses), days: days === "never" ? null : Number(days) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't make the invite");
      return (await res.json()) as Invite;
    },
    onSuccess: (inv) => {
      setMade(inv);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-invites"] });
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Couldn't make the invite", "error"),
  });

  const link = (code: string) => `${location.origin}/join/${code}`;
  async function share(inv: Invite) {
    const url = link(inv.code);
    try {
      // The link goes in the message itself, on its own line after a blank one: apps that are
      // handed the text and the link separately (WhatsApp) run them together on one line.
      if (navigator.share) await navigator.share({ title: "Join me on ana", text: `An invite to ana, a quiet journal for your sadhana.\n\n${url}` });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied", "success", 1600);
      }
    } catch {
      /* share sheet closed */
    }
  }
  async function revoke(inv: Invite) {
    if (!(await ask({ title: "Revoke this invite?", body: "The link stops working. Anyone who already joined with it stays.", confirmLabel: "Revoke", tone: "danger" }))) return;
    await fetch("/api/admin/invites", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inv.id, revoke: true }) });
    qc.invalidateQueries({ queryKey: ["admin-invites"] });
  }
  const live = (inv: Invite) => !inv.revokedAt && (!inv.expiresAt || new Date(inv.expiresAt) > new Date()) && (inv.maxUses === null || inv.uses < inv.maxUses);
  const active = invites.filter(live).length;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="shrink-0">
        <PlusMark size={16} /> Invite{active ? <span className="tabular text-ink-soft">· {active} open</span> : null}
      </Button>
      <Sheet open={open} onClose={() => { setOpen(false); setMade(null); }} title="Invites">
        <div className="flex flex-col gap-6">
          {made ? (
            <div className="rounded-[18px] bg-accent-soft p-4">
              <p className="font-ui text-[13px] font-semibold text-accent">New invite</p>
              <p className="mt-1 font-ui text-[22px] font-semibold tracking-[0.12em] text-ink tabular select-all">{made.code}</p>
              <p className="mt-1 font-ui text-[13px] text-ink-soft break-all">{link(made.code)}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => share(made)}>Share link</Button>
                <Button size="sm" variant="ghost" onClick={() => setMade(null)}>Make another</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="font-ui text-[14px] leading-[1.55] text-ink-soft">Whoever joins with the link is let in as soon as they&rsquo;ve set up, without waiting for you.</p>
              <label className="block">
                <span className="font-ui text-[13px] font-semibold text-ink">A note for yourself <span className="font-normal text-ink-soft">(optional)</span></span>
                <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 80))} placeholder="e.g. Saturday satsang group" className="mt-2 w-full h-11 px-4 rounded-[14px] bg-surface-2 text-ink font-ui text-[15px] outline-none border border-transparent focus:border-accent" />
              </label>
              <div>
                <span className="block font-ui text-[13px] font-semibold text-ink">How many can use it</span>
                <Segmented className="mt-2.5" label="How many can use it" value={uses} onChange={setUses} options={USES.map((u) => ({ value: u.value, name: u.name, label: u.label }))} />
              </div>
              <div>
                <span className="block font-ui text-[13px] font-semibold text-ink">Works for</span>
                <Segmented className="mt-2.5" label="Works for" value={days} onChange={setDays} options={DAYS.map((d) => ({ value: d.value, name: d.name, label: d.label }))} />
              </div>
              <Button onClick={() => create.mutate()} loading={create.isPending} className="self-start">Make invite</Button>
            </div>
          )}

          {invites.length > 0 && (
            <div>
              <p className="font-ui text-[13px] font-semibold text-ink mb-2">Your invites</p>
              <ul className="rounded-[16px] bg-surface divide-y divide-line">
                {invites.map((inv) => (
                  <li key={inv.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3", !live(inv) && "opacity-55")}>
                    <span className="flex-1 min-w-[150px]">
                      <span className="block font-ui text-[14.5px] font-semibold text-ink tabular tracking-[0.06em]">{inv.code}</span>
                      <span className="block font-ui text-[12.5px] text-ink-soft">
                        {[inv.note, `${inv.uses}${inv.maxUses ? ` of ${inv.maxUses}` : ""} joined`, inv.revokedAt ? "Revoked" : inv.expiresAt ? (new Date(inv.expiresAt) > new Date() ? `until ${dateFmt.format(new Date(inv.expiresAt))}` : "Ended") : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {live(inv) && (
                      <span className="flex items-center gap-1 ml-auto -mr-2">
                        <Button size="sm" variant="ghost" onClick={() => share(inv)}><Glyph k="copy" size={15} /> Share</Button>
                        <Button size="sm" variant="ghost" className="text-ink-soft hover:text-danger" onClick={() => revoke(inv)}>Revoke</Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
