"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "@phosphor-icons/react";
import { Lotus } from "@/components/art/Lotus";
import { ButtonLoader } from "@/components/ui/Loader";
import { DEFAULT_PRACTICES } from "@/lib/defaults";
import { cn } from "@/lib/utils";

type Step = "welcome" | "account" | "practices";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [selectedPractices, setSelectedPractices] = useState<number[]>(
    DEFAULT_PRACTICES.map((_, i) => i) // all selected by default
  );
  const [loading, setLoading] = useState(false);

  function togglePractice(index: number) {
    setSelectedPractices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }

  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [authLoading, setAuthLoading] = useState(false);

  async function handleCreateAccount() {
    if (!username.trim() || !password.trim()) return;
    setAuthError("");
    setAuthLoading(true);
    try {
      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ email: username.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (authMode === "login") {
          router.replace("/tracker");
        } else {
          setStep("practices");
        }
      } else {
        setAuthError(data.error || (authMode === "login" ? "Invalid credentials" : "Registration failed"));
      }
    } catch {
      setAuthError("Network error");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleFinish() {
    setLoading(true);
    try {
      // Send selected practice indices to the onboard API
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedIndices: selectedPractices }),
      });
      if (res.ok) {
        router.replace("/tracker");
      }
    } catch (e) {
      console.error("Onboard failed:", e);
      setLoading(false);
    }
  }

  // Step 1: Welcome
  if (step === "welcome") {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-6 px-6">
        <Lotus size={88} className="text-accent" />
        <h1 className="font-hand text-[96px] text-ink leading-none">ANA</h1>
        <p className="font-serif italic text-xl text-ink-soft">
          Your practice, alive.
        </p>
        <button
          onClick={() => setStep("account")}
          className="mt-8 px-10 py-3 rounded-full bg-accent text-bg font-ui text-sm font-medium
                     hover:opacity-90 transition-opacity"
        >
          Begin
        </button>
      </div>
    );
  }

  // Step 2: Create account or login
  if (step === "account") {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-6 px-6">
        <Lotus size={48} className="text-accent" />
        <h2 className="font-hand text-[36px] text-ink">
          {authMode === "register" ? "Create your journal" : "Welcome back"}
        </h2>
        <p className="font-serif italic text-base text-ink-soft text-center max-w-[300px]">
          {authMode === "register"
            ? "A simple account so your practice stays with you."
            : "Sign in to continue where you left off."}
        </p>

        <form
          className="w-full max-w-[320px] space-y-3 mt-4"
          onSubmit={(e) => { e.preventDefault(); handleCreateAccount(); }}
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-14 border border-line bg-surface-2 text-ink font-ui text-sm outline-none placeholder:text-ink-soft"
            autoFocus
          />
          <input
            type="password"
            placeholder={authMode === "register" ? "Password (min 4 characters)" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-14 border border-line bg-surface-2 text-ink font-ui text-sm outline-none placeholder:text-ink-soft"
          />
          {authError && (
            <p className="font-ui text-xs text-accent text-center">{authError}</p>
          )}
          <button
            type="submit"
            disabled={!username.trim() || password.length < 4 || authLoading}
            className="w-full py-3 rounded-14 bg-accent text-bg font-ui text-sm font-medium
                       disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {authLoading ? <ButtonLoader /> : (authMode === "register" ? "Create account" : "Sign in")}
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode(authMode === "register" ? "login" : "register"); setAuthError(""); }}
            className="w-full py-2 font-ui text-xs text-accent hover:underline transition-colors"
          >
            {authMode === "register" ? "Already have an account? Sign in" : "New here? Create account"}
          </button>

          <button
            type="button"
            onClick={() => setStep("practices")}
            className="w-full py-2 font-ui text-xs text-ink-soft hover:text-ink transition-colors"
          >
            Skip — use without account
          </button>
        </form>
      </div>
    );
  }

  // Step 3: Select practices
  return (
    <div className="min-h-dvh px-6 py-10 max-w-[480px] mx-auto">
      <h2 className="font-hand text-[32px] text-ink mb-2">Choose your practices</h2>
      <p className="font-serif italic text-base text-ink-soft mb-6">
        Select what you want to track. You can always add or remove later.
      </p>

      <div className="space-y-2 mb-8">
        {DEFAULT_PRACTICES.map((practice, index) => {
          const isSelected = selectedPractices.includes(index);
          return (
            <button
              key={practice.name}
              onClick={() => togglePractice(index)}
              className={cn(
                "w-full flex items-center gap-3 p-3.5 rounded-14 border transition-all text-left",
                isSelected
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface hover:border-ink-soft"
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "w-6 h-6 rounded-full grid place-items-center shrink-0 transition-all",
                  isSelected
                    ? "bg-good border-good text-white"
                    : "border-[1.6px] border-line"
                )}
              >
                {isSelected && <Check size={12} weight="bold" />}
              </div>

              {/* Name + field info */}
              <div className="flex-1 min-w-0">
                <div className="font-serif text-base text-ink">{practice.name}</div>
                <div className="font-ui text-[11px] text-ink-soft">
                  {describeFields(practice)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Finish */}
      <div className="sticky bottom-6">
        <button
          onClick={handleFinish}
          disabled={selectedPractices.length === 0 || loading}
          className="w-full py-3.5 rounded-14 bg-accent text-bg font-ui text-sm font-medium
                     disabled:opacity-40 disabled:cursor-not-allowed transition-opacity
                     shadow-[0_6px_16px_var(--accent-soft)] flex items-center justify-center gap-2"
        >
          {loading
            ? <ButtonLoader />
            : `Start with ${selectedPractices.length} practice${selectedPractices.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

function describeFields(practice: (typeof DEFAULT_PRACTICES)[0]): string {
  const parts: string[] = [];
  if (practice.hasDoneToggle) parts.push("done toggle");
  for (const field of practice.fields) {
    switch (field.kind) {
      case "TIME": parts.push("time"); break;
      case "COUNT": parts.push(field.max ? `count (max ${field.max})` : "count"); break;
      case "MINUTES": parts.push("minutes"); break;
      case "ICONSCALE": parts.push("3-level scale"); break;
      case "MOOD": parts.push("mood picker"); break;
      default: parts.push(field.kind.toLowerCase());
    }
  }
  return parts.join(" + ");
}
