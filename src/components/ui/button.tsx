"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground rounded-2xl shadow-sm hover:brightness-110",
        destructive: "bg-destructive text-destructive-foreground rounded-2xl shadow-sm hover:brightness-110",
        outline: "bg-transparent text-foreground border border-input rounded-2xl hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground border border-input rounded-2xl hover:brightness-95",
        ghost: "bg-transparent text-foreground rounded-2xl shadow-none hover:bg-muted",
        link: "bg-transparent text-primary rounded-2xl shadow-none underline-offset-4 hover:underline focus:ring-0",
      },
      size: {
        default: "h-12 px-6 text-base",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-8 text-lg",
        icon: "h-12 w-12 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
