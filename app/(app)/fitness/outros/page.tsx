import { Activity, Bike, Waves, Mountain, Heart } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Lucas (2026-05-21): "outra para demais exercícios."
 *
 * Phase 2: tracking de bike, natação, escalada, yoga, alongamento,
 * caminhada, etc. Schema `workout_sessions.kind = 'cardio'|'other'`
 * já suporta — só falta UI.
 */
export default function OutrosPage() {
  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-md">
            <Activity className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900">
              Outras atividades — em breve
            </h2>
            <p className="mt-1 text-[13px] text-zinc-600">
              Bike, natação, escalada, yoga, mobilidade. Vai ter logging de
              tempo + intensidade + zona cardíaca.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <ActivityChip icon={<Bike className="h-5 w-5" />} label="Ciclismo" />
        <ActivityChip icon={<Waves className="h-5 w-5" />} label="Natação" />
        <ActivityChip icon={<Mountain className="h-5 w-5" />} label="Escalada" />
        <ActivityChip icon={<Heart className="h-5 w-5" />} label="Yoga" />
        <ActivityChip icon={<Activity className="h-5 w-5" />} label="Mobilidade" />
        <ActivityChip icon={<Activity className="h-5 w-5" />} label="HIIT" />
      </section>

      <p className="mt-2 text-center text-[11px] text-zinc-400">
        Esquema de banco já suporta (workout_sessions.kind = 'cardio' | 'other')
      </p>
    </div>
  );
}

function ActivityChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-3 py-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-zinc-600 ring-1 ring-zinc-200">
        {icon}
      </span>
      <span className="text-[12px] font-medium text-zinc-700">{label}</span>
    </div>
  );
}
