/**
 * The journal's own small marks, drawn as pen strokes to match the calligraphic tick: each
 * stroke heavy where the pen lands and tapering off. All are filled shapes in the current text
 * colour, so they render the same everywhere (no font needed).
 */
type MarkProps = { size?: number; className?: string };

function Mark({ size = 16, className, children }: MarkProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

/** Close (✕). */
export function CrossMark(props: MarkProps) {
  return <Mark {...props}><path d="M5.4 5.2c1-.6 2-.2 2.8.5 3.1 2.8 6.4 6.9 10.3 12 .3.4 0 .8-.4.6-3.5-2.6-7.9-6.6-11.6-9.7-1.2-1-1.9-2.6-1.1-3.4zM18.9 5.1c.3.3.2.8-.1 1.1-4 3.9-7.6 7.9-10.8 12-.6.8-1.7.9-2.3.3-.5-.5-.4-1.3.1-1.8 3.7-3.8 8.2-7.9 12.4-11.6.2-.2.5-.2.7 0z" /></Mark>;
}

/** Back (‹). */
export function BackMark(props: MarkProps) {
  return <Mark {...props}><path d="M14.8 3.4L14.2 3.9L13.6 4.4L13.1 5L12.6 5.7L12.2 6.3L11.7 6.9L11.1 7.5L10.6 8.1L10.1 8.6L9.5 9.2L9 9.7L8.4 10.3L7.8 10.8L7.2 11.3A1.1 1.1 0 0 0 8.8 12.9L9.5 12.5L10.1 12L10.8 11.6L11.5 11.2L12.1 10.7L12.8 10.2L13.4 9.7L13.9 9.2L14.5 8.7L15 8.1L15.6 7.5L16.1 6.9L16.4 6.2L16.8 5.4A1.4 1.4 0 0 0 14.8 3.4ZM7.6 12.6L7.9 13.4L8.4 14L8.9 14.6L9.4 15.2L9.9 15.8L10.5 16.3L11.1 16.8L11.7 17.3L12.3 17.7L13 18.2L13.6 18.6L14.3 19L15 19.4L15.7 19.8A0.4 0.4 0 0 0 16.3 19.2L15.7 18.7L15.1 18.2L14.5 17.7L14 17.1L13.4 16.6L12.9 16L12.4 15.4L11.9 14.9L11.4 14.2L11 13.6L10.5 13L10.1 12.3L9.6 11.7L9 11.2A1 1 0 0 0 7.6 12.6Z" /></Mark>;
}

/** Add / more (+). */
export function PlusMark(props: MarkProps) {
  return <Mark {...props}><path d="M4.4 13.5L5.5 13.8L6.6 14L7.7 14.1L8.8 14.1L9.9 14L11 13.9L12.1 13.8L13.2 13.6L14.2 13.4L15.3 13.2L16.4 13L17.5 12.7L18.5 12.4L19.6 12.1A0.5 0.5 0 0 0 19.6 11.3L18.5 11.3L17.4 11.3L16.3 11.3L15.2 11.3L14.1 11.3L13.1 11.3L12 11.2L10.9 11.1L9.8 11.1L8.7 11L7.6 10.9L6.5 10.9L5.4 10.9L4.4 11.1A1.2 1.2 0 0 0 4.4 13.5ZM11 4.4L10.9 5.5L10.9 6.5L10.9 7.6L11 8.7L11.1 9.8L11.2 10.9L11.3 12L11.3 13.1L11.4 14.2L11.4 15.2L11.4 16.3L11.4 17.4L11.4 18.5L11.4 19.6A0.4 0.4 0 0 0 12.2 19.6L12.5 18.5L12.7 17.5L13 16.4L13.2 15.3L13.4 14.2L13.6 13.1L13.7 12L13.8 11L13.9 9.9L13.9 8.8L13.9 7.7L13.8 6.6L13.6 5.5L13.4 4.4A1.2 1.2 0 0 0 11 4.4Z" /></Mark>;
}

/** Less (−). */
export function MinusMark(props: MarkProps) {
  return <Mark {...props}><path d="M4.4 13.5L5.5 13.8L6.6 14L7.7 14.1L8.8 14.1L9.9 14L11 13.9L12.1 13.8L13.2 13.6L14.2 13.4L15.3 13.2L16.4 13L17.5 12.7L18.5 12.4L19.6 12.1A0.5 0.5 0 0 0 19.6 11.3L18.5 11.3L17.4 11.3L16.3 11.3L15.2 11.3L14.1 11.3L13.1 11.3L12 11.2L10.9 11.1L9.8 11.1L8.7 11L7.6 10.9L6.5 10.9L5.4 10.9L4.4 11.1A1.2 1.2 0 0 0 4.4 13.5Z" /></Mark>;
}

/** More options (⋯): three ink dots, each a little different. */
export function DotsMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <ellipse cx="5" cy="12.3" rx="2.15" ry="1.95" transform="rotate(-20 5 12.3)" />
      <ellipse cx="12" cy="12" rx="2.05" ry="1.9" transform="rotate(15 12 12)" />
      <ellipse cx="19" cy="11.8" rx="1.9" ry="1.75" transform="rotate(-10 19 11.8)" />
    </Mark>
  );
}
