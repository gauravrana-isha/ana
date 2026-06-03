"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check if user has practices (is onboarded)
    async function check() {
      try {
        const res = await fetch("/api/practices", { credentials: "include" });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          router.replace("/tracker");
        } else {
          // Double check with /api/me
          const meRes = await fetch("/api/me", { credentials: "include" });
          const me = await meRes.json();
          if (me?.onboarded) {
            router.replace("/tracker");
          } else {
            router.replace("/onboarding");
          }
        }
      } catch {
        // If offline or error, try to go to tracker (SW will serve cached page)
        router.replace("/tracker");
      }
      setChecked(true);
    }
    check();
  }, [router]);

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-accent animate-spin" />
      </div>
    );
  }

  return null;
}
