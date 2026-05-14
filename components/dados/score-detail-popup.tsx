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
} from "recharts";
import type { ScorePoint } from "@/lib/mock-data";

interface ScoreDetailPopupProps {
  open: boolean;
  onClose: () => void;
  score: number;
  status: "on-track" | "attention" | "at-risk";
  history: ScorePoint[];
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function ScoreDetailPopup({
  open,
  onClose,
  score,
  status,
  history,
}: ScoreDetailPopupProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
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

  // Summary: delta from first to last point
  const first = history[0]?.score ?? score;
  const last = history[history.length - 1]?.score ?? score;
  const delta = last - first;
  const summaryText =
    delta > 0
      ? `Você melhorou +${delta} pontos desde o primeiro exame`
      : delta < 0
        ? `Queda de ${Math.abs(delta)} pontos desde o primeiro exame`
        : "Pontuação estável desde o primeiro exame";

  const statusLabel =
    status === "on-track"
      ? "On Track"
      : status === "attention"
        ? "Atenção"
        : "Em Risco";

  const chartData = history.map((p) => ({
    date: formatDateShort(p.date),
    score: p.score,
  }));

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Histórico do Longevify Score"
    >
      <div className="relative w-full max-w-[520px] rounded-[18px] bg-white shadow-xl">
        {/* Header */}
        <div className="rounded-t-[18px] bg-[#1f5d3f] px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/70">
                Longevify Score
              </p>
              <h2 className="mt-1 text-[22px] font-semibold text-white leading-tight">
                Histórico do Longevify Score
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

          {/* Score + status badge */}
          <div className="mt-4 flex items-end gap-3">
            <span className="text-[52px] leading-none font-semibold tracking-tight text-white">
              {score}
            </span>
            <span className="mb-1 inline-flex h-7 items-center rounded-full bg-white/10 px-3 text-[12px] font-medium text-white/90 backdrop-blur">
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Summary text */}
          <p className="text-[14px] text-[#143D28] font-medium">{summaryText}</p>

          {/* Chart */}
          <div className="mt-5 h-[180px] w-full">
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
                  domain={["dataMin - 5", "dataMax + 5"]}
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
                  formatter={(val: number) => [val, "Score"]}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#1f5d3f"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#1f5d3f", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#1f5d3f" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex justify-between text-[11px] text-gray-400 mb-1">
              <span>0</span>
              <span>100</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(90deg, #E85D5D 0%, #F39A50 25%, #E6B845 50%, #79C98E 75%, #10B981 100%)",
                }}
              />
              <div
                className="absolute -top-0.5 h-3 w-[2px] bg-[#1f5d3f]"
                style={{ left: `calc(${Math.min(Math.max(score, 0), 100)}% - 1px)` }}
              />
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-[#1f5d3f] py-3 text-[14px] font-semibold text-white hover:bg-[#143D28] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
