import Image from "next/image";

interface LotusProps {
  size?: number;
  className?: string;
}

export function Lotus({ size = 54, className = "" }: LotusProps) {
  return (
    <Image
      src="/icons/logo.png"
      alt="ana"
      width={size}
      height={size}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      className={`rounded-lg object-contain ${className}`}
      priority
    />
  );
}
