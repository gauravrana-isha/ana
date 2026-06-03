"use client";

import { useEffect } from "react";

export function ThemeColor() {
  useEffect(() => {
    function updateThemeColor() {
      const theme = document.documentElement.getAttribute("data-theme");
      const color = theme === "light" ? "#faf6f0" : "#0f0f0f";
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", color);
    }

    updateThemeColor();

    // Watch for theme changes
    const observer = new MutationObserver(updateThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, []);

  return null;
}
