"use client";

import Image from "next/image";
import { Sun, ChevronRight, Check, X, ShoppingCart, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { estimateStock } from "@/lib/protocolo/stock";
import type { StockStatus } from "@/lib/protocolo/stock";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodayAction {
  id: string;
  label: string;
  image?: string;
  icon?: LucideIcon;
  iconAccent?: string;
  /** Se presente, abre fluxo de suplemento. Se ausente, botão simples "marcar feito". */
  productId?: string;
  /** Query string da loja: ?q=vitamina+d */
  shopQuery?: string;
}

interface WorkingOnItem {
  id: string;
  title: string;
  description: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TODAY_ACTIONS: TodayAction[] = [
  {
    id: "vitd",
    label: "Tomar 1 cápsula de Vitamina D3 5.000 UI no café da manhã",
    image: "/marketplace/vitamina-d.png",
    productId: "vitamina-d",
    shopQuery: "vitamina+d",
  },
  {
    id: "omega",
    label: "Tomar 2 cápsulas de Ômega 3 (EPA/DHA) com o almoço",
    image: "/marketplace/omega-3.png",
    productId: "omega-3",
    shopQuery: "omega+3",
  },
  {
    id: "creatina",
    label: "Tomar 5g de Creatina monohidratada com água",
    image: "/marketplace/creatina.png",
    productId: "creatina",
    shopQuery: "creatina",
  },
  {
    id: "magnesio",
    label: "Tomar 1 cápsula de Magnésio Quelato 200mg antes de dormir",
    image: "/marketplace/magnesio-quelato.png",
    productId: "magnesio-quelato",
    shopQuery: "magnesio",
  },
  {
    id: "sun-move",
    label: "10 min de sol matinal + 30 min de caminhada em Zona 2",
    icon: Sun,
    iconAccent: "bg-[#FCEBD8] text-[#A8651B]",
    // sem productId → popup simples
  },
];

const WORKING_ON: WorkingOnItem[] = [
  {
    id: "ldl",
    title: "Reduzir LDL abaixo de 100 mg/dL",
    description:
      "Seu LDL está em 103 mg/dL. Vamos chegar à faixa ótima reduzindo gordura saturada e priorizando 30g de fibra por dia.",
  },
  {
    id: "vitd-level",
    title: "Atingir 50+ ng/dL de Vitamina D",
    description:
      "Você está em 42,3 ng/dL. Suplementação diária + 10 min de sol matinal devem te levar à faixa ótima em 8 a 12 semanas.",
  },
  {
    id: "zone2",
    title: "Construir base aeróbica em Zona 2",
    description:
      "150 min/semana de zona 2 (caminhada rápida, bike leve) é o investimento mais robusto pra longevidade cardiovascular.",
  },
];

const TASKS_STORAGE_KEY = "longevify-tasks-done";

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProtocoloClient() {
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set());
  const [openModal, setOpenModal] = useState<TodayAction | null>(null);
  // nowMs is set client-side only (useEffect) to avoid hydration mismatch
  const [nowMs, setNowMs] = useState<number | null>(null);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setNowMs(Date.now());
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        setDoneTasks(new Set(parsed));
      }
    } catch {
      // ignore parse errors — stale data
    }
  }, []);

  const markDone = useCallback((taskId: string) => {
    setDoneTasks((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore storage errors
      }
      return next;
    });
    setOpenModal(null);
  }, []);

  const handleActionClick = useCallback((action: TodayAction) => {
    if (doneTasks.has(action.id)) return; // already done
    setOpenModal(action);
  }, [doneTasks]);

  return (
    <>
      <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 sm:py-10">
        <header className="pb-8">
          <span className="text-[13px] text-muted">Personalizado para voce</span>
          <h1 className="text-[32px] leading-[1.05] font-semibold tracking-tight sm:text-[40px]">
            Protocolo
          </h1>
        </header>

        {/* Acoes de hoje */}
        <section>
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
            Acoes de hoje
          </h2>
          <ul className="flex flex-col gap-2">
            {TODAY_ACTIONS.map((a) => (
              <li key={a.id}>
                <TodayActionRow
                  action={a}
                  isDone={doneTasks.has(a.id)}
                  onClick={() => handleActionClick(a)}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* No que estamos trabalhando */}
        <section className="mt-12">
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
            No que estamos trabalhando
          </h2>
          <ul className="flex flex-col gap-3">
            {WORKING_ON.map((item, idx) => (
              <li key={item.id}>
                <WorkingOnRow item={item} index={idx + 1} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Modal */}
      {openModal && (
        <ActionModal
          action={openModal}
          nowMs={nowMs ?? Date.now()}
          onDone={() => markDone(openModal.id)}
          onClose={() => setOpenModal(null)}
        />
      )}
    </>
  );
}

// ─── TodayActionRow ────────────────────────────────────────────────────────────

function TodayActionRow({
  action,
  isDone,
  onClick,
}: {
  action: TodayAction;
  isDone: boolean;
  onClick: () => void;
}) {
  const Icon = action.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDone}
      aria-label={isDone ? `${action.label} — concluido` : action.label}
      className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.995] ${
        isDone
          ? "border-brand-200 bg-brand-50/60 cursor-default"
          : "border-border bg-surface hover:border-brand-200 hover:bg-brand-50/40"
      }`}
    >
      {/* Checkbox visual */}
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
          isDone
            ? "border-brand-500 bg-brand-500"
            : "border-border bg-surface group-hover:border-brand-400"
        }`}
      >
        {isDone && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>

      {/* Icone/imagem do item */}
      {action.image ? (
        <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50">
          <Image
            src={action.image}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
          />
        </span>
      ) : Icon ? (
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${action.iconAccent ?? "bg-brand-50 text-brand-700"}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      ) : null}

      <span
        className={`flex-1 text-[14px] font-medium leading-snug transition ${
          isDone ? "text-muted line-through decoration-brand-400" : "text-ink"
        }`}
      >
        {action.label}
      </span>

      {!isDone && (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted/50" />
      )}
    </button>
  );
}

// ─── WorkingOnRow ─────────────────────────────────────────────────────────────

function WorkingOnRow({ item, index }: { item: WorkingOnItem; index: number }) {
  return (
    <article className="flex gap-4 rounded-2xl border border-border bg-surface px-5 py-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-[14px] font-semibold text-brand-700">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] font-semibold leading-snug text-ink">
          {item.title}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {item.description}
        </p>
      </div>
    </article>
  );
}

// ─── ActionModal ───────────────────────────────────────────────────────────────

function ActionModal({
  action,
  nowMs,
  onDone,
  onClose,
}: {
  action: TodayAction;
  nowMs: number;
  onDone: () => void;
  onClose: () => void;
}) {
  const router = useRouter();

  // If no productId — simple "mark done" modal
  if (!action.productId) {
    return (
      <Backdrop onClose={onClose}>
        <ModalCard onClose={onClose}>
          <ModalHeader action={action} />
          <p className="mt-3 text-[14px] text-muted leading-relaxed">
            Registre que voce completou essa atividade hoje.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-[14px] text-ink hover:bg-brand-50/40 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onDone}
              className="rounded-xl bg-brand-700 px-5 py-2 text-[14px] font-medium text-white hover:bg-brand-600 transition"
            >
              Marcar como feito
            </button>
          </div>
        </ModalCard>
      </Backdrop>
    );
  }

  // Supplement modal — two-step flow
  return (
    <SupplementModal
      action={action}
      nowMs={nowMs}
      onDone={onDone}
      onClose={onClose}
      onShop={(query) => {
        onClose();
        router.push(`/loja?q=${query}`);
      }}
    />
  );
}

// ─── SupplementModal ───────────────────────────────────────────────────────────

type SupplementStep = "question" | "stock-result";

function SupplementModal({
  action,
  nowMs,
  onDone,
  onClose,
  onShop,
}: {
  action: TodayAction;
  nowMs: number;
  onDone: () => void;
  onClose: () => void;
  onShop: (query: string) => void;
}) {
  const [step, setStep] = useState<SupplementStep>("question");
  const [stockResult, setStockResult] = useState<{
    status: StockStatus;
    daysSince: number;
    duration: number;
  } | null>(null);

  function handleAlreadyBought() {
    const result = estimateStock(action.productId!, nowMs);
    setStockResult(result);
    setStep("stock-result");
  }

  function handleNotBought() {
    onShop(action.shopQuery ?? action.productId!);
  }

  if (step === "question") {
    return (
      <Backdrop onClose={onClose}>
        <ModalCard onClose={onClose}>
          <ModalHeader action={action} />
          <p className="mt-3 text-[15px] font-medium text-ink">
            Voce ja tem esse suplemento em casa?
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleAlreadyBought}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-[14px] font-medium text-white hover:bg-brand-600 transition"
            >
              <Package className="h-4 w-4" />
              Ja comprei
            </button>
            <button
              type="button"
              onClick={handleNotBought}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-[14px] font-medium text-ink hover:bg-brand-50/40 transition"
            >
              <ShoppingCart className="h-4 w-4" />
              Nao comprei ainda
            </button>
          </div>
        </ModalCard>
      </Backdrop>
    );
  }

  // step === "stock-result"
  if (!stockResult) return null;

  const { status, daysSince, duration } = stockResult;

  if (status === "in-stock" || status === "running-out") {
    const isRunningOut = status === "running-out";
    const daysLeft = duration - daysSince;

    return (
      <Backdrop onClose={onClose}>
        <ModalCard onClose={onClose}>
          <ModalHeader action={action} />
          <div className={`mt-4 rounded-xl px-4 py-3 text-[13px] ${isRunningOut ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-brand-50 text-brand-800 border border-brand-200"}`}>
            {isRunningOut
              ? `Seu frasco esta acabando — restam cerca de ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}. Considere repor em breve.`
              : `Voce ainda tem estoque por cerca de ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}.`}
          </div>
          <div className="mt-5 flex justify-end gap-3">
            {isRunningOut && (
              <button
                type="button"
                onClick={() => onShop(action.shopQuery ?? action.productId!)}
                className="rounded-xl border border-border px-4 py-2 text-[14px] text-ink hover:bg-brand-50/40 transition"
              >
                Comprar ja
              </button>
            )}
            <button
              type="button"
              onClick={onDone}
              className="rounded-xl bg-brand-700 px-5 py-2 text-[14px] font-medium text-white hover:bg-brand-600 transition"
            >
              Marcar como feito
            </button>
          </div>
        </ModalCard>
      </Backdrop>
    );
  }

  // out-of-stock or never-purchased
  const isNeverPurchased = status === "never-purchased";

  return (
    <Backdrop onClose={onClose}>
      <ModalCard onClose={onClose}>
        <ModalHeader action={action} />
        <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-800">
          {isNeverPurchased
            ? "Voce ainda nao comprou esse suplemento. Adquira na loja Longevify."
            : `Seu ultimo frasco durou ${daysSince} dia${daysSince !== 1 ? "s" : ""} — hora de repor!`}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-[14px] text-ink hover:bg-brand-50/40 transition"
          >
            Agora nao
          </button>
          <button
            type="button"
            onClick={() => onShop(action.shopQuery ?? action.productId!)}
            className="flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2 text-[14px] font-medium text-white hover:bg-brand-600 transition"
          >
            <ShoppingCart className="h-4 w-4" />
            {isNeverPurchased ? "Comprar agora" : "Comprar de novo"}
          </button>
        </div>
      </ModalCard>
    </Backdrop>
  );
}

// ─── Shared modal primitives ──────────────────────────────────────────────────

function Backdrop({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-close is supplemental; Escape is handled above
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center sm:pb-0 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

function ModalCard({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-6 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">{children}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="mt-0.5 ml-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-brand-50/60 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ModalHeader({ action }: { action: TodayAction }) {
  const Icon = action.icon;
  return (
    <div className="flex items-center gap-3">
      {action.image ? (
        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50">
          <Image
            src={action.image}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-cover"
          />
        </span>
      ) : Icon ? (
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${action.iconAccent ?? "bg-brand-50 text-brand-700"}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <p className="text-[14px] font-medium leading-snug text-ink">
        {action.label}
      </p>
    </div>
  );
}
