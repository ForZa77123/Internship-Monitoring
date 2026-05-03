import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Custom status variants
        active:
          "border-transparent bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        idle: "border-transparent bg-amber-500/20 text-amber-400 border border-amber-500/30",
        away: "border-transparent bg-red-500/20 text-red-400 border border-red-500/30",
        unknown:
          "border-transparent bg-slate-500/20 text-slate-400 border border-slate-500/30",
        approved:
          "border-transparent bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        rejected:
          "border-transparent bg-red-500/20 text-red-400 border border-red-500/30",
        flagged:
          "border-transparent bg-orange-500/20 text-orange-400 border border-orange-500/30",
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
