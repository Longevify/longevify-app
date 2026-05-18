"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { PostExamStories } from "@/components/onboarding/post-exam-stories";
import type { Patient } from "@/lib/mock-data";

interface PrefetchedInsight {
  mainMessage: string;
  whyHappened: string;
  whatToDo: string[];
  timeline: string;
}

/**
 * Wrapper que mostra um botão "Rever apresentação" + a presentação em si.
 * Usado SÓ na home demo (Lucas pediu pra ele rever a apresentação inicial
 * sem precisar limpar localStorage manualmente).
 *
 * State `replay` controla o forceShow do PostExamStories. Quando user
 * clica no botão → replay=true → stories abrem. Quando fecha → replay=false.
 *
 * `prefetchedInsights` vem do home/page.tsx (server component) com
 * análises AI já calculadas — assim quando o user clica em "Rever
 * apresentação", os insights aparecem instantâneo, sem loading.
 */
export function ReplayStoriesButton({
  patient,
  prefetchedInsights,
}: {
  patient: Patient;
  prefetchedInsights?: Record<string, PrefetchedInsight>;
}) {
  const [replay, setReplay] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setReplay(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/60 px-3 py-1.5 text-[12px] font-medium text-brand-700 transition hover:bg-brand-100/70"
      >
        <PlayCircle className="h-3.5 w-3.5" />
        Rever apresentação
      </button>

      {replay && (
        <PostExamStories
          patient={patient}
          forceShow
          onClose={() => setReplay(false)}
          prefetchedInsights={prefetchedInsights}
        />
      )}
    </>
  );
}
