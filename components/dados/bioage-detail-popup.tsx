"use client";

import { useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { BiologicalAgePoint, OrganBioAge } from "@/lib/mock-data";

interface BioAgeDetailPopupProps {
  open: boolean;
  onClose: () => void;
  bioAge: number;
  chronologicalAge: number;
  history: BiologicalAgePoint[];
  organAges: OrganBioAge[];
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta < -2) {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-[#d1fae5] px-2.5 text-[11px] font-semibold text-[#065f46]">
        {delta} anos
      </span>
    );
  }
  if (delta <= 0) {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-[#fef9c3] px-2.5 text-[11px] font-semibold text-[#854d0e]">
        {delta} anos
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-[#fee2e2] px-2.5 text-[11px] font-semibold text-[#991b1b]">
      +{delta} anos
    </span>
  );
}

const ORGAN_ICONS: Record<string, string> = {
  heart: "♥",
  brain: "◉",
  liver: "◈",
  kidneys: "⬟",
  lungs: "◐",
  intestine: "⟳",
  pancreas: "◆",
};

export function BioAgeDetailPopup({
  open,
  onClose,
  bioAge,
  chronologicalAge,
  history,
  organAges,
}: BioAgeDetailPopupProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const diff = +(chronologicalAge - bioAge).toFixed(1);
  const younger = diff > 0;

  const chartData = history.map((p) => ({
    date: formatDateShort(p.date),
    "Idade Biológica": p.age,
  }));

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Idade Biológica por Sistema"
    >
      <div className="relative w-full max-w-[520px] rounded-[18px] bg-white shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="rounded-t-[18px] bg-[#1f5d3f] px-6 py-5 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/70">
                Idade Biológica
              </p>
              <h2 className="mt-1 text-[22px] font-semibold text-white leading-tight">
                Idade Biológica por Sistema
              </h2>
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
              aria-label="Fechar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1L13 13M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* BioAge headline */}
          <div className="mt-4 flex items-end gap-3">
            <div>
              <span className="text-[52px] leading-none font-semibold tracking-tight text-white">
                {bioAge}
              </span>
              <span className="text-[18px] text-white/60 ml-1">anos</span>
            </div>
            <span className="mb-1 inline-flex h-7 items-center rounded-full bg-white/10 px-3 text-[12px] font-medium text-white/90">
              {younger
                ? `${Math.abs(diff)} anos mais jovem`
                : diff === 0
                  ? "Igual à cronológica"
                  : `${Math.abs(diff)} anos mais velho`}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-white/60">
            Idade cronológica: {chronologicalAge} anos
          </p>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Organs table */}
          <div>
            <h3 className="text-[12px] font-semibold tracking-[0.1em] uppercase text-gray-400 mb-3">
              Por Sistema
            </h3>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
              {organAges.map((organ) => (
                <div
                  key={organ.organId}
                  className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] text-[#1f5d3f] w-5 text-center select-none">
                      {ORGAN_ICONS[organ.organId] ?? "•"}
                    </span>
                    <span className="text-[14px] font-medium text-gray-800">
                      {organ.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-semibold text-gray-700 tabular-nums">
                      {organ.age} anos
                    </span>
                    <DeltaBadge delta={organ.delta} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historical chart */}
          <div>
            <h3 className="text-[12px] font-semibold tracking-[0.1em] uppercase text-gray-400 mb-3">
              Evolução
            </h3>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7f5ec" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #c9e9d6",
                      fontSize: 13,
                    }}
                    formatter={(val: number) => [val, "Idade Biológica"]}
                  />
                  <ReferenceLine
                    y={chronologicalAge}
                    stroke="#9ca3af"
                    strokeDasharray="4 3"
                    label={{
                      value: "Crono.",
                      position: "right",
                      fontSize: 10,
                      fill: "#9ca3af",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Idade Biológica"
                    stroke="#1f5d3f"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#1f5d3f", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#1f5d3f" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[#1f5d3f] py-3 text-[14px] font-semibold text-white hover:bg-[#143D28] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
