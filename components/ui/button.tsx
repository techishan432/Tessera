import { motion } from "framer-motion";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline" | "gold";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary/85 shadow-[0_0_24px_-6px_var(--primary)]",
  gold: "bg-gold text-[var(--on-gold)] hover:bg-gold/85 shadow-[0_0_24px_-8px_var(--gold)]",
  ghost: "bg-transparent text-foreground hover:bg-overlay border border-transparent",
  outline: "bg-transparent text-foreground border border-line hover:border-primary/60 hover:bg-primary-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...rest }, ref) => (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      ref={ref}
      className={
        "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-colors disabled:opacity-40 disabled:pointer-events-none " +
        variants[variant] +
        " " +
        sizes[size] +
        " " +
        className
      }
      {...(rest as object)}
    >
      {children}
    </motion.button>
  )
);
Button.displayName = "Button";
