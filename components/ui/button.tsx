import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-500 text-white hover:bg-brand-600 shadow-[0_1px_2px_rgba(13,40,24,.12)]",
        dark: "bg-brand-900 text-brand-100 hover:bg-brand-800",
        ghost: "bg-transparent text-ink hover:bg-black/5",
        outline:
          "border border-border bg-white text-ink hover:bg-brand-50/70",
        pillDark:
          "bg-brand-900 text-white hover:bg-black",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(button({ variant, size }), className)}
        {...props}
      />
    );
  },
);
