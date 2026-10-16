/**
 * Shown the instant a section is tapped, while its page is on the way. The header (title,
 * date, bell) stays put above it, so the tap feels answered at once. It also lets Next.js
 * prefetch every section up to this point.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4 ana-skeleton">
      <div className="h-[92px] rounded-[22px] bg-surface" />
      <div className="h-5 w-40 rounded-full bg-surface mt-2" />
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[62px] rounded-[18px] bg-surface" style={{ opacity: 1 - i * 0.18 }} />
        ))}
      </div>
    </div>
  );
}
