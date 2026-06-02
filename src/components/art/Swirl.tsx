interface SwirlProps {
  className?: string;
}

export function Swirl({ className = "" }: SwirlProps) {
  return (
    <svg
      width="120"
      height="24"
      viewBox="0 0 120 24"
      fill="none"
      className={className}
    >
      <path
        d="M10 12c8-8 20-6 28-2s18 6 22 0 8-8 14-4 10 6 16 4 12-6 20-2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="60" cy="12" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
