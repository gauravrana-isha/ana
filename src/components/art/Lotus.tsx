import Image from "next/image";
import { cn } from "@/lib/utils";

interface LotusProps {
  size?: number;
  className?: string;
}

/** The ana lotus mark. */
export function Lotus({ size = 32, className = "" }: LotusProps) {
  return (
    <Image
      src="/brand/lotus-256.webp"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      priority
      className={cn("shrink-0 select-none object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
