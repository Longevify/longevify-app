"use client";

import { useEffect, useState, useTransition } from "react";
import {
  X,
  Search,
  Link2,
  Check,
  Loader2,
  Send,
  Copy,
  MapPin,
  Phone,
  Smartphone,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  searchUsersAction,
  sendFriendInviteAction,
  matchContactsAction,
  linkMyPhoneAction,
  myPhoneLinkedAction,
  type UserSearchResult,
} from "./actions";

/**
 * Sheet de adicionar amigo. Dois caminhos:
 *
 *  1. **Buscar por nome** — input → debounced search em profiles (first_name
 *     OR last_name ilike). Resultado anota relação atual (já amigo, invite
 *     pendente, eu mesmo). Botão "Convidar" envia invite.
 *
 *  2. **Compartilhar link** — `app.longevify.com.br/social/invite/<meu-id>`
 *     que abre uma página simples no destinatário com "Aceitar convite".
 */
type View = "menu" | "search" | "contacts" | "link";

export function AddFriendSheet({
  myUserId,
  onClose,
}: {
  myUserId: string | null;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("menu");
  const inviteUrl =
    myUserId && typeof window !== "undefined"
      ? `${window.location.origin}/social/invite/${myUserId}`
      : "";

  const titles: Record<View, { title: string; subtitle: string }> = {
    menu: {
      title: "Adicionar amigo",
      subtitle: "Como você quer encontrar?",
    },
    search: {
      title: "Buscar por nome",
      subtitle: "Procure por amigos que já estão no Longevify",
    },
    contacts: {
      title: "Importar contatos",
      subtitle: "Veja quem da sua lista de contatos está no Longevify",
    },
    link: {
      title: "Meu link de convite",
      subtitle: "Mande pra um amigo que ainda não tem conta",
    },
  };
  const { title, subtitle } = titles[view];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/*
        Lucas (2026-05-24): no mobile, full-screen (h-full) em vez de
        bottom sheet — UX mais didática + evita interferência de zoom do
        teclado. Desktop continua com sheet centralizada arredondada.
      */}
      <div className="relative z-10 flex h-full max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[88dvh] sm:max-w-[520px] sm:rounded-3xl">
        {/* Lucas (2026-05-26): "se eu abro essa aba no telefone, os
            botões ficam muito altos" — header colava no notch do iPhone
            sem safe-area. Padding-top respeita safe-area-inset-top em
            mobile fullscreen + mantém 14px em desktop. */}
        <header
          className="flex items-center gap-3 border-b border-zinc-100 px-4 pb-3.5"
          style={{ paddingTop: "max(0.875rem, env(safe-area-inset-top))" }}
        >
          {view === "menu" ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setView("menu")}
              aria-label="Voltar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[16px] font-semibold leading-tight text-zinc-900">
              {title}
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-zinc-500">
              {subtitle}
            </p>
          </div>
          {view !== "menu" && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {view === "menu" && <MenuPane onPick={setView} />}
          {view === "search" && <SearchPane />}
          {view === "contacts" && <ContactsPane />}
          {view === "link" && <LinkPane url={inviteUrl} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Menu inicial com 3 cards grandes e didáticos — cada um tem ícone
 * grande, título claro, descrição em 1 linha e affordance de
 * "tocar pra abrir". Lucas (2026-05-24): "tem que ser algo mais
 * didático para fazer."
 */
function MenuPane({ onPick }: { onPick: (v: View) => void }) {
  const options: Array<{
    view: Exclude<View, "menu">;
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    iconColor: string;
    title: string;
    description: string;
  }> = [
    {
      view: "search",
      icon: Search,
      bg: "bg-brand-50",
      iconColor: "text-brand-700",
      title: "Buscar por nome",
      description: "Achar amigos que já estão no Longevify",
    },
    {
      view: "contacts",
      icon: Smartphone,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-700",
      title: "Importar contatos",
      description: "Ver quem da sua lista já usa o app",
    },
    {
      view: "link",
      icon: Link2,
      bg: "bg-amber-50",
      iconColor: "text-amber-700",
      title: "Compartilhar meu link",
      description: "Convidar quem ainda não tem conta",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-relaxed text-zinc-600">
        Adicione amigos pra ver corridas, treinos e disputar streaks 🔥.
        Escolha um caminho:
      </p>

      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.view}
            type="button"
            onClick={() => onPick(opt.view)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-left transition hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-sm active:scale-[0.99]"
          >
            <span
              className={cn(
                "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                opt.bg,
              )}
            >
              <Icon className={cn("h-5 w-5", opt.iconColor)} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-zinc-900">
                {opt.title}
              </div>
              <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">
                {opt.description}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
          </button>
        );
      })}

      <p className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-zinc-600">
        💡 <strong>Dica:</strong> os 3 caminhos funcionam — use o que for
        mais rápido. Buscar por nome geralmente é o mais direto se você
        souber o primeiro nome do amigo.
      </p>
    </div>
  );
}

// ─── Search pane ──────────────────────────────────────────────────────

function SearchPane() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<Record<string, "sending" | "sent">>(
    {},
  );

  // Debounce search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchUsersAction(trimmed);
        if (ctrl.signal.aborted) return;
        if (res.ok) {
          setResults(res.data ?? []);
          setError(null);
        } else {
          setError(res.error);
          setResults([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
      setLoading(false);
    };
  }, [query]);

  const sendInvite = async (userId: string) => {
    setInviteStatus((prev) => ({ ...prev, [userId]: "sending" }));
    const res = await sendFriendInviteAction(userId);
    if (res.ok) {
      setInviteStatus((prev) => ({ ...prev, [userId]: "sent" }));
    } else {
      alert(res.error);
      setInviteStatus((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome ou sobrenome"
          autoFocus
          // text-[16px] obrigatório pra iOS Safari NÃO dar zoom ao focar
          className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2.5 text-[16px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-[12.5px] text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Buscando…
        </div>
      )}

      {/* Sessão expirada — substitui o error vermelho por banner com
          botão de reload (Lucas 2026-05-25) */}
      {error === "Não autenticado" && <SessionExpiredBanner />}

      {error && error !== "Não autenticado" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-6 text-center text-[12.5px] text-zinc-500">
          Nenhum usuário encontrado com &ldquo;{query}&rdquo;
        </div>
      )}

      {!loading && query.trim().length < 2 && (
        <p className="px-1 text-[11.5px] text-zinc-500">
          💡 Digite ao menos 2 letras pra buscar.
        </p>
      )}

      {results.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {results.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-[14px] font-semibold text-brand-700">
                {u.firstName[0]?.toUpperCase() ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-zinc-900">
                  {u.firstName}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-zinc-500">
                  <span>Level {u.level}</span>
                  <span>·</span>
                  <span className="tabular-nums">
                    {u.totalPoints.toLocaleString("pt-BR")} pts
                  </span>
                  {u.city && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {u.city}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <UserActionBtn
                user={u}
                status={inviteStatus[u.id]}
                onSend={() => sendInvite(u.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Contacts pane ────────────────────────────────────────────────────

/**
 * Lucas (2026-05-24): "indique usuários para seguir na aba social com
 * base nos seus contatos do telefone."
 *
 * Estratégia:
 *  1. User precisa primeiro vincular seu próprio phone (opt-in pra ser
 *     descoberto). Mostra inline mini-form se ainda não vinculou.
 *  2. Botão "Sincronizar contatos" tenta navigator.contacts.select (Web
 *     Contacts API — Chrome Android).
 *  3. Fallback: textarea pra colar lista de telefones manualmente (1
 *     por linha) — funciona em iOS Safari, desktop, etc.
 *  4. POST hashes pro server → retorna matches anotados (já amigo /
 *     pendente / convidar).
 */
function ContactsPane() {
  // Lucas (2026-05-26): "tem que pedir para fazer o sync dos contatos
  // para evitar com que isso apareça [Sessão expirou]". Antes a gente
  // chamava `myPhoneLinkedAction` direto no mount → server action
  // disparava com JWT possivelmente expirado → "Sessão expirou" banner.
  // Fix: arranca o auto-check; mostra UI didática "Sincronizar contatos"
  // e só dispara a action quando user clica. Click acontece já com
  // cookie fresco (qualquer navegação refresca via /api/health).
  // - linked === null: ainda não checou (estado inicial = mostra CTA)
  // - linked === false: checou, user não vinculou phone → mostra opt-in
  // - linked === true: checou, ok → mostra sync UI
  const [linked, setLinked] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<Record<string, "sending" | "sent">>(
    {},
  );
  const [manualPhones, setManualPhones] = useState("");

  const checkPhoneLinked = async () => {
    setChecking(true);
    setAuthError(null);
    try {
      const res = await myPhoneLinkedAction();
      if (res.ok) {
        setLinked(res.data?.linked ?? false);
      } else {
        setAuthError(res.error);
        setLinked(false);
      }
    } finally {
      setChecking(false);
    }
  };

  const matchPhones = async (phones: string[]) => {
    if (phones.length === 0) {
      setError("Nenhum telefone válido encontrado.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await matchContactsAction(phones);
      if (res.ok) {
        setResults(res.data ?? []);
        if ((res.data ?? []).length === 0) {
          setError(
            "Nenhum dos seus contatos está no Longevify ainda. Compartilhe seu link de convite!",
          );
        }
      } else {
        setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const syncFromBrowser = async () => {
    // Web Contacts API — Chrome Android only
    interface ContactsManager {
      select: (
        props: string[],
        options?: { multiple?: boolean },
      ) => Promise<Array<{ tel?: string[]; email?: string[] }>>;
    }
    interface NavWithContacts {
      contacts?: ContactsManager;
    }
    const nav = navigator as Navigator & NavWithContacts;
    if (!nav.contacts?.select) {
      setError(
        "Seu navegador não suporta importar contatos. Use o método manual abaixo.",
      );
      return;
    }
    try {
      const contacts = await nav.contacts.select(["tel"], { multiple: true });
      const phones = contacts.flatMap((c) => c.tel ?? []);
      await matchPhones(phones);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message);
      }
    }
  };

  const syncFromManual = async () => {
    const lines = manualPhones
      .split(/[\n,;]/)
      .map((l) => l.trim())
      .filter(Boolean);
    await matchPhones(lines);
  };

  const sendInvite = async (userId: string) => {
    setInviteStatus((prev) => ({ ...prev, [userId]: "sending" }));
    const res = await sendFriendInviteAction(userId);
    if (res.ok) {
      setInviteStatus((prev) => ({ ...prev, [userId]: "sent" }));
    } else {
      alert(res.error);
      setInviteStatus((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  // Estado inicial — user ainda não tentou sincronizar. Mostra CTA
  // didático em vez de auto-checar (que disparava "Sessão expirou").
  if (linked === null) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-brand-50/40 to-white px-4 py-5 text-center">
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-brand-700 text-white shadow-sm">
            <Smartphone className="h-5 w-5" />
          </div>
          <h3 className="text-[14px] font-semibold text-zinc-900">
            Sincronizar contatos
          </h3>
          <p className="mt-1 text-[11.5px] leading-snug text-zinc-600">
            Pra encontrar quem da sua lista já está no Longevify, primeiro
            precisamos vincular seu telefone (opt-in).
          </p>
          <button
            type="button"
            onClick={checkPhoneLinked}
            disabled={checking}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition disabled:opacity-50"
          >
            {checking ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Conectando…
              </>
            ) : (
              <>
                <Smartphone className="h-3.5 w-3.5" />
                Começar
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Erro de auth (sessão expirada) — mostra explicação + reload */}
      {authError === "Não autenticado" && (
        <SessionExpiredBanner />
      )}
      {authError && authError !== "Não autenticado" && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {/* Se ainda não vinculou phone, mostra mini-form opt-in */}
      {!linked && !authError && (
        <LinkPhoneInline onLinked={() => setLinked(true)} />
      )}

      {linked && !authError && (
        <>
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-brand-900">
            ✓ Você está descobrível por contato. Amigos que sincronizarem o
            telefone vão te ver automaticamente.
          </div>

          <button
            type="button"
            onClick={syncFromBrowser}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-3 text-[13px] font-semibold text-white shadow-md transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Smartphone className="h-4 w-4" />
            )}
            Importar do telefone
          </button>

          <div className="mt-1 text-center text-[10.5px] text-zinc-500">
            — ou —
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Colar telefones (1 por linha)
            </label>
            <textarea
              value={manualPhones}
              onChange={(e) => setManualPhones(e.target.value)}
              rows={3}
              placeholder={"+55 11 98765 4321\n+55 21 91234 5678"}
              // 16px pra evitar zoom iOS
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[16px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={syncFromManual}
              disabled={loading || !manualPhones.trim()}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Procurar
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          <li className="px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {results.length} pessoa{results.length === 1 ? "" : "s"} no Longevify
          </li>
          {results.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-[14px] font-semibold text-brand-700">
                {u.firstName[0]?.toUpperCase() ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-zinc-900">
                  {u.firstName}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-zinc-500">
                  <span>Level {u.level}</span>
                  <span>·</span>
                  <span className="tabular-nums">
                    {u.totalPoints.toLocaleString("pt-BR")} pts
                  </span>
                  {u.city && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {u.city}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <UserActionBtn
                user={u}
                status={inviteStatus[u.id]}
                onSend={() => sendInvite(u.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-[10.5px] leading-relaxed text-zinc-600">
        🔒 LGPD: telefones que você compartilha aqui são usados apenas pra
        match. Não armazenamos os contatos do seu telefone — só seu próprio.
      </p>
    </div>
  );
}

/**
 * Mini-form inline pra user vincular seu próprio telefone (opt-in pra
 * ser descoberto por sync de contatos de amigos).
 */
/**
 * Lucas (2026-05-25): server actions retornam "Não autenticado" quando
 * o cookie JWT expirou enquanto a aba ficou aberta (Supabase access
 * token dura 1h por default). Frontend não tinha como recuperar — UX
 * ficava broken silenciosamente.
 *
 * Banner explica + oferece reload (que dispara o middleware do Next
 * que refresha o cookie automaticamente).
 */
function SessionExpiredBanner() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-amber-900">
            Sessão expirou
          </div>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-amber-800">
            Sua sessão expirou enquanto a aba ficou aberta. Recarregue a
            página pra continuar.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2 text-[12.5px] font-semibold text-white transition hover:bg-amber-800"
      >
        Recarregar página
      </button>
    </div>
  );
}

function LinkPhoneInline({ onLinked }: { onLinked: () => void }) {
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await linkMyPhoneAction(phone);
    setSaving(false);
    if (res.ok) {
      onLinked();
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex items-start gap-2">
        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-amber-900">
            Vincule seu telefone primeiro
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
            Necessário pra você aparecer como sugestão pra amigos que
            sincronizem contatos.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+55 11 98765 4321"
          // 16px pra evitar zoom iOS
          className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-[16px] text-zinc-800 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={saving || phone.length < 8}
          className="rounded-lg bg-amber-700 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Vincular"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[11px] text-rose-700">{error}</p>
      )}
    </div>
  );
}

function UserActionBtn({
  user,
  status,
  onSend,
}: {
  user: UserSearchResult;
  status?: "sending" | "sent";
  onSend: () => void;
}) {
  if (user.isMe) {
    return (
      <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-[10.5px] font-medium text-zinc-500">
        Você
      </span>
    );
  }
  if (user.isFriend) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700">
        <Check className="h-3 w-3" />
        Amigos
      </span>
    );
  }
  if (user.pendingInviteId || status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[10.5px] font-semibold text-amber-800">
        Pendente
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={status === "sending"}
      className="inline-flex items-center gap-1 rounded-lg bg-brand-700 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
    >
      {status === "sending" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Send className="h-3 w-3" />
      )}
      Convidar
    </button>
  );
}

// ─── Link pane ────────────────────────────────────────────────────────

function LinkPane({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const copy = () => {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        startTransition(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        });
      })
      .catch(() => alert("Não consegui copiar — copie manualmente."));
  };

  const shareNative = async () => {
    if (!navigator.share) {
      copy();
      return;
    }
    try {
      await navigator.share({
        title: "Vamos ser amigos no Longevify",
        text: "Adiciona aí pra gente disputar ranking de saúde 🏃",
        url,
      });
    } catch {
      /* user cancelled */
    }
  };

  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-6 text-center text-[12.5px] text-zinc-500">
        Carregando seu link…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] leading-relaxed text-zinc-700">
        Compartilhe esse link com quem você quer adicionar. Ao abrir, a pessoa
        verá um botão pra aceitar virar seu amigo.
      </p>

      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <span className="truncate text-[11.5px] tabular-nums text-zinc-700">
          {url}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold transition",
            copied
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copiar link
            </>
          )}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            onClick={shareNative}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-800"
          >
            Compartilhar
          </button>
        )}
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-zinc-500">
        💡 O link só funciona pra quem já tem conta Longevify. Se ainda não
        tem, peça pra se cadastrar primeiro em <strong>app.longevify.com.br</strong>.
      </p>
    </div>
  );
}
