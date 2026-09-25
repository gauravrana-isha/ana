import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ButtonLoader } from "./Loader";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-bg hover:brightness-110 shadow-[var(--shadow-soft)]",
  secondary: "bg-surface-2 text-ink hover:bg-[color-mix(in_srgb,var(--surface-2)_80%,var(--ink)_8%)]",
  ghost: "text-accent hover:bg-accent-soft",
  danger: "text-danger hover:bg-danger/10",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg" | "sm";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "press inline-flex items-center justify-center gap-2 font-ui font-semibold rounded-[14px] select-none",
        "relative disabled:cursor-not-allowed",
        // A loading button keeps its full colour; only a truly disabled one fades.
        loading ? "cursor-progress" : "disabled:opacity-45 disabled:shadow-none",
        size === "lg" && "h-[52px] px-6 text-[15px]",
        size === "md" && "h-11 px-5 text-[14px]",
        size === "sm" && "h-9 px-3.5 text-[13px] rounded-[11px]",
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {/* The label stays in place (invisible) so the button never changes width. */}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
      {loading && <ButtonLoader className="absolute inset-0 m-auto w-fit h-fit" />}
    </button>
  );
});
