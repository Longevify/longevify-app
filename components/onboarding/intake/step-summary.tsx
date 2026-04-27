"use client";

import { ArrowRight, PartyPopper, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  calcAgeFromBirthDate,
  calcBMI,
  type IntakeRecord,
} from "@/lib/intake/schema";
import {
  ACTIVITY_OPTIONS,
  CONDITION_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  SEX_OPTIONS,
} from "./options";

interface Props {
  record: IntakeRecord;
  onEdit: () => void;
}

export function StepSummary({ record, onEdit }: Props) {
  const { data, variant } = record;
  const firstName =
    data.identity.fullName?.split(" ")[0] ?? "bem-vindo";
  const age = calcAgeFromBirthDate(data.identity.birthDate);
  const bmi = calcBMI(data.identity.heightCm, data.identity.weightKg);
  const sex = SEX_OPTIONS.find(
    (o) => o.value === data.identity.biologicalSex,
  )?.label;

  const activeConditions = data.medical.diagnosedConditions.filter(
    (c) => c !== "nenhuma",
  );
  const conditionLabels = activeConditions
    .map((c) => CONDITION_OPTIONS.find((o) => o.value === c)?.label ?? c)
    .slice(0, 3);

  const primaryGoal = PRIMARY_GOAL_OPTIONS.find(
    (o) => o.value === data.goals.primaryGoal,
  )?.label;

  const summary: string[] = [];
  if (age != null) summary.push(`${age} anos`);
  if (sex) summary.push(sex.toLowerCase());
  if (bmi) summary.push(`IMC ${bmi.value.toFixed(1)} (${bmi.band})`);
  if (data.lifestyle.exerciseDaysPerWeek != null) {
    summary.push(
      data.lifestyle.exerciseDaysPerWeek === 0
        ? "sedentário"
        : `${data.lifestyle.exerciseDaysPerWeek}x treino/semana`,
    );
  }
  if (conditionLabels.length > 0) {
    summary.push(`condições: ${conditionLabels.join(", ").toLowerCase()}`);
  } else if (activeConditions.length === 0 && data.medical.diagnosedConditions.length > 0) {
    summary.push("sem condições crônicas");
  }
  if (primaryGoal) summary.push(`objetivo: ${primaryGoal.toLowerCase()}`);

  const slot = data.scheduling.selectedSlotISO
    ? new Date(data.scheduling.selectedSlotISO)
    : null;

  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-700">
        <PartyPopper className="h-6 w-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-[24px] font-semibold leading-tight">
          Tudo pronto, {firstName}!
        </h2>
        <p className="max-w-xl text-[13.5px] leading-relaxed text-muted">
          Recebemos {variant === "comprehensive" ? "seu cadastro completo" : "seu cadastro inicial"}.
          {slot ? (
            <>
              {" "}
              Sua coleta está agendada para{" "}
              <strong>
                {slot.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                })}{" "}
                às {slot.getHours()}h
              </strong>
              .
            </>
          ) : null}
        </p>
      </div>

      {summary.length > 0 ? (
        <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-4 text-left">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Resumo do seu perfil
          </span>
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.map((s) => (
              <li
                key={s}
                className="rounded-full bg-brand-50 px-3 py-1 text-[12px] font-medium text-brand-900"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-[12px] text-muted">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
        Seu Concierge IA já está sendo personalizado com seus dados.
      </div>

      <div className="flex flex-col items-stretch gap-2 pt-2 sm:flex-row">
        <Link href="/home">
          <Button variant="primary" size="md" className="w-full">
            Ir pro meu painel
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Button variant="outline" size="md" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Quero adicionar mais info
        </Button>
      </div>
    </div>
  );
}
