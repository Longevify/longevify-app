<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Longevify — Architecture Notes

## Multi-platform: Web + PWA + Mobile (Capacitor)

Este repo serve **três deploy targets** do mesmo código:

1. **Web** (Vercel) — `app.longevify.com.br` — Next.js 16 SSR/RSC
2. **PWA** — Add to Home Screen no iOS Safari + Chrome Android. Service worker em `public/sw.js`, manifest em `app/manifest.ts`
3. **Mobile nativo** — iOS + Android via Capacitor 8 (pasta `mobile/`). WebView aponta pra mesma URL `app.longevify.com.br` em produção

Mudanças no app web automaticamente refletem em todas as 3 plataformas (sem rebuild de app — Capacitor consome remote URL).

## Auth (lições aprendidas, MUITO importante)

A camada de auth foi a mais dolorosa do projeto — 19 PRs até estabilizar (#45-#64). Padrões consolidados:

### Read paths (page renders, GET routes)
```ts
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

const { userId, accessToken } = await getUserIdFromCookie();
if (!userId) return /* logged out */;
const supabase = await createSupabaseWithJwt(accessToken);
const { data } = await supabase.from("...").select(...);
```

`createSupabaseWithJwt` usa `@supabase/supabase-js` PURO (não-ssr) com `auth: { persistSession: false, autoRefreshToken: false }` e Bearer token explicit no global header. **NUNCA usa cookies handler** — evita race condition onde supabase ssr deletava cookies de auth durante navegação.

### Write paths que precisam refresh real (login, recovery, callback)
```ts
import { getServerClient } from "@/lib/supabase/server";

const supabase = await getServerClient();
await supabase.auth.signInWithPassword(...); // setAll real escreve cookies
```

`getServerClient` usa `@supabase/ssr` `createServerClient` com cookies handler que escreve/deleta cookies de verdade. Cookies forçados como `httpOnly: true, secure: true, sameSite: "lax"` (anti Safari ITP).

### Write paths comuns (server actions de save)
Use o **mesmo padrão de read paths** (createSupabaseWithJwt) — RLS valida via JWT, não precisa do cookies handler do supabase ssr.

### NUNCA fazer
- `supabase.auth.getSession()` ou `supabase.auth.getUser()` em render paths — dispara refresh proativo que em race deleta cookies
- Múltiplas chamadas a `cookies()` em uma server action — quebra setAll silenciosamente
- `<Link href="/logout">` — Next prefetcha e desloga em background. Use `<form action="/logout" method="post">` (GET /logout é inerte)

## JWT helper detalhes
`lib/auth/jwt.ts` extrai user_id direto do cookie sem chamar `supabase.auth.*`. Também:
- Detecta JWT expirado (com 30s margem) — retorna como deslogado em vez de estado zumbi
- Extrai `user_metadata.first_name/last_name` pra fallback de UI quando profile DB falha

## Mobile (Capacitor)

`mobile/` é projeto separado com seu próprio `package.json`, `tsconfig.json`, e `node_modules`. Excluído do typecheck do app web via `tsconfig.json` exclude.

### Plataforma detection (no app web)
```ts
import { usePlatform } from "@/lib/native/use-platform";

const { isNative, platform, isStandalone } = usePlatform();
if (isNative && platform === "ios") return <ConnectAppleHealth />;
```

### HealthKit ingest (KILLER feature pra Apple Review 4.2)
- Mobile app: `mobile/src/bridges/health.ts` chama HealthKit nativo
- POST pra `/api/wearables/healthkit/ingest` com batch de métricas
- Server upserts em `daily_health_metrics` (idempotente por patient_id+date)

### Forced version gate
`/api/version` retorna `{ latest, minimum }`. App nativo no boot compara com sua versão; se < minimum, mostra modal bloqueante "Atualize pela App Store".

### Submission
Ver `MOBILE_SUBMISSION_GUIDE.md` na raiz — passo a passo pra App Store + Play Store.

## Brand colors

```
brand-50:  #f4faf6  (background outer)
brand-100: #e7f5ec  (separadores, hint backgrounds)
brand-200: #c9e9d6  (bordas suaves)
brand-300: #9fd4b3
brand-400: #6dba8e
brand-500: #3f9a6b
brand-600: #2a7a53
brand-700: #1f5d3f  (CTAs, headings, links primários)
brand-800: #123e2a  (texto principal escuro)
brand-900: #0d2818  (gradiente escuro do header, splash bg)
```

Splash screen + status bar + theme-color usam #1f5d3f / #0d2818.
