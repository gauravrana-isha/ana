"use client";

import { useEffect } from "react";

interface ThemeBridgeProps {
  theme: "dark" | "light";
}

export function ThemeBridge({ theme }: ThemeBridgeProps) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return null;
}
