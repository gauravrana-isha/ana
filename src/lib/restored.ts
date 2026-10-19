"use client";

/*
 * When the journal's copy kept on this device has been read back into the app (once per page
 * load). Something that reshapes everything (an import) waits for it, so the older copy can't
 * land on top of what it just brought in.
 */

let done: () => void = () => {};
const restored = new Promise<void>((resolve) => (done = resolve));

export function markRestored() {
  done();
}

export function whenRestored() {
  return restored;
}
