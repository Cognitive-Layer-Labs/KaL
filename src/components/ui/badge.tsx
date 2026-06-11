import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        easy: "border-transparent bg-mono-green/15 text-mono-green",
        medium: "border-transparent bg-mono-yellow/15 text-mono-yellow",
        hard: "border-transparent bg-mono-red/15 text-mono-red",
        kal: "border-kal/30 bg-kal/15 text-kal-light",
        // course tiers
        free: "border-mono-green/30 bg-mono-green/10 text-mono-green",
        paid: "border-kal/30 bg-kal/12 text-kal-light",
        unlocked: "border-mono-purple/35 bg-mono-purple/12 text-mono-purple",
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
