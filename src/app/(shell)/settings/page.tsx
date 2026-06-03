"use client";

import { useState, useEffect } from "react";
import { usePractices } from "@/lib/queries";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { Practice } from "@/lib/types";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const { data: practices } = usePractices();
  const { toast, update } = useToast();

  // Auth state
  const [authMode, setAuthMode] = useState<"idle" | "login" | "register">("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as "dark" | "light";
    if (current) setTheme(current);

    // Check if already logged in
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.email) {
          setLoggedIn(true);
          setUsername(data.email);
        } else if (data?.onboarded) {
          setLoggedIn(true);
          setUsername("Anonymous");
        }
      })
      .catch(() => {});
  }, []);

  function handleThemeChange(newTheme: "dark" | "light") {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    // Persist to cookie via API
    fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    });
  }

  async function handleAuth(mode: "login" | "register") {
    setAuthError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setLoggedIn(true);
        setAuthMode("idle");
        setEmail("");
        setPassword("");
      } else {
        setAuthError(data.error || "Failed");
      }
    } catch {
      setAuthError("Network error");
    }
  }

  async function handleExport() {
    const toastId = toast("Exporting data…", "loading");
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ana-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      update(toastId, "Export complete", "success");
    } catch {
      update(toastId, "Export failed. Please try again.", "error");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast("Importing data…", "loading");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        update(toastId, result.message || "Import successful!", "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const err = await res.json();
        update(toastId, err.error || "Import failed.", "error");
      }
    } catch {
      update(toastId, "Invalid JSON file.", "error");
    }
    e.target.value = "";
  }

  const practiceList: Practice[] = Array.isArray(practices) ? practices : [];

  return (
    <div className="space-y-8">
      {/* Theme Toggle */}
      <section>
        <h2 className="font-hand text-[22px] text-accent mb-3">Theme</h2>
        <div className="inline-flex gap-0.5 p-[3px] rounded-[30px] bg-surface-2">
          <button
            className={cn(
              "font-ui text-[13px] font-medium px-5 py-2 rounded-[30px] transition-all",
              theme === "dark" ? "text-ink bg-surface" : "text-ink-soft"
            )}
            onClick={() => handleThemeChange("dark")}
          >
            Dark
          </button>
          <button
            className={cn(
              "font-ui text-[13px] font-medium px-5 py-2 rounded-[30px] transition-all",
              theme === "light" ? "text-ink bg-surface" : "text-ink-soft"
            )}
            onClick={() => handleThemeChange("light")}
          >
            Light
          </button>
        </div>
      </section>

      {/* Practice Management */}
      <section>
        <h2 className="font-hand text-[22px] text-accent mb-3">Practices</h2>
        <div className="space-y-1.5">
          {practiceList.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 bg-surface rounded-14"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-9 bg-accent-soft text-accent grid place-items-center text-sm font-ui">
                  {p.iconName.charAt(0)}
                </div>
                <span className="font-serif text-sm text-ink">{p.name}</span>
              </div>
              <span className="font-ui text-[10px] text-ink-soft uppercase">
                {p.tier}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Stamp Guide */}
      <section>
        <h2 className="font-hand text-[22px] text-accent mb-3">Stamp Guide</h2>
        <p className="font-ui text-xs text-ink-soft mb-3">
          These symbols appear below each reflection prompt. Tap to mark the essence of your answer.
        </p>
        <div className="space-y-3">
          {[
            { name: "Growth", desc: "Something shifted upward", icon: "Rocket" },
            { name: "Struggle", desc: "Resistance, difficulty", icon: "Mountains" },
            { name: "Insight", desc: "A realization landed", icon: "Lightbulb" },
            { name: "Stillness", desc: "Peace, no movement needed", icon: "Leaf" },
            { name: "Devotion", desc: "Gratitude, offering", icon: "Flame" },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent grid place-items-center">
                <span className="font-ui text-xs">{s.icon.charAt(0)}</span>
              </div>
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
        <h2 className="font-hand text-[22px] text-accent mb-3">Data</h2>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-5 py-2.5 rounded-14 border border-line text-ink font-ui text-sm hover:bg-surface transition-colors"
          >
            Export JSON
          </button>
          <label className="px-5 py-2.5 rounded-14 border border-line text-ink font-ui text-sm hover:bg-surface transition-colors cursor-pointer">
            Import JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="font-hand text-[22px] text-accent mb-3">Account</h2>
        {loggedIn ? (
          <div className="space-y-2">
            <p className="font-ui text-sm text-ink">
              Signed in as <span className="text-accent font-medium">{username}</span>
            </p>
          </div>
        ) : authMode === "idle" ? (
          <div className="flex gap-3">
            <button
              onClick={() => setAuthMode("login")}
              className="px-5 py-2.5 rounded-14 border border-line text-ink font-ui text-sm hover:bg-surface"
            >
              Sign in
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className="px-5 py-2.5 rounded-14 bg-accent text-bg font-ui text-sm"
            >
              Create account
            </button>
          </div>
        ) : (
          <div className="max-w-[320px] space-y-3">
            <input
              type="text"
              placeholder="Username / email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-[10px] border border-line bg-surface-2 text-ink font-ui text-sm outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-[10px] border border-line bg-surface-2 text-ink font-ui text-sm outline-none"
            />
            {authError && (
              <p className="font-ui text-xs text-accent">{authError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleAuth(authMode)}
                disabled={!email || !password}
                className="px-5 py-2.5 rounded-14 bg-accent text-bg font-ui text-sm disabled:opacity-40"
              >
                {authMode === "login" ? "Sign in" : "Create account"}
              </button>
              <button
                onClick={() => { setAuthMode("idle"); setAuthError(""); }}
                className="px-5 py-2.5 rounded-14 border border-line text-ink-soft font-ui text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
