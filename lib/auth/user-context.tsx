"use client";

import { createContext, useContext } from "react";
import type { CurrentUser } from "./current-user";

const UserContext = createContext<CurrentUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/**
 * Hook pra qualquer client component pegar o usuário atual.
 * Retorna o user passado pelo `<UserProvider>` no `app/(app)/layout.tsx`.
 */
export function useCurrentUser(): CurrentUser {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used inside <UserProvider>");
  }
  return ctx;
}
