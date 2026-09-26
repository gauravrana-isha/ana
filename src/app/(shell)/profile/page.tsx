"use client";

import { Switch } from "@/components/ui/Switch";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { WhoAmICard } from "@/components/profile/WhoAmI";
import { mediaUrl } from "@/lib/media-client";
import { useMe, type Me } from "@/lib/me";
import { NotificationSettings } from "@/components/push/Notifications";
import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Trash, PencilSimple, DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { usePractices } from "@/lib/queries";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/shell/Sidebar";
import { FeatureBadge } from "@/components/art/FeatureBadge";
import { StampBadge } from "@/components/art/StampIcon";
import { PracticeIcon } from "@/components/tracker/PracticeIcon";
import { AddPracticeDialog } from "@/components/tracker/AddPracticeDialog";
import { describeTracking } from "@/lib/practiceCatalog";
import { keys } from "@/lib/queries";
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

export default function ProfilePage() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as ThemeName);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<FeatureKey | null>(null);
  const [dataBusy, setDataBusy] = useState<null | "export" | "import">(null);
  const [, startTransition] = useTransition();
  const { data: practices } = usePractices();
  const { toast, update } = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const { data: me } = useMe();

  function handleThemeChange(next: ThemeName) {
    applyTheme(next);
  }

  async function toggleFeature(key: FeatureKey, enabled: boolean) {
    if (!me || pendingFeature) return;
    if (!enabled && me.features.length === 1) {
      toast("Keep at least one section on.", "error");
      return;
    }
    setPendingFeature(key);
    qc.setQueryData<Me>(["me"], {
      ...me,
      features: enabled ? [...me.features, key] : me.features.filter((k) => k !== key),
    });
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: { [key]: enabled } }),
    });
    if (!res.ok) {
      toast("Couldn't update. Please try again.", "error");
      await qc.invalidateQueries({ queryKey: ["me"] });
      setPendingFeature(null);
      return;
    }
    // The navigation is rendered on the server from these choices.
    startTransition(() => router.refresh());
    setPendingFeature(null);
  }

  async function handleExport() {
    setDataBusy("export");
    const toastId = toast("Preparing your journal…", "loading");
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ana-journal-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      update(toastId, "Downloaded", "success");
    } catch {
      update(toastId, "Download failed. Please try again.", "error");
    } finally {
      setDataBusy(null);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setDataBusy("import");
    const toastId = toast("Bringing in your journal…", "loading");
    try {
      const data = JSON.parse(await file.text());
      const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Import failed.");
      update(toastId, result.message || "Imported", "success");
      // Refresh everything that might have changed, without reloading the page.
      await qc.invalidateQueries();
    } catch (err) {
      update(toastId, err instanceof SyntaxError ? "That file isn't valid JSON." : err instanceof Error ? err.message : "Import failed.", "error");
    } finally {
      setDataBusy(null);
    }
  }

  const practiceList: Practice[] = Array.isArray(practices) ? practices : [];

  return (
    <div className="space-y-8">
      {/* Profile */}
      <ProfileHeader me={me} />

      {/* Who am I? */}
      <WhoAmICard />

      {/* Appearance */}
      <section>
        <SectionTitle>Appearance</SectionTitle>
        <div role="radiogroup" aria-label="Theme" className="inline-flex p-1 rounded-full bg-surface">
          {([
            { value: "light", label: "Light", icon: Sun },
            { value: "dark", label: "Dark", icon: Moon },
          ] as const).map((o) => (
            <button
              key={o.value}
              role="radio"
              aria-checked={theme === o.value}
              onClick={() => handleThemeChange(o.value)}
              className={cn(
                "press inline-flex items-center gap-2 h-9 px-4 rounded-full font-ui text-[13.5px] font-semibold transition-colors",
                theme === o.value ? "bg-bg text-ink shadow-[var(--shadow-soft)]" : "text-ink-soft hover:text-ink"
              )}
            >
              <o.icon size={16} weight={theme === o.value ? "fill" : "regular"} />
              {o.label}
            </button>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <NotificationSettings />

      {/* Sections */}
      <section>
        <SectionTitle>Sections</SectionTitle>
        <div className="rounded-[18px] bg-surface divide-y divide-line">
          {FEATURES.map((f) => {
            const allowed = me?.allowedFeatures.includes(f.key) ?? true;
            const on = me?.features.includes(f.key) ?? false;
            return (
              <label key={f.key} className={cn("flex items-center gap-3.5 px-4 py-3.5", allowed ? "cursor-pointer" : "opacity-50")}>
                <FeatureBadge k={f.key} size={34} />
                <span className="flex-1 min-w-0">
                  <span className="block font-ui text-[14.5px] font-semibold text-ink">{f.label}</span>
                  <span className="block font-ui text-[13px] leading-[1.45] text-ink-soft mt-0.5">
                    {allowed ? f.description : "Not available on your account."}
                  </span>
                </span>
                <Switch checked={on} disabled={!allowed || !me || !!pendingFeature} busy={pendingFeature === f.key} onChange={(v) => toggleFeature(f.key, v)} label={f.label} />
              </label>
            );
          })}
        </div>
      </section>

      {/* Practice Management */}
      {me?.features.includes("tracker") && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Practices</SectionTitle>
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="press inline-flex items-center gap-1.5 h-9 px-3 -mt-3 rounded-[11px] font-ui text-[13px] font-semibold text-accent hover:bg-accent-soft"
            >
              <PencilSimple size={15} /> Edit practices
            </button>
          </div>
          <ManagePractices practices={practiceList} />
          <AddPracticeDialog open={libraryOpen} onClose={() => setLibraryOpen(false)} />
        </section>
      )}

      {/* Stamp Guide */}
      <section>
        <h2 className="font-display text-[19px] font-semibold text-ink mb-3">Stamp Guide</h2>
        <p className="font-ui text-xs text-ink-soft mb-3">
          These symbols appear below each reflection prompt. Tap to mark the essence of your answer.
        </p>
        <div className="space-y-3">
          {[
            { name: "Growth", desc: "Something shifted upward", icon: "growth" as const },
            { name: "Struggle", desc: "Resistance, difficulty", icon: "struggle" as const },
            { name: "Insight", desc: "A realization landed", icon: "insight" as const },
            { name: "Stillness", desc: "Peace, no movement needed", icon: "stillness" as const },
            { name: "Devotion", desc: "Gratitude, offering", icon: "devotion" as const },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <StampBadge k={s.icon} size={36} />
              <div>
                <span className="font-ui text-sm text-ink font-medium">{s.name}</span>
                <span className="font-ui text-sm text-ink-soft"> — {s.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data */}
      <section>
        <SectionTitle>Your data</SectionTitle>
        <p className="font-ui text-[13.5px] text-ink-soft -mt-1.5 mb-3 max-w-[60ch]">
          Download everything as a file you keep: practices, days, reflections, moments, people and letters. Recordings and
          photos stay safely in your account. Importing the same file twice won&rsquo;t duplicate anything.
        </p>
        <div className="flex flex-wrap gap-2.5" inert={!!dataBusy} aria-busy={!!dataBusy || undefined}>
          <Button variant="secondary" onClick={handleExport} loading={dataBusy === "export"}>
            <DownloadSimple size={16} /> Download my journal
          </Button>
          <label className={cn("press inline-flex items-center gap-2 h-11 px-5 rounded-[14px] bg-surface-2 text-ink font-ui text-[14px] font-semibold cursor-pointer", dataBusy && "opacity-60")}>
            {dataBusy === "import" ? <ButtonLoader /> : <UploadSimple size={16} />} Import a file
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </section>

    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[19px] font-semibold text-ink mb-3">{children}</h2>;
}

function ManagePractices({ practices }: { practices: Practice[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Practice | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(p: Practice) {
    if (!confirm(`Remove ${p.name}? Days you've already logged stay as they are.`)) return;
    setBusyId(p.id);
    const res = await fetch("/api/practices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    });
    if (!res.ok) toast("Couldn't remove. Please try again.", "error");
    else toast(`${p.name} removed`, "success", 1800);
    await qc.invalidateQueries({ queryKey: keys.practices() });
    setBusyId(null);
  }

  if (practices.length === 0) {
    return <p className="font-ui text-[14px] text-ink-soft">No practices yet. Add some from the library.</p>;
  }

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
              <PencilSimple size={17} />
            </button>
            <button type="button" aria-label={`Remove ${p.name}`} onClick={() => remove(p)} className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:text-danger hover:bg-danger/10">
              <Trash size={17} />
            </button>
          </li>
        ))}
      </ul>
      <PracticeEditor practice={editing} open={!!editing} onClose={() => setEditing(null)} />
    </>
  );
}

/** "time of day · default 4:30 am", "minutes · fills 15 min". */
function practiceSummary(p: Practice) {
  const spec = specFor(p);
  const what = describeTracking(spec.fields, spec.hasDoneToggle) || "done";
  const usual = spec.fields
    .map((f) => {
      const v = spec.rhythm ? f.default : f.fill;
      if (v === undefined || v === "" || v === 0) return null;
      if (f.kind === "TIME") return time12(v);
      if (f.kind === "ICONSCALE") return scaleLabel(f, v);
      return f.taps ? `${v}×` : `${v} ${f.unit}`;
    })
    .filter(Boolean);
  return usual.length ? `${what} · ${spec.rhythm ? "default" : "tick fills"} ${usual.join(", ")}` : what;
}

function ProfileHeader({ me }: { me: Me | undefined }) {
  const [editing, setEditing] = useState(false);
  const { data: stats } = useQuery({
    queryKey: ["profile-stats", today()],
    queryFn: async (): Promise<{ memberSince: string; month: Record<"daily" | "weekly" | "expressions" | "tracker", number> }> =>
      (await fetch(`/api/profile?date=${today()}`)).json(),
  });

  const cells = [
    { k: "daily", label: "Daily", value: stats?.month.daily },
    { k: "weekly", label: "Weekly", value: stats?.month.weekly },
    { k: "expressions", label: "Moments", value: stats?.month.expressions },
    { k: "tracker", label: "Practice days", value: stats?.month.tracker },
  ].filter((c) => !me || me.features.includes(c.k as FeatureKey));

  return (
    <section className="rounded-[22px] bg-surface overflow-hidden">
      {/* Who: photo and name side by side; the intention and edit button get the full width below */}
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center gap-4 pr-10">
          <Avatar name={me?.name ?? me?.email ?? "You"} image={me?.photoId ? mediaUrl(me.photoId) : (me?.image ?? null)} size={64} />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[21px] sm:text-[24px] font-semibold text-ink leading-tight truncate">{me?.name ?? "\u00a0"}</h2>
            <p className="font-ui text-[13px] text-ink-soft truncate mt-0.5">{me?.email ?? "\u00a0"}</p>
            {(me?.place || me?.birthday || stats?.memberSince) && (
              <p className="font-ui text-[12px] text-ink-soft/80 mt-0.5">
                {[
                  me?.place,
                  me?.birthday ? `Born ${new Date(me.birthday + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long" })}` : null,
                  stats?.memberSince ? `With ana since ${new Date(stats.memberSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 sm:pl-[80px] flex flex-col items-start gap-3">
          {me?.intention && <p className="font-serif italic text-[16.5px] leading-[1.55] text-ink max-w-[52ch] text-pretty">&ldquo;{me.intention}&rdquo;</p>}
          <button type="button" onClick={() => setEditing(true)} disabled={!me} className="press inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-line font-ui text-[13px] font-semibold text-ink hover:bg-bg disabled:opacity-50">
            <PencilSimple size={14} /> Edit profile
          </button>
        </div>
        <SignOutButton className="absolute top-4 right-3 sm:top-5 sm:right-4" labelClassName="hidden sm:inline" />
        {me && <ProfileEditor me={me} open={editing} onClose={() => setEditing(false)} />}
      </div>

      {/* This month: equal tiles, badge on top, number, then label */}
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
