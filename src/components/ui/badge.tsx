import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 select-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs",
        secondary: "border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        destructive: "border-transparent bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
        outline: "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
