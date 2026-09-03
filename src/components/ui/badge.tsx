import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border-[3px] border-foreground px-2.5 py-0.5 text-xs font-black uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]",
        outline: "text-foreground bg-background shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]",
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
