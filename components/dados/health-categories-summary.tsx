import Link from "next/link";
import { cn } from "@/lib/utils";
import { CATEGORIES, type CategoryGrade } from "@/lib/mock-data";

interface HealthCategoriesSummaryProps {
  className?: string;
}

/**
 * Lista vertical das categorias de saúde com badge de nota (A/B/C/D)
 * — coluna esquerda do Painel de saúde, no estilo "Summary" das telas
 * de health platforms (categoria → letra).
 *
 * Linka pra /dados?cat=<id> pra abrir a aba já filtrada.
 */
export function HealthCategoriesSummary({
  className,
}: HealthCategoriesSummaryProps) {
  // Exclui o pseudo-bucket "all"
  const categories = CATEGORIES.filter((c) => c.id !== "all");

  return (
    <ul
      className={cn(
        "flex flex-col divide-y divide-border/60 overflow-hidden rounded-[16px] border border-border bg-surface",
        className,
      )}
    >
      {categories.map((c) => (
        <li key={c.id}>
          <Link
            href={`/dados?cat=${c.id}`}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/60"
          >
            <GradeBadge grade={c.grade} />
            <span className="flex-1 truncate text-[14px] font-medium text-ink">
              {c.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function GradeBadge({ grade }: { grade: CategoryGrade }) {
  const palette: Record<CategoryGrade, { bg: string; text: string }> = {
    A: { bg: "bg-[#DFF5E9]", text: "text-[#0E7B45]" },
    B: { bg: "bg-[#FBF0D4]", text: "text-[#8A6A13]" },
    C: { bg: "bg-[#FCE2C9]", text: "text-[#A8651B]" },
    D: { bg: "bg-[#FBDADA]", text: "text-[#A22A2A]" },
  };
  const { bg, text } = palette[grade];

  return (
    <span
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
        bg,
        text,
      )}
    >
      {grade}
    </span>
  );
}
