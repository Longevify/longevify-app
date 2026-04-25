"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QuestionCard } from "@/components/questionnaire/question-card";
import { QuestionnaireProgress } from "@/components/questionnaire/progress-bar";
import { ScoreResult } from "@/components/questionnaire/score-result";
import { getQuestionnaire } from "@/lib/questionnaires/definitions";
import {
  clearDraft,
  commitResult,
  loadRecord,
  saveDraft,
  type QuestionnaireResult,
} from "@/lib/questionnaires/storage";

export default function QuestionnaireRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const questionnaire = getQuestionnaire(id);

  if (!questionnaire) notFound();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuestionnaireResult | null>(null);
  const [history, setHistory] = useState<QuestionnaireResult[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const rec = loadRecord(questionnaire.id);
    setHistory(rec.history);
    if (rec.draft && Object.keys(rec.draft.answers).length > 0) {
      setAnswers(rec.draft.answers);
      const firstUnanswered = questionnaire.questions.findIndex(
        (q) => rec.draft!.answers[q.id] === undefined,
      );
      setIndex(firstUnanswered === -1 ? questionnaire.questions.length - 1 : firstUnanswered);
    }
    setHydrated(true);
  }, [questionnaire]);

  const total = questionnaire.questions.length;
  const currentQuestion = questionnaire.questions[index];
  const allAnswered = useMemo(
    () => questionnaire.questions.every((q) => answers[q.id] !== undefined),
    [questionnaire, answers],
  );

  function handleSelect(value: number) {
    if (!currentQuestion) return;
    const next = { ...answers, [currentQuestion.id]: value };
    setAnswers(next);
    saveDraft(questionnaire.id, next);
    if (index < total - 1) {
      window.setTimeout(() => setIndex((i) => i + 1), 180);
    }
  }

  function handleSubmit() {
    if (!allAnswered) return;
    const score = questionnaire.score(answers);
    const r: QuestionnaireResult = {
      answers,
      score,
      completedAt: new Date().toISOString(),
    };
    commitResult(questionnaire.id, r);
    setResult(r);
  }

  function handleRestart() {
    clearDraft(questionnaire.id);
    const rec = loadRecord(questionnaire.id);
    setHistory(rec.history);
    setAnswers({});
    setIndex(0);
    setResult(null);
  }

  if (result) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-6 py-10">
        <BackLink />
        <header className="pb-6">
          <span className="text-[13px] text-muted">
            {questionnaire.fullName}
          </span>
          <h1 className="mt-1 text-[34px] leading-[1.1] font-semibold tracking-tight">
            {questionnaire.name}
          </h1>
        </header>
        <ScoreResult
          questionnaire={questionnaire}
          current={result}
          history={history}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-10">
      <BackLink />

      <header className="pb-6">
        <span className="text-[13px] text-muted">{questionnaire.fullName}</span>
        <h1 className="mt-1 text-[34px] leading-[1.1] font-semibold tracking-tight">
          {questionnaire.name}
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          {questionnaire.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {questionnaire.estimatedMinutes} min
          </span>
          <span>{total} perguntas</span>
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-medium text-brand-700">
            {questionnaire.scale}
          </span>
        </div>
      </header>

      <Card className="mb-5 bg-brand-50/40 p-5 text-[13.5px] leading-relaxed text-ink">
        {questionnaire.preamble}
      </Card>

      <div className="mb-5">
        <QuestionnaireProgress
          current={Object.keys(answers).length}
          total={total}
        />
      </div>

      {hydrated && currentQuestion ? (
        <QuestionCard
          question={currentQuestion}
          index={index}
          total={total}
          value={answers[currentQuestion.id]}
          onSelect={handleSelect}
        />
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </Button>
        {index < total - 1 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={
              currentQuestion ? answers[currentQuestion.id] === undefined : true
            }
          >
            Próxima
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!allAnswered}
          >
            Ver resultado
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="mt-10 text-[11.5px] leading-relaxed text-muted">
        {questionnaire.attribution}
      </p>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/perfil/questionarios"
      className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Todos os questionários
    </Link>
  );
}
