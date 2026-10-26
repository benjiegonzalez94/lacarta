import type { ReactNode } from "react";

export type BadgeVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "Muted";

export interface BadgeProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "success" | "danger" | "muted";
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps["variant"]>, string> = {
  primary:
    "bg-[#E11D48]/15 text-[#E11D48] border border-[#E11D48]/35",
  secondary:
    "bg-[#D34E27]/20 text-[#FF8A65] border border-[#D34E27]/40",
  success:
    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  danger:
    "bg-red-500/15 text-red-400 border border-red-500/30",
  muted:
    "bg-zinc-800/80 text-zinc-300 border border-zinc-700",
};

export function Badge({
  children,
  variant = "primary",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
