import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";

const base =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...rest }, ref) => (
    <input ref={ref} className={base + " " + className} {...rest} />
  )
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...rest }, ref) => (
    <select ref={ref} className={base + " appearance-none " + className} {...rest}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...rest }, ref) => (
    <textarea ref={ref} className={base + " min-h-20 resize-y " + className} {...rest} />
  )
);
Textarea.displayName = "Textarea";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted/70">{hint}</span>}
    </label>
  );
}
