"use client";

import { useEffect, useState } from "react";

/**
 * Hook SSR-safe pra `Date.now()`. Retorna `null` durante SSR e
 * primeiro client render (evita hydration mismatch React #418).
 * Após mount, atualiza pra `Date.now()` real.
 *
 * Uso:
 *   const now = useNow();
 *   const isFuture = now !== null && eventDate.getTime() >= now;
 *
 * Em SSR isFuture será sempre false. Após hydrate (mount), avalia
 * com timestamp real. Como React reconcilia entre as duas renders
 * sem mismatch (SSR rendou null state, client mounta com null state,
 * depois setState pra Date.now() real), nenhum erro de hydration.
 */
export function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);
  return now;
}

/**
 * Hook pra "today" como objeto Date — null em SSR.
 * Útil pra comparações de calendário tipo `date.toDateString() === today.toDateString()`.
 */
export function useToday(): Date | null {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
  }, []);
  return today;
}
