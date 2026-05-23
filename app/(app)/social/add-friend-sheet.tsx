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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  searchUsersAction,
  sendFriendInviteAction,
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
export function AddFriendSheet({
  myUserId,
  onClose,
}: {
  myUserId: string | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"search" | "link">("search");
  const inviteUrl =
    myUserId && typeof window !== "undefined"
      ? `${window.location.origin}/social/invite/${myUserId}`
      : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[520px] sm:rounded-3xl rounded-t-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-[17px] font-semibold leading-tight text-zinc-900">
              Adicionar amigo
            </h2>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              Encontre por nome ou compartilhe seu link de convite
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Tabs */}
        <nav className="border-b border-zinc-100 px-3 pt-2">
          <ul className="flex gap-1">
            <TabBtn
              label="Buscar por nome"
              Icon={Search}
              active={tab === "search"}
              onClick={() => setTab("search")}
            />
            <TabBtn
              label="Meu link"
              Icon={Link2}
              active={tab === "link"}
              onClick={() => setTab("link")}
            />
          </ul>
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "search" && <SearchPane />}
          {tab === "link" && <LinkPane url={inviteUrl} />}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-[12.5px] font-semibold transition",
          active
            ? "border-brand-700 text-brand-800"
            : "border-transparent text-zinc-500 hover:text-zinc-800",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    </li>
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
          className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-[12.5px] text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Buscando…
        </div>
      )}

      {error && (
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
