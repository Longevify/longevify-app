import { cn } from "@/lib/utils";
import type { SleepSegment, SleepStage } from "@/lib/wearables-mock";
import {
  getSegmentsRange,
  formatHourLabel,
} from "@/lib/sleep-segments";

/**
 * Gráfico de fases do sono ao longo da noite — estilo Apple Health.
 *
 * 4 trilhas horizontais (Awake / REM / Core / Deep, de cima pra baixo).
 * Cada fase é renderizada na sua trilha como bloco arredondado, com
 * "tail" conectando a próxima fase (similar ao gráfico do iOS).
 *
 * Eixo X: horas (12 AM / 2 AM / 4 AM / 6 AM no exemplo). Eixo Y: trilhas
 * das 4 fases. Cores Apple Health:
 *   - awake:  laranja (#F47A56)
 *   - rem:    azul claro (#8EC3F6)
 *   - core:   azul médio (#3D80F0)
 *   - deep:   roxo escuro (#5145C5)
 */

interface SleepTimelineProps {
  segments: SleepSegment[];
  /** Altura total do gráfico em px (default 240) */
  height?: number;
  /** Compacto pra usar no card mini (sem labels, sem trilhas) */
  compact?: boolean;
  className?: string;
}

const STAGE_ORDER: SleepStage[] = ["awake", "rem", "core", "deep"];
const STAGE_LABEL: Record<SleepStage, string> = {
  awake: "Acordado",
  rem: "REM",
  core: "Leve",
  deep: "Profundo",
};
const STAGE_COLOR: Record<SleepStage, string> = {
  awake: "#F47A56",
  rem: "#8EC3F6",
  core: "#3D80F0",
  deep: "#5145C5",
};

export function SleepTimeline({
  segments,
  height = 240,
  compact = false,
  className,
}: SleepTimelineProps) {
  if (segments.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-zinc-50 text-[12px] text-zinc-500",
          className,
        )}
        style={{ height }}
      >
        Sem dados de fases do sono.
      </div>
    );
  }

  const { startMin, endMin } = getSegmentsRange(segments);
  const totalRange = endMin - startMin;
  if (totalRange <= 0) return null;

  // ViewBox: largura proporcional, altura = trilhas
  const W = 1000;
  const H = compact ? 60 : 200;
  const lanes = compact ? 1 : 4; // compact = todas as fases na mesma linha
  const laneHeight = H / lanes;
  // Padding vertical interno por trilha (faz bloco ficar com espaço acima/abaixo)
  const padY = compact ? 3 : 6;

  const xOf = (min: number) =>
    ((min - startMin) / totalRange) * W;

  // Gera linhas verticais a cada 2 horas pra grid de fundo
  const gridLines: number[] = [];
  const startHour = Math.floor(startMin / 60);
  const endHour = Math.ceil(endMin / 60);
  for (let h = startHour; h <= endHour; h++) {
    if (h * 60 >= startMin && h * 60 <= endMin && h % 2 === 0) {
      gridLines.push(h * 60);
    }
  }

  const laneIndex = (stage: SleepStage): number => {
    if (compact) return 0;
    return STAGE_ORDER.indexOf(stage);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trilhas / labels à esquerda (não em compact) */}
      {!compact && (
        <div
          className="absolute left-0 top-0 flex flex-col pr-2"
          style={{ width: 56, height: H + 4 }}
        >
          {STAGE_ORDER.map((stage) => (
            <div
              key={stage}
              className="flex items-center text-[10px] text-zinc-500"
              style={{ height: laneHeight }}
            >
              {STAGE_LABEL[stage]}
            </div>
          ))}
        </div>
      )}

      {/* SVG do gráfico */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={cn(
          "block w-full",
          !compact && "ml-14",
        )}
        style={{
          height,
          width: compact ? "100%" : "calc(100% - 56px)",
        }}
        preserveAspectRatio="none"
        aria-label="Gráfico de fases do sono"
      >
        {/* Grid lines verticais */}
        {gridLines.map((g) => (
          <line
            key={g}
            x1={xOf(g)}
            y1={0}
            x2={xOf(g)}
            y2={H}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="1"
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Trilhas horizontais (não em compact) */}
        {!compact &&
          STAGE_ORDER.map((stage, i) => (
            <line
              key={stage}
              x1={0}
              y1={i * laneHeight + laneHeight / 2}
              x2={W}
              y2={i * laneHeight + laneHeight / 2}
              stroke="rgba(0,0,0,0.04)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

        {/* Segmentos como blocos arredondados */}
        {segments.map((seg, i) => {
          const x = xOf(seg.startMin);
          const w = Math.max(2, xOf(seg.endMin) - x);
          const y = compact
            ? padY
            : laneIndex(seg.stage) * laneHeight + padY;
          const h = laneHeight - padY * 2;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={Math.min(4, h / 2)}
                fill={STAGE_COLOR[seg.stage]}
                opacity={seg.stage === "awake" ? 0.95 : 0.92}
              />
            </g>
          );
        })}

        {/* Conectores tipo "drop" entre segmentos adjacentes (igual Apple)
            — linha vertical fina conectando final do segmento anterior
            ao início do próximo se mudaram de trilha. Só renderiza se
            não compact. */}
        {!compact &&
          segments.slice(0, -1).map((seg, i) => {
            const next = segments[i + 1];
            if (next.stage === seg.stage) return null;
            const x = xOf(seg.endMin);
            const y1 =
              laneIndex(seg.stage) * laneHeight + laneHeight / 2;
            const y2 =
              laneIndex(next.stage) * laneHeight + laneHeight / 2;
            return (
              <line
                key={`drop-${i}`}
                x1={x}
                y1={y1}
                x2={x}
                y2={y2}
                stroke={STAGE_COLOR[seg.stage]}
                strokeWidth="2"
                opacity="0.55"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
      </svg>

      {/* Eixo X — labels de hora (não em compact) */}
      {!compact && gridLines.length > 0 && (
        <div
          className="ml-14 flex justify-between text-[9.5px] text-zinc-400 tabular-nums"
          style={{ marginTop: 4 }}
        >
          {gridLines.map((g) => (
            <span key={g}>{formatHourLabel(g)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
