import { cn } from "@/lib/utils";

interface SymptomChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function SymptomChip({ label, selected, onClick }: SymptomChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center rounded-full border px-3.5 h-9 text-[13px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
        selected
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-border bg-white text-ink hover:border-brand-300 hover:bg-brand-50/40",
      )}
    >
      {label}
    </button>
  );
}
