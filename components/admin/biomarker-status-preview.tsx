import { cn } from "@/lib/utils";
import type { BiomarkerStatus } from "@/lib/mock-data";

const MAP: Record<BiomarkerStatus, { label: string; cls: string }> = {
  optimal: { label: "Ótimo", cls: "bg-[#DFF5E9] text-[#0E7B45]" },
  normal: { label: "Normal", cls: "bg-[#FBF0D4] text-[#8A6A13]" },
  out: { label: "Fora da faixa", cls: "bg-[#FBE1E1] text-[#B6333A]" },
};

export function BiomarkerStatusPreview({
  status,
  dim,
  className,
}: {
  status?: BiomarkerStatus;
  dim?: boolean;
  className?: string;
}) {
  if (!status) {
    return (
      <span
        className={cn(
          "inline-flex h-6 items-center rounded-full border border-dashed border-border px-2.5 text-[11px] text-muted",
          className,
        )}
      >
        Aguardando valor
      </span>
    );
  }
  const { label, cls } = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium",
        cls,
        dim && "opacity-60",
        className,
      )}
    >
      {label}
    </span>
  );
}
