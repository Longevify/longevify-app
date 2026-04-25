import Link from "next/link";
import { AlertTriangle, CheckCircle2, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDatePtBR } from "@/lib/utils";
import {
  getInterpretation,
  type Questionnaire,
} from "@/lib/questionnaires/definitions";
import type { QuestionnaireResult } from "@/lib/questionnaires/storage";

interface ScoreResultProps {
  questionnaire: Questionnaire;
  current: QuestionnaireResult;
  history: QuestionnaireResult[];
  onRestart: () => void;
}

const SEVERITY_STYLES: Record<
  "ok" | "low" | "moderate" | "high",
  { ring: string; chip: string; icon: typeof CheckCircle2 }
> = {
  ok: {
    ring: "from-[#DFF5E9] to-[#B8E4CB]",
    chip: "bg-[#DFF5E9] text-[#0E7B45]",
    icon: CheckCircle2,
  },
  low: {
    ring: "from-[#FBF0D4] to-[#F5E2A1]",
    chip: "bg-[#FBF0D4] text-[#8A6A13]",
    icon: AlertTriangle,
  },
  moderate: {
    ring: "from-[#FBE7D1] to-[#F1C896]",
    chip: "bg-[#FBE7D1] text-[#A85A1B]",
    icon: AlertTriangle,
  },
  high: {
    ring: "from-[#FBE1E1] to-[#F0B0B0]",
    chip: "bg-[#FBE1E1] text-[#B6333A]",
    icon: AlertTriangle,
  },
};

const maxScore = (q: Questionnaire) =>
  q.interpretation[q.interpretation.length - 1].max;

export function ScoreResult({
  questionnaire,
  current,
  history,
  onRestart,
}: ScoreResultProps) {
  const interp = getInterpretation(questionnaire, current.score);
  const style = SEVERITY_STYLES[interp.severity];
  const Icon = style.icon;
  const max = maxScore(questionnaire);
  const recommendActive = current.score >= questionnaire.recommendThreshold;

  return (
    <div className="flex flex-col gap-6">
      <Card
        className={cn(
          "relative overflow-hidden p-6",
          "bg-gradient-to-br",
          style.ring,
        )}
      >
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-ink">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <span className="text-[11px] uppercase tracking-[0.14em] text-ink/60">
              Resultado · {questionnaire.name}
            </span>
            <h2 className="mt-1 text-[26px] font-semibold leading-tight text-ink">
              {interp.label}
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink/80">
              {interp.guidance}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-white/70 px-5 py-4">
          <div>
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted">
              Pontuação
            </span>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[40px] font-semibold leading-none tabular-nums text-ink">
                {current.score}
              </span>
              <span className="text-[14px] text-muted">/ {max}</span>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 h-7 text-[12px] font-medium",
              style.chip,
            )}
          >
            {interp.label}
          </span>
        </div>
      </Card>

      {recommendActive ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-brand-400/40 bg-brand-50/50 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold leading-tight">
                Recomendamos conversar com a equipe Longevify
              </h3>
              <p className="mt-1 text-[13px] text-muted">
                Sua pontuação está num patamar que vale acompanhamento. O time
                clínico revisa o resultado em até 24h.
              </p>
            </div>
          </div>
          <Link href="/concierge" className="shrink-0">
            <Button variant="primary" size="sm">
              Abrir Concierge
            </Button>
          </Link>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4 p-6">
        <h3 className="text-[15px] font-semibold leading-tight">
          Histórico de respostas
        </h3>
        {history.length === 0 ? (
          <p className="text-[13px] text-muted">
            Esta foi sua primeira resposta. As próximas vão aparecer aqui.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {[current, ...history.filter((h) => h.completedAt !== current.completedAt)]
              .slice(0, 8)
              .map((r) => {
                const band = getInterpretation(questionnaire, r.score);
                const isCurrent = r.completedAt === current.completedAt;
                return (
                  <li
                    key={r.completedAt}
                    className="flex items-center justify-between gap-3 py-3 text-[13.5px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted">
                        {formatDatePtBR(r.completedAt)}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-700">
                          atual
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                          SEVERITY_STYLES[band.severity].chip,
                        )}
                      >
                        {band.label}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {r.score}
                      </span>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={onRestart}>
          Refazer questionário
        </Button>
        <Link href="/perfil/questionarios">
          <Button variant="ghost" size="sm">
            Voltar pra lista
          </Button>
        </Link>
      </div>

      <p className="text-[11.5px] leading-relaxed text-muted">
        {questionnaire.attribution} Esta ferramenta é uma triagem e não
        substitui avaliação clínica. Em emergência, ligue 188 (CVV) ou 192
        (SAMU).
      </p>
    </div>
  );
}
