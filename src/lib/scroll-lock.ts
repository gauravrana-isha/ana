"use client";

/*
 * Keep the page still while something sits over it (a sheet, a viewer, search). iPhone
 * Safari ignores `overflow: hidden` on the body for touch scrolling, so the page is pinned
 * in place where it was, and returned to the same spot when the last lock is released.
 */

let locks = 0;
let saved = { y: 0, style: "" };

export function lockScroll() {
  if (locks++ === 0) {
    const y = window.scrollY;
    saved = { y, style: document.body.getAttribute("style") ?? "" };
    Object.assign(document.body.style, { position: "fixed", top: `-${y}px`, left: "0", right: "0", width: "100%", overflow: "hidden" });
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) {
      document.body.setAttribute("style", saved.style);
      window.scrollTo({ top: saved.y, behavior: "instant" });
    }
  };
}
