"use client";

import { useMemo } from "react";
import type { GpsPoint } from "@/lib/fitness/types";

/**
 * Mapa SVG inline pra trace de corrida.
 *
 * Sem dependências externas (Leaflet ficaria pra um v2 quando integrar
 * com tiles OSM). Por enquanto normaliza GPS coords no bounding box do
 * trajeto e desenha um path elegante.
 *
 * Pra MVP: dá um sentido visual da rota + serve como base pro share
 * image canvas (mesmas coordenadas).
 */

interface RouteMapProps {
  coords: GpsPoint[];
  height?: number;
  /** Quando true, anima o ponto final (live tracking) */
  live?: boolean;
}

export function RouteMap({ coords, height = 200, live = false }: RouteMapProps) {
  const { pathD, lastX, lastY, firstX, firstY, hasData } = useMemo(() => {
    if (coords.length < 1) {
      return {
        pathD: "",
        lastX: 0,
        lastY: 0,
        firstX: 0,
        firstY: 0,
        hasData: false,
      };
    }
    const lats = coords.map((c) => c[0]);
    const lons = coords.map((c) => c[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const latR = maxLat - minLat || 0.0001;
    const lonR = maxLon - minLon || 0.0001;
    // ViewBox 100×100, com 8% padding
    const padding = 8;
    const projX = (lon: number) =>
      padding + ((lon - minLon) / lonR) * (100 - 2 * padding);
    const projY = (lat: number) =>
      100 - padding - ((lat - minLat) / latR) * (100 - 2 * padding);

    const pts = coords.map((c) => [projX(c[1]), projY(c[0])]);
    if (pts.length === 1) {
      return {
        pathD: "",
        firstX: pts[0][0],
        firstY: pts[0][1],
        lastX: pts[0][0],
        lastY: pts[0][1],
        hasData: true,
      };
    }
    const d = pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
      .join(" ");
    return {
      pathD: d,
      firstX: pts[0][0],
      firstY: pts[0][1],
      lastX: pts[pts.length - 1][0],
      lastY: pts[pts.length - 1][1],
      hasData: true,
    };
  }, [coords]);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center bg-gradient-to-br from-brand-50/40 to-zinc-50 text-[11px] text-zinc-400"
        style={{ height }}
      >
        Aguardando sinal GPS…
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden bg-gradient-to-br from-brand-50/40 to-zinc-50"
      style={{ height }}
    >
      {/* Grid sutil */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="rgba(31, 93, 63, 0.06)"
              strokeWidth="0.5"
            />
          </pattern>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9fd4b3" />
            <stop offset="100%" stopColor="#2a7a53" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        {pathD && (
          <>
            {/* Halo */}
            <path
              d={pathD}
              fill="none"
              stroke="rgba(31, 93, 63, .15)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={pathD}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        {/* Start dot */}
        <circle
          cx={firstX}
          cy={firstY}
          r="1.5"
          fill="#1f5d3f"
          stroke="white"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        {/* End dot — pulse se live */}
        {(coords.length > 1 || live) && (
          <>
            {live && (
              <circle
                cx={lastX}
                cy={lastY}
                r="3"
                fill="rgba(31, 93, 63, .3)"
                vectorEffect="non-scaling-stroke"
              >
                <animate
                  attributeName="r"
                  values="2;4;2"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.6;0;0.6"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle
              cx={lastX}
              cy={lastY}
              r="1.8"
              fill={live ? "#2a7a53" : "#1f5d3f"}
              stroke="white"
              strokeWidth="0.6"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      {/* Legenda */}
      {coords.length > 1 && (
        <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-2 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-brand-800 shadow-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-700" />
          {coords.length} pontos
        </div>
      )}
    </div>
  );
}
