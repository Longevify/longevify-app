# Longevify

Plataforma de longevidade personalizada — biomarcadores, protocolo, concierge IA, loja e wearables. Foco em ajudar usuários a entender seus dados de saúde e agir, com curadoria humana e de IA.

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4** (`@theme` em `app/globals.css`, sem `tailwind.config.js`)
- **Supabase** (auth + Postgres + RLS)
- **Stripe Brasil** (cartão recorrente, PIX e boleto one-shot)
- **Kimi K2.5** + **Anthropic Claude** + **OpenAI** (concierge IA com fallback)
- **recharts** (gráficos), **lucide-react** (ícones), **class-variance-authority** (variants)

## Rodar localmente

```bash
npm install
cp .env.local.example .env.local   # preencha as chaves (todas opcionais — ver tabela abaixo)
npm run dev
```

App sobe em [http://localhost:3000](http://localhost:3000). Sem env vars, o app roda em **modo demo**: dados mock em `lib/mock-data.ts`, checkout pula direto pra sucesso e wearables abre modal "em breve".

## Variáveis de ambiente

Todas opcionais em dev (modo demo). Em produção, marque as **CRÍTICAS** como obrigatórias.

| Variável | Crítica em prod? | Onde obter |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Supabase → Project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Supabase → Project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Supabase → Project settings → API → `service_role` (server only) |
| `STRIPE_SECRET_KEY` | Sim | Stripe → Developers → API keys (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Sim | Stripe → Developers → Webhooks → endpoint signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Sim | Stripe → Developers → API keys (`pk_live_...`) |
| `ANTHROPIC_API_KEY` | Recomendado | console.anthropic.com → API keys |
| `KIMI_API_KEY` (ou `MOONSHOT_API_KEY`) | Opcional | platform.moonshot.cn → API keys |
| `OPENAI_API_KEY` | Opcional | platform.openai.com → API keys |
| `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` / `OURA_REDIRECT_URI` | Opcional | cloud.ouraring.com → OAuth apps |
| `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` / `WHOOP_REDIRECT_URI` | Opcional | developer.whoop.com → OAuth apps |
| `NEXT_PUBLIC_SITE_URL` | Recomendado | `https://app.longevify.com.br` (usado por robots/sitemap) |

Health-check sem leak de secrets: `GET /api/health` retorna `{ status, timestamp, version, providers }` (apenas booleans por provider).

## Deploy na Vercel

1. **Push o repo pro GitHub** (ver "Setup do repo" abaixo).
2. **Importe na Vercel**: [vercel.com/new](https://vercel.com/new) → selecione o repo `longevify-app` → Framework: Next.js (autodetect) → região já fixada em `gru1` (São Paulo) via `vercel.json`.
3. **Cole as env vars** no painel da Vercel (*Settings → Environment Variables*). Use as chaves de **produção** (Stripe live, Supabase prod). Marque cada uma para `Production`, e opcionalmente também `Preview` com chaves de teste.
4. **Deploy**. Primeiro build cria o domínio `longevify-app.vercel.app`.
5. **Smoke test**: abra `/api/health` e confirme `providers.supabase: true` e `providers.stripe: true`.

## Configurar domínio `app.longevify.com.br`

1. Na Vercel, no projeto: *Settings → Domains → Add* → digite `app.longevify.com.br`.
2. A Vercel mostra o registro DNS pra criar. Geralmente:
   - `CNAME app → cname.vercel-dns.com.`
3. No seu provedor DNS (Registro.br, Cloudflare, etc.), adicione o registro acima.
4. Aguarde propagação (~5min em Cloudflare, até 1h em Registro.br). A Vercel emite o cert SSL automaticamente.
5. Atualize `NEXT_PUBLIC_SITE_URL=https://app.longevify.com.br` nas envs da Vercel e redeploy.
6. **Stripe**: ajuste o webhook endpoint para `https://app.longevify.com.br/api/billing/webhook` e copie o novo `whsec_...` pra env.
7. **Supabase**: em *Authentication → URL Configuration*, defina `Site URL = https://app.longevify.com.br` e adicione `https://app.longevify.com.br/auth/callback` em *Redirect URLs*.

## Setup Stripe BR

A página `/planos` e a API `/api/billing/*` ficam em **modo demo** se `STRIPE_SECRET_KEY` não estiver configurada — checkout pula direto pra sucesso. Pra plugar Stripe Brasil:

1. **Crie a conta Stripe BR** em [dashboard.stripe.com](https://dashboard.stripe.com). Habilite `card`, `pix` e `boleto` em *Settings → Payment methods*.

2. **Crie produtos e prices**. Cada plano tem 3 prices (PIX e boleto são one-shot, cartão é recorrente):

   | Plano | Card (recorrente, anual) | Pix (one-shot) | Boleto (one-shot) |
   | --- | --- | --- | --- |
   | Essential | R$ 3.600 / yr, recurring | R$ 3.420 (5% off), one-time | R$ 3.600, one-time |
   | Premium | R$ 4.800 / yr, recurring | R$ 4.560 (5% off), one-time | R$ 4.800, one-time |
   | Concierge | R$ 12.000 / yr, recurring | R$ 11.400 (5% off), one-time | R$ 12.000, one-time |

   Cole cada `price_id` em `lib/billing/plans.ts` no campo `stripePriceId` correspondente.

3. **Env vars** em produção (Vercel):
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

4. **Webhook**. *Developers → Webhooks → Add endpoint*: `https://app.longevify.com.br/api/billing/webhook`. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.created` / `updated` / `deleted`
   - `invoice.paid` / `invoice.payment_failed`

   Em dev: `stripe listen --forward-to localhost:3000/api/billing/webhook`.

5. **Parcelamento**. *Settings → Payment methods → Cards → Brazil*: habilite "Installments" (até 12x sem juros).

## Setup Supabase

1. Crie projeto em [supabase.com/dashboard](https://supabase.com/dashboard).
2. Copie `URL`, `anon key` e `service_role` pra `.env.local` / Vercel.
3. **Migrations**:
   ```bash
   # CLI (recomendado)
   supabase link --project-ref <seu-ref>
   supabase db push
   # ou pelo dashboard: cole supabase/migrations/0001_initial.sql no SQL editor
   ```
4. **Seed** (biomarcadores + catálogo de produtos):
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
   ```
5. **Promover admin** (depois de signup pelo `/signup`):
   ```sql
   update public.profiles set role = 'admin' where id = '<auth-user-id>';
   ```
6. *Authentication → URL Configuration*: `Site URL = https://app.longevify.com.br`, redirect URL = `https://app.longevify.com.br/auth/callback`.

Com Supabase configurado, o middleware exige auth em `/home`, `/dados`, `/protocolo`, `/loja`, `/concierge`, `/wearables`, `/admin/*`. RLS garante isolamento por usuário.

## Setup do repo

Se o repo ainda não está no GitHub:

```bash
# Opção A: via GitHub CLI (instale com `brew install gh` e `gh auth login`)
gh repo create longevify-app --public --source=. \
  --description "Longevify — plataforma de longevidade personalizada" \
  --remote=origin --push

# Opção B: manual
# 1. Crie o repo em github.com/new (privado ou público)
# 2. Aponte o remote local:
git remote add origin git@github.com:<seu-user>/longevify-app.git
git branch -M main
git push -u origin main
```

## Estrutura do código

```
app/
  (admin)/admin/        → área admin (gestão de usuários, catálogo)
  (app)/                → rotas autenticadas com <TopNav>
    home/               → dashboard inicial
    dados/              → biomarcadores (lista + detalhe)
    protocolo/          → plano de ação personalizado
    loja/               → marketplace de produtos
    concierge/          → chat IA (Kimi/Claude/OpenAI com fallback)
    wearables/          → Oura, Whoop, Apple Health
    planos/             → checkout Stripe (Essential, Premium, Concierge)
    perfil/             → conta + assinatura
    onboarding/         → fluxo inicial de cadastro
  (auth)/               → login, signup, reset
  api/
    health/             → smoke test (booleans por provider)
    chat/               → concierge streaming
    billing/            → Stripe checkout + webhook
    wearables/          → OAuth callbacks
  robots.ts             → SEO
  sitemap.ts            → SEO
components/
  app/                  → shell (TopNav)
  brand/                → Logo
  ui/                   → primitives (Button, Card, Badge, Avatar)
  dados/                → domínio Dados
  loja/                 → domínio Loja
  concierge/            → domínio Concierge
  wearables/            → domínio Wearables
lib/
  ai/                   → providers Kimi/Claude/OpenAI + fallback
  billing/              → Stripe integration (plans, checkout, webhook)
  data/                 → repository pattern (mock + Supabase adapters)
  supabase/             → client/server helpers + RLS-aware proxy
  wearables/            → Oura, Whoop, Apple Health parsers
  mock-data.ts          → PATIENT, BIOMARKERS (modo demo)
  products.ts           → catálogo da loja (modo demo)
supabase/
  migrations/           → schema versionado
  seed.sql              → seed de biomarcadores e produtos
```

## Sair (sign out)

`GET /logout` limpa a sessão Supabase + cookie de demo e redireciona pra `/login`.
