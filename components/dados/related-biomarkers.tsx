import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusDot } from "@/components/ui/badge";
import type { Biomarker } from "@/lib/mock-data";

export function RelatedBiomarkers({
  biomarkers,
}: {
  biomarkers: Biomarker[];
}) {
  if (!biomarkers.length) return null;

  return (
    <ul className="flex flex-col">
      {biomarkers.map((b) => (
        <li
          key={b.id}
          className="border-b border-border/70 last:border-none"
        >
          <Link
            href={`/dados/${b.id}`}
            className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-brand-50/60"
          >
            <StatusDot status={b.status} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium leading-tight">
                {b.name}
              </div>
              <div className="truncate text-[11px] text-muted">
                {b.value}
                <span className="ml-1">{b.unit}</span>
                <span className="mx-1.5">·</span>
                {b.category}
              </div>
            </div>
            <ChevronRight
              className="h-4 w-4 flex-none text-muted transition-colors group-hover:text-ink"
              strokeWidth={2}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
