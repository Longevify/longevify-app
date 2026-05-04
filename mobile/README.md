# Longevify Mobile — Capacitor Setup

Wrapper nativo iOS + Android para o app web em `https://app.longevify.com.br`.
Usa Capacitor 8, servindo o app via remote URL (live reload do web sem rebuild nativo).

---

## Arquitetura

```
mobile/
├── capacitor.config.ts      — configuracao central do Capacitor
├── package.json             — deps do mobile, SEPARADO do Next.js
├── www/                     — placeholder obrigatorio (webDir); app real vem do server.url
├── src/bridges/             — wrappers TypeScript para plugins nativos
│   ├── health.ts            — HealthKit (iOS) + Health Connect (Android)
│   ├── push.ts              — APNS + FCM
│   ├── appleSignIn.ts       — Apple Sign In (iOS only)
│   ├── appVersion.ts        — versao nativa + deteccao de plataforma
│   └── index.ts             — re-exporta tudo
├── scripts/
│   └── generate_icons.py    — gera todos os icones via Pillow (ja executado)
├── ios/                     — projeto Xcode (scaffolded pelo Capacitor)
└── android/                 — projeto Android Studio (scaffolded pelo Capacitor)
```

---

## Pre-requisitos

### Comuns
- Node 22+ (disponivel em `~/.local/node-v22.11.0-darwin-arm64/bin/`)
- npm 10+

### iOS
- macOS (obrigatorio)
- **Xcode 16+** — instale pela App Store
- **CocoaPods** — `sudo gem install cocoapods` (ou `brew install cocoapods`)
- **Apple Developer Account** — ainda nao criada; necessaria para device testing e App Store

### Android
- **Android Studio Koala+** — https://developer.android.com/studio
- **JDK 17** — `brew install openjdk@17`
- **Android SDK 34+** — instale pelo SDK Manager do Android Studio
- `ANDROID_HOME` configurado (normalmente `~/Library/Android/sdk`)

---

## Setup inicial (primeira vez)

```bash
# 1. Instalar deps do mobile (ja feito, mas pra referencia)
cd mobile/
export PATH="/Users/lucasvalle/.local/node-v22.11.0-darwin-arm64/bin:$PATH"
npm install

# 2. iOS — instalar Pods (requer CocoaPods)
cd ios/App
pod install
cd ../..

# 3. Android — sync do Gradle (automatico ao abrir Android Studio)
```

---

## Comandos do dia a dia

```bash
# Sempre dentro de mobile/ com Node no PATH:
export PATH="/Users/lucasvalle/.local/node-v22.11.0-darwin-arm64/bin:$PATH"
cd /Users/lucasvalle/Desktop/longevify/longevify-app/mobile

# Sincronizar config e plugins com os projetos nativos
npm run sync

# Abrir no Xcode
npm run open:ios

# Abrir no Android Studio
npm run open:android

# Rodar em simulador/emulador (requer device ou simulador configurado)
npm run run:ios
npm run run:android

# Ver estado de saude do setup
npm run doctor

# Atualizar plugins nativos
npm run update
```

---

## Build de desenvolvimento

### iOS (simulador)
```bash
# 1. Sync config
npm run sync:ios

# 2. Abrir Xcode
npm run open:ios

# 3. No Xcode:
#    - Selecione um simulador (ex: iPhone 16 Pro)
#    - Cmd+R para rodar
#    - O app vai abrir https://app.longevify.com.br no WebView nativo
```

### Android (emulador)
```bash
# 1. Sync config
npm run sync:android

# 2. Abrir Android Studio
npm run open:android

# 3. No Android Studio:
#    - Run > Run 'app'
#    - Selecione um emulador (API 34+)
```

---

## Apontar para localhost (dev)

Para testar contra `http://localhost:3000` em vez do prod:

```bash
# Em mobile/capacitor.config.ts, a variavel NODE_ENV controla o server.url.
# Para forcar dev:
NODE_ENV=development npx cap sync
```

No iOS, adicione o simulador como `cleartext: true` temporariamente se precisar de HTTP puro.
No Android, o emulador usa `10.0.2.2` pra acessar o host — ajuste o server.url se necessario.

---

## Checklist do que FALTA

- [ ] **Apple Developer Account** — criar em https://developer.apple.com/account/
  - Custo: USD 99/ano
  - Necessario para: device testing, push notifications, HealthKit em device real, App Store
- [ ] **Bundle ID registrado** — registrar `com.longevify.app` no Apple Developer portal
- [ ] **Provisioning Profile + Signing Certificate** — gerar no Xcode (Signing & Capabilities)
- [ ] **APNS Key** — criar em Developer portal > Keys para push notifications
- [ ] **FCM config** — baixar `google-services.json` do Firebase Console e colocar em `android/app/`
- [ ] **HealthKit entitlement ativado no Xcode**:
  - Abrir `ios/App/App.xcworkspace`
  - Target "App" > Signing & Capabilities > + Capability > HealthKit
  - O `App.entitlements` ja esta criado com as chaves corretas
- [ ] **`aps-environment` no App.entitlements** — mudar de `development` para `production` antes do App Store
- [ ] **Icones de producao** — substituir o placeholder "L" por identidade visual final
- [ ] **@capacitor-community/apple-sign-in** — instalar se Apple Sign In for implementado:
  ```bash
  npm install @capacitor-community/apple-sign-in
  npx cap sync
  # + ativar "Sign in with Apple" capability no Xcode
  ```
- [ ] **CocoaPods** — nao instalado na maquina; `pod install` vai falhar ate instalar
- [ ] **Xcode** — nao verificado se instalado
- [ ] **Android Studio** — nao verificado se instalado
- [ ] **Splash screen no LaunchScreen.storyboard** — o `Splash.png` (2732x2732) foi gerado em
  `ios/App/App/Splash.png`. Para wirear no storyboard:
  1. Abrir Xcode > LaunchScreen.storyboard
  2. Deletar o label e image view padrao do Capacitor
  3. Adicionar UIImageView com o Splash.png e constraint de fill

---

## Troubleshooting

### `pod install` falha com "command not found"
```bash
sudo gem install cocoapods
# Se Ruby for antigo:
brew install rbenv ruby-build
rbenv install 3.2.0 && rbenv global 3.2.0
gem install cocoapods
```

### Build iOS falha com "No provisioning profile"
- Abrir Xcode > App target > Signing & Capabilities
- Marcar "Automatically manage signing"
- Selecionar seu Apple Developer Team

### Android: "SDK location not found"
```bash
# Criar android/local.properties (nao commitado)
echo "sdk.dir=/Users/$(whoami)/Library/Android/sdk" > android/local.properties
```

### Android: Health Connect permissions negadas
- Health Connect exige Android 9+ e o app Health Connect instalado
- Em emuladores Android < 14, use o APK do Health Connect da Play Store

### App nao carrega no WebView (ERR_CLEARTEXT_NOT_PERMITTED)
- Verificar que `server.cleartext: false` esta correto para HTTPS
- Em dev com localhost, definir `cleartext: true` temporariamente no config

### Capacitor sync falha com "webDir does not exist"
```bash
# Garantir que www/ existe com o placeholder
mkdir -p www && echo '<html></html>' > www/index.html
npx cap sync
```

### `npx cap` nao encontrado
```bash
export PATH="/Users/lucasvalle/.local/node-v22.11.0-darwin-arm64/bin:$PATH"
# Ou use:
./node_modules/.bin/cap doctor
```

---

## Variavel de ambiente

| Var | Valor | Descricao |
|-----|-------|-----------|
| `NODE_ENV` | `production` / `development` | Controla `server.url` no `capacitor.config.ts` |

---

## Health data types suportados

Ver `src/bridges/health.ts`. Tipos implementados:
`steps`, `heart_rate`, `sleep_analysis`, `active_energy_burned`, `body_mass`, `height`,
`blood_pressure_systolic`, `blood_pressure_diastolic`, `blood_glucose`,
`oxygen_saturation`, `respiratory_rate`, `body_temperature`

---

## Links uteis

- Capacitor docs: https://capacitorjs.com/docs
- HealthKit entitlement: https://developer.apple.com/documentation/healthkit
- Health Connect Android: https://developer.android.com/health-and-fitness/guides/health-connect
- App Store guidelines: https://developer.apple.com/app-store/review/guidelines/
- capacitor-health plugin: https://www.npmjs.com/package/capacitor-health
