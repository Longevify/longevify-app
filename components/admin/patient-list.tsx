"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { cn, formatDatePtBR, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AdminPatient, PatientStatus } from "@/lib/admin/types";
import { createPatient } from "@/lib/admin/storage";

const STATUS_META: Record<PatientStatus, { label: string; cls: string }> = {
  ativo: { label: "Ativo", cls: "bg-[#DFF5E9] text-[#0E7B45]" },
  onboarding: { label: "Onboarding", cls: "bg-[#FBF0D4] text-[#8A6A13]" },
  inativo: { label: "Inativo", cls: "bg-[#EEF2F0] text-muted" },
};

interface PatientListProps {
  initial: AdminPatient[];
}

export function PatientList({ initial }: PatientListProps) {
  const [patients, setPatients] = useState<AdminPatient[]>(initial);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | PatientStatus>("all");
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      return `${p.firstName} ${p.lastName} ${p.email}`
        .toLowerCase()
        .includes(q);
    });
  }, [patients, query, status]);

  async function handleCreate(form: FormData) {
    const newPatient = await createPatient({
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? "") || undefined,
      chronologicalAge: Number(form.get("age") ?? 0),
      status: "onboarding",
    });
    setPatients((prev) => [newPatient, ...prev]);
    setShowForm(false);
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente…"
            className="h-10 w-full rounded-full border border-border bg-white pl-10 pr-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="inline-flex rounded-full border border-border bg-white p-1 text-[12px]">
          {(["all", "ativo", "onboarding", "inativo"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                status === s
                  ? "bg-brand-900 text-white"
                  : "text-muted hover:text-ink",
              )}
            >
              {s === "all" ? "Todos" : STATUS_META[s].label}
            </button>
          ))}
        </div>
        <Button
          variant="dark"
          onClick={() => setShowForm((v) => !v)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Novo paciente
        </Button>
      </div>

      {showForm ? (
        <form
          action={handleCreate}
          className="grid grid-cols-1 gap-3 rounded-[16px] border border-border bg-surface p-5 md:grid-cols-5"
        >
          <input
            name="firstName"
            required
            placeholder="Nome"
            className="h-10 rounded-full border border-border bg-white px-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <input
            name="lastName"
            required
            placeholder="Sobrenome"
            className="h-10 rounded-full border border-border bg-white px-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="email@paciente.com"
            className="h-10 rounded-full border border-border bg-white px-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <input
            name="phone"
            placeholder="Telefone"
            className="h-10 rounded-full border border-border bg-white px-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="flex items-center gap-2">
            <input
              name="age"
              type="number"
              required
              min={1}
              max={120}
              placeholder="Idade"
              className="h-10 w-24 rounded-full border border-border bg-white px-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <Button type="submit" variant="primary">
              Salvar
            </Button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="border-b border-border bg-[#F7FAF8] text-[11px] font-medium uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-center">Idade</th>
              <th className="px-4 py-3">Último exame</th>
              <th className="px-4 py-3 text-center">Score</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Nenhum paciente encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/70 last:border-b-0 transition-colors hover:bg-brand-50/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pacientes/${p.id}`}
                      className="flex items-center gap-3"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-800">
                        {initials(`${p.firstName} ${p.lastName}`)}
                      </span>
                      <span className="font-medium text-ink">
                        {p.firstName} {p.lastName}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.email}</td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    {p.chronologicalAge}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {p.latestExamDate
                      ? formatDatePtBR(p.latestExamDate)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold tabular-nums">
                    {p.longevifyScore ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium",
                        STATUS_META[p.status].cls,
                      )}
                    >
                      {STATUS_META[p.status].label}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
