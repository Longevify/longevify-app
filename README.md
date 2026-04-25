This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Setup Supabase

The app ships with a **demo mode**: if `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, the proxy lets every request through and data repositories return the mock data bundled in `lib/`. Use it for UI work without any backend.

To plug a real Supabase project:

1. **Create a project** at [supabase.com](https://supabase.com/dashboard) (free tier is fine).
2. **Copy the URL and anon key** from *Project settings → API* into a new `.env.local` file at the project root:

   ```bash
   cp .env.local.example .env.local
   # then fill in:
   # NEXT_PUBLIC_SUPABASE_URL=...
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   # SUPABASE_SERVICE_ROLE_KEY=...   (Project settings → API → service_role)
   ```

3. **Run the schema migration**. Two options:

   - Using the Supabase CLI (recommended):
     ```bash
     supabase link --project-ref <your-ref>
     supabase db push
     ```
   - Or paste the contents of `supabase/migrations/0001_initial.sql` into the SQL editor on the Supabase dashboard and run it.

4. **Seed catalog tables** (biomarker definitions + product catalog):

   ```bash
   # CLI
   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
   # Dashboard
   # Paste supabase/seed.sql into the SQL editor and run.
   ```

5. **Create an admin (optional).** After signing up once through `/signup`, promote that user by running in the SQL editor:

   ```sql
   update public.profiles set role = 'admin' where id = '<auth-user-id>';
   ```

6. **Configure Auth email templates** (optional). Under *Authentication → URL Configuration*, set `Site URL` to `http://localhost:3000` for local dev (adjust for production) so magic links and confirmation emails redirect to `/auth/callback` correctly.

7. **Restart the dev server** so Next picks up the new env vars.

With Supabase configured, the proxy enforces authentication on `/home`, `/dados`, `/protocolo`, `/loja`, `/concierge`, `/wearables`, and `/admin/*`. Unauthenticated visitors are redirected to `/login`. RLS policies ensure each user only sees their own rows.

### How the data layer works

- UI pages can either import `lib/mock-data.ts` directly (legacy) or go through `lib/data` which exposes a repository interface.
- `getRepositories()` always returns mock — safe for synchronous usage.
- `getServerRepositories()` inspects env + session and returns either the mock adapter (demo mode) or the Supabase adapter (real mode). This makes incremental migration of each page possible without branching code.

### Sign out

Route handler: `GET /logout` clears the Supabase session (if any) plus the demo cookie, then redirects to `/login`.

## Setup Stripe BR

A página `/planos` e a API `/api/billing/*` ficam em **modo demo** se `STRIPE_SECRET_KEY` não estiver configurada — o checkout pula direto pra página de sucesso sem cobrar nada. Pra plugar a Stripe Brasil de verdade:

1. **Crie a conta Stripe BR** em [dashboard.stripe.com](https://dashboard.stripe.com). A entidade Brasil suporta nativamente `card`, `pix` e `boleto` como métodos de pagamento — habilite os três em *Settings → Payment methods*.

2. **Crie os produtos e prices**. Pra cada plano (`essential-anual`, `premium-anual`, `concierge-anual`) crie um Product, e dentro dele 3 Prices distintos (um por método de pagamento, porque PIX e boleto são one-shot e cartão é recorrente):

   | Plano             | Card (recorrente, anual)         | Pix (one-shot)             | Boleto (one-shot)            |
   | ----------------- | -------------------------------- | -------------------------- | ---------------------------- |
   | Essential         | R$ 3.600 / yr, recurring         | R$ 3.420 (5% off), one-time | R$ 3.600, one-time          |
   | Premium           | R$ 4.800 / yr, recurring         | R$ 4.560 (5% off), one-time | R$ 4.800, one-time          |
   | Concierge         | R$ 12.000 / yr, recurring        | R$ 11.400 (5% off), one-time | R$ 12.000, one-time        |

   Copie cada `price_id` e cole em `lib/billing/plans.ts` no campo `stripePriceId` do plano correspondente.

3. **Configure as variáveis de ambiente** em `.env.local`:

   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. **Configure o webhook**. Em *Developers → Webhooks*, adicione um endpoint apontando para `https://<seu-dominio>/api/billing/webhook` (em dev use `stripe listen --forward-to localhost:3001/api/billing/webhook`). Eventos a escutar:

   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

   Copie o signing secret (`whsec_...`) pro `STRIPE_WEBHOOK_SECRET`.

5. **Parcelamento sem juros (cartão)**. Em *Settings → Payment methods → Cards → Brazil*, habilite "Installments" e configure até 12x sem juros (Stripe BR aceita ICR/installments nativamente para cards Brasil).

6. **Restart** o dev server pra carregar as envs novas.

A persistência da assinatura no Supabase (Wave 3+) ainda é stub — o webhook hoje só faz `console.log` dos eventos. A UI de "Minha assinatura" em `/perfil` mostra dados mock até a integração com a tabela `subscriptions` no Supabase.
