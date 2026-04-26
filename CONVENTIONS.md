# Longevify — Convenções para agentes

Você está contribuindo para o app web do Longevify (healthtech de longevidade). Siga estas convenções rigorosamente.

## Stack
- **Next.js 16** (App Router, Turbopack, React 19)
- **TypeScript**
- **Tailwind v4** com tokens definidos em `app/globals.css` via `@theme`
- **recharts** para gráficos
- **lucide-react** para ícones
- **clsx + tailwind-merge** via `cn()` em `lib/utils.ts`
- **class-variance-authority** para variantes de componentes
- **@anthropic-ai/sdk** disponível (apenas use quando Anthropic API key existir)
- **fast-xml-parser** disponível

## Idioma
- Toda a UI e todo o texto em **português do Brasil**.
- Nomes de variáveis e tipos em inglês (padrão).

## Estrutura de pastas
```
app/
  (app)/           → rotas autenticadas com <TopNav>
    home/page.tsx
    dados/page.tsx
    dados/[biomarkerId]/page.tsx   (Agent A)
    protocolo/page.tsx
    loja/page.tsx                   (Agent C)
    loja/[productId]/page.tsx       (Agent C)
    concierge/page.tsx              (Agent B reescreve)
    wearables/page.tsx              (Agent D)
  api/
    chat/route.ts                   (Agent B)
  globals.css
  layout.tsx
  page.tsx (redirect → /home)
components/
  app/           → shell (TopNav)     ← NÃO MODIFICAR (gerenciado pelo orquestrador)
  brand/         → Logo
  ui/            → primitives (Button, Card, Badge, Avatar)
  dados/         → domínio Dados
  concierge/     → domínio Concierge  (Agent B)
  loja/          → domínio Loja       (Agent C)
  wearables/     → domínio Wearables  (Agent D)
lib/
  utils.ts       → cn(), formatDatePtBR(), initials()
  mock-data.ts   → Patient, Biomarker, etc.
  biomarker-knowledge.ts  (Agent A cria)
  products.ts              (Agent C cria)
  wearables-mock.ts        (Agent D cria)
  ai/                      (Agent B cria)
```

## Design tokens (Tailwind)
Estão em `app/globals.css`. Use classes tipo `bg-brand-900`, `text-muted`, `border-border`:

- **brand-50 → 900**: verde escala (baseado no logo)
- **status-optimal** #10b981, **status-normal** #e6b845, **status-out** #e85d5d
- **page**, **surface**, **border**, **ink**, **muted**
- **radius-card** 20px, **radius-pill** 999px

Fonte: `var(--font-geist-sans)` carregada em `app/layout.tsx`.

## Componentes-chave (padrão)
Veja estes arquivos ANTES de criar algo similar:
- `components/ui/card.tsx` — wrapper de Card
- `components/ui/button.tsx` — Button com variants `primary | dark | ghost | outline | pillDark`
- `components/ui/badge.tsx` — StatusBadge, StatusDot, GradeBadge
- `components/dados/score-card.tsx` — card escuro com gradient progress bar
- `components/dados/bio-age-card.tsx` — card claro
- `components/dados/biomarker-row.tsx` — linha de biomarcador (Agent A vai fazer clicável)
- `components/dados/sparkline.tsx` — sparkline com Area chart

## Padrões importantes
1. **Server Components por padrão**. Só use `"use client"` se precisar de state, effects ou event handlers.
2. **recharts é client-only** — componentes que usam recharts precisam de `"use client"`.
3. **Async params no Next 16**: em rotas dinâmicas como `/dados/[biomarkerId]`, o tipo de `params` é `Promise<{ biomarkerId: string }>`. Exemplo:
   ```tsx
   export default async function Page({ params }: { params: Promise<{ biomarkerId: string }> }) {
     const { biomarkerId } = await params;
   }
   ```
4. **Tipo de métrica** — use os tipos já exportados em `lib/mock-data.ts` (`BiomarkerStatus`, `CategoryGrade`, etc.).
5. **Status colors** — use `bg-[color:var(--color-status-optimal)]` ou `bg-[#DFF5E9]` — NÃO invente novos hex.
6. **Arredondamentos** — cards usam `rounded-[20px]`, pílulas `rounded-full`, inputs `rounded-full h-10 px-4`.
7. **Spacing** — containers usam `max-w-[1280px] px-6 py-8` no mesmo padrão da página `/dados`.
8. **Sem comentários supérfluos**. Comente só WHY, não WHAT.
9. **Sem TailwindCSS config file** — Tailwind v4 usa `@theme` em CSS. Não crie `tailwind.config.js`.

## NÃO FAÇA
- ❌ Não modifique: `components/app/top-nav.tsx`, `app/layout.tsx`, `app/globals.css`, `package.json`, `app/(app)/layout.tsx`
- ❌ Não rode `npm install` — dependências já estão prontas
- ❌ Não crie arquivos `.md` documentando o que fez (o diff basta)
- ❌ Não use emojis no código ou UI, a menos que a intenção seja ícone visual (prefira lucide-react)
- ❌ Não commite segredos — nunca hardcode API keys. Use `process.env.ANTHROPIC_API_KEY`.
- ❌ Não quebre a página `/dados` existente — se modificar `biomarker-row.tsx`, garanta que tudo continua renderizando.

## Dados do usuário mock
O "usuário" é o João, definido em `lib/mock-data.ts` (`PATIENT`). Biomarcadores em `BIOMARKERS` (10 itens). Use esses dados em todas as telas para manter consistência.

## Quando terminar
- Confirme que as rotas novas retornam 200 (`curl -s http://localhost:3001/<rota>`).
- Reporte: quais arquivos criou, quais modificou, o que testou e o que é limitação intencional pra Wave 2.
