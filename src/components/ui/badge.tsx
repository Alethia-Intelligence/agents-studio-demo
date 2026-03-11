"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center py-1.5 px-4 text-xs font-semibold rounded-tl-full rounded-tr-full rounded-br-full rounded-bl-none transition-all",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        destructive: "bg-destructive/10 text-destructive",
        outline: "bg-transparent text-foreground border border-input",
        blue: "bg-ale-blue/10 text-ale-blue",
        indigo: "bg-ale-indigo/10 text-ale-indigo",
        magenta: "bg-ale-magenta/10 text-ale-magenta",
        orange: "bg-ale-orange/10 text-ale-orange",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
