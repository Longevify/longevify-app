#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenMed Longevify — bootstrap em Mac mini 24/7
# ─────────────────────────────────────────────────────────────────────────────
#
# O que faz:
#   1. Verifica pré-requisitos (Docker Desktop, brew, arquitetura)
#   2. Build da imagem Docker (com pre-download de pesos ~5GB)
#   3. Run do container com restart=always
#   4. Configura System Settings pra Mac não dormir (manual prompt)
#   5. Smoke test do /health
#   6. Gera token de auth aleatório se você não fornecer
#   7. Imprime instruções de Cloudflare Tunnel
#
# Uso:
#   cd lib/openmed/docker
#   bash setup-mac-mini.sh
#
# Idempotente: rode quantas vezes quiser. Vai usar imagem cached se já
# tiver buildado, e remove container antigo antes de subir novo.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

CONTAINER_NAME="openmed-longevify"
IMAGE_TAG="openmed-longevify:latest"
PORT=8000

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red() { printf "\033[31m%s\033[0m\n" "$*"; }

step() { echo; bold "▶ $*"; }

# ─── 1. Pré-requisitos ──────────────────────────────────────────────────────

step "1/7 — Verificando pré-requisitos"

ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
  green "  Arquitetura: Apple Silicon (ARM64) — inferência será nativa e rápida"
elif [[ "$ARCH" == "x86_64" ]]; then
  yellow "  Arquitetura: Intel (x86_64) — funciona mas inferência ~2x mais lenta"
else
  red "  Arquitetura $ARCH não testada. Pode funcionar."
fi

if ! command -v docker >/dev/null 2>&1; then
  red "  Docker não encontrado. Instale Docker Desktop pro Mac:"
  echo "    https://www.docker.com/products/docker-desktop/"
  echo "    Depois rode esse script de novo."
  exit 1
fi
green "  Docker instalado: $(docker --version)"

if ! docker info >/dev/null 2>&1; then
  red "  Docker não está rodando. Abra Docker Desktop e rode esse script de novo."
  exit 1
fi
green "  Docker rodando"

# ─── 2. Token de auth ──────────────────────────────────────────────────────

step "2/7 — Token de auth"

if [[ -z "${OPENMED_API_TOKEN:-}" ]]; then
  OPENMED_API_TOKEN=$(openssl rand -hex 32)
  yellow "  Token gerado automaticamente. ANOTE — você vai precisar setar no Vercel:"
  echo
  echo "    OPENMED_API_TOKEN=$OPENMED_API_TOKEN"
  echo
else
  green "  Token fornecido via env OPENMED_API_TOKEN"
fi

# ─── 3. Build da imagem ─────────────────────────────────────────────────────

step "3/7 — Build da imagem Docker (pode levar 10-15 min na primeira vez)"
echo "  Inclui download de ~5GB de modelos OpenMed."
echo

docker build -t "$IMAGE_TAG" . || {
  red "  Build falhou. Veja erro acima."
  exit 1
}
green "  Imagem buildada: $IMAGE_TAG"

# ─── 4. Run do container ─────────────────────────────────────────────────────

step "4/7 — Subindo container"

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  yellow "  Container '${CONTAINER_NAME}' já existe. Removendo pra subir nova versão..."
  docker rm -f "$CONTAINER_NAME" >/dev/null
fi

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart always \
  -p "${PORT}:8000" \
  -e OPENMED_API_TOKEN="$OPENMED_API_TOKEN" \
  "$IMAGE_TAG" >/dev/null

green "  Container subindo. Aguardando ficar saudável (~30s)..."

# ─── 5. Smoke test ─────────────────────────────────────────────────────────

step "5/7 — Smoke test"

for i in {1..30}; do
  if curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    red "  Container não respondeu em 60s. Veja logs:"
    echo "    docker logs $CONTAINER_NAME"
    exit 1
  fi
done

green "  /health respondeu OK"
echo
echo "  Resposta:"
curl -s "http://localhost:${PORT}/health" | python3 -m json.tool | sed 's/^/    /'

echo
echo "  Teste de /pii/extract:"
curl -s -X POST "http://localhost:${PORT}/pii/extract" \
  -H "Authorization: Bearer $OPENMED_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Carlos Mendes, CPF 987.654.321-00, mora em São Paulo"}' \
  | python3 -m json.tool 2>/dev/null | sed 's/^/    /' || echo "    (sem entidades — modelo carregando, tente de novo em 30s)"

# ─── 6. System Settings — não dormir ───────────────────────────────────────

step "6/7 — Configurar Mac mini pra não dormir"

cat <<'EOF'
  Abra System Settings no Mac mini e ajuste:

    Displays  → Advanced     → "Prevent automatic sleeping on power adapter": ON
    Battery   → Options      → "Wake for network access": ON
                             → "Prevent automatic sleeping when the display is off": ON
    Network   → garantir Wi-Fi ou Ethernet sempre conectado

  Ou via terminal (rode como sudo):

    sudo pmset -c sleep 0          # nunca dormir no AC
    sudo pmset -c disksleep 0      # disco nunca dorme
    sudo pmset -c womp 1           # acorda com rede

EOF

# ─── 7. Cloudflare Tunnel — instruções ────────────────────────────────────

step "7/7 — Próximo passo: expor pra internet via Cloudflare Tunnel"

cat <<EOF
  O container está rodando em http://localhost:${PORT} — agora precisa expor
  pra o Vercel chamar de fora.

  Opção recomendada: Cloudflare Tunnel (gratuito, sem cartão, sem IP fixo)

    1. Crie conta grátis em https://dash.cloudflare.com/sign-up
    2. Adicione um domínio (pode ser um que você já tem, ou pegue grátis
       em https://www.freenom.com ou https://www.is-a.dev)
    3. Instale o cloudflared:

         brew install cloudflared

    4. Autentique:

         cloudflared tunnel login

    5. Crie o túnel:

         cloudflared tunnel create openmed-longevify

    6. Crie ~/.cloudflared/config.yml com:

         tunnel: openmed-longevify
         credentials-file: /Users/${USER}/.cloudflared/<UUID>.json
         ingress:
           - hostname: openmed.seudominio.com.br
             service: http://localhost:${PORT}
           - service: http_status:404

    7. Aponte DNS:

         cloudflared tunnel route dns openmed-longevify openmed.seudominio.com.br

    8. Suba o túnel como serviço (vai rodar em background sempre):

         sudo cloudflared service install
         sudo launchctl start com.cloudflare.cloudflared

    9. Teste do seu telefone:

         curl https://openmed.seudominio.com.br/health

   10. Configure no Vercel:

         Settings → Environment Variables → adicione:

           OPENMED_API_URL=https://openmed.seudominio.com.br
           OPENMED_API_TOKEN=$OPENMED_API_TOKEN

   11. Redeploy do app no Vercel (Settings → Deployments → Redeploy).

EOF

green "Setup local concluído ✅"
echo
echo "Container: $(docker ps --filter "name=$CONTAINER_NAME" --format '{{.Status}}')"
echo "Logs:      docker logs -f $CONTAINER_NAME"
echo "Restart:   docker restart $CONTAINER_NAME"
echo "Stop:      docker stop $CONTAINER_NAME"
