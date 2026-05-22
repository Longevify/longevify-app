import { Footprints, MapPin, Timer, Share2, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Lucas (2026-05-21): "na aba de corrida, imitaremos features do strava,
 * atuando como cronometro, medidor de pace e mostrando a localização
 * de onde você está correndo, quanto o pace ta variando nos
 * determinados pontos do trajeto e quero que isso seja postável nas
 * redes sociais, Dr Lon criará treinos de corrida com base na resposta
 * de um questionário."
 *
 * Phase 2 (próximo PR): implementação completa. Requer:
 *   - Geolocation API (navigator.geolocation.watchPosition)
 *   - Map provider (Leaflet + OpenStreetMap free tier)
 *   - State machine de corrida (idle → countdown → running → paused → done)
 *   - Persistence em running_sessions (schema já criado neste PR)
 *   - Image generation pra share (canvas/og-image)
 *   - Dr. Lon training plan endpoint
 *
 * Por enquanto: tela de preview do que vem.
 */
export default function CorridaPage() {
  return (
    <div className="flex flex-col gap-4">
      {/* Hero placeholder */}
      <section className="overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-md">
            <Footprints className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900">
              Corrida — em desenvolvimento
            </h2>
            <p className="mt-1 text-[13px] text-zinc-600">
              Cronômetro + pace tracker + GPS + Dr. Lon coach. Próxima PR.
            </p>
          </div>
        </div>
      </section>

      {/* Lista de features prometidas */}
      <section className="grid grid-cols-1 gap-2.5">
        <FeatureRow
          icon={<Timer className="h-4 w-4" />}
          accent="bg-emerald-50 text-emerald-700"
          title="Cronômetro + pace em tempo real"
          body="Start/pause/stop · pace médio · pace atual · distância acumulada · split por km."
        />
        <FeatureRow
          icon={<MapPin className="h-4 w-4" />}
          accent="bg-sky-50 text-sky-700"
          title="GPS + mapa do trajeto"
          body="Trace da rota via Geolocation API + Leaflet/OpenStreetMap. Variação de pace por trecho destacada."
        />
        <FeatureRow
          icon={<Share2 className="h-4 w-4" />}
          accent="bg-purple-50 text-purple-700"
          title="Compartilhar nas redes sociais"
          body="Imagem gerada com mapa + métricas (tipo Strava). Download ou share API nativa."
        />
        <FeatureRow
          icon={<Sparkles className="h-4 w-4" />}
          accent="bg-amber-50 text-amber-700"
          title="Planos de Dr. Lon"
          body="Questionário inicial (objetivo, frequência, base atual) → AI monta plano semanal de corrida."
        />
      </section>

      <p className="mt-4 text-center text-[11px] text-zinc-400">
        Esquema de banco já está em produção · falta UI + lógica de GPS
      </p>
    </div>
  );
}

function FeatureRow({
  icon,
  accent,
  title,
  body,
}: {
  icon: React.ReactNode;
  accent: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accent}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-semibold leading-tight text-zinc-900">
          {title}
        </h3>
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">{body}</p>
      </div>
    </div>
  );
}
