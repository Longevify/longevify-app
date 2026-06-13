# OpenMed self-host — Mac mini 24/7

Setup pra rodar **OpenMed PT-BR (detecção de PII em português brasileiro
incluindo CPF/CEP/RG)** num Mac mini ligado 24h, expondo via Cloudflare
Tunnel pro app Vercel consumir.

**Custo total recorrente: ~R$5/mês** (eletricidade do Mac mini idle).

## Dois caminhos — escolha um

### Caminho recomendado pra Mac mini M-series: NATIVO (sem Docker)

Roda Python direto no macOS, acelera inferência via GPU integrada (Metal
Performance Shaders / MPS). **5-10x mais rápido** que Docker porque Docker
Desktop não compartilha GPU com containers.

```bash
cd lib/openmed/docker
bash setup-mac-native.sh
```

Performance: **~100-200ms por requisição** (vs ~1s no Docker).
Porta padrão: **8765**.
Serviço: launchd (`com.longevify.openmed`), sobrevive reboot.
Sem dependência: nada de Docker Desktop.

### Caminho alternativo: Docker (Apple Silicon ou Intel)

Se preferir Docker (mais portável, mais fácil de mover pra outro host depois):

```bash
cd lib/openmed/docker
bash setup-mac-mini.sh
```

Performance: ~1s/req em Apple Silicon, ~2-3s em Intel.
Porta padrão: **8000**.
Container `openmed-longevify` com `--restart always`.
Requer Docker Desktop instalado.

## Comparação de caminhos

| Caminho | Custo/mês | Setup | Performance | Requer Docker |
|---------|-----------|-------|-------------|---------------|
| **Mac mini M-series NATIVO (MPS)** | ~R$5 (luz) | 30min | ~100-200ms/req | Não |
| Mac mini M-series Docker | ~R$5 (luz) | 30min | ~1s/req | Sim |
| Mac mini Intel Docker | ~R$5 (luz) | 30min | ~2-3s/req | Sim |
| Fly.io shared-cpu-2x | ~$5-10 USD | 15min | ~1s/req | — |
| HF Inference Endpoint dedicado | $50-1000+ USD | 5min | Excelente | — |

## Pré-requisitos

### Pra ambos os caminhos
1. **Mac mini** ligado 24h, internet sempre conectada
2. **Conta Cloudflare grátis** (https://dash.cloudflare.com/sign-up)
3. **Um domínio** — pode ser do seu projeto OU pegar grátis em https://www.is-a.dev

### Específico do nativo (`setup-mac-native.sh`)
- Apple Silicon (M1/M2/M3/M4) — o script verifica e aborta em Intel
- Homebrew (o script instala Python 3.11 se faltar)

### Específico do Docker (`setup-mac-mini.sh`)
- Docker Desktop pro Mac — https://www.docker.com/products/docker-desktop/

## Setup nativo — o que o script faz

1. Verifica que é Apple Silicon (aborta em Intel — use Docker nesse caso)
2. Instala Python 3.11 via Homebrew se faltar
3. Cria venv em `~/.openmed-longevify/`
4. Instala PyTorch 2.4.1 com suporte MPS
5. Pre-download dos modelos OpenMed (~5GB, primeira vez ~15min)
6. Gera token de auth (salvo em `~/.openmed-longevify/.token` chmod 600)
7. Cria launchd plist `com.longevify.openmed` (sobrevive reboot)
8. Carrega o serviço e smoke test do `/health`
9. Mostra próximos passos (Cloudflare Tunnel + Vercel env vars)

## Setup Docker — o que o script faz

1. Verifica Docker, arquitetura, etc.
2. Gera token de auth automaticamente (anote — vai pro Vercel)
3. Build da imagem Docker (pesa 5GB, demora ~15min na primeira vez)
4. Sobe container com `restart=always` (sobrevive a reboot do Mac)
5. Smoke test do `/health` e `/pii/extract`
6. Mostra instruções pra configurar Mac não dormir
7. Mostra passo a passo Cloudflare Tunnel

## Cloudflare Tunnel (depois do setup local)

```bash
# 1. Instalar cloudflared
brew install cloudflared

# 2. Autenticar (abre browser)
cloudflared tunnel login

# 3. Criar túnel
cloudflared tunnel create openmed-longevify

# 4. Configurar — crie ~/.cloudflared/config.yml:
cat > ~/.cloudflared/config.yml <<'EOF'
tunnel: openmed-longevify
credentials-file: /Users/SEU_USUARIO/.cloudflared/<UUID>.json
ingress:
  - hostname: openmed.seudominio.com.br
    service: http://localhost:8000
  - service: http_status:404
EOF

# 5. DNS routing
cloudflared tunnel route dns openmed-longevify openmed.seudominio.com.br

# 6. Subir como serviço (roda em background, sobrevive a reboot)
sudo cloudflared service install
sudo launchctl start com.cloudflare.cloudflared

# 7. Teste externo
curl https://openmed.seudominio.com.br/health
```

## Configurar no Vercel

Settings → Environment Variables → adicione:

```
OPENMED_API_URL=https://openmed.seudominio.com.br
OPENMED_API_TOKEN=<token gerado pelo setup-mac-mini.sh>
```

Redeploy do app. Pronto — o Concierge agora detecta CPF/CEP/RG/nomes
brasileiros em texto livre via seu Mac mini.

## Configurar Mac pra nunca dormir

System Settings:
- **Displays → Advanced** → "Prevent automatic sleeping on power adapter": ON
- **Battery (ou Energy Saver) → Options** → "Wake for network access": ON +
  "Prevent automatic sleeping when the display is off": ON

Ou via terminal:

```bash
sudo pmset -c sleep 0          # nunca dormir no AC
sudo pmset -c disksleep 0      # disco nunca dorme
sudo pmset -c womp 1           # acorda com rede
```

## Endpoints expostos

### `GET /health`
```json
{
  "status": "ok",
  "models": {
    "pii": "OpenMed/OpenMed-PII-Portuguese-SnowflakeMed-Large-568M-v1",
    "disease": "OpenMed/OpenMed-NER-DiseaseDetect-SuperClinical-434M",
    "pharma": "OpenMed/OpenMed-NER-PharmaDetect-SuperClinical-434M"
  },
  "auth_required": true
}
```

### `POST /pii/extract`
Request:
```json
{"text":"Carlos Mendes, CPF 987.654.321-00, mora em São Paulo","lang":"pt"}
```
Response:
```json
{"entities":[
  {"word":"Carlos","entity_group":"FIRSTNAME","score":0.998,"start":0,"end":6},
  {"word":"Mendes","entity_group":"LASTNAME","score":0.997,"start":7,"end":13},
  {"word":"987.654.321-00","entity_group":"CPF","score":0.995,"start":20,"end":34},
  {"word":"São Paulo","entity_group":"CITY","score":0.992,"start":44,"end":53}
]}
```

### `POST /analyze`
Request:
```json
{"text":"45yo woman with diabetes on metformin","task":"disease"}
```
Response: extrai doenças/medicamentos conforme `task`.

## Manutenção

### Caminho nativo (`setup-mac-native.sh`)

- **Status**: `launchctl list | grep com.longevify.openmed`
- **Logs**: `tail -f ~/.openmed-longevify/stdout.log`
- **Erros**: `tail -f ~/.openmed-longevify/stderr.log`
- **Stop**: `launchctl unload ~/Library/LaunchAgents/com.longevify.openmed.plist`
- **Start**: `launchctl load ~/Library/LaunchAgents/com.longevify.openmed.plist`
- **Restart**: `launchctl unload …plist && launchctl load …plist`
- **Atualizar modelos / código**: rode `bash setup-mac-native.sh` de novo. É idempotente —
  pega novas dependências, reinstala se preciso, e recarrega o serviço.
- **Desinstalar**: `launchctl unload ~/Library/LaunchAgents/com.longevify.openmed.plist`
  + `rm -rf ~/.openmed-longevify ~/Library/LaunchAgents/com.longevify.openmed.plist`

### Caminho Docker (`setup-mac-mini.sh`)

- **Logs**: `docker logs -f openmed-longevify`
- **Reiniciar**: `docker restart openmed-longevify`
- **Atualizar imagem** (a cada trimestre vale rebuild):
  ```
  cd lib/openmed/docker
  docker build -t openmed-longevify:latest .
  docker stop openmed-longevify && docker rm openmed-longevify
  docker run -d --name openmed-longevify --restart always -p 8000:8000 \
    -e OPENMED_API_TOKEN=$OPENMED_API_TOKEN openmed-longevify:latest
  ```

## Plano B se Mac cair

Internet cai, Mac trava, etc. O `lib/openmed/client.ts` tem fallback
automático: se `OPENMED_API_URL` timeout ou falhar, usa HuggingFace
gratuito (`dslim/bert-base-NER`). App continua funcionando — só perde
precisão PT-BR enquanto Mac estiver offline.

Não há urgência em redundância. Quando estiver pronto pra remover SPOF,
spin-up Fly.io ($5/mês) como secondary.

## LGPD compliance

O Mac mini processa **dados sensíveis** (texto livre de paciente com
possível PII). Como você é controlador da Longevify e o servidor é
físico no seu controle:

- ✅ Liste o Mac mini como **subprocessador interno** em /subprocessadores
- ✅ Mantenha o Mac em local físico seguro (não emprestado, não compartilhado)
- ✅ Backup criptografado se houver persistência de dados (esse container
  é stateless — não armazena nada, só processa e devolve)
- ✅ Cloudflare Tunnel já cuida do HTTPS (TLS termina no Cloudflare)

## Licença dos modelos

Todos os modelos OpenMed são **Apache 2.0** — uso comercial liberado
sem royalty. Mantida atribuição em README.
