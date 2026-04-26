"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FlaskConical,
  Sparkles,
  Package,
  ArrowRight,
} from "lucide-react";
import { formatDatePtBR } from "@/lib/utils";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getExams, getPatients, getProducts } from "@/lib/admin/storage";
import type { AdminExam, AdminPatient, AdminProduct } from "@/lib/admin/types";

export default function AdminDashboard() {
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [p, e, pr] = await Promise.all([
        getPatients(),
        getExams(),
        getProducts(),
      ]);
      if (!mounted) return;
      setPatients(p);
      setExams(e);
      setProducts(pr);
      setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const activePatients = patients.filter((p) => p.status === "ativo").length;
  const pendingExams = exams.filter((e) => e.status === "draft").length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newResults = exams.filter(
    (e) => e.publishedAt && new Date(e.publishedAt).getTime() >= weekAgo,
  ).length;
  const activeProducts = products.filter((p) => p.status === "ativo").length;

  const recent = [...patients]
    .filter((p) => p.longevifyScore !== undefined)
    .sort((a, b) => (b.latestExamDate ?? "").localeCompare(a.latestExamDate ?? ""))
    .slice(0, 5);

  const columns: Column<AdminPatient>[] = [
    {
      key: "name",
      header: "Paciente",
      render: (p) => (
        <Link
          href={`/admin/pacientes/${p.id}`}
          className="font-medium hover:underline"
        >
          {p.firstName} {p.lastName}
        </Link>
      ),
    },
    {
      key: "age",
      header: "Idade",
      align: "center",
      render: (p) => <span className="tabular-nums">{p.chronologicalAge}</span>,
    },
    {
      key: "latest",
      header: "Último exame",
      render: (p) =>
        p.latestExamDate ? (
          <span className="text-muted">
            {formatDatePtBR(p.latestExamDate)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "score",
      header: "Score",
      align: "center",
      render: (p) => (
        <span className="font-semibold tabular-nums">
          {p.longevifyScore ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (p) =>
        p.scoreStatus ? (
          <StatusBadge
            status={
              p.scoreStatus === "on-track"
                ? "optimal"
                : p.scoreStatus === "attention"
                  ? "normal"
                  : "out"
            }
          />
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted">
            Painel clínico
          </span>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
            Bom dia, Dra. Marina
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            Visão geral da operação Longevify — pacientes, exames e catálogo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/exames/novo">
            <Button variant="dark" className="gap-2">
              Lançar exame <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!loaded ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[132px] animate-pulse rounded-[20px] border border-border bg-surface"
            />
          ))
        ) : (
          <>
            <StatCard
              label="Pacientes ativos"
              value={activePatients}
              delta={{ value: "+2 esta semana", trend: "up" }}
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              label="Exames aguardando"
              value={pendingExams}
              hint="em rascunho"
              tone={pendingExams > 0 ? "warn" : "default"}
              icon={<FlaskConical className="h-4 w-4" />}
            />
            <StatCard
              label="Novos resultados (7d)"
              value={newResults}
              delta={{
                value: newResults > 0 ? "publicados" : "nenhum",
                trend: newResults > 0 ? "up" : "flat",
              }}
              icon={<Sparkles className="h-4 w-4" />}
            />
            <StatCard
              label="Produtos ativos"
              value={activeProducts}
              hint={`${products.length} no catálogo`}
              icon={<Package className="h-4 w-4" />}
            />
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight">
              Pacientes recentes
            </h2>
            <p className="text-[12px] text-muted">
              Ordenados pelo último exame laboratorial.
            </p>
          </div>
          <Link
            href="/admin/pacientes"
            className="text-[13px] font-medium text-brand-700 hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        {loaded ? (
          <DataTable<AdminPatient>
            columns={columns}
            rows={recent}
            rowKey={(p) => p.id}
            emptyMessage="Sem pacientes cadastrados ainda."
          />
        ) : (
          <div className="h-[260px] animate-pulse rounded-[16px] border border-border bg-surface" />
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-border bg-surface p-5">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
            Novos cadastros
          </h3>
          <p className="mt-1 text-[12px] text-muted">
            Últimos 12 meses (mock).
          </p>
          <MonthlyBarChart />
        </div>
        <div className="rounded-[16px] border border-border bg-surface p-5">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
            Próximos passos
          </h3>
          <ul className="mt-3 space-y-3 text-[13px]">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              <span>
                Revise exames em rascunho em{" "}
                <Link
                  href="/admin/exames"
                  className="font-medium text-brand-700 hover:underline"
                >
                  Exames
                </Link>
                .
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#E6B845]" />
              <span>
                Complete onboarding de pacientes novos em{" "}
                <Link
                  href="/admin/pacientes"
                  className="font-medium text-brand-700 hover:underline"
                >
                  Pacientes
                </Link>
                .
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted" />
              <span>
                Atualize catálogo em{" "}
                <Link
                  href="/admin/produtos"
                  className="font-medium text-brand-700 hover:underline"
                >
                  Produtos
                </Link>{" "}
                — estoque, preço e status.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function MonthlyBarChart() {
  const months = [
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
    "Jan",
    "Fev",
    "Mar",
    "Abr",
  ];
  const values = [4, 6, 5, 7, 8, 10, 12, 11, 9, 13, 15, 18];
  const max = Math.max(...values);
  return (
    <div className="mt-5 flex h-[140px] items-end gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-brand-500/80"
            style={{ height: `${(v / max) * 100}%` }}
          />
          <span className="text-[10px] text-muted">{months[i]}</span>
        </div>
      ))}
    </div>
  );
}
