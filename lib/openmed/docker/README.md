# OpenMed self-host — Mac mini 24/7

Setup pra rodar **OpenMed PT-BR (detecção de PII em português brasileiro
incluindo CPF/CEP/RG)** num Mac mini ligado 24h, expondo via Cloudflare
Tunnel pro app Vercel consumir.

**Custo total recorrente: ~R$5/mês** (eletricidade do Mac mini idle).

## Por que Mac mini self-host vs cloud paga

| Caminho | Custo/mês | Setup | Performance |
|---------|-----------|-------|-------------|
| **Mac mini M-series + Cloudflare Tunnel** | ~R$5 (eletricidade) | 60min | Excelente (<1s/req nativo MLX) |
| Mac mini Intel + Cloudflare Tunnel | ~R$5 (eletricidade) | 60min | OK (~2-3s/req) |
| Fly.io shared-cpu-2x | ~$5-10 USD (~R$25-50) | 15min | Bom (~1s/req) |
| HuggingFace Inference Endpoint dedicado | $50-1000+ USD | 5min | Excelente |

## Pré-requisitos

1. **Mac mini** (qualquer ano, Apple Silicon preferível)
2. **Docker Desktop pro Mac** — https://www.docker.com/products/docker-desktop/
3. **Internet sempre conectada** no Mac (Wi-Fi ou cabo)
4. **Conta Cloudflare grátis** (https://dash.cloudflare.com/sign-up)
5. **Um domínio** — pode ser do seu projeto OU pegar grátis em https://www.is-a.dev

## Setup rápido (script automatizado)

```bash
cd lib/openmed/docker
bash setup-mac-mini.sh
```

O script faz:
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
