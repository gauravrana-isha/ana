"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useHydrated } from "@/lib/hydrated";
import { ProfileSkeleton } from "@/components/skeletons/ScreenSkeletons";
import { Switch } from "@/components/ui/Switch";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { WhoAmICard } from "@/components/profile/WhoAmI";
import { mediaUrl } from "@/lib/media-client";
import { useMe, type Me } from "@/lib/me";
import { NotificationSettings } from "@/components/push/Notifications";
import { usePractices, keys } from "@/lib/queries";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/shell/Sidebar";
import { FeatureBadge, FeatureGlyph } from "@/components/art/FeatureBadge";
import { PracticeIcon } from "@/components/tracker/PracticeIcon";
import { AddPracticeDialog } from "@/components/tracker/AddPracticeDialog";
import { describeTracking } from "@/lib/practiceCatalog";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { BusyBar } from "@/components/ui/Busy";
import { Button } from "@/components/ui/Button";
import { ButtonLoader } from "@/components/ui/Loader";
import { scaleLabel, specFor, time12 } from "@/lib/practiceSpec";
import { PracticeEditor } from "@/components/tracker/PracticeEditor";
import { today } from "@/lib/dates";
import { applyTheme, type ThemeName } from "@/lib/theme";
import { FEATURES, type FeatureKey } from "@/lib/features";
import { cn } from "@/lib/utils";
import type { Practice } from "@/lib/types";
import { deletePractice, fetchProfileStats } from "@/lib/journal";
import { exportJournal, importJournal } from "@/lib/importer";
import { PrivacySettings } from "@/components/vault/PrivacySettings";
import { DeleteMark, EditMark, MoonMark, SunMark } from "@/components/art/PenMarks";
import { useConfirm } from "@/components/ui/Confirm";
import { Glyph } from "@/components/art/Glyphs";
import { Segmented } from "@/components/ui/Segmented";
import { Chevron } from "@/components/ui/Arrows";
import { BackButton } from "@/components/ui/DetailBar";
import { QuestionsEditor } from "./QuestionsEditor";
import { onScreen } from "@/lib/on-screen";

/*
 * Profile, as a short hub: your card and "Who am I?" up top, then one Settings list, then
 * Sign out. On phones a row opens its own full page (with a way
 * back); on wider screens the list sits on the left and the open part on the right.
 */

export type SectionKey = "sections" | "practices" | "questions" | "device" | "privacy" | "data";

const TITLES: Record<SectionKey, string> = {
  sections: "Sections",
  practices: "Practices",
  questions: "Reflection questions",
  device: "Device",
  privacy: "Privacy & keys",
  data: "Your data",
};

export function isSectionKey(v: string): v is SectionKey {
  return v in TITLES;
}

function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia("(min-width: 1024px)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia("(min-width: 1024px)").matches,
    () => false
  );
}

export function ProfileHub({ section }: { section?: SectionKey }) {
  const { data: me } = useMe();
  const hydrated = useHydrated();
  const wide = useWide();

  if (!hydrated || !me) return <ProfileSkeleton />;

  // Phones, one part open: a page of its own (no tab bar), with the way back.
  if (!wide && section) {
    return (
      <div>
        <div className="sticky top-[max(12px,calc(var(--safe-top)+6px))] z-20 -mx-1 mb-4 pointer-events-none">
          <BackButton to="/profile" label="Back to Profile" />
        </div>
        <h1 className="mb-5 font-display text-[28px] font-semibold tracking-[-0.015em] text-ink">{TITLES[section]}</h1>
        <Panel k={section} me={me} />
      </div>
    );
  }

  const open: SectionKey = section ?? "sections";
  return (
    <div className="space-y-8">
      <ProfileHeader me={me} />
      <WhoAmICard />
      {wide ? (
        <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-8 items-start">
          <div className="sticky top-24 flex flex-col gap-5">
            <Rows me={me} active={open} />
            <SignOutButton className="self-start" />
          </div>
          <section aria-labelledby="profile-panel">
            <h2 id="profile-panel" className="font-display text-[22px] font-semibold text-ink mb-4">{TITLES[open]}</h2>
            <Panel k={open} me={me} />
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Rows me={me} />
          <div className="rounded-[18px] bg-surface">
            <SignOutButton className="w-full justify-center h-12 rounded-[18px] text-[14.5px]" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the rows

function Rows({ me, active }: { me: Me; active?: SectionKey }) {
  const tracker = me.features.includes("tracker");
  const reflects = me.features.includes("daily") || me.features.includes("weekly");

  const rows: { k: SectionKey; icon: React.ReactNode }[] = [
    { k: "sections", icon: <Glyph k="cards" size={19} /> },
    ...(tracker ? [{ k: "practices" as const, icon: <FeatureGlyph k="tracker" size={19} /> }] : []),
    ...(reflects ? [{ k: "questions" as const, icon: <FeatureGlyph k="daily" size={19} /> }] : []),
    { k: "device", icon: <Glyph k="phone" size={19} /> },
    { k: "privacy", icon: <Glyph k="lock" size={19} /> },
    { k: "data", icon: <Glyph k="download" size={19} /> },
  ];

  return (
    <nav aria-label="Settings">
      <h2 className="mb-2 px-1 font-ui text-[13px] font-semibold text-ink-soft">Settings</h2>
      <ul className="rounded-[18px] bg-surface p-1.5 flex flex-col gap-0.5">
        {rows.map((r) => {
          const on = active === r.k;
          return (
            <li key={r.k}>
              <Link
                href={`/profile/${r.k}`}
                scroll={!active}
                aria-current={on ? "page" : undefined}
                className={cn("press flex items-center gap-3 px-2.5 py-2.5 rounded-[13px] transition-colors", on ? "bg-bg shadow-[var(--shadow-soft)]" : "hover:bg-bg/60")}
              >
                <span className={cn("grid place-items-center w-9 h-9 rounded-[11px] shrink-0 transition-colors", on ? "bg-accent text-bg" : "bg-accent-soft text-accent")}>{r.icon}</span>
                <span className="flex-1 font-ui text-[15px] font-semibold text-ink whitespace-nowrap">{TITLES[r.k]}</span>
                <Chevron dir="right" size={15} className="text-ink-soft shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------- the parts

function Panel({ k, me }: { k: SectionKey; me: Me }) {
  switch (k) {
    case "sections":
      return <SectionsPanel me={me} />;
    case "practices":
      return <PracticesPanel />;
    case "questions":
      return <QuestionsEditor me={me} />;
    case "device":
      return <DevicePanel />;
    case "privacy":
      return <PrivacySettings bare />;
    case "data":
      return <DataPanel />;
  }
}

function SectionsPanel({ me }: { me: Me }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<FeatureKey | null>(null);
  const [, startTransition] = useTransition();

  async function toggle(key: FeatureKey, enabled: boolean) {
    if (pending) return;
    if (!enabled && me.features.length === 1) return toast("Keep at least one section on.", "error");
    setPending(key);
    onScreen.me({ features: enabled ? [...me.features, key] : me.features.filter((x) => x !== key) });
    const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ features: { [key]: enabled } }) });
    if (!res.ok) {
      toast("Couldn't update. Please try again.", "error");
      void qc.invalidateQueries({ queryKey: ["me"] });
      setPending(null);
      return;
    }
    // The navigation is rendered on the server from these choices.
    startTransition(() => router.refresh());
    setPending(null);
  }

  return (
    <div className="rounded-[18px] bg-surface divide-y divide-line">
      {FEATURES.map((f) => {
        const allowed = me.allowedFeatures.includes(f.key);
        const on = me.features.includes(f.key);
        return (
          <label key={f.key} className={cn("flex items-center gap-3.5 px-4 py-3.5", allowed ? "cursor-pointer" : "opacity-50")}>
            <FeatureBadge k={f.key} size={34} />
            <span className="flex-1 min-w-0">
              <span className="block font-ui text-[14.5px] font-semibold text-ink">{f.label}</span>
              <span className="block font-ui text-[13px] leading-[1.45] text-ink-soft mt-0.5">{allowed ? f.description : "Not available on your account."}</span>
            </span>
            <Switch checked={on} disabled={!allowed || !!pending} busy={pending === f.key} onChange={(v) => toggle(f.key, v)} label={f.label} />
          </label>
        );
      })}
    </div>
  );
}

/** Both are this device's own: its theme, and whether it shows notifications. */
function DevicePanel() {
  return (
    <div className="flex flex-col gap-7">
      <section>
        <h3 className="mb-3 font-ui text-[14px] font-semibold text-ink">Theme</h3>
        <AppearancePanel />
      </section>
      <section>
        <h3 className="mb-3 font-ui text-[14px] font-semibold text-ink">Notifications</h3>
        <NotificationSettings bare />
      </section>
    </div>
  );
}

function AppearancePanel() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as ThemeName);
  return (
    <Segmented
      label="Theme"
      value={theme}
      onChange={(t) => applyTheme(t)}
      options={[
        { value: "light", label: "Light", icon: <SunMark size={17} /> },
        { value: "dark", label: "Dark", icon: <MoonMark size={17} /> },
      ]}
    />
  );
}

function PracticesPanel() {
  const { data: practices } = usePractices();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const list: Practice[] = Array.isArray(practices) ? practices : [];
  return (
    <div className="flex flex-col gap-3">
      <ManagePractices practices={list} />
      <button type="button" onClick={() => setLibraryOpen(true)} className="press self-start inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-surface font-ui text-[13.5px] font-semibold text-accent hover:bg-surface-2">
        <EditMark size={17} /> Add or change practices
      </button>
      <AddPracticeDialog open={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </div>
  );
}

function DataPanel() {
  const qc = useQueryClient();
  const { toast, update } = useToast();
  const [busy, setBusy] = useState<null | "export" | "import">(null);

  async function exportIt() {
    setBusy("export");
    const id = toast("Preparing your journal…", "loading");
    try {
      const blob = await exportJournal();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ana-journal-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      update(id, "Downloaded", "success");
    } catch {
      update(id, "Download failed. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function importIt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("import");
    const id = toast("Bringing in your journal…", "loading");
    try {
      const message = await importJournal(JSON.parse(await file.text()));
      update(id, message, "success");
      void qc.invalidateQueries();
    } catch (err) {
      update(id, err instanceof SyntaxError ? "That file isn't valid JSON." : err instanceof Error ? err.message : "Import failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <p className="font-ui text-[13.5px] leading-[1.55] text-ink-soft mb-3 max-w-[60ch]">
        Download your journal as a file, or import one.
      </p>
      <div className="flex flex-wrap gap-2.5" inert={!!busy} aria-busy={!!busy || undefined}>
        <Button variant="secondary" onClick={exportIt} loading={busy === "export"}>
          <Glyph k="download" size={18} /> Download my journal
        </Button>
        <label className={cn("press inline-flex items-center gap-2 h-11 px-5 rounded-[14px] bg-surface-2 text-ink font-ui text-[14px] font-semibold cursor-pointer", busy && "opacity-60")}>
          {busy === "import" ? <ButtonLoader /> : <Glyph k="upload" size={18} />} Import a file
          <input type="file" accept=".json,application/json" className="hidden" onChange={importIt} />
        </label>
      </div>
    </div>
  );
}

function ManagePractices({ practices }: { practices: Practice[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Practice | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const ask = useConfirm();

  async function remove(p: Practice) {
    if (!(await ask({ title: `Remove ${p.name}?`, body: "Days you've already logged stay as they are.", confirmLabel: "Remove", tone: "danger" }))) return;
    setBusyId(p.id);
    try {
      await deletePractice(p.id);
      toast(`${p.name} removed`, "success", 1800);
    } catch {
      toast("Couldn't remove. Please try again.", "error");
    }
    void qc.invalidateQueries({ queryKey: keys.practices() });
    setBusyId(null);
  }

  if (practices.length === 0) return <p className="font-ui text-[14px] text-ink-soft">No practices yet. Add some from the library.</p>;

  return (
    <>
      <ul className="rounded-[18px] bg-surface divide-y divide-line">
        {practices.map((p) => (
          <li key={p.id} inert={busyId === p.id} aria-busy={busyId === p.id || undefined} className={cn("relative flex items-center gap-3 px-3 py-2.5 transition-opacity", busyId === p.id && "opacity-60")}>
            {busyId === p.id && <BusyBar show className="absolute top-0 inset-x-3" />}
            <button type="button" onClick={() => setEditing(p)} className="flex flex-1 items-center gap-3 min-w-0 text-left rounded-[10px]">
              <PracticeIcon name={p.name} iconName={p.iconName} catalogId={p.catalogId} size={36} />
              <span className="flex-1 min-w-0">
                <span className="block font-ui text-[14.5px] font-semibold text-ink truncate">{p.name}</span>
                <span className="block font-ui text-[12.5px] text-ink-soft truncate">{practiceSummary(p)}</span>
              </span>
            </button>
            <button type="button" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)} className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:text-ink hover:bg-surface-2">
              <EditMark size={19} />
            </button>
            <button type="button" aria-label={`Remove ${p.name}`} onClick={() => remove(p)} className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:text-danger hover:bg-danger/10">
              <DeleteMark size={19} />
            </button>
          </li>
        ))}
      </ul>
      <PracticeEditor practice={editing} open={!!editing} onClose={() => setEditing(null)} />
    </>
  );
}

/** One short line: "time of day · default 4:30 am", "minutes · fills 15 min", "1–2× + kapalbhati · fills 1×, 108". */
function practiceSummary(p: Practice) {
  const spec = specFor(p);
  const what = describeTracking(spec.fields, spec.hasDoneToggle) || "done";
  const usual = spec.fields
    .map((f) => {
      const v = spec.rhythm ? f.default : f.fill;
      if (v === undefined || v === "" || v === 0) return null;
      if (f.kind === "TIME") return time12(v);
      if (f.kind === "ICONSCALE") return scaleLabel(f, v);
      if (f.taps) return `${v}×`;
      // A named count is already named in the first half ("kapalbhati"), so just its number.
      return f.kind === "MINUTES" ? `${v} min` : String(v);
    })
    .filter(Boolean);
  return usual.length ? `${what} · ${spec.rhythm ? "default" : "fills"} ${usual.join(", ")}` : what;
}

// ---------------------------------------------------------------- your card

function ProfileHeader({ me }: { me: Me }) {
  const [editing, setEditing] = useState(false);
  const { data: stats } = useQuery({ queryKey: ["profile-stats", today()], queryFn: () => fetchProfileStats(today()) });

  const cells = [
    { k: "daily", label: "Daily", value: stats?.month.daily },
    { k: "weekly", label: "Weekly", value: stats?.month.weekly },
    { k: "expressions", label: "Moments", value: stats?.month.expressions },
    { k: "tracker", label: "Practice days", value: stats?.month.tracker },
  ].filter((c) => me.features.includes(c.k as FeatureKey));

  return (
    <section className="rounded-[22px] bg-surface overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar name={me.name ?? me.email ?? "You"} image={me.photoId ? mediaUrl(me.photoId) : (me.image ?? null)} size={64} />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[21px] sm:text-[24px] font-semibold text-ink leading-tight truncate">{me.name ?? " "}</h2>
            <p className="font-ui text-[13px] text-ink-soft truncate mt-0.5">{me.email ?? " "}</p>
            {(me.place || me.birthday || stats?.memberSince) && (
              <p className="font-ui text-[12px] text-ink-soft/80 mt-0.5">
                {[
                  me.place,
                  me.birthday ? `Born ${new Date(me.birthday + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long" })}` : null,
                  stats?.memberSince ? `With ana since ${new Date(stats.memberSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 sm:pl-[80px] flex flex-col items-start gap-3">
          {me.intention && <p className="font-serif italic text-[16.5px] leading-[1.55] text-ink max-w-[52ch] text-pretty">&ldquo;{me.intention}&rdquo;</p>}
          <button type="button" onClick={() => setEditing(true)} className="press inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-line font-ui text-[13px] font-semibold text-ink hover:bg-bg">
            <EditMark size={16} /> Edit profile
          </button>
        </div>
        <ProfileEditor me={me} open={editing} onClose={() => setEditing(false)} />
      </div>

      {cells.length > 0 && (
        <div className="border-t border-line px-5 sm:px-6 pt-4 pb-5">
          <p className="mb-3 font-ui text-[13px] font-semibold text-ink-soft">This month</p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {cells.map((c) => (
              <li key={c.k} className="flex items-center gap-2.5 rounded-[16px] bg-bg/70 px-3 py-3">
                <FeatureBadge k={c.k} size={36} />
                <span className="min-w-0">
                  <span className="block font-display text-[22px] font-semibold text-ink tabular leading-none">{c.value ?? "–"}</span>
                  <span className="block font-ui text-[12.5px] leading-tight text-ink-soft mt-1 text-balance">{c.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function readTheme(): ThemeName {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
