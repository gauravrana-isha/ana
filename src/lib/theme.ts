export type ThemeName = "light" | "dark";

/** Switch theme with a brief colour cross-fade, and remember it. */
export function applyTheme(theme: ThemeName) {
  const html = document.documentElement;
  html.classList.add("theme-switching");
  html.setAttribute("data-theme", theme);
  window.setTimeout(() => html.classList.remove("theme-switching"), 320);
  return fetch("/api/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  }).catch(() => {});
}
