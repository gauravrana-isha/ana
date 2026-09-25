import "server-only";

/** Is the letter due to be read again? Once per calendar month or quarter. */
export function commitmentDue(c: { revisit: string; revisitedAt: Date | null; createdAt: Date }, now = new Date()) {
  if (c.revisit === "never") return false;
  const start =
    c.revisit === "quarterly"
      ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  return (c.revisitedAt ?? c.createdAt) < start;
}
