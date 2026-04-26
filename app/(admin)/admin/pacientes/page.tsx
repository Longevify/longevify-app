"use client";

import { useEffect, useState } from "react";
import { PatientList } from "@/components/admin/patient-list";
import { getPatients } from "@/lib/admin/storage";
import type { AdminPatient } from "@/lib/admin/types";

export default function PatientsPage() {
  const [patients, setPatients] = useState<AdminPatient[] | null>(null);

  useEffect(() => {
    let mounted = true;
    getPatients().then((p) => mounted && setPatients(p));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <span className="text-[12px] font-medium uppercase tracking-wider text-muted">
          Clínica
        </span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
          Pacientes
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Gestão de todos os pacientes Longevify — prontuário, exames e
          protocolo.
        </p>
      </header>

      {patients === null ? (
        <div className="h-[320px] animate-pulse rounded-[16px] border border-border bg-surface" />
      ) : (
        <PatientList initial={patients} />
      )}
    </div>
  );
}
