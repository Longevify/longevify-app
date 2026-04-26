"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn, formatDatePtBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/admin/stepper";
import { PatientSearchCombobox } from "@/components/admin/patient-search-combobox";
import { ExamUploadStep } from "@/components/admin/exam-upload-step";
import {
  BiomarkerInputGrid,
  computeExamValues,
} from "@/components/admin/biomarker-input-grid";
import { BIOMARKER_CATALOG } from "@/lib/admin/biomarker-catalog";
import { createExam, getPatients, publishExam } from "@/lib/admin/storage";
import type { AdminPatient } from "@/lib/admin/types";
import { BiomarkerStatusPreview } from "@/components/admin/biomarker-status-preview";

const STEPS = [
  { id: "patient", label: "Paciente" },
  { id: "upload", label: "Upload & coleta" },
  { id: "values", label: "Valores" },
  { id: "review", label: "Revisão" },
];

// Wrapper que satisfaz a exigência do Next 16 de Suspense em torno de useSearchParams
export default function NovoExamePageWrapper() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-muted">Carregando…</div>}>
      <NovoExamePage />
    </Suspense>
  );
}

function NovoExamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectPatient = searchParams.get("patient");

  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [step, setStep] = useState(0);
  const [patientId, setPatientId] = useState<string | null>(
    preselectPatient ?? null,
  );
  const [fileName, setFileName] = useState<string | undefined>();
  const [lab, setLab] = useState<string | undefined>();
  const [collectionDate, setCollectionDate] = useState<string | undefined>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [rawValues, setRawValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [published, setPublished] = useState<string | null>(null);

  useEffect(() => {
    getPatients().then(setPatients);
  }, []);

  useEffect(() => {
    if (preselectPatient && !patientId) setPatientId(preselectPatient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectPatient]);

  const patient = useMemo(
    () => patients.find((p) => p.id === patientId) ?? null,
    [patients, patientId],
  );

  const values = useMemo(() => computeExamValues(rawValues), [rawValues]);
  const filledCount = values.length;
  const flaggedCount = values.filter((v) => v.status === "out").length;

  const canNext = (() => {
    if (step === 0) return !!patientId;
    if (step === 1) return !!collectionDate;
    if (step === 2) return filledCount > 0;
    return true;
  })();

  async function handlePublish() {
    if (!patientId || !collectionDate) return;
    setSubmitting(true);
    const exam = await createExam({
      patientId,
      collectionDate,
      lab,
      fileName,
      values,
    });
    await publishExam(exam.id);
    setPublished(exam.id);
    setSubmitting(false);
  }

  function handleSaveDraft() {
    if (!patientId || !collectionDate) return;
    setSubmitting(true);
    createExam({ patientId, collectionDate, lab, fileName, values })
      .then(() => router.push("/admin/exames"))
      .finally(() => setSubmitting(false));
  }

  if (published) {
    return (
      <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 rounded-[20px] border border-border bg-surface p-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-700">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Exame publicado
        </h1>
        <p className="text-[13px] text-muted">
          O paciente {patient?.firstName} {patient?.lastName} já tem acesso aos
          resultados no app. O Longevify Score foi recalculado automaticamente.
        </p>
        <div className="mt-2 flex gap-2">
          <Link href="/admin/exames">
            <Button variant="outline">Voltar à lista</Button>
          </Link>
          <Link href={`/admin/pacientes/${patient?.id}`}>
            <Button variant="dark">Ver paciente</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/exames"
          className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Exames
        </Link>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight">
          Lançar resultado de exame
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Fluxo guiado em quatro etapas. Os valores disparam cálculo de status
          em tempo real.
        </p>
      </div>

      <div className="rounded-[16px] border border-border bg-surface px-5 py-4">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="rounded-[20px] border border-border bg-surface p-6">
        {step === 0 ? (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-[16px] font-semibold">
                1. Escolha o paciente
              </h2>
              <p className="text-[12px] text-muted">
                Digite para filtrar. Você também pode abrir este fluxo direto
                da página do paciente.
              </p>
            </div>
            <PatientSearchCombobox
              patients={patients}
              value={patientId}
              onChange={setPatientId}
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-[16px] font-semibold">
                2. Anexar PDF do exame
              </h2>
              <p className="text-[12px] text-muted">
                Anexe o laudo e informe o laboratório e a data da coleta.
              </p>
            </div>
            <ExamUploadStep
              fileName={fileName}
              lab={lab}
              collectionDate={collectionDate}
              onChange={(d) => {
                setFileName(d.fileName);
                setLab(d.lab);
                setCollectionDate(d.collectionDate);
              }}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold">
                  3. Entrada de valores
                </h2>
                <p className="text-[12px] text-muted">
                  Digite os resultados numéricos. O status (ótimo, normal, fora)
                  é calculado automaticamente. Campos em branco são ignorados.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[12px] text-muted">
                <span>{filledCount}/10 preenchidos</span>
                {flaggedCount > 0 ? (
                  <span className="rounded-full bg-[#FBE1E1] px-2 py-0.5 text-[11px] font-medium text-[#B6333A]">
                    {flaggedCount} fora da faixa
                  </span>
                ) : null}
              </div>
            </div>
            <BiomarkerInputGrid
              values={rawValues}
              onChange={(id, raw) =>
                setRawValues((prev) => ({ ...prev, [id]: raw }))
              }
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-[16px] font-semibold">4. Revisão</h2>
              <p className="text-[12px] text-muted">
                Confirme os dados antes de publicar. A publicação torna o
                resultado visível no app do paciente.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard label="Paciente">
                {patient ? (
                  <>
                    <div className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </div>
                    <div className="text-[12px] text-muted">
                      {patient.email}
                    </div>
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </SummaryCard>
              <SummaryCard label="Laboratório">
                <div className="font-medium">{lab ?? "—"}</div>
                <div className="text-[12px] text-muted">
                  Coleta: {collectionDate ? formatDatePtBR(collectionDate) : "—"}
                </div>
              </SummaryCard>
              <SummaryCard label="PDF anexado">
                <div className="truncate font-medium">
                  {fileName ?? "Sem PDF"}
                </div>
                <div className="text-[12px] text-muted">
                  {filledCount} biomarcadores preenchidos
                </div>
              </SummaryCard>
            </div>

            <div className="overflow-hidden rounded-[16px] border border-border">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-border bg-[#F7FAF8] text-[11px] font-medium uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-2">Biomarcador</th>
                    <th className="px-4 py-2">Ref.</th>
                    <th className="px-4 py-2 text-right">Valor</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {values.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-muted"
                      >
                        Nenhum valor preenchido.
                      </td>
                    </tr>
                  ) : (
                    values.map((v) => {
                      const meta = BIOMARKER_CATALOG.find(
                        (m) => m.id === v.biomarkerId,
                      )!;
                      return (
                        <tr
                          key={v.biomarkerId}
                          className={cn(
                            "border-b border-border/70 last:border-b-0",
                            v.status === "out" && "bg-[#FBE1E1]/30",
                          )}
                        >
                          <td className="px-4 py-2 font-medium">
                            {meta.name}
                          </td>
                          <td className="px-4 py-2 text-muted">
                            {meta.referenceLabel} {meta.unit}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {v.value} {meta.unit}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <BiomarkerStatusPreview status={v.status} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          {step === STEPS.length - 1 ? (
            <>
              <Button
                variant="ghost"
                onClick={handleSaveDraft}
                disabled={submitting}
              >
                Salvar como rascunho
              </Button>
              <Button
                variant="dark"
                onClick={handlePublish}
                disabled={
                  submitting || !patientId || !collectionDate || values.length === 0
                }
              >
                {submitting ? "Publicando…" : "Publicar resultado"}
              </Button>
            </>
          ) : (
            <Button
              variant="dark"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canNext}
            >
              Próximo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-white p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-2 text-[14px]">{children}</div>
    </div>
  );
}
