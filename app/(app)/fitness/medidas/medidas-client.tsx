"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  X,
  Loader2,
  Scale,
  Ruler,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logBodyMeasurement, deleteBodyMeasurement } from "../actions";
import { toast } from "@/lib/toast";
import type { BodyMeasurement, BodyTrendPoint } from "@/lib/fitness/body";

interface Trends {
  weight: BodyTrendPoint[];
  bodyFat: BodyTrendPoint[];
  muscle: BodyTrendPoint[];
  waist: BodyTrendPoint[];
}

interface MedidasClientProps {
  measurements: BodyMeasurement[];
  trends: Trends;
}

export function MedidasClient({ measurements, trends }: MedidasClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, startDeleting] = useTransition();

  const latest = measurements[0];

  const handleDelete = (id: string, date: string) => {
    if (!confirm(`Apagar medição de ${date}?`)) return;
    startDeleting(async () => {
      const result = await deleteBodyMeasurement(id);
      if (result.ok) {
        toast.success({ title: "Apagado" });
        window.location.reload();
      } else {
        toast.error({ title: "Erro", description: result.error });
      }
    });
  };

  return (
    <div className="pb-12">
      <Link
        href="/fitness"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      <header className="mb-5">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-800">
          <Scale className="h-3 w-3" />
          Composição corporal
        </div>
        <h2 className="mt-1 text-[24px] font-semibold leading-tight text-zinc-900">
          Suas medidas
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          Track de peso, composição e medidas pra ver progresso além dos
          números da balança.
        </p>
      </header>

      {/* Cards das 4 métricas principais */}
      <section className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MetricCard
          label="Peso"
          unit="kg"
          value={latest?.weightKg ?? null}
          trend={trends.weight}
        />
        <MetricCard
          label="% gordura"
          unit="%"
          value={latest?.bodyFatPct ?? null}
          trend={trends.bodyFat}
          invertColors // menos % gordura = melhor
        />
        <MetricCard
          label="Massa muscular"
          unit="kg"
          value={latest?.muscleMassKg ?? null}
          trend={trends.muscle}
        />
        <MetricCard
          label="Cintura"
          unit="cm"
          value={latest?.waistCm ?? null}
          trend={trends.waist}
          invertColors // cintura menor = melhor
        />
      </section>

      {/* CTA */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3.5 text-[14px] font-semibold text-white shadow-md transition active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        Registrar medição
      </button>

      {/* Histórico tabela */}
      <section>
        <h3 className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Histórico ({measurements.length})
        </h3>
        {measurements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center">
            <Ruler className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
            <h3 className="text-[14px] font-semibold text-zinc-700">
              Sem medições ainda
            </h3>
            <p className="mt-1 text-[12px] text-zinc-500">
              Registre seu peso, % gordura e medidas regularmente pra ver
              evolução visual.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {measurements.map((m) => (
              <li
                key={m.id}
                className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-semibold text-zinc-800 tabular-nums">
                    {new Date(m.measuredAt + "T00:00").toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "short", year: "numeric" },
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] tabular-nums text-zinc-500">
                    {m.weightKg && <span>⚖️ {m.weightKg}kg</span>}
                    {m.bodyFatPct && <span>📉 {m.bodyFatPct}% gord</span>}
                    {m.muscleMassKg && <span>💪 {m.muscleMassKg}kg massa</span>}
                    {m.waistCm && <span>📏 cintura {m.waistCm}cm</span>}
                    {m.armCm && <span>💪 braço {m.armCm}cm</span>}
                    {m.thighCm && <span>🦵 coxa {m.thighCm}cm</span>}
                  </div>
                  {m.notes && (
                    <p className="mt-1 text-[10.5px] italic text-zinc-500">
                      {m.notes}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleDelete(
                      m.id,
                      new Date(m.measuredAt + "T00:00").toLocaleDateString(
                        "pt-BR",
                      ),
                    )
                  }
                  disabled={deleting}
                  aria-label="Apagar medição"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-rose-600 disabled:opacity-30"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modalOpen && (
        <LogMeasurementModal
          latest={latest}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function MetricCard({
  label,
  unit,
  value,
  trend,
  invertColors = false,
}: {
  label: string;
  unit: string;
  value: number | null;
  trend: BodyTrendPoint[];
  invertColors?: boolean;
}) {
  let deltaPct: number | null = null;
  let trendIcon: React.ReactNode = <Minus className="h-3 w-3 text-zinc-400" />;
  let trendColor = "text-zinc-500";

  if (trend.length >= 2) {
    const first = trend[0].value;
    const last = trend[trend.length - 1].value;
    if (first > 0) {
      deltaPct = ((last - first) / first) * 100;
      const isUp = deltaPct > 1;
      const isDown = deltaPct < -1;
      const goodGoingUp = !invertColors;
      if (isUp) {
        trendIcon = <TrendingUp className="h-3 w-3" />;
        trendColor = goodGoingUp ? "text-emerald-600" : "text-rose-500";
      } else if (isDown) {
        trendIcon = <TrendingDown className="h-3 w-3" />;
        trendColor = goodGoingUp ? "text-rose-500" : "text-emerald-600";
      }
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 shadow-[0_2px_8px_-4px_rgba(13,40,24,.08)]">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-[16px] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
        {value !== null ? (
          <>
            {value}
            <span className="ml-0.5 text-[10px] font-medium text-zinc-500">
              {unit}
            </span>
          </>
        ) : (
          <span className="text-zinc-300">—</span>
        )}
      </div>
      {deltaPct !== null && (
        <div
          className={cn(
            "mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
            trendColor,
          )}
        >
          {trendIcon}
          <span>
            {deltaPct >= 0 ? "+" : ""}
            {deltaPct.toFixed(1)}% total
          </span>
        </div>
      )}
      {/* Mini sparkline (SVG) */}
      {trend.length >= 2 && <Sparkline points={trend} invert={invertColors} />}
    </div>
  );
}

function Sparkline({
  points,
  invert,
}: {
  points: BodyTrendPoint[];
  invert: boolean;
}) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 24;

  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p.value - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  // Cor baseada na direção
  const first = values[0];
  const last = values[values.length - 1];
  const isUp = last > first;
  const goodGoingUp = !invert;
  const isPositive = isUp === goodGoingUp;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-1 h-5 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke={isPositive ? "#10b981" : "#f43f5e"}
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function LogMeasurementModal({
  latest,
  onClose,
  onSaved,
}: {
  latest: BodyMeasurement | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [weight, setWeight] = useState(latest?.weightKg?.toString() ?? "");
  const [bodyFat, setBodyFat] = useState(latest?.bodyFatPct?.toString() ?? "");
  const [muscle, setMuscle] = useState(
    latest?.muscleMassKg?.toString() ?? "",
  );
  const [waist, setWaist] = useState(latest?.waistCm?.toString() ?? "");
  const [chest, setChest] = useState(latest?.chestCm?.toString() ?? "");
  const [hip, setHip] = useState(latest?.hipCm?.toString() ?? "");
  const [arm, setArm] = useState(latest?.armCm?.toString() ?? "");
  const [thigh, setThigh] = useState(latest?.thighCm?.toString() ?? "");
  const [notes, setNotes] = useState("");
  const [measuredAt, setMeasuredAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, startSaving] = useTransition();

  const parseNum = (s: string) => {
    if (!s.trim()) return null;
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const submit = () => {
    startSaving(async () => {
      const result = await logBodyMeasurement({
        measuredAt,
        weightKg: parseNum(weight),
        bodyFatPct: parseNum(bodyFat),
        muscleMassKg: parseNum(muscle),
        waistCm: parseNum(waist),
        chestCm: parseNum(chest),
        hipCm: parseNum(hip),
        armCm: parseNum(arm),
        thighCm: parseNum(thigh),
        notes: notes.trim() || null,
      });
      if (result.ok) {
        toast.success({
          title: "Medição salva",
          description: `${new Date(measuredAt + "T00:00").toLocaleDateString("pt-BR")} ✓`,
        });
        onSaved();
      } else {
        toast.error({ title: "Erro", description: result.error });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[480px] sm:rounded-3xl rounded-t-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-[17px] font-semibold leading-tight text-zinc-900">
              Registrar medição
            </h2>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              Pesa-se de manhã em jejum pra consistência
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Data */}
          <div className="mb-4">
            <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              Data da medição
            </label>
            <input
              type="date"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] focus:border-brand-400 focus:outline-none"
            />
          </div>

          {/* Composição core */}
          <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
            Composição
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            <NumberInput label="Peso" unit="kg" value={weight} onChange={setWeight} placeholder="75" />
            <NumberInput label="% Gord" unit="%" value={bodyFat} onChange={setBodyFat} placeholder="18" />
            <NumberInput label="Massa" unit="kg" value={muscle} onChange={setMuscle} placeholder="35" />
          </div>

          {/* Medidas core */}
          <h3 className="mb-2 mt-5 text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
            Medidas (cm)
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <NumberInput label="Cintura" unit="cm" value={waist} onChange={setWaist} placeholder="80" />
            <NumberInput label="Peito" unit="cm" value={chest} onChange={setChest} placeholder="100" />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="mt-3 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
          >
            {showAdvanced ? "− Esconder" : "+ Mais medidas"}
          </button>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <NumberInput label="Quadril" unit="cm" value={hip} onChange={setHip} placeholder="95" />
              <NumberInput label="Braço" unit="cm" value={arm} onChange={setArm} placeholder="35" />
              <NumberInput label="Coxa" unit="cm" value={thigh} onChange={setThigh} placeholder="55" />
            </div>
          )}

          {/* Notas */}
          <div className="mt-5">
            <label className="block text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              Notas <span className="text-zinc-400">— opcional</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algum detalhe? Roupa? Hidratação?"
              rows={2}
              maxLength={300}
              className="mt-1 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12.5px] focus:border-brand-400 focus:outline-none"
            />
          </div>
        </div>

        <footer className="border-t border-zinc-100 px-5 py-3">
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-3 text-[14px] font-semibold text-white transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gravando…
              </>
            ) : (
              <>Salvar medição</>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[9.5px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          step="any"
          min="0"
          className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 pr-9 text-[15px] tabular-nums focus:border-brand-400 focus:outline-none"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">
          {unit}
        </span>
      </div>
    </div>
  );
}
