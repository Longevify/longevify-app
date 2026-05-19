"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type {
  MenstrualEntry,
  MenstrualProfile,
} from "@/lib/menstrual/types";
import { MenstrualOnboardingWizard } from "@/components/menstrual/onboarding-wizard";
import { CycleDashboard } from "@/components/menstrual/cycle-dashboard";
import { useCurrentUser } from "@/lib/auth/user-context";
import {
  loadEntries,
  loadProfile,
  saveProfile,
} from "@/lib/menstrual/client-store";

/**
 * Orquestra os 3 estados da feature:
 *   - Sem profile → wizard de onboarding
 *   - Profile + tracking ON → dashboard com calendário
 *   - Profile + tracking OFF → tela pra reativar
 *
 * Em DEMO mode (Lucas testando como João), os dados vêm do localStorage
 * — fix do bug "no-session-cookie" reportado em 2026-05-19.
 */
export function CycleClient({
  initialProfile,
  initialEntries,
}: {
  initialProfile: MenstrualProfile | null;
  initialEntries: MenstrualEntry[];
}) {
  const user = useCurrentUser();
  const [profile, setProfile] = useState<MenstrualProfile | null>(
    initialProfile,
  );
  const [entries, setEntries] = useState<MenstrualEntry[]>(initialEntries);
  const [hydrated, setHydrated] = useState(!user.isDemo);

  // Em modo demo, server passa null/[] (não tem como ler localStorage no
  // server). Carrega do storage local no mount pra hidratar.
  useEffect(() => {
    if (!user.isDemo) return;
    (async () => {
      const [p, e] = await Promise.all([
        loadProfile(true),
        loadEntries(true),
      ]);
      if (p) setProfile(p);
      if (e.length) setEntries(e);
      setHydrated(true);
    })();
  }, [user.isDemo]);

  // Mostra splash enquanto hidrata demo (evita flash do wizard antes
  // de saber se já existe profile no localStorage).
  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-rose-50/40 via-white to-white">
        <Sparkles className="h-8 w-8 animate-pulse text-rose-300" />
      </div>
    );
  }

  // Sem profile → wizard
  if (!profile || !profile.onboardedAt) {
    return (
      <MenstrualOnboardingWizard
        onComplete={async () => {
          const reloaded = await loadProfile(user.isDemo);
          if (reloaded) {
            setProfile(reloaded);
          } else {
            window.location.reload();
          }
        }}
      />
    );
  }

  // Profile com tracking off → CTA reativar
  if (!profile.trackingEnabled) {
    return (
      <TrackingDisabledScreen
        isDemo={user.isDemo}
        onReactivate={setProfile}
      />
    );
  }

  // Dashboard normal
  return <CycleDashboard profile={profile} initialEntries={entries} />;
}

function TrackingDisabledScreen({
  isDemo,
  onReactivate,
}: {
  isDemo: boolean;
  onReactivate: (p: MenstrualProfile) => void;
}) {
  const [reactivating, setReactivating] = useState(false);

  const reactivate = async () => {
    setReactivating(true);
    try {
      const result = await saveProfile({ tracking_enabled: true }, isDemo);
      if (result.ok && result.profile) {
        onReactivate(result.profile);
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
