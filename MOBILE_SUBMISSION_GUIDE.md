# Guia de Submission App Store + Google Play — Longevify

**Status**: First-time submission (never submitted before)  
**Data**: 2026-05-03  
**Bundle ID**: `com.longevify.app`  
**Categoria**: Health & Fitness  

---

## 1. PRÉ-REQUISITOS E SETUP INICIAL

### 1.1 Contas e Programas de Desenvolvedor

#### Apple Developer Program
- **Custo**: $99/ano (~R$500)
- **Link signup**: https://developer.apple.com/programs/
- **O que você vai receber**: 
  - Acesso ao Apple Developer Portal (certificados, provisioning profiles)
  - App Store Connect (submeter app, gerenciar versões, analytics)
  - Acesso a TestFlight (distribuição beta)
  - Suporte técnico (pode não ajudar em rejeição, mas vale ter)

- **Processo**:
  1. Acessa https://developer.apple.com/programs/
  2. Clica "Enroll" → escolhe "Organization" (não Individual, porque Longevify é empresa)
  3. Precisa de: Apple ID pessoal (usa seu `eulucasvalle@gmail.com` ou cria novo) + informações da empresa (CNPJ, nome, endereço legal)
  4. Valida conta com email (2-3 dias normalmente)
  5. Apple pode pedir verificação adicional via telefone (~1 hora call)
  6. **Prazo total**: 3-7 dias

- **Tax ID Brasil**: 
  - Apple vai pedir seu CNPJ (Longevify). Se não tiver CNPJ constituído ainda, essa é a hora de fazer.
  - Se CNPJ ainda não existir, você pode usar Individual (Apple ID pessoal) temporariamente e transferir depois, mas é trabalhoso.

#### Google Play Developer Program
- **Custo**: $25 one-time (~R$130)
- **Link signup**: https://play.google.com/console/
- **O que você vai receber**:
  - Play Console (submeter apps Android, gerenciar versões, reviews)
  - Distribuição em track de testes (internal, closed, open)

- **Processo**:
  1. Acessa https://play.google.com/console/
  2. Clica "Create account" → escolhe "Organization"
  3. Pede CNPJ, nome, endereço, email
  4. Paga $25 via cartão de crédito (não aceita boleto)
  5. **Prazo total**: 30 min a 2 horas (payment processing)

- **Tax ID Brasil**:
  - Google Play vai pedir CNPJ também
  - Se tiver dúvida sobre impostos (Brasil rende em Real), entra em contato com contabilista de startups tech

### 1.2 Documentos Necessários

**Antes de submeter qualquer app, tenha pronto:**

- [ ] CNPJ da Longevify (ativo, com inscrição estadual)
- [ ] Razão social e endereço legal da empresa
- [ ] Conta bancária para receber pagamentos (Apple, Google Play vão fazer TED direto para BR)
- [ ] Email corporativo verificado (`suporte@longevify.com.br` recomendado)
- [ ] DUNS number (opcional, mas Apple pode pedir se houver rejeição; é gratuito via Dun & Bradstreet)

### 1.3 Apple Developer Program: Detalhe Brasil

**LGPD e Tributação**:
- Apple já sabe que seu app usa dados de saúde (HealthKit). Isso não é problema.
- No tax form (W-8BEN), marca "Outros Países" (Brasil), insere CNPJ
- Será tributado em ~15% em ganhos (dividendos). Apple retém.
- **Use CRM/contabilista**: Longevify precisa reportar isso pro Fisco

**Apple Privacy Manifest** (obrigatório desde maio 2024):
- Você vai precisar de um arquivo `PrivacyInfo.xcprivacy` no Xcode declarando quais dados coleta
- Template vai ser fornecido pelo Xcode quando fazer build pra App Store

---

## 2. CAMINHO APPLE APP STORE

### 2.1 Configurar App no Apple Developer Portal

1. **Criar App ID**:
   ```
   Acessa: Apple Developer > Identifiers
   Clica "Register new Identifier" → App ID
   Bundle ID: com.longevify.app
   Capabilities:
     - HealthKit (obrigatório)
     - Push Notifications (obrigatório pra notificações)
     - Sign in with Apple (opcional, mas recomendado pra compliance)
   ```

2. **Criar Certificate (Distribution)**:
   ```
   Acessa: Certificates, Identifiers & Profiles > Certificates
   Clica "Create a New Certificate"
   Tipo: "Apple Distribution" (ou "iOS Distribution")
   Segue wizard: gera CSR no Mac, faz upload, baixa .cer
   Duplo-clica em .cer → Keychain (automático)
   ```

   *Comando pra gerar CSR se precisar manualmente:*
   ```bash
   # Abre Keychain Access > Certificate Assistant > Request a Certificate from a CA
   # Email: suporte@longevify.com.br
   # CN: Longevify Distributor
   # Salva em disk
   ```

3. **Criar Provisioning Profile**:
   ```
   Acessa: Certificates, Identifiers & Profiles > Profiles
   Clica "Create a New Profile"
   Type: "App Store"
   App ID: seleciona com.longevify.app
   Certificate: seleciona o Distribution cert que criou
   Download .mobileprovision
   Duplo-clica em .mobileprovision → Xcode (automático)
   ```

### 2.2 Xcode: Setup Signing & Capabilities

No seu projeto (Next.js, mas quando compilar pra iOS):

```
Abre Xcode > Targets > Longevify (seu alvo)
Signing & Capabilities:
  - Team: Longevify (associada ao seu Apple Developer Account)
  - Bundle ID: com.longevify.app
  - Signing Certificate: Apple Distribution (aquela que criou)
  - Provisioning Profile: Longevify App Store (aquela que baixou)

Capabilities (clica + > Add):
  - HealthKit: Health Kit
  - Push Notifications: ON
  - Sign in with Apple: ON (opcional)
```

**Nota**: Se tiver React Native / Expo, o setup muda. Verifica com outro agente que tá trabalhando em `mobile/`.

### 2.3 App Store Connect: Criar App

1. **Login**: https://appstoreconnect.apple.com/

2. **Criar App**:
   ```
   Clica "My Apps" → "+"
   Escolhe "New App"
   Bundle ID: com.longevify.app
   Default Language: Portuguese (Brazil)
   Name: Longevify
   SKU: com.longevify.app (pode ser qualquer string única)
   Primary Category: Health & Fitness
   Secondary Category: Medical (opcional, se quiser)
   ```

3. **Preencher Informações Obrigatórias**:
   
   **Subtitle** (iOS):
   ```
   "Longevidade Personalizada com Biologia de Vanguarda"
   ```
   
   **Description** (4000 caracteres máx):
   ```
   Longevify é o app de longevidade personalizada que transforma dados de saúde em plano de vida saudável.
   
   Recursos:
   - Longevify Score: métrica 0-100 que resume sua saúde a partir de 100+ biomarcadores
   - Integração com Apple HealthKit para histórico de dados de saúde
   - Receitas personalizadas de suplementação e estilo de vida baseadas em seu DNA e sangue
   - Acompanhamento trimestral com médico especialista em longevidade
   - Chat com IA que responde dúvidas sobre longevidade
   
   Como funciona:
   1. Faça coleta de sangue (Painel Básico ou Avançado)
   2. Receba seu Longevify Score em 7 dias
   3. Acompanhe progresso no app com dados do Apple HealthKit
   4. Converse com médico e IA para ajustar seu plano
   
   Dados de Saúde:
   Este app lê dados do Apple HealthKit com sua permissão e não compartilha com terceiros para publicidade ou mineração de dados. Todos os dados são criptografados e armazenados com conformidade LGPD.
   
   Aviso Legal:
   Este app é uma ferramenta de acompanhamento de saúde e bem-estar. Não é um dispositivo médico. Sempre consulte um médico antes de fazer mudanças na sua saúde.
   ```

   **Keywords** (100 caracteres máx, separados por vírgula):
   ```
   longevidade, saúde, biomarcadores, biologia, wellness, anti-aging, DNA, suplementos
   ```

   **Support URL**:
   ```
   https://longevify.com.br/suporte
   ```

   **Privacy Policy URL** (OBRIGATÓRIO):
   ```
   https://longevify.com.br/privacidade
   ```
   *Deve conter seção explícita sobre LGPD, dados de saúde, e política de retenção*

4. **Privacy Nutrition Labels** (Apple Privacy Manifest):
   
   Na seção "App Privacy", declara:
   - [ ] Health & Fitness: Health Data (read HealthKit)
   - [ ] Identifiers: User ID (se cria conta)
   - [ ] Diagnostics: Crash Data (opcional, via Sentry)
   - [ ] Purposes: Health Management (primária)
   
   **Cria arquivo `PrivacyInfo.xcprivacy`** no Xcode:
   ```
   Xcode > File > New > File > App Privacy and Data Types Configuration
   ```
   
   Preenche com:
   ```xml
   <dict>
     <key>NSPrivacyTracking</key>
     <false/>
     <key>NSPrivacyTrackingDomains</key>
     <array/>
     <key>NSPrivacyCollectedDataTypes</key>
     <array>
       <dict>
         <key>NSPrivacyCollectedDataType</key>
         <string>NSPrivacyCollectedDataTypeHealthKitData</string>
         <key>NSPrivacyCollectedDataTypeLinked</key>
         <false/>
         <key>NSPrivacyCollectedDataTypeTracking</key>
         <false/>
         <key>NSPrivacyCollectedDataTypePurposes</key>
         <array>
           <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
         </array>
       </dict>
     </array>
   </dict>
   ```

### 2.4 Screenshots (Obrigatório)

Apple requer screenshots de várias resoluções. Você precisa de **no mínimo**:

| Device | Resolution | Qtd | Descrição |
|--------|-----------|-----|-----------|
| iPhone 6.7" | 1290x2796 | 2-5 | iPhone 15 Pro Max, mostra features principais |
| iPhone 6.5" | 1242x2688 | 2-5 | iPhone 15 Pro, mostra features |
| iPad (13") | 2732x2048 | 2-5 | iPad Pro (opcional, mas recomendado) |

**Conteúdo recomendado dos screenshots**:
1. Home com Longevify Score grande
2. Gráfico de biomarcadores
3. Receitas personalizadas
4. Chat com IA
5. Integração HealthKit

**Tool**: Use Figma ou Sketch pra criar mockups. Exporte em PNG.

### 2.5 Versão + Build Number

```
App Store Connect > General
- Version: 1.0.0
- Build: 1 (incrementa com cada submit)
```

### 2.6 Rating

```
App Content:
- Categoria: Health & Fitness
- Violence/Gore: None
- Sexual Content: None
- Frequency of Alcohol/Tobacco: None
```

### 2.7 Build + Submit

**Antes de submeter, checklist**:

- [ ] Xcode build em Release mode roda sem erros
- [ ] HealthKit entitlements configuradas no Xcode
- [ ] Privacy Manifest (`PrivacyInfo.xcprivacy`) presente
- [ ] Push notifications configuradas (se usar)
- [ ] Nenhum código debug ou console.log visível
- [ ] Versão de iOS suportada: mínimo iOS 15.0 (Apple exige iOS 15+ em 2026)
- [ ] Testes manuais feitos em dispositivo físico
- [ ] Screenshots prontas

**Build + Archive**:
```bash
# No Xcode ou via CLI
xcodebuild -scheme Longevify -configuration Release archive \
  -archivePath ./build/Longevify.xcarchive
```

**Submit via App Store Connect ou Xcode**:
```
Xcode > Organizer > Archives
Seleciona seu build > Distribute App
Escolhe App Store Connect
Segue wizard (seleciona certificate, provisioning profile)
```

*Ou via web:*
```
App Store Connect > Build
Clica "+" > seleciona .ipa que fez upload
```

### 2.8 Review e Rejeições Comuns

**Apple revisa em 1-3 dias normalmente** (até 7 dias se tiver problema).

#### Rejection Checklist (Evita estas):

1. **HealthKit: False/Inaccurate Claims** ❌
   - Não diga que app mede pressão via câmera do celular (impossível)
   - Diga claramente: "App lê dados do Apple HealthKit que você forneceu"
   - Inclua aviso: "Não é dispositivo médico, sempre consulte médico"

2. **Privacy Violations** ❌
   - Não use dados de HealthKit para publicidade/marketing
   - Não compartilhe dados com terceiros sem consentimento explícito
   - Apple verifica código — se vê envio pra terceiros, rejeita

3. **Missing Privacy Policy** ❌
   - Privacy URL obrigatória, não pode ser PDF, tem que ser web ativa
   - Tem que ter seção explícita sobre LGPD e dados de saúde

4. **LGPD Compliance** ⚠️
   - Declara: "Seus dados são armazenados com conformidade com Lei Geral de Proteção de Dados (LGPD)"
   - Inclui informações sobre DPO (Data Protection Officer)
   - Explica finalidades de coleta

5. **Broken Links/Bad Metadata** ❌
   - Links na descrição têm que funcionar
   - Nenhum typo em nome ou descrição

6. **Crash on Launch** ❌
   - Apple testa app em iOS 15-18 antes de aceitar
   - Se crashear, rejeita imediatamente

#### Se Rejeitar:

1. **Leia o email** com motivo exato (Apple é específico)
2. **Responde via App Store Connect > Resolution Center**
3. **Submete novo build** com o fix
4. **Prazo pra resolver**: ~10 dias (ou é rejeitado definitivamente, precisa resubmeter from scratch)

### 2.9 TestFlight (Beta Testing — Altamente Recomendado)

Antes de submeter pra review pública, teste com usuários reais via TestFlight.

```
App Store Connect > TestFlight
Clica "+" > Internal Testing
Adiciona email de tester (ex: dra.marina@longevify.com.br)
Envia link de testflight via email
Tester baixa app pelo TestFlight (precisa do Apple ID)
Testa por até 90 dias antes de review
```

**Vantagem**: Descobre problemas antes que Apple rejeite (salva semanas).

---

## 3. CAMINHO GOOGLE PLAY STORE

### 3.1 Setup no Play Console

1. **Login**: https://play.google.com/console/

2. **Criar App**:
   ```
   Clica "Create app"
   Default Language: Portuguese (Brazil)
   App name: Longevify
   Default category: Health & Fitness
   Type: Fitness
   ```

3. **Preencher Informações**:

   **App Name**: `Longevify`
   
   **Short description** (80 caracteres máx):
   ```
   Longevidade Personalizada com Biologia de Vanguarda
   ```

   **Full description** (4000 caracteres máx):
   ```
   Longevify é o app de longevidade personalizada que transforma dados de saúde em plano de vida saudável.
   
   ✓ Longevify Score: métrica 0-100 que resume sua saúde a partir de 100+ biomarcadores
   ✓ Integração com Android Health Connect para histórico completo
   ✓ Receitas personalizadas de suplementação e estilo de vida
   ✓ Acompanhamento trimestral com médico especialista
   ✓ Chat com IA que responde dúvidas sobre longevidade
   
   Como funciona:
   1. Faça coleta de sangue (Painel Básico R$349 ou Avançado R$1.799)
   2. Receba análises detalhadas em 7 dias
   3. Acompanhe progresso com dados do Android Health Connect
   4. Converse com médico e IA
   
   ⚠️ Este app não é um dispositivo médico. Não diagnóstico, não trata, não previne qualquer doença. Sempre consulte um médico antes de fazer mudanças na sua saúde.
   
   Dados de Saúde:
   Seus dados são armazenados com conformidade LGPD (Lei Geral de Proteção de Dados do Brasil). Não compartilhamos com terceiros para publicidade.
   ```

   **Categoria**: Health & Fitness
   
   **Content Rating Questionnaire**:
   ```
   - No violence
   - No explicit sexual content
   - No gambling
   - No ads targeting children
   - Health/Medical app
   ```

### 3.2 Health App Declaration (Obrigatório desde ago/2024)

Na seção **Policy > App content**:

```
☑ My app contains health features
  
  Which health features? (marcar todos aplicáveis)
  ☑ Health and fitness tracking
  ☑ Disease and condition management (longevidade é prevenção)
  
  Health data access:
  ☑ Lê dados do Android Health Connect (HealthKit BR)
  ☑ Nunca compartilha pra publicidade ou terceiros
  
  Is your app a medical device?
  ☐ No (Longevify é app de wellness, não dispositivo médico)
```

### 3.3 Privacy Policy

```
Play Console > App content > Privacy
URL: https://longevify.com.br/privacidade
(mesma que no Apple, mas tem que ter seção LGPD visível)
```

### 3.4 Assets (Imagens + Icons)

| Asset | Tamanho | Formato | Qtd |
|-------|---------|---------|-----|
| App icon | 512x512 px | PNG | 1 |
| Feature graphic | 1024x500 px | PNG | 1 |
| Screenshots | Varia | PNG | 2-8 |

**Screenshots Android** (mínimo 2, máx 8):

| Device | Tamanho | Descrição |
|--------|---------|-----------|
| Phone | 1080x1920 | Home com Score |
| Phone | 1080x1920 | Biomarcadores |
| Tablet (7") | 1200x1824 | Opcional |
| Tablet (10") | 1600x2560 | Opcional |

**Feature Graphic** (1024x500):
- Grande headline: "Longevidade Personalizada"
- Subtítulo: "Com Biologia de Vanguarda"
- Logo e cores Longevify

### 3.5 Build: Generate Signed AAB (Android App Bundle)

```bash
# No seu projeto React Native / Flutter / Kotlin
# Gera chave privada (uma vez):
keytool -genkey -v -keystore longevify-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias longevify-key \
  -dname "CN=Longevify,O=Longevify,L=São Paulo,ST=SP,C=BR"

# Assina e bundla:
gradle bundleRelease \
  -Pandroid.injected.signing.store.file=longevify-release-key.jks \
  -Pandroid.injected.signing.store.password=SEU_PASSWORD \
  -Pandroid.injected.signing.key.alias=longevify-key \
  -Pandroid.injected.signing.key.password=SEU_PASSWORD

# Saída: app/release/app-release.aab
```

**Guarda a chave privada em local seguro** (entra em .gitignore):
```bash
echo "longevify-release-key.jks" >> .gitignore
```

### 3.6 Submit no Play Console

```
Play Console > Releases > Production
Clica "Create release"
Upload: app-release.aab
Nome da versão: Longevify 1.0
Release notes: 
  - Versão inicial do app Longevify
  - Integração com Health Connect
  - Chat com IA
  
Clica "Review release"
Confirma tudo
Clica "Rollout to Production"
```

### 3.7 Review Google Play

**Google analisa em <24h normalmente** (raramente mais).

#### Rejection Checklist:

1. **Medical Device Disclaimer** ❌
   - Primeira frase da description: "Este app não é um dispositivo médico"
   - Se não tiver, Google rejeita automaticamente

2. **Data Justification** ❌
   - Google vai pedir: "Por que app precisa ler blood pressure?"
   - Resposta: "Para mostrar histórico de saúde e correlações com Longevify Score"
   - Se não justificar, pede mais dados

3. **Privacy Policy URL** ❌
   - Tem que ser URL ativa, não PDF
   - Acessível publicamente (não geofenced)

4. **No Health Data Mining** ❌
   - Código não pode enviar dados de saúde pra analytics/ads
   - Google verifica binário

5. **LGPD Text** ⚠️
   - Não é obrigatório no Google Play, mas recomendado na política
   - "Seus dados são armazenados com conformidade LGPD"

#### Se Rejeitar:

1. **Leia o email** (Google é menos detalhado que Apple)
2. **Play Console > Manage Releases > Fix issues**
3. **Submete novo build**
4. **Prazo**: ilimitado (mas Google pode te ignorar se não fizer nada)

### 3.8 Internal Testing (Recomendado)

```
Play Console > Releases > Internal testing
Upload AAB
Adiciona emails de tester (ex: dra.marina@longevify.com.br)
Tester recebe email com link pra testar
```

---

## 4. ESPECIFICAÇÕES DE ASSETS

### 4.1 App Icons

**iOS**:
- Tamanho: 1024x1024 px
- Formato: PNG ou PDF
- Sem transparência (fundo sólido ou gradiente)
- Sem cantos redondos (iOS arredonda automaticamente)
- Requer versões menores (512, 256, etc — Xcode redimensiona)

**Android**:
- **Legacy**: 512x512 px PNG
- **Adaptive icon** (obrigatório em Android 8+):
  - Foreground: 108x108 px (com safe zone de 72x72)
  - Background: 108x108 px (cor sólida ou padrão)
  - Google cria mask automaticamente

**Recomendação**: Cria ícone vetorial (Figma, Illustrator) e exporta em PNG em várias escalas.

### 4.2 Screenshots

**iPhone 6.7" (1290x2796)**:
1. Tela home com Longevify Score em grande
2. Gráfico de biomarcadores
3. Receita personalizada
4. Chat com IA
5. Integração HealthKit

**iPhone 5.5" (1242x2208)**:
Mesmas 5 (ou 3 mínimo)

**iPad (2732x2048)**:
Versão tablet (opcional, mas Apple adora)

**Android (1080x1920)**:
Mesmas que iPhone (Google redimensiona)

**Dicas**:
- Sem barra de status real, coloca fundo neutro
- Cada screenshot com 1-2 frases explicativas (via overlay de texto)
- Mostra features principais (Score, gráficos, IA)

### 4.3 Feature Graphic (Android)

1024x500 px PNG, com:
- Logo Longevify centralizado
- Headline: "Longevidade Personalizada"
- Subtítulo: "Com Biologia de Vanguarda"
- Cores vibrantes (match brand)
- Sem texto pequeno (visível em thumb 200x100)

---

## 5. TEXTO DE LISTING (Pronto pra Copiar)

### 5.1 Nome e Subtítulo

**App Name**: `Longevify`

**Subtitle (iOS)**: `Longevidade Personalizada`

### 5.2 Short Description (Android — 80 chars máx)

```
Longevidade Personalizada com Biologia de Vanguarda
```
(exatamente 50 chars, cabe bem)

### 5.3 Long Description (PT-BR)

**iOS e Android** (3500-4000 chars):

```
Longevify é o app de longevidade personalizada que transforma dados de saúde em plano de vida saudável.

RECURSOS PRINCIPAIS

✓ Longevify Score
Métrica 0-100 que resume sua saúde a partir de 100+ biomarcadores. Acompanhe seu score semanal.

✓ Histórico de Saúde
Integração com Apple HealthKit (iOS) e Android Health Connect. Sincronize dados de frequência cardíaca, sono, passos, pressão e muito mais.

✓ Receitas Personalizadas
Recomendações de suplementação, dieta e exercícios baseadas em seu DNA, sangue e genética. Tudo calculado por IA.

✓ Acompanhamento com Médico
Consultas trimestrais com especialista em longevidade. Acesso a relatórios detalhados.

✓ Chat Inteligente
Converse com IA especialista em longevidade. Faça perguntas sobre biomarcadores, suplementos, exercícios.

COMO FUNCIONA

1. Solicite um Painel Básico (R$349) ou Avançado (R$1.799)
2. Faça coleta de sangue em qualquer laboratório
3. Receba análises detalhadas em 7 dias
4. Acompanhe seu score e progresso no app
5. Consulte com médico para otimizar saúde

CONFORMIDADE E SEGURANÇA

⚠️ AVISO IMPORTANTE: Este app é uma ferramenta de acompanhamento de saúde e bem-estar. Não é um dispositivo médico. Não diagnóstico, não trata, não previne qualquer doença. Sempre consulte um médico licenciado antes de fazer qualquer mudança na sua saúde ou antes de iniciar suplementação.

🔒 DADOS SEGUROS
- Criptografia de ponta a ponta
- Conformidade com Lei Geral de Proteção de Dados (LGPD)
- Nunca compartilhamos dados com terceiros para publicidade
- Todos os dados são armazenados em servidores seguros

COMPATIBILIDADE

iOS 15+ e Android 12+
Funciona melhor com Apple HealthKit ou Android Health Connect

SUPORTE

Dúvidas? Acesse suporte@longevify.com.br ou https://longevify.com.br/suporte

---
Versão 1.0 — Maio 2026
```

### 5.4 Keywords (iOS — 100 chars máx)

```
longevidade, saúde, biomarcadores, bem-estar, IA, DNA, suplementos, envelhecimento, fitness
```
(exatamente 98 chars)

### 5.5 Support & Privacy URLs

```
Support: https://longevify.com.br/suporte
Privacy:  https://longevify.com.br/privacidade
Terms:    https://longevify.com.br/termos
```

**Nota**: Todas essas páginas TÊM que existir e ser atuais (sem 404). Google e Apple checam.

---

## 6. COMPLIANCE ESPECIAL — HEALTHTECH BRASIL

### 6.1 LGPD (Lei Geral de Proteção de Dados)

Seu app manipula dados de saúde. LGPD é obrigatória. Aqui tá o mínimo:

**Na Privacy Policy, inclua seção explícita**:

```
DADOS DE SAÚDE E LGPD

A Longevify está comprometida com a proteção de seus dados conforme Lei Geral de Proteção de Dados (LGPD).

1. FINALIDADES DE COLETA:
   - Calcular Longevify Score (análise de saúde)
   - Sincronizar com Apple HealthKit / Android Health Connect (seu consentimento)
   - Fornecer recomendações personalizadas (IA)
   - Acompanhamento com médico (consultas)
   - Melhorar qualidade do app (analytics — dados anônimos)

2. DADOS COLETADOS:
   - Biomarcadores (sangue): glicose, colesterol, vitaminas, hormônios, etc.
   - Dados HealthKit: frequência cardíaca, sono, passos, pressão arterial
   - Informações pessoais: nome, email, data de nascimento
   - Histórico de saúde: medicações, condições, alergias

3. COMPARTILHAMENTO:
   - Médicos da Longevify (quando consultar)
   - Provedores de infraestrutura (Supabase — dados criptografados)
   - NÃO compartilhamos com terceiros, anunciantes ou plataformas de rastreamento

4. DIREITOS DO USUÁRIO:
   - Acesso: solicite cópia de seus dados (suporte@longevify.com.br)
   - Correção: edite informações no app ou solicite
   - Exclusão: pode deletar conta e todos os dados (mas precisa de formulário)
   - Portabilidade: pode solicitar download em formato aberto

5. DATA PROTECTION OFFICER (DPO):
   Email: dpo@longevify.com.br
   (se ainda não tiver formalmente, nomeie alguém; Apple e Google pedem)

6. RETENÇÃO:
   - Dados de sangue/health: mantemos 7 anos (recado médico-legal BR)
   - Chat com IA: mantemos 3 anos (melhoria do serviço)
   - Logs técnicos: 30 dias

7. SEGURANÇA:
   - TLS 1.3 em trânsito
   - AES-256 em repouso
   - Acesso restrito a funcionários com NDA
   - Auditorias trimestrais de segurança
```

### 6.2 HealthKit (Apple) — Regras Específicas

**O que NÃO fazer** (Apple rejeita):

1. ❌ Usar dados de HealthKit para publicidade ou marketing
2. ❌ Compartilhar dados com redes sociais (Facebook Pixel, Google Analytics com health data)
3. ❌ Vender dados de saúde
4. ❌ Usar HealthKit pra calcular score de "risco" sem base científica clara
5. ❌ Escrever dados false/inacurados em HealthKit

**O que FAZER** (Apple aprova):

1. ✓ Ler dados que usuário já tem (frequência cardíaca, sono, passos)
2. ✓ Correlacionar com seu algoritmo (Longevify Score com rigor científico)
3. ✓ Mostrar insights personalizados
4. ✓ Permitir export de dados do app
5. ✓ Avisar: "Este app não é dispositivo médico"

**Privacy Manifest** (arquivo `PrivacyInfo.xcprivacy`):
```xml
<key>NSPrivacyTracking</key>
<false/>

<key>NSPrivacyCollectedDataTypes</key>
<array>
  <dict>
    <key>NSPrivacyCollectedDataType</key>
    <string>NSPrivacyCollectedDataTypeHealthKitData</string>
    <key>NSPrivacyCollectedDataTypePurposes</key>
    <array>
      <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
    </array>
    <key>NSPrivacyCollectedDataTypeLinked</key>
    <false/>
    <key>NSPrivacyCollectedDataTypeTracking</key>
    <false/>
  </dict>
</array>
```

### 6.3 Health Connect (Android) — Regras Específicas

Google é menos rígido que Apple, mas ainda valida:

1. **Declarar dados que lê**: No Health Apps Declaration, lista exatamente quais (blood pressure, glucose, heart rate, sleep, steps)
2. **Justificar cada um**: "Por que precisa desse dado?" — responde no formulário de review
3. **Não compartilhar pra ads**: Analytics anônimo OK, mas não "use health data to target ads"

### 6.4 ANS / CFM — Aplicável?

**ANS** (Agência Nacional de Saúde Suplementar): só se oferecer seguro saúde. Longevify não oferece, então não aplica.

**CFM** (Conselho Federal de Medicina): só se praticar medicina. Longevify fornece dados e recomendações, NÃO prescreve medicação ou diagnostica. Mas:

- [ ] Garante que médicos da equipe são registrados no CFM
- [ ] App avisa: "Consulte médico licenciado; este app não é conselho médico"
- [ ] Armazena prontuários de forma segura (dados do paciente)

**Nota**: Se quiser ser super safe, contata assessoria jurídica health/healthtech BR. Mas pra MVP inicial, as warnings acima são suficientes.

---

## 7. TIMELINE REALISTA

### 7.1 Fase 0: Pré-Setup (1-2 semanas)

- [ ] Inscreve em Apple Developer Program: 3-7 dias (incluindo validação)
- [ ] Inscreve em Google Play Developer: 30 min
- [ ] Cria/ativa CNPJ Longevify (se ainda não tem): 1-10 dias (depende de cartório)
- [ ] Prepara assets (icons, screenshots): 3-5 dias
- [ ] Escreve Privacy Policy com seção LGPD: 1-2 dias
- [ ] **Total**: 1-2 semanas (se CNPJ já existir, 1 semana)

### 7.2 Fase 1: Xcode + Build (2-3 dias)

- [ ] Configura certificates + provisioning profiles no Apple Developer: 1 dia
- [ ] Setup Xcode (signing, capabilities, HealthKit): 1 dia
- [ ] Build local + testa em device: 1 dia
- [ ] **Total**: 2-3 dias

### 7.3 Fase 2: App Store (5-7 dias)

- [ ] Cria app em App Store Connect: 30 min
- [ ] Preenche metadata (descrição, keywords, screenshots): 2-3 horas
- [ ] Cria Privacy Manifest: 1 hora
- [ ] Upload build + metadata: 1 hora
- [ ] **TestFlight (beta)**: 24-48 horas (testers usam, você coleta feedback)
- [ ] Submete pro review oficial: 1 dia (Apple revisa)
- [ ] **Review time**: 1-3 dias (normalmente), até 7 se tiver issue
- [ ] **Total**: 3-5 dias (se tudo passar na primeira; 7 se tiver rejeição)

### 7.4 Fase 3: Google Play (2-4 dias)

- [ ] Cria app em Play Console: 30 min
- [ ] Gera signed AAB (Android bundle): 1-2 horas
- [ ] Preenche metadata + screenshots: 2 horas
- [ ] Health Declaration form: 30 min
- [ ] **Internal testing**: 1-2 horas (testers usam)
- [ ] Submete pro production: 1 hora
- [ ] **Review time**: <24 horas normalmente, até 48 se tiver issue
- [ ] **Total**: 1-2 dias (se tudo passar na primeira; 3-4 se tiver rejeição)

### 7.5 Cronograma Completo

```
Semana 1:
  - Seg: Developer Program signup + CNPJ check
  - Ter-Qua: Assets + Privacy Policy
  - Qui-Sex: Certificates + local build

Semana 2:
  - Seg: App Store Connect setup + metadata
  - Ter: TestFlight launch
  - Qua: App Store submit
  - Qui-Sex: App Store review + eventual fixes

Semana 3:
  - Seg: App Store approved (ou rejeição + fix)
  - Ter-Qua: Play Console setup + Android build
  - Qui: Google Play submit
  - Sex: Google Play approved

RESULTADO: App ao vivo em ambas stores em ~2.5 semanas
(mais rápido se já tiver CNPJ e assets prontos)
```

---

## 8. CUSTOS (BRL)

| Item | Custo USD | Custo BRL* | Recorrência |
|------|-----------|-----------|-------------|
| Apple Developer Program | $99 | ~R$500 | Anual |
| Google Play Developer | $25 | ~R$130 | One-time |
| Push Notifications (Firebase) | $0 | Grátis | Sempre |
| Email SMTP (Resend) | $0 | Grátis (até 100/dia) | Sempre |
| Domain `.com.br` | ~$50/ano | ~R$300 | Anual |
| SSL Certificate | Incluído em domain | - | Anual |
| **TOTAL ANO 1** | **~$174** | **~R$930** | - |
| **TOTAL ANO 2+** | **~$174** | **~R$930** | - |

*Taxas atualizadas maio/2026 (1 USD = ~5 BRL aproximado)

**Nota**: Estes são os custos de infraestrutura. Você já tem Supabase, Vercel, etc pra backend.

---

## 9. TROUBLESHOOTING: Rejection Reasons Comuns

### 9.1 Apple App Store

| Motivo | Sintoma | Solução |
|--------|------|----------|
| **Privacy Manifest Missing** | "Provide NSPrivacyInfo.xcprivacy" | Cria arquivo PrivacyInfo.xcprivacy no Xcode |
| **HealthKit False Claims** | "Your app claims to measure X without validation" | Remove claims que app não pode suportar; avisa que lê HealthKit |
| **Missing Disclaimer** | "Health app must warn users" | Adiciona "Não é dispositivo médico" na descrição |
| **Broken Privacy URL** | "Link is broken or PDF" | Garante que https://longevify.com.br/privacidade retorna 200 OK, não PDF |
| **Crash on Launch** | "App crashes when opened" | Testa em dispositivo físico iOS 15-18; verifica console logs |
| **Push Notifications Not Enabled** | "App uses push but no entitlement" | Habilita "Push Notifications" em Xcode Capabilities |
| **Invalid Certificate** | "Certificate expired" | Regenera distribution certificate no Apple Developer |

### 9.2 Google Play Store

| Motivo | Sintoma | Solução |
|--------|------|----------|
| **Missing Medical Disclaimer** | "Health app must include disclaimer" | Primeira linha: "Este app não é dispositivo médico" |
| **Data Justification** | "Why does app need access to blood pressure?" | Explain: "Para mostrar histórico sincronizado com Health Connect" |
| **Privacy Policy Missing** | "No URL or link provided" | Adiciona URL pública em Play Console > Privacy policy |
| **Crashes on Android 12+** | "App not compatible" | Testa em Android 12, 13, 14 emulator |
| **Adaptive Icon Missing** | "App icon not adaptive" | Cria foreground/background separate; Google cria mask |
| **Invalid Bundle** | "AAB corrupted" | Regenera bundle com `gradle bundleRelease -clean` |
| **Content Rating Mismatch** | "You selected wrong category" | Re-submete Health & Fitness, not Medical |

### 9.3 Dicas Gerais

1. **Testa localmente ANTES de submeter**: Xcode + Android Studio emulators
2. **Usa TestFlight + Internal Testing**: Descobre 80% dos bugs antes de Apple/Google verem
3. **Lê o email de rejeição COM ATENÇÃO**: Apple e Google são bem específicos
4. **Não tenta mentir**: Se disser que funciona com HealthKit, tem que funcionar
5. **Versiona tudo**: Build #1, #2, etc — rastreia qual foi rejeitado

---

## 10. PÓS-LAUNCH: Primeiro Mês

### 10.1 Monitoramento

- [ ] Ativa Sentry / error tracking
- [ ] Monitora Crashlytics (Firebase)
- [ ] Lê reviews do App Store (responde bem)
- [ ] Responde reviews do Google Play
- [ ] Acompanha analytics (Vercel, Firebase)

### 10.2 Updates Planejados

- [ ] v1.0.1: bug fixes (7-10 dias depois de launch)
- [ ] v1.1: new features baseado em user feedback (2-4 semanas)
- [ ] v1.2: performance improvements (1 mês)

### 10.3 Renovação de Certificados

- [ ] Apple Developer ($99): renova em maio/2027
- [ ] Distribution Certificate: expira em 12 meses, regenera antes

---

## 11. CHECKLIST FINAL ANTES DE SUBMETER

### Apple App Store

- [ ] Bundle ID: `com.longevify.app`
- [ ] iOS Deployment Target: 15.0+
- [ ] HealthKit entitlement habilitado em Xcode
- [ ] Push Notifications entitlement habilitado
- [ ] PrivacyInfo.xcprivacy presente e completo
- [ ] All icons (1024x1024) exportadas
- [ ] Screenshots (1290x2796, 1242x2688) prontas
- [ ] Descrição finalizada em PT-BR
- [ ] Keywords definidas
- [ ] Privacy Policy URL ativa (HTTPS)
- [ ] Support URL ativa
- [ ] Disclaimer "Não é dispositivo médico" visível
- [ ] Versão buildada em Release mode
- [ ] Signed com distribution certificate
- [ ] Testada em device físico iOS 15+
- [ ] Nenhum console.log ou debug visible
- [ ] App Store Connect metadata 100% preenchido

### Google Play Store

- [ ] Package name: `com.longevify.app`
- [ ] Minimum SDK: API 31+ (Android 12+)
- [ ] App signed com release keystore
- [ ] AAB gerado e validado
- [ ] Feature graphic (1024x500) pronta
- [ ] Screenshots (1080x1920) prontas
- [ ] Descrição finalizada em PT-BR
- [ ] Short description <80 chars
- [ ] Health Declaration form completo
- [ ] Content rating form completo
- [ ] Privacy Policy URL ativa (HTTPS)
- [ ] Medical disclaimer no início da descrição
- [ ] Testada em Android 12/13/14 emulator
- [ ] Play Console metadata 100% preenchido
- [ ] Versão > 1.0

### Ambas Stores

- [ ] DPO email e contato definido (dpo@longevify.com.br ou similar)
- [ ] LGPD privacy policy na web
- [ ] Todos os links são HTTPS (sem HTTP)
- [ ] Nenhum link morto (404)
- [ ] Email de suporte funcional
- [ ] Brand guidelines seguidas (logo, cores, tone)
- [ ] Legal review feito (assessor legal revisou)
- [ ] CFM consulted se médicos envolvidos

---

## Referências Oficiais

### Apple
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Health & Fitness Apps](https://developer.apple.com/health-fitness/)
- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [HealthKit Protection Best Practices](https://developer.apple.com/documentation/healthkit/protecting-user-privacy)

### Google Play
- [Health & Fitness Content](https://support.google.com/googleplay/android-developer/answer/13996367)
- [Health Apps Declaration](https://support.google.com/googleplay/android-developer/answer/14738291)
- [Medical Device Labeling](https://support.google.com/googleplay/android-developer/answer/16933379)
- [Play Store Policies](https://developer.android.com/distribute/play-policies)

### Brasil / LGPD
- [Lei Geral de Proteção de Dados (LGPD)](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [ANPD Resoluções](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd/documentos/resolucoes)

---

## Suporte / Dúvidas Comuns

**P: Posso submeter em português ou preciso de English?**
A: Português é OK. Apple e Google aceitam qualquer idioma. Recomendamos ofertar English depois (v1.1+).

**P: Quanto tempo até aparecer na App Store depois de aprovado?**
A: Apple: imediato (aparece em <1 hora na store). Google: 2-4 horas.

**P: Preciso de DUNS number pra Apple?**
A: Não obrigatório. Só se Apple pedir (rare). Se pedir, Dun & Bradstreet tem serviço gratuitoou pago.

**P: Posso usar TestFlight por quanto tempo?**
A: Até 90 dias por build. Recomenda-se testar por 7-14 dias antes de submeter pro review público.

**P: Se tiver rejeição no Google, quanto tempo até poder resubmeter?**
A: Imediato. Pode submeter novo build na mesma hora.

**P: Qual iOS mínimo suportado?**
A: iOS 15.0. Apple vai exigir isso em 2026+ pra novos apps.

**P: Preciso de estatísticas de clínicas pra validar Score?**
A: Não obrigatório pra Apple/Google, mas é bom ter. Se disser na descrição que Score é baseado em 100+ biomarcadores, precisa ter validação científica (estudos, papers).

---

**Última atualização**: 2026-05-03  
**Maintainer**: Technical Writing Team  
**Próxima review**: Primeira rejeição ou 30 dias pós-launch
