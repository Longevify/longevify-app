# Contribuindo no Longevify

> Fluxo de trabalho oficial — **toda mudança vai pra produção via Pull Request.** Direto em `main` é bloqueado por branch protection.

## Setup local (1ª vez)

```bash
git clone https://github.com/Longevify/longevify-app.git
cd longevify-app
npm install
cp .env.local.example .env.local   # preenche as chaves (Supabase, Stripe, Moonshot)
npm run dev
```

App roda em http://localhost:3000.

## Fluxo padrão de mudança

1. **Cria branch** a partir de `main`:
   ```bash
   git checkout main && git pull
   git checkout -b feature/nome-descritivo   # ou fix/, chore/, docs/
   ```
2. **Faz a mudança e commita** com mensagem clara:
   ```bash
   git add .
   git commit -m "feat: adiciona campo de telefone no perfil"
   ```
3. **Push e abre PR**:
   ```bash
   git push -u origin feature/nome-descritivo
   gh pr create --title "..." --body "..."   # ou via UI do GitHub
   ```
4. **Vercel cria preview deploy automático** — link aparece no PR.
5. **CI roda automaticamente** (build, lint, type check) — bloqueia merge se falhar.
6. **Self-review do diff** no GitHub UI antes de mergear.
7. **Merge via UI** (botão verde "Merge pull request").
8. Vercel faz deploy de produção em ~2 min.

## Convenção de nome de branch

| Prefixo | Quando usar | Exemplo |
|---|---|---|
| `feature/` | Funcionalidade nova | `feature/dashboard-protocolo` |
| `fix/` | Correção de bug | `fix/cart-drawer-overflow` |
| `chore/` | Manutenção (deps, config) | `chore/update-next-16` |
| `docs/` | Só documentação | `docs/runbook-stripe` |
| `setup/` | Setup inicial / infra | `setup/supabase-rls` |

## Convenção de commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/) leve:

```
feat: adiciona campo X no perfil
fix: corrige cálculo de Longevify Score quando biomarker faltante
chore: atualiza dependências menores
docs: documenta setup do Stripe
refactor: extrai lógica de scoring pra lib/scoring/
```

## Branch protection ativa em `main`

- ❌ Push direto bloqueado
- ✅ PR + 1 aprovação + CI verde pra mergear
- ✅ Histórico linear (sem merge commits — usa "Squash and merge")
- ❌ Force push bloqueado

Pra desabilitar temporariamente (admin): Settings → Branches → main → unset.

## Variáveis de ambiente

Listadas em `.env.local.example`. As 3 categorias:

- **Sempre obrigatórias**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Pra Concierge funcionar com IA real**: `MOONSHOT_API_KEY` (recomendado) ou `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY`
- **Pra cobrar de verdade**: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

Sem qualquer dessas, o app entra em modo demo silenciosamente.

## Secrets em produção (Vercel)

Tudo do `.env.local` precisa ir pra Vercel → Settings → Environment Variables. NUNCA commite o `.env.local` (já está no `.gitignore`).

## Testando antes de mergear

Cada PR tem **3 níveis de validação**:

1. **CI no GitHub Actions** — build, lint, type check. Bloqueia merge se falhar.
2. **Preview deploy da Vercel** — URL única tipo `longevify-app-git-feature-x.vercel.app`. Você abre no celular, testa o fluxo.
3. **Smoke test manual** — login real, navegar tudo que mudou.

Pra mudanças críticas (pagamento, auth, dados clínicos): peça review de 2ª pessoa antes de mergear.
