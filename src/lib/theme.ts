export type ThemeName = "light" | "dark";

/** Switch theme with a brief colour cross-fade, and remember it. */
export function applyTheme(theme: ThemeName) {
  const html = document.documentElement;
  html.classList.add("theme-switching");
  html.setAttribute("data-theme", theme);
  // Kept on the device too, so it holds offline (the server saves it as well, below).
  document.cookie = `ana-theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.setTimeout(() => html.classList.remove("theme-switching"), 320);
  return fetch("/api/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  }).catch(() => {});
}
