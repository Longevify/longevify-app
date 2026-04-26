import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  className?: string;
}

export function Avatar({ name, className }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full",
        "bg-gradient-to-br from-[#a78bfa] to-[#6d5dfd] text-white",
        "text-[13px] font-semibold tracking-wide select-none",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
