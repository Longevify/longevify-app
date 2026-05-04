# Sessão 2026-05-04 — Auth fix + Mobile foundation

Resumo do que foi feito enquanto você jantava. Lê isso primeiro quando voltar.

## TL;DR

Fechei a saga dolorosa de auth (19 PRs, root cause foi Next prefetch silencioso de `/logout`). Setup completo de Capacitor pra App Store + Play Store. PWA totalmente instalável. Camada de ponte web ↔ nativo. Guia de submission pronto pra você seguir.

**Falta você fazer**: comprar Apple Developer Program ($99), comprar Google Play Console ($25), instalar Xcode + Android Studio, e seguir o `MOBILE_SUBMISSION_GUIDE.md`.

## PRs mergeados nessa sessão

### Auth saga (19 PRs, #45-#64) — TUDO FECHADO

A causa raiz final foi **Next.js prefetchando `<Link href="/logout">`** silenciosamente quando você abria o avatar dropdown. Isso disparava `signOut()` em background e deletava cookies de auth sem você saber. Por isso o app voltava pra "conta demo" do nada.

Fix: GET `/logout` virou inerte (só redireciona pra /login). POST faz signOut real. ProfileMenu usa `<form action="/logout" method="post">` em vez de `<Link>`.

Bugs adicionais arrumados ao longo do caminho:
- RLS bloqueava queries silenciosamente (JWT injection explícito)
- supabase ssr autoRefresh deslogava após queries (autoRefreshToken: false)
- `supabase.auth.getSession()` em paths de render causava race
- Cookies sem `httpOnly: true` eram deletados pelo Safari ITP
- JWT expirado deixava user em estado zumbi (agora detecta e desloga)
- Avatar mostrava "E" do email em vez de "LV" (agora extrai do JWT user_metadata)
- Email confirmação clicava → ia pra demo (callback agora aceita `token_hash`/`verifyOtp`)
- Email design feio (3 templates HTML criados em `supabase/email-templates/`)

### Mobile foundation (PRs #65-#69)

| PR | O que faz | Status |
|----|-----------|--------|
| #65 | Capacitor scaffolding (iOS + Android) | **OPEN** — você revisa antes |
| #66 | PWA layer (manifest, sw, icons, install prompt, version gate) | merged |
| #67 | Submission guide (App Store + Play Store) | merged |
| #68 | Bridge layer (web ↔ nativo: hooks, splash, Apple Health, healthkit ingest) | merged |
| #69 | ConnectAppleHealth card no /wearables | merged |

## Arquitetura escolhida

**PWA + Capacitor** — webview do app nativo aponta pra `app.longevify.com.br`. Reusa 100% do código web. Bridges nativas pra HealthKit, push, splash. PWA fallback pra quem instalar via "Add to Home Screen".

Validado por 2 expert agents:
- Capacitor é correto pra teu cenário (founder solo, sem stack mobile, Next 16 SSR pesado)
- Alternativa (Expo/RN puro) tomaria 210-280h de reescrita
- Estimativa realista até 1ª submission: **6-9 semanas**

## Killer feature pra Apple Review (anti 4.2 rejection)

Apple rejeita apps que são "apenas wrappers de site". Pra justificar:

1. **HealthKit nativo** (já implementado): lê HRV/sono/peso/VO2max do Apple Watch, faz batch POST pro backend. Único caminho real pra ter dados de wearable em iOS.
2. **Push notifications APNs nativo** (plugin instalado, falta backend trigger)
3. **Sign in with Apple nativo** (bridge criado, falta backend exchange)
4. **Camera nativa** (plugin instalado, OCR de exames antigos no futuro)

## Estado atual do código

```
/Users/lucasvalle/Desktop/longevify/longevify-app/
├── app/                          # Next.js (web — intocado pra mobile)
│   ├── manifest.ts                # PWA manifest dinâmico
│   ├── api/
│   │   ├── version/               # forced-update endpoint
│   │   └── wearables/healthkit/ingest/  # HealthKit batch ingest
│   └── icon.png + apple-icon.png  # gerados via scripts/generate-icons.mjs
├── components/
│   ├── pwa/                       # service worker, install prompt, version gate
│   └── native/                    # platform-aware components (Apple Health, splash)
├── lib/
│   ├── auth/                      # JWT helpers (jwt.ts, current-user.ts)
│   ├── native/                    # platform.ts, use-platform.ts, types.ts
│   └── supabase/                  # server.ts (writes), server-with-jwt.ts (reads)
├── mobile/                        # Capacitor (PR #65 aberto)
│   ├── capacitor.config.ts
│   ├── ios/                       # Xcode project
│   ├── android/                   # Gradle project
│   ├── src/bridges/               # TS wrappers (health, push, appleSignIn, version)
│   └── package.json               # deps separadas do app web
├── public/
│   ├── icons/                     # PWA + master SVG
│   ├── sw.js                       # service worker
│   └── offline.html                # offline shell
├── scripts/
│   └── generate-icons.mjs          # SVG → PNG em todos os tamanhos
├── supabase/email-templates/       # confirm-signup, reset-password, magic-link
├── AGENTS.md                       # convenções do codebase atualizadas
├── MOBILE_SUBMISSION_GUIDE.md      # **passo a passo App Store + Play Store**
└── SESSION_NOTES_2026_05_04.md     # esse arquivo
```

## Próximos passos (você faz, ordem recomendada)

### Imediato (~1h)
1. **Confirma URL Site no Supabase** — `app.longevify.com.br` (você já mudou)
2. **Cola os 3 email templates** em https://supabase.com/dashboard/project/clivszxztpfpteuuwefb/auth/templates
3. **Testa criação de conta nova** com `agentelvalle+teste1@gmail.com` — vai chegar email com cores Longevify, click vai pra `/login?confirmed=1` com banner verde
4. **Review PR #65** (https://github.com/Longevify/longevify-app/pull/65) — é o setup do Capacitor. Se tiver tudo OK pra você, mergea

### Esta semana (~10-15h)
5. **Apple Developer Program** signup ($99/ano): https://developer.apple.com/programs/enroll/ — pode demorar 1-3 dias pra aprovar
6. **Google Play Developer Console** signup ($25 once): https://play.google.com/console/signup
7. **Instala Xcode** (Mac App Store, ~10GB) + **CocoaPods** (`sudo gem install cocoapods`)
8. **Instala Android Studio** + **JDK 17** (Homebrew: `brew install --cask android-studio temurin@17`)
9. **Build local iOS:**
   ```bash
   cd /Users/lucasvalle/Desktop/longevify/longevify-app/mobile
   npm install
   npx cap sync ios
   npx cap open ios   # abre Xcode
   ```
   Configura signing team, adiciona HealthKit capability, build em simulador
10. **Build local Android:**
    ```bash
    npx cap open android  # abre Android Studio
    ```

### Antes da primeira submission (~5-10h)
11. Segue `MOBILE_SUBMISSION_GUIDE.md` passo a passo
12. **Screenshots reais** do app rodando — 6.7", 6.5", 5.5", iPad
13. **Política de privacidade** com LGPD compliance (template no guide)
14. **Nutrition labels Apple** (o que coleta, com quem compartilha)
15. **Ícone hi-res 1024x1024** finalizado (placeholder atual é "L" verde — pode usar pra MVP, mas idealmente design custom)
16. Submit to TestFlight (Apple) + Internal Testing (Google) primeiro
17. Beta com 5-10 pessoas → fix bugs → submit produção

### Timeline realista até live
- **Semana 1-2**: ambiente local + builds funcionando
- **Semana 3-4**: HealthKit testado, push nativos, Sign in with Apple
- **Semana 5**: screenshots, copy, privacy policy, app submission
- **Semana 6-7**: Apple review (1-3 dias normal, conta 1 rejeição) + fix + resubmit
- **TOTAL: ~6-7 semanas até live na App Store**

## Custos esperados

- Apple Developer Program: **$99/ano (~R$500)**
- Google Play Console: **$25 once (~R$130)**
- Supabase: continua Free Tier por enquanto (~3-4 emails/hora limite)
- **Custom SMTP recomendado** quando começar a ter tráfego: Resend (https://resend.com) free tier 3k emails/mês

Total ano 1 mobile: ~R$630 (sem contar SMTP)

## Bugs conhecidos (pequenos, atrás da fila)

- ConnectAppleHealth no /wearables tem placeholder ícone "♥" (vermelho Apple). Idealmente trocar por ícone real do Apple Health (mas Apple proíbe usar logo deles fora de contextos específicos — atual ♥ é seguro)
- Splash screen tá com ícone "L" placeholder. Quando tiver design final, regerar via `node scripts/generate-icons.mjs` (atualiza svg na string e roda)
- `mobile/www/` tem placeholder vazio — é só um requirement do Capacitor, não usado em runtime (webview vai pra remote URL)
- Apple deployment target = 15.0, Android minSdk = 24. Cobre ~95% dos devices ativos

## Quando testar tudo

Quando você tiver Xcode + Apple Developer Account, valida esse fluxo:

1. Build iOS no simulador → app abre, splash verde, loading, vai pra app.longevify.com.br
2. Login → cookies persistem (auth fix funcionou)
3. /wearables → vê card "Conectar Apple Health"
4. Clica "Conectar" → pede permissão HealthKit (no simulador adiciona dados fake)
5. POST pra `/api/wearables/healthkit/ingest` → check Supabase `daily_health_metrics` tem rows
6. Mata e abre app de novo → cookie persiste, vai direto pra /home
7. Force update test: muda `minimum: "1.0.1"` em `app/api/version/route.ts`, deploya, abre app antigo → modal bloqueante "Atualize"

## Prazo realista de live

**Antes de Junho 2026** (depende do quanto rápido você fizer enrollment Apple + setup local). Quando tudo estiver verde, enviar TestFlight beta com você + 5 amigos antes de submeter pra produção. Beta evita 90% das rejeições.

Boa janta. Quando voltar, lê esse arquivo, mergea PR #65 se tudo OK, e começa pelo step 1 (templates de email).
