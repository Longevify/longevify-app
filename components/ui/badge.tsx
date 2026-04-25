import { cn } from "@/lib/utils";
import type { BiomarkerStatus, CategoryGrade } from "@/lib/mock-data";

export function StatusBadge({
  status,
  className,
}: {
  status: BiomarkerStatus;
  className?: string;
}) {
  const map: Record<BiomarkerStatus, { label: string; cls: string }> = {
    optimal: {
      label: "Ótimo",
      cls: "bg-[#DFF5E9] text-[#0E7B45]",
    },
    normal: {
      label: "Normal",
      cls: "bg-[#FBF0D4] text-[#8A6A13]",
    },
    out: {
      label: "Fora da Faixa",
      cls: "bg-[#FBE1E1] text-[#B6333A]",
    },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 h-6 text-[11px] font-medium",
        cls,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function StatusDot({ status }: { status: BiomarkerStatus }) {
  const color =
    status === "optimal"
      ? "bg-[color:var(--color-status-optimal)]"
      : status === "normal"
        ? "bg-[color:var(--color-status-normal)]"
        : "bg-[color:var(--color-status-out)]";
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", color)} />;
}

export function GradeBadge({
  grade,
  className,
}: {
  grade: CategoryGrade;
  className?: string;
}) {
  const map: Record<CategoryGrade, string> = {
    A: "bg-[#DFF5E9] text-[#0E7B45]",
    B: "bg-[#FBF0D4] text-[#8A6A13]",
    C: "bg-[#FBE7D1] text-[#A85A1B]",
    D: "bg-[#FBE1E1] text-[#B6333A]",
  };
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold",
        map[grade],
        className,
      )}
    >
      {grade}
    </span>
  );
}
