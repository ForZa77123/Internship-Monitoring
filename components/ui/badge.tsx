import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        active:
          "border-emerald-600/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold",
        idle: "border-amber-600/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold",
        away: "border-rose-600/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold",
        unknown:
          "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400 font-semibold",
        approved:
          "border-emerald-600/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold",
        rejected:
          "border-rose-600/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold",
        flagged:
          "border-amber-600/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
