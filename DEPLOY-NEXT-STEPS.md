# 🚀 Próximos passos pra colocar o Longevify no ar

Status: **app rodando local** + **Stripe test conectado** + **GitHub remote configurado**, faltam ações manuais suas.

## 1. ⚠️ Supabase — preciso de mais 2 chaves

Você me mandou `clivszxztpfpteuuwefb` que é o **Project ID**, não a chave da API. As chaves verdadeiras são JWTs longos. Pra pegar:

1. Abra https://supabase.com/dashboard/project/clivszxztpfpteuuwefb
2. Sidebar → **Settings** → **API**
3. Copia 2 valores:
   - **Project API keys → `anon` `public`** (começa com `eyJhbGciOi...`)
   - **Project API keys → `service_role` `secret`** (começa com `eyJhbGciOi...`, **mantenha em segredo**)
4. Me manda os 2 — coloco no `.env.local`

Depois disso preciso rodar 2 SQL files no SQL Editor do Supabase:
- `supabase/migrations/0001_initial.sql` (cria 13 tabelas + RLS)
- `supabase/seed.sql` (popula products + biomarker_definitions)

Eu te guio quando os keys chegarem.

## 2. ✅ Stripe — funcionando em test mode

Suas chaves test foram validadas (R$0 BRL balance, livemode: false). O endpoint `/api/billing/checkout` agora cria Stripe Checkout Sessions reais — **mas precisa de products + prices criados no dashboard primeiro.**

### Você precisa fazer:

1. Acesse https://dashboard.stripe.com (modo **Test**, canto superior esquerdo)
2. **Produtos** → criar 4 produtos:
   - Plano Individual Anual
   - Plano Premium Anual
   - Plano Trio Anual
   - Plano Concierge Anual
3. Pra cada produto, criar 3 prices (recurring annual):
   - **Cartão** — preço cheio em BRL
   - **Pix** — preço com 5% off
   - **Boleto** — preço cheio em BRL
   - Total: 12 prices
4. Copia o `price_xxx` ID de cada e me manda — eu plugo em `lib/billing/plans.ts`
5. **Webhook**: `Developers → Webhooks → Add endpoint`
   - URL: `https://seu-dominio/api/billing/webhook` (depois do deploy)
   - Eventos: `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.{paid,payment_failed}`
   - Copia o **signing secret** (`whsec_...`) → me manda → vai pro `.env.local` como `STRIPE_WEBHOOK_SECRET`

> **Sobre `npx skills add -y https://docs.stripe.com`:** isso é um comando do **Cursor** (IDE), não do nosso ambiente Claude Code. Equivale a "ensinar o agent a usar a doc do Stripe". Não precisa rodar — eu já tenho o SDK `stripe` v22 instalado e referência completa da API.

## 3. ⚠️ GitHub — repo precisa ser criado primeiro

O remote `https://github.com/Longevify/longevify-app.git` está configurado, mas **o repo provavelmente ainda não existe no GitHub**. Você precisa:

1. Logar em https://github.com com a conta `Longevify`
2. Criar repo: https://github.com/new
   - Owner: `Longevify`
   - Repository name: `longevify-app`
   - Public ✅
   - **Não marque** "Add README" / "Add .gitignore" / "Add license" (já tenho local)
3. Depois de criado, abre o **Terminal** seu (não daqui) e roda:
   ```bash
   cd /Users/lucasvalle/Desktop/longevify-app
   git checkout main
   git push -u origin main
   ```
   (Eu não consigo rodar `git push main` daqui porque o sandbox bloqueia push direto pra branch protegida + não tem suas credenciais GitHub.)

Alternativa mais rápida (te economiza esses passos): instala o GitHub CLI:
```bash
brew install gh
gh auth login   # escolhe HTTPS, login via browser
gh repo create Longevify/longevify-app --public --source=/Users/lucasvalle/Desktop/longevify-app --push
```

## 4. ⚠️ Vercel — depois do GitHub

1. https://vercel.com/new
2. **Import Git Repository** → seleciona `Longevify/longevify-app`
3. Framework: Next.js (autodetectado)
4. **Environment Variables** — copia tudo do meu `.env.local` que tá local (eu te listo abaixo)
5. **Deploy**
6. **Settings → Domains → Add `app.longevify.com.br`** — Vercel te dá um CNAME pra criar no DNS

### Env vars pra colar na Vercel:
```
MOONSHOT_API_KEY=sk-7Ed...     (do .env.local local)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=         (preenche depois de criar webhook)
NEXT_PUBLIC_SUPABASE_URL=https://clivszxztpfpteuuwefb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY= (do dashboard Supabase)
SUPABASE_SERVICE_ROLE_KEY=     (do dashboard Supabase)
NEXT_PUBLIC_SITE_URL=https://app.longevify.com.br
```

## 5. ⚠️ DNS

Depois que a Vercel der o CNAME (algo tipo `cname.vercel-dns.com`), você precisa criar no provedor onde está o `longevify.com.br`:

```
Tipo: CNAME
Nome: app
Valor: cname.vercel-dns.com  (ou o que a Vercel mostrar)
TTL: 300
```

Onde está o domínio? Registro.br, GoDaddy, Cloudflare? Me diz que eu te guio o painel específico.

## ✅ Checklist final pra "100% no ar"

- [ ] Me manda 2 chaves Supabase (anon + service_role)
- [ ] Cria 4 products + 12 prices no Stripe e me manda os IDs
- [ ] Cria repo no GitHub.com/Longevify/longevify-app
- [ ] Importa repo na Vercel
- [ ] Cola env vars no Vercel
- [ ] Add domain `app.longevify.com.br` na Vercel
- [ ] Cria CNAME no DNS
- [ ] Configura webhook no Stripe apontando pra `https://app.longevify.com.br/api/billing/webhook`
- [ ] Smoke test: `curl https://app.longevify.com.br/api/health`

Me diz quando tiver feito o passo 1 (Supabase) e eu sigo daí.
