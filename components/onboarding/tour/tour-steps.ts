/**
 * Lucas (2026-05-21): "o tutorial tem que interagir com o app de modo
 * a mostrar onde estão as diferentes abas e features, em vez de só
 * mostrar um texto no pop up."
 *
 * Declaração dos steps do tour interativo. Cada step:
 *   - targetSelector: query CSS pro elemento real no DOM (geralmente
 *     `[data-tour='id']`). null = step centralizado sem spotlight
 *   - route: rota onde o elemento existe. Se diferente da atual, o
 *     runner navega antes de mostrar
 *   - placement: "auto" tenta below → above → side. Pode forçar
 *   - title + body: copy mostrado no tooltip
 *
 * Ordem covers o fluxo principal pós-onboarding:
 *   1. Welcome (no spotlight, modal central)
 *   2. Score card (home)
 *   3. Bio Age card (home)
 *   4. Daily progress grid (home)
 *   5. Todo sidebar (home)
 *   6. Monthly goals (home)
 *   7. Evolution card (home)
 *   8. Bottom nav (todas as rotas — anchored mobile-only)
 *   9. Dr Lon floating (todas — anchored bottom-right)
 *   10. Pronto pra começar (modal central)
 */

export type TourPlacement = "auto" | "top" | "bottom" | "left" | "right" | "center";

export interface TourStep {
  id: string;
  /** CSS selector OU null pra modal centralizado sem spotlight. */
  targetSelector: string | null;
  /** Rota onde o elemento existe. Se diferente da atual, runner navega. */
  route: string;
  title: string;
  body: string;
  placement?: TourPlacement;
  /** Hint chip opcional abaixo do body. */
  hint?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    targetSelector: null,
    route: "/home",
    placement: "center",
    title: "Bem-vindo ao Longevify",
    body: "Vou te mostrar as principais features em 8 passos rápidos. Pode pular a qualquer momento.",
  },
  {
    id: "score",
    targetSelector: "[data-tour='score-card']",
    route: "/home",
    placement: "bottom",
    title: "Longevify Score",
    body: "Métrica 0-100 baseada em todos seus biomarcadores. Click pra abrir histórico com toggle 7d / 30d / 6m + breakdown por órgão.",
  },
  {
    id: "bio-age",
    targetSelector: "[data-tour='bio-age-card']",
    route: "/home",
    placement: "bottom",
    title: "Idade Biológica",
    body: "Sua idade fisiológica vs. cronológica. Click pra ver evolução + score derivado (5 anos mais jovem = 100).",
  },
  {
    id: "daily-progress",
    targetSelector: "[data-tour='daily-progress']",
    route: "/home",
    placement: "top",
    title: "Progresso de hoje",
    body: "Sono, Exercício, Tarefas Feitas e Pendentes. Cards de wearable têm score 0-100. Click pra abrir popup detalhado.",
    hint: "Score real só com wearable conectado",
  },
  {
    id: "todo-sidebar",
    targetSelector: "[data-tour='todo-sidebar']",
    route: "/home",
    placement: "left",
    title: "Tarefas do dia",
    body: "Marca/desmarca direto aqui — toda task feita conta pro seu streak (🔥 dias seguidos).",
  },
  {
    id: "monthly-goals",
    targetSelector: "[data-tour='monthly-goals']",
    route: "/home",
    placement: "top",
    title: "Metas do mês",
    body: "4 missões com ring de progresso: Score, biomarcadores ótimos, streak e rejuvenescimento. Estilo Duolingo.",
  },
  {
    id: "evolution",
    targetSelector: "[data-tour='evolution-card']",
    route: "/home",
    placement: "top",
    title: "Sua evolução",
    body: "Sparklines do Score + Idade Biológica ao longo do tempo. Conquistas (badges) aparecem automáticas conforme você melhora.",
  },
  {
    id: "bottom-nav",
    targetSelector: "[data-tour='bottom-nav']",
    route: "/home",
    placement: "top",
    title: "5 abas principais",
    body: "Home · Dados (biomarcadores) · Protocolo (suplementos + hábitos) · Loja · Mais (ciclo, dieta, concierge, wearables).",
    hint: "Visível no mobile — desktop usa top nav",
  },
  {
    id: "dr-lon",
    targetSelector: "[data-tour='dr-lon-button']",
    route: "/home",
    placement: "left",
    title: "Dr. Lon — concierge IA",
    body: "Pergunta qualquer coisa: \"como melhorar meu LDL?\". Conhece seus dados. Não substitui consulta médica — só orienta.",
  },
  {
    id: "complete",
    targetSelector: null,
    route: "/home",
    placement: "center",
    title: "Pronto pra começar!",
    body: "Sua próxima coleta vai otimizar tudo. Suba exames antigos em /dados pra acelerar o histórico. Boa jornada!",
  },
];
