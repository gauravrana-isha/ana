import type { PresenceKind } from "@/lib/presence";

/**
 * Each kind in Presence, drawn by hand in the journal's ink: a person, a bowl with steam, a
 * drop, the mountains, a vessel, footsteps, a small star.
 */
const PATHS: Record<PresenceKind, string[]> = {
  person: ["M12 11.6c2.1 0 3.6-1.6 3.6-3.7S14.1 4.3 12 4.3 8.4 5.8 8.4 7.9s1.5 3.7 3.6 3.7Z", "M5.2 19.6c.6-3.6 3.3-5.7 6.8-5.7s6.3 2.1 6.9 5.7"],
  food: ["M4.3 12.4h15.4c-.3 3.9-3.6 6.6-7.7 6.6s-7.4-2.7-7.7-6.6Z", "M9 9.6c-.8-1.1.8-1.9 0-3.1", "M12.4 9.4c-.8-1.2.9-2 0-3.3", "M15.6 9.6c-.8-1.1.8-1.9 0-3.1"],
  water: ["M12 3.8c2.7 3.4 5.4 6.6 5.4 9.6a5.4 5.4 0 0 1-10.8 0c0-3 2.7-6.2 5.4-9.6Z", "M9.4 14.2c.4 1.5 1.4 2.4 2.8 2.6"],
  earth: ["M2.8 18.8 9.2 8.4l3.4 5.3", "M10.6 18.8l5.6-9 5 9", "M2.8 18.8h18.4", "M8 10.4l1.2.9 1-.7"],
  thing: ["M8.6 4.6h6.8", "M9.6 4.6c0 2.2-3.4 3.6-3.4 7.6 0 4.5 2.6 7.4 5.8 7.4s5.8-2.9 5.8-7.4c0-4-3.4-5.4-3.4-7.6", "M7.4 12.6h9.2"],
  act: ["M7.6 13.8c-1.4-.2-2.3-1.8-2-3.8s1.4-3.6 2.8-3.4 1.9 1.9 1.6 3.9-1 3.5-2.4 3.3Z", "M7.2 16.2l2.4.4", "M15.8 10.4c1.4-.2 2.3-1.8 2-3.8S16.4 3 15 3.2s-1.9 1.9-1.6 3.9 1 3.5 2.4 3.3Z", "M16.4 12.8l-2.4.4"],
  other: ["M12 3.6c.5 4 1.9 5.9 5.6 6.4-3.7.6-5.1 2.4-5.6 6.4-.5-4-1.9-5.8-5.6-6.4 3.7-.5 5.1-2.4 5.6-6.4Z", "M18 15.6c.2 1.6.8 2.3 2.2 2.5-1.4.2-2 .9-2.2 2.5-.2-1.6-.8-2.3-2.2-2.5 1.4-.2 2-.9 2.2-2.5Z"],
};

export function PresenceMark({ kind, size = 22, className }: { kind: PresenceKind; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {PATHS[kind].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
