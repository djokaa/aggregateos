import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-zinc-900 text-zinc-50 shadow-sm",
        secondary:
          "border border-zinc-200 bg-zinc-50 text-zinc-700",
        destructive:
          "border border-transparent bg-red-500 text-white shadow-sm",
        outline:
          "border border-zinc-200 text-zinc-700 bg-white",

        // ── Semantic status variants ────────────────────────────────
        success:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
        warning:
          "border border-amber-200 bg-amber-50 text-amber-700",
        info:
          "border border-blue-200 bg-blue-50 text-blue-700",
        error:
          "border border-red-200 bg-red-50 text-red-700",
        purple:
          "border border-purple-200 bg-purple-50 text-purple-700",
        orange:
          "border border-orange-200 bg-orange-50 text-orange-700",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[11px]",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
