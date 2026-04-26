"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  FileText,
  PlusCircle,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { cn, formatDatePtBR, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { getBiomarkerMeta } from "@/lib/admin/biomarker-catalog";
import type { AdminExam, AdminPatient } from "@/lib/admin/types";
import { updatePatient } from "@/lib/admin/storage";

interface PatientDetailProps {
  patient: AdminPatient;
  exams: AdminExam[];
}

export function PatientDetail({ patient, exams }: PatientDetailProps) {
  const [notes, setNotes] = useState(patient.protocol ?? "");
  const [saving, setSaving] = useState(false);

  const sortedHistory = useMemo(
    () =>
      [...patient.scoreHistory].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    [patient.scoreHistory],
  );

  const maxScore = 100;

  async function saveProtocol() {
    setSaving(true);
    await updatePatient(patient.id, { protocol: notes });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/pacientes"
          className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Todos os pacientes
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-[16px] font-semibold text-brand-800">
            {initials(`${patient.firstName} ${patient.lastName}`)}
          </span>
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {patient.email}
              </span>
              {patient.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {patient.phone}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {patient.chronologicalAge}{" "}
                anos
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/exames/novo?patient=${patient.id}`}>
            <Button variant="dark" className="gap-2">
              <PlusCircle className="h-4 w-4" /> Lançar resultado
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-5">
          <div className="rounded-[16px] border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold">Exames</h2>
                <p className="text-[12px] text-muted">
                  Histórico de painéis laboratoriais — publique ou reveja
                  resultados.
                </p>
              </div>
              <span className="text-[12px] text-muted">
                {exams.length} registro{exams.length === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              {exams.length === 0 ? (
                <div className="px-5 py-8 text-center text-[13px] text-muted">
                  Este paciente ainda não possui exames.
                </div>
              ) : (
                exams.map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      "flex flex-wrap items-center gap-4 border-b border-border/70 px-5 py-4 last:border-b-0",
                      e.flagged && "bg-[#FBE1E1]/30",
                    )}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[13px] font-medium">
                        Painel {e.lab ?? "Longevify"} ·{" "}
                        {formatDatePtBR(e.collectionDate)}
                        {e.flagged ? (
                          <span className="rounded-full bg-[#FBE1E1] px-2 py-0.5 text-[10px] font-semibold text-[#B6333A]">
                            Valor crítico
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-muted">
                        {e.values.length} biomarcadores ·{" "}
                        {e.fileName ?? "Sem PDF anexado"}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        e.status === "published"
                          ? "bg-[#DFF5E9] text-[#0E7B45]"
                          : "bg-[#FBF0D4] text-[#8A6A13]",
                      )}
                    >
                      {e.status === "published" ? "Publicado" : "Rascunho"}
                    </span>
                    {e.status === "draft" ? (
                      <Link
                        href={`/admin/exames/novo?patient=${e.patientId}&exam=${e.id}`}
                        className="text-[12px] font-medium text-brand-700 hover:underline"
                      >
                        Revisar
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          {exams.length > 0 && exams[0].values.length > 0 ? (
            <div className="rounded-[16px] border border-border bg-surface">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">
                  Biomarcadores — último exame
                </h2>
                <p className="text-[12px] text-muted">
                  Valores publicados mais recentes do paciente.
                </p>
              </div>
              <div>
                {exams[0].values.map((v) => {
                  const meta = getBiomarkerMeta(v.biomarkerId);
                  if (!meta) return null;
                  return (
                    <div
                      key={v.biomarkerId}
                      className="flex items-center justify-between border-b border-border/70 px-5 py-3 last:border-b-0"
                    >
                      <div>
                        <div className="text-[13px] font-medium">
                          {meta.name}
                        </div>
                        <div className="text-[11px] text-muted">
                          Ref. {meta.referenceLabel}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[14px] font-semibold tabular-nums">
                          {v.value}{" "}
                          <span className="text-[11px] font-normal text-muted">
                            {meta.unit}
                          </span>
                        </span>
                        <StatusBadge status={v.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="flex flex-col gap-5">
          <div className="rounded-[16px] border border-border bg-surface p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
              Longevify Score
            </h2>
            <div className="mt-2 text-[36px] font-semibold leading-none tabular-nums">
              {patient.longevifyScore ?? "—"}
            </div>
            {patient.scoreStatus ? (
              <div className="mt-1 text-[12px] text-muted">
                Status:{" "}
                {patient.scoreStatus === "on-track"
                  ? "No ritmo"
                  : patient.scoreStatus === "attention"
                    ? "Atenção"
                    : "Em risco"}
              </div>
            ) : null}

            {sortedHistory.length > 0 ? (
              <div className="mt-5">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Evolução
                </div>
                <div className="mt-2 space-y-1.5">
                  {sortedHistory.map((pt) => (
                    <div
                      key={pt.date}
                      className="flex items-center gap-2 text-[12px]"
                    >
                      <span className="w-20 text-muted">
                        {formatDatePtBR(pt.date)}
                      </span>
                      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                          style={{
                            width: `${Math.min(100, (pt.score / maxScore) * 100)}%`,
                          }}
                        />
                      </span>
                      <span className="w-8 text-right font-semibold tabular-nums">
                        {pt.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[16px] border border-border bg-surface p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
              Protocolo atual
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Ex: Protocolo metabólico + cardiovascular…"
              className="mt-3 w-full resize-none rounded-[12px] border border-border bg-white p-3 text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <div className="mt-3 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={saveProtocol}
                disabled={saving}
              >
                {saving ? "Salvando…" : "Salvar protocolo"}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
