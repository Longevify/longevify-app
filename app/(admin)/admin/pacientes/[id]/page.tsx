"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { PatientDetail } from "@/components/admin/patient-detail";
import { getExams, getPatient } from "@/lib/admin/storage";
import type { AdminExam, AdminPatient } from "@/lib/admin/types";

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [patient, setPatient] = useState<AdminPatient | null | undefined>(
    undefined,
  );
  const [exams, setExams] = useState<AdminExam[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [p, e] = await Promise.all([getPatient(id), getExams(id)]);
      if (!mounted) return;
      setPatient(p);
      setExams(e);
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (patient === undefined) {
    return (
      <div className="h-[480px] animate-pulse rounded-[20px] border border-border bg-surface" />
    );
  }

  if (patient === null) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-10 text-center">
        <h1 className="text-[20px] font-semibold">Paciente não encontrado</h1>
        <p className="mt-2 text-[13px] text-muted">
          Este paciente não existe ou foi removido.
        </p>
        <Link
          href="/admin/pacientes"
          className="mt-4 inline-block text-[13px] font-medium text-brand-700 hover:underline"
        >
          Voltar à lista
        </Link>
      </div>
    );
  }

  return <PatientDetail patient={patient} exams={exams} />;
}
