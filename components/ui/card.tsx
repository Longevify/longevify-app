import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-border bg-surface",
        "shadow-[0_1px_2px_rgba(13,40,24,.04)]",
        className,
      )}
      {...props}
    />
  );
}
