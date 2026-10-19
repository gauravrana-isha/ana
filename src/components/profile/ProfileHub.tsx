"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useHydrated } from "@/lib/hydrated";
import { ProfileSkeleton } from "@/components/skeletons/ScreenSkeletons";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { WhoAmICard } from "@/components/profile/WhoAmI";
import { mediaUrl } from "@/lib/media-client";
import { useMe, type Me } from "@/lib/me";
import { NotificationSettings } from "@/components/push/Notifications";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/shell/Sidebar";
import { FeatureBadge, FeatureGlyph } from "@/components/art/FeatureBadge";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button } from "@/components/ui/Button";
import { ButtonLoader } from "@/components/ui/Loader";
import { today } from "@/lib/dates";
import { applyTheme, type ThemeName } from "@/lib/theme";
import type { BundleKey, BundleSetting } from "@/lib/bundles";
import { monthFiguresOf, settingPart, settingPartsOf } from "@/bundles/parts";
import { BUNDLE_SLOTS } from "@/lib/nav-plan";
import { TabBarChooser } from "@/components/shell/BundleNav";
import { useBundles } from "@/components/shell/Bundles";
import { cn } from "@/lib/utils";
import { whenRestored } from "@/lib/restored";
import { fetchProfileStats } from "@/lib/journal";
import { exportJournal, importJournal } from "@/lib/importer";
import { PrivacySettings } from "@/components/vault/PrivacySettings";
import { EditMark, MoonMark, SunMark } from "@/components/art/PenMarks";
import { Glyph } from "@/components/art/Glyphs";
import { Segmented } from "@/components/ui/Segmented";
import { Chevron } from "@/components/ui/Arrows";
import { BackButton } from "@/components/ui/DetailBar";
import { OnThisPhone } from "./OnThisPhone";

/*
 * Profile, as a short hub: your card and "Who am I?" up top, then one Settings list, then
 * Sign out. On phones a row opens its own full page (with a way
 * back); on wider screens the list sits on the left and the open part on the right.
 */

/** Profile's own settings, for everyone (each bundle adds its own: see src/bundles). */
type CoreKey = "device" | "privacy" | "data";
export type SectionKey = CoreKey | BundleSetting;

const CORE: Record<CoreKey, { title: string; icon: React.ReactNode }> = {
  device: { title: "Device", icon: <Glyph k="phone" size={19} /> },
  privacy: { title: "Privacy & keys", icon: <Glyph k="lock" size={19} /> },
  data: { title: "Your data", icon: <Glyph k="download" size={19} /> },
};
const isCore = (k: string): k is CoreKey => k in CORE;

const titleOf = (k: SectionKey) => (isCore(k) ? CORE[k].title : (settingPart(k)?.title ?? ""));
const iconOf = (k: SectionKey) => (isCore(k) ? CORE[k].icon : <FeatureGlyph k={settingPart(k)?.mark ?? "today"} size={19} />);

/** The settings someone sees: each of their bundles brings its own (Sadhana its practices, Reflection its questions), then this device, privacy and data. */
function rowsFor(bundles: readonly BundleKey[]): SectionKey[] {
  return [...settingPartsOf(bundles).map((p) => p.key), "device", "privacy", "data"];
}

export function isSectionKey(v: string): v is SectionKey {
  return isCore(v) || !!settingPart(v);
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

export function ProfileHub({ section: asked }: { section?: SectionKey }) {
  const { data: me } = useMe();
  const hydrated = useHydrated();
  const wide = useWide();
  const bundles = useBundles();
  // A bundle's setting only for those who have the bundle (otherwise, Profile itself).
  const section = asked && rowsFor(bundles).includes(asked) ? asked : undefined;

  if (!hydrated || !me) return <ProfileSkeleton />;

  // Phones, one part open: a page of its own (no tab bar), with the way back.
  if (!wide && section) {
    return (
      <div>
        <div className="sticky top-[max(12px,calc(var(--safe-top)+6px))] z-20 -mx-1 mb-4 pointer-events-none">
          <BackButton to="/profile" label="Back to Profile" />
        </div>
        <h1 className="mb-5 font-display text-[28px] font-semibold tracking-[-0.015em] text-ink">{titleOf(section)}</h1>
        <Panel k={section} me={me} />
      </div>
    );
  }

  const open: SectionKey = section ?? rowsFor(bundles)[0];
  return (
    <div className="space-y-8">
      <ProfileHeader me={me} />
      <WhoAmICard />
      {wide ? (
        <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-8 items-start">
          <div className="sticky top-24 flex flex-col gap-5">
            <Rows active={open} admin={me.role === "ADMIN"} />
            <SignOutButton className="self-start" />
          </div>
          <section aria-labelledby="profile-panel">
            <h2 id="profile-panel" className="font-display text-[22px] font-semibold text-ink mb-4">{titleOf(open)}</h2>
            <Panel k={open} me={me} />
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Rows admin={me.role === "ADMIN"} />
          <div className="rounded-[18px] bg-surface">
            <SignOutButton className="w-full justify-center h-12 rounded-[18px] text-[14.5px]" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the rows

function Rows({ active, admin }: { active?: SectionKey; admin: boolean }) {
  const bundles = useBundles();
  const rows = rowsFor(bundles).map((k) => ({ k, icon: iconOf(k) }));
  const [choosing, setChoosing] = useState(false);
  // Pages reached from here (they take no tab): Insights, and Access for admins.
  const pages = [
    { href: "/insights", label: "Insights", hint: "Gentle patterns in what you keep", icon: <FeatureGlyph k="insights" size={19} /> },
    ...(admin ? [{ href: "/admin", label: "Access", hint: "Who's in, and their bundles", icon: <FeatureGlyph k="admin" size={19} /> }] : []),
  ];

  return (
    <nav aria-label="Settings" className="flex flex-col gap-5">
      <ul className="rounded-[18px] bg-surface p-1.5 flex flex-col gap-0.5">
        {pages.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="press flex items-center gap-3 px-2.5 py-2.5 rounded-[13px] transition-colors hover:bg-bg/60">
              <span className="grid place-items-center w-9 h-9 rounded-[11px] shrink-0 bg-accent-soft text-accent">{p.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-ui text-[15px] font-semibold text-ink">{p.label}</span>
                <span className="block font-ui text-[12.5px] text-ink-soft truncate">{p.hint}</span>
              </span>
              <Chevron dir="right" size={15} className="text-ink-soft shrink-0" />
            </Link>
          </li>
        ))}
        {/* With more bundles than tabs: which ones sit in the tab bar. */}
        {bundles.length > BUNDLE_SLOTS && (
          <li>
            <button type="button" onClick={() => setChoosing(true)} className="press w-full flex items-center gap-3 px-2.5 py-2.5 rounded-[13px] text-left transition-colors hover:bg-bg/60">
              <span className="grid place-items-center w-9 h-9 rounded-[11px] shrink-0 bg-accent-soft text-accent"><Glyph k="cards" size={19} /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-ui text-[15px] font-semibold text-ink">Tab bar</span>
                <span className="block font-ui text-[12.5px] text-ink-soft truncate">Which {BUNDLE_SLOTS} bundles sit in it</span>
              </span>
              <Chevron dir="right" size={15} className="text-ink-soft shrink-0" />
            </button>
          </li>
        )}
      </ul>
      <TabBarChooser open={choosing} onClose={() => setChoosing(false)} />
      <div>
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
                  <span className="flex-1 font-ui text-[15px] font-semibold text-ink whitespace-nowrap">{titleOf(r.k)}</span>
                  <Chevron dir="right" size={15} className="text-ink-soft shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------- the parts

function Panel({ k, me }: { k: SectionKey; me: Me }) {
  if (!isCore(k)) {
    const Part = settingPart(k)?.Panel;
    return Part ? <Part me={me} /> : null;
  }
  switch (k) {
    case "device":
      return <DevicePanel />;
    case "privacy":
      return <PrivacySettings bare />;
    case "data":
      return <DataPanel />;
  }
}

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
      <section>
        <h3 className="mb-3 font-ui text-[14px] font-semibold text-ink">On this phone</h3>
        <OnThisPhone />
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
      // After the device's own copy is back, so it can't land on top of what's brought in.
      await whenRestored();
      const message = await importJournal(JSON.parse(await file.text()));
      update(id, message, "success");
      // Screens open now refresh; every other screen's copy is dropped, so it loads afresh when
      // opened (a copy restored from the device can't refresh itself until a screen uses it).
      void qc.invalidateQueries();
      qc.removeQueries({ type: "inactive" });
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

// ---------------------------------------------------------------- your card

function ProfileHeader({ me }: { me: Me }) {
  const [editing, setEditing] = useState(false);
  const { data: stats } = useQuery({ queryKey: ["profile-stats", today()], queryFn: () => fetchProfileStats(today()) });

  // Each bundle brings its own figures (Reflection: days reflected on; Presence: moments).
  const cells = monthFiguresOf(useBundles()).map((f) => ({ k: f.key, mark: f.mark, label: f.label, value: stats ? f.value(stats) : undefined }));

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
                <FeatureBadge k={c.mark} size={36} />
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
