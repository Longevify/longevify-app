# Email templates do Longevify

Templates HTML estilizados pra os emails transacionais do Supabase Auth.

## Como instalar

1. Vai em https://supabase.com/dashboard/project/clivszxztpfpteuuwefb/auth/templates
2. Clica em cada template e cola o HTML correspondente:

| Template no dashboard | Arquivo |
|----------------------|---------|
| Confirm signup       | `confirm-signup.html` |
| Reset password       | `reset-password.html` |
| Magic Link           | `magic-link.html` |
| Change Email         | usa `confirm-signup.html` (similar enough, opcional) |
| Invite User          | usa `confirm-signup.html` (similar enough, opcional) |

3. Salva cada um.

## Variáveis disponíveis

Supabase substitui no momento do envio:
- `{{ .ConfirmationURL }}` — URL completa pro callback (já com `?token_hash=...&type=...&redirect_to=...`)
- `{{ .Email }}` — email do destinatário
- `{{ .Token }}` — token OTP cru (não usar em produção)
- `{{ .TokenHash }}` — hash do token OTP

## Subject (assunto)

Cada template no Supabase tem um campo "Subject" separado. Sugestões:

- **Confirm signup:** `Confirma teu e-mail no Longevify ✓`
- **Reset password:** `Recuperar senha — Longevify`
- **Magic Link:** `Seu link mágico do Longevify`

## Redirect URL

Verifica que o redirect URL na Supabase tá apontando pro callback do app:
- Settings > Authentication > URL Configuration
- Site URL: `https://app.longevify.com.br`
- Redirect URLs (allowlist): `https://app.longevify.com.br/auth/callback`, `https://app.longevify.com.br/auth/recovery`

## Cores da paleta usadas

```
brand-50:  #f4faf6  (background outer)
brand-100: #e7f5ec  (separadores, hint backgrounds)
brand-200: #c9e9d6  (bordas suaves)
brand-300: #9fd4b3  (texto sobre bg escuro)
brand-700: #1f5d3f  (CTAs, headings, links)
brand-800: #123e2a  (texto principal)
brand-900: #0d2818  (gradiente escuro do header)
```
