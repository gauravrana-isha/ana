"use client";

import { useEffect } from "react";

const COLORS = { light: "#fbf8f2", dark: "#13120e" };

/** Keeps the browser/status bar colour in step with the chosen theme. */
export function ThemeColor() {
  useEffect(() => {
    const html = document.documentElement;

    function update() {
      const theme = html.getAttribute("data-theme") === "dark" ? "dark" : "light";
      // The app's own theme wins over the device setting: set every theme-color tag.
      const metas = document.querySelectorAll('meta[name="theme-color"]');
      if (metas.length === 0) {
        const m = document.createElement("meta");
        m.setAttribute("name", "theme-color");
        document.head.appendChild(m);
      }
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", COLORS[theme]));
    }

    update();
    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return null;
}
