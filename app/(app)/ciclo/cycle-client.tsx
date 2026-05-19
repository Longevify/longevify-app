"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type {
  MenstrualEntry,
  MenstrualProfile,
} from "@/lib/menstrual/types";
import { MenstrualOnboardingWizard } from "@/components/menstrual/onboarding-wizard";
import { CycleDashboard } from "@/components/menstrual/cycle-dashboard";

/**
 * Orquestra os 3 estados da feature:
 *   - Sem profile → wizard de onboarding
 *   - Profile + tracking ON → dashboard com calendário
 *   - Profile + tracking OFF → tela pra reativar
 */
export function CycleClient({
  initialProfile,
  initialEntries,
}: {
  initialProfile: MenstrualProfile | null;
  initialEntries: MenstrualEntry[];
}) {
  const [profile, setProfile] = useState<MenstrualProfile | null>(
    initialProfile,
  );

  // Sem profile → wizard
  if (!profile || !profile.onboardedAt) {
    return (
      <MenstrualOnboardingWizard
        onComplete={async () => {
          // Re-fetch profile + entries depois do onboarding
          try {
            const res = await fetch("/api/menstrual/profile");
            const data = await res.json();
            if (data?.ok && data.profile) {
              setProfile({
                patientId: data.profile.patient_id,
                trackingEnabled: data.profile.tracking_enabled,
                lastPeriodStart: data.profile.last_period_start,
                avgCycleDays: data.profile.avg_cycle_days,
                avgPeriodDays: data.profile.avg_period_days,
                cycleRegularity: data.profile.cycle_regularity,
                contraceptiveKind: data.profile.contraceptive_kind,
                reproductiveStatus: data.profile.reproductive_status,
                onboardedAt: data.profile.onboarded_at,
                notes: data.profile.notes,
              });
            }
          } catch {
            // se falhou, ainda assim mostramos o dashboard (com profile que sabemos que existe agora)
            window.location.reload();
          }
        }}
      />
    );
  }

  // Profile com tracking off → CTA reativar
  if (!profile.trackingEnabled) {
    return <TrackingDisabledScreen onReactivate={setProfile} />;
  }

  // Dashboard normal
  return <CycleDashboard profile={profile} initialEntries={initialEntries} />;
}

function TrackingDisabledScreen({
  onReactivate,
}: {
  onReactivate: (p: MenstrualProfile) => void;
}) {
  const [reactivating, setReactivating] = useState(false);

  const reactivate = async () => {
    setReactivating(true);
    try {
      const res = await fetch("/api/menstrual/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking_enabled: true }),
      });
      const data = await res.json();
      if (data?.ok && data.profile) {
        onReactivate({
          patientId: data.profile.patient_id,
          trackingEnabled: data.profile.tracking_enabled,
          lastPeriodStart: data.profile.last_period_start,
          avgCycleDays: data.profile.avg_cycle_days,
          avgPeriodDays: data.profile.avg_period_days,
          cycleRegularity: data.profile.cycle_regularity,
          contraceptiveKind: data.profile.contraceptive_kind,
          reproductiveStatus: data.profile.reproductive_status,
          onboardedAt: data.profile.onboarded_at,
          notes: data.profile.notes,
        });
      }
    } finally {
      setReactivating(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-rose-50/40 via-white to-white px-6 text-center">
      <Sparkles className="h-10 w-10 text-rose-400" />
      <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-zinc-900">
        Tracking pausado
      </h1>
      <p className="mt-2 max-w-xs text-[13px] text-zinc-600">
        Seus dados estão preservados. Reative pra continuar registrando ciclo e
        sintomas.
      </p>
      <button
        type="button"
        onClick={reactivate}
        disabled={reactivating}
        className="mt-6 rounded-2xl bg-zinc-900 px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
      >
        {reactivating ? "Reativando..." : "Reativar tracking"}
      </button>
    </div>
  );
}
