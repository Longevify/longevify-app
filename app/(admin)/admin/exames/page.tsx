"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";
import { cn, formatDatePtBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/admin/data-table";
import { getExams, publishExam } from "@/lib/admin/storage";
import type { AdminExam, ExamStatus } from "@/lib/admin/types";

export default function ExamsPage() {
  const [exams, setExams] = useState<AdminExam[] | null>(null);
  const [status, setStatus] = useState<"all" | ExamStatus>("all");
  const [lab, setLab] = useState<string>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    getExams().then((e) => mounted && setExams(e));
    return () => {
      mounted = false;
    };
  }, []);

  const labs = useMemo(() => {
    if (!exams) return [];
    return Array.from(
      new Set(exams.map((e) => e.lab).filter(Boolean) as string[]),
    );
  }, [exams]);

  const filtered = useMemo(() => {
    if (!exams) return [];
    const q = query.trim().toLowerCase();
    return exams.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (lab !== "all" && e.lab !== lab) return false;
      if (!q) return true;
      return (
        e.patientName.toLowerCase().includes(q) ||
        (e.fileName ?? "").toLowerCase().includes(q)
      );
    });
  }, [exams, status, lab, query]);

  async function handlePublish(id: string) {
    await publishExam(id);
    const next = await getExams();
    setExams(next);
  }

  const columns: Column<AdminExam>[] = [
    {
      key: "patient",
      header: "Paciente",
      render: (e) => (
        <Link
          href={`/admin/pacientes/${e.patientId}`}
          className="font-medium hover:underline"
        >
          {e.patientName}
        </Link>
      ),
    },
    {
      key: "lab",
      header: "Laboratório",
      render: (e) => <span className="text-muted">{e.lab ?? "—"}</span>,
    },
    {
      key: "date",
      header: "Coleta",
      render: (e) => (
        <span className="text-muted">{formatDatePtBR(e.collectionDate)}</span>
      ),
    },
    {
      key: "values",
      header: "Valores",
      align: "center",
      render: (e) => (
        <span className="tabular-nums">{e.values.length}</span>
      ),
    },
    {
      key: "flag",
      header: "Crítico?",
      align: "center",
      render: (e) =>
        e.flagged ? (
          <span className="inline-flex h-6 items-center rounded-full bg-[#FBE1E1] px-2.5 text-[11px] font-medium text-[#B6333A]">
            Fora da faixa
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (e) => (
        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium",
            e.status === "published"
              ? "bg-[#DFF5E9] text-[#0E7B45]"
              : "bg-[#FBF0D4] text-[#8A6A13]",
          )}
        >
          {e.status === "published" ? "Publicado" : "Rascunho"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) => (
        <div className="flex justify-end gap-2">
          {e.status === "draft" ? (
            <>
              <Link
                href={`/admin/exames/novo?patient=${e.patientId}&exam=${e.id}`}
                className="text-[12px] font-medium text-brand-700 hover:underline"
              >
                Editar
              </Link>
              <button
                onClick={() => handlePublish(e.id)}
                className="text-[12px] font-medium text-[#0E7B45] hover:underline"
              >
                Publicar
              </button>
            </>
          ) : (
            <Link
              href={`/admin/pacientes/${e.patientId}`}
              className="text-[12px] font-medium text-brand-700 hover:underline"
            >
              Ver paciente
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted">
            Clínica
          </span>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
            Exames
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            Painéis laboratoriais de toda a clínica — rascunhos e publicados.
          </p>
        </div>
        <Link href="/admin/exames/novo">
          <Button variant="dark" className="gap-2">
            <PlusCircle className="h-4 w-4" /> Novo exame
          </Button>
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente ou arquivo…"
            className="h-10 w-full rounded-full border border-border bg-white pl-10 pr-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="inline-flex rounded-full border border-border bg-white p-1 text-[12px]">
          {(["all", "draft", "published"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                status === s
                  ? "bg-brand-900 text-white"
                  : "text-muted hover:text-ink",
              )}
            >
              {s === "all"
                ? "Todos"
                : s === "draft"
                  ? "Rascunho"
                  : "Publicado"}
            </button>
          ))}
        </div>
        <select
          value={lab}
          onChange={(e) => setLab(e.target.value)}
          className="h-10 rounded-full border border-border bg-white px-4 text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">Todos os laboratórios</option>
          {labs.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {exams === null ? (
        <div className="h-[320px] animate-pulse rounded-[16px] border border-border bg-surface" />
      ) : (
        <DataTable<AdminExam>
          columns={columns}
          rows={filtered}
          rowKey={(e) => e.id}
          flagged={(e) => e.flagged}
          emptyMessage="Nenhum exame encontrado com esses filtros."
        />
      )}
    </div>
  );
}
