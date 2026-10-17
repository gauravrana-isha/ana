import { cn } from "@/lib/utils";

interface BrandMarkProps {
  size?: number;
  className?: string;
}

/** The ana mark: the ribbon A, in its light or dark colours to match the theme. */
export function BrandMark({ size = 32, className = "" }: BrandMarkProps) {
  const img = "select-none object-contain";
  return (
    <span aria-hidden="true" className={cn("inline-block shrink-0 align-middle", className)} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark-light.webp" alt="" width={size} height={size} draggable={false} className={cn(img, "block dark:hidden")} style={{ width: size, height: size }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark-dark.webp" alt="" width={size} height={size} draggable={false} className={cn(img, "hidden dark:block")} style={{ width: size, height: size }} />
    </span>
  );
}
