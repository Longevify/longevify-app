import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import { BIOMARKERS } from "@/lib/mock-data";
import { getBiomarkerKnowledge } from "@/lib/biomarker-knowledge";
import { formatDatePtBR } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BiomarkerBigChart } from "@/components/dados/biomarker-big-chart";
import { ImproveCard } from "@/components/dados/improve-card";
import { RangePosition } from "@/components/dados/range-position";
import { RelatedBiomarkers } from "@/components/dados/related-biomarkers";
import { loadDadosForUser } from "@/lib/dados/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

/**
 * Página de detalhe de UM biomarcador. Lucas (2026-05-20):
 * "ao clicar no biomarcador, aparecem os dados da conta demo e não os
 * meus." Antes essa página usava só `BIOMARKERS` mock — ignorava
 * completamente os exames anexados pelo paciente.
 *
 * Agora carrega os biomarkers REAIS via loadDadosForUser; fallback no
 * mock somente quando o user não tem exames (demo + empty state).
 */
export default async function BiomarkerDetailPage({
  params,
}: {
  params: Promise<{ biomarkerId: string }>;
}) {
  const { biomarkerId } = await params;

  const user = await getCurrentUser();
  const dados = await loadDadosForUser({
    userId: user.id,
    isDemo: user.isDemo,
  });

  // Prioridade: biomarker REAL do paciente. Fallback no mock (somente se
  // user não tem exames OU se o id solicitado existe só no catálogo mock
  // estendido — alguns marcadores demo do João têm IDs que ainda não
  // entraram no catálogo real do DB).
  const fromReal = dados.biomarkers.find((b) => b.id === biomarkerId);
  const fromMock = BIOMARKERS.find((b) => b.id === biomarkerId);
  const biomarker = fromReal ?? fromMock;

  const knowledge = getBiomarkerKnowledge(biomarkerId);

  if (!biomarker || !knowledge) {
    notFound();
  }

  const lastPoint = biomarker.history[biomarker.history.length - 1];
  const lastDate = lastPoint ? lastPoint.date : null;

  // Related: tenta resolver pelo conjunto REAL primeiro, depois mock
  const related = knowledge.relatedBiomarkerIds
    .map(
      (id) =>
        dados.biomarkers.find((b) => b.id === id) ??
        BIOMARKERS.find((b) => b.id === id),
    )
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
      {/* Breadcrumb / back link */}
      <div className="mb-5">
        <Link
          href="/dados"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Voltar para Dados
        </Link>
      </div>

      {/* Hero */}
      <section className="mb-6 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            {biomarker.category}
          </div>
          <h1 className="mt-1.5 text-[32px] leading-tight font-semibold tracking-tight">
            {biomarker.name}
          </h1>
          {lastDate ? (
            <div className="mt-2 text-[13px] text-muted">
              Último exame · {formatDatePtBR(lastDate)}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[48px] leading-none font-semibold tracking-tight tabular-nums">
              {biomarker.value}
            </span>
            <span className="text-[15px] font-medium text-muted">
              {biomarker.unit}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={biomarker.status} />
            <span className="text-[12px] text-muted">
              Ref.: {biomarker.referenceLabel} {biomarker.unit}
            </span>
          </div>
        </div>
      </section>

      {/* Big chart */}
      <Card className="mb-8 p-5">
        <div className="mb-3">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Histórico
          </div>
          <h2 className="mt-0.5 text-[16px] font-semibold">
            Evolução ao longo do tempo
          </h2>
        </div>
        <BiomarkerBigChart biomarker={biomarker} />
      </Card>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (2/3) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-6">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              O que é
            </div>
            <h3 className="mt-1 text-[18px] font-semibold tracking-tight">
              Entenda o marcador
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-ink/85">
              {knowledge.whatItIs}
            </p>
          </Card>

          <Card className="p-6">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              Por que importa
            </div>
            <h3 className="mt-1 text-[18px] font-semibold tracking-tight">
              Impacto na longevidade
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-ink/85">
              {knowledge.whyItMatters}
            </p>
          </Card>

          <ImproveCard improve={knowledge.improve} />
        </div>

        {/* Right column (1/3) */}
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              Contexto da faixa
            </div>
            <h3 className="mt-1 text-[16px] font-semibold tracking-tight">
              Sua posição
            </h3>
            <div className="mt-4">
              <RangePosition biomarker={biomarker} />
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              {knowledge.rangeContext}
            </p>
          </Card>

          <Card className="p-6">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              Fatores
            </div>
            <h3 className="mt-1 text-[16px] font-semibold tracking-tight">
              O que influencia
            </h3>
            <ul className="mt-4 space-y-2.5">
              {knowledge.factors.map((f, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-[13px] leading-relaxed text-ink/85"
                >
                  <span className="mt-[8px] inline-block h-1.5 w-1.5 flex-none rounded-full bg-brand-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Card>

          {related.length ? (
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                  Relacionados
                </div>
                <h3 className="mt-1 text-[16px] font-semibold tracking-tight">
                  Marcadores correlacionados
                </h3>
              </div>
              <RelatedBiomarkers biomarkers={related} />
            </Card>
          ) : null}

          <article className="relative overflow-hidden rounded-[20px] p-6 text-white bg-gradient-to-br from-[#143D28] via-[#0F3020] to-[#0C2418] shadow-[0_1px_2px_rgba(13,40,24,.08)]">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-white/70 uppercase">
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
              Concierge
            </div>
            <h3 className="mt-3 text-[18px] font-semibold leading-tight tracking-tight">
              Tire dúvidas com sua equipe
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/80">
              Converse com seu médico e nutricionista do Longevify sobre este
              resultado e próximos passos.
            </p>
            <Link
              href="/concierge"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 h-9 text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              Abrir Concierge
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </article>

          {knowledge.disclaimer ? (
            <div className="rounded-[16px] border border-border/80 bg-brand-50/60 p-4 text-[12px] leading-relaxed text-muted">
              <span className="font-semibold text-ink/80">Importante.</span>{" "}
              {knowledge.disclaimer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
