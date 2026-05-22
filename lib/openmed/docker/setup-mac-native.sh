#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenMed Longevify — Setup NATIVO no Mac Apple Silicon (sem Docker)
# ─────────────────────────────────────────────────────────────────────────────
#
# Por que nativo em vez de Docker?
#   Docker Desktop pro Mac usa virtualização e NÃO compartilha o GPU Metal
#   com o container. Rodando Python nativo no macOS, o PyTorch detecta MPS
#   (Metal Performance Shaders) e acelera a inferência via GPU integrada.
#
#   Resultado: ~100-200ms por requisição vs ~1s no Docker. 5-10x mais rápido.
#
# O que faz:
#   1. Verifica que é Apple Silicon
#   2. Instala Python 3.11 via Homebrew se faltar
#   3. Cria venv em ~/.openmed-longevify/
#   4. Instala dependências (PyTorch com MPS support)
#   5. Pre-download dos modelos OpenMed
#   6. Cria launchd plist pra rodar como serviço (sobrevive reboot)
#   7. Carrega o serviço e faz smoke test
#
# Uso:
#   cd lib/openmed/docker
#   bash setup-mac-native.sh
#
# Idempotente.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

INSTALL_DIR="$HOME/.openmed-longevify"
SERVICE_NAME="com.longevify.openmed"
PORT=8765  # porta padrão diferente do Docker (8000) pra coexistirem se quiser
LAUNCHD_PLIST="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red() { printf "\033[31m%s\033[0m\n" "$*"; }

step() { echo; bold "▶ $*"; }

# ─── 1. Verificar Apple Silicon ─────────────────────────────────────────────

step "1/7 — Verificando Apple Silicon"

ARCH=$(uname -m)
if [[ "$ARCH" != "arm64" ]]; then
  red "  Este script é específico pra Apple Silicon (M1/M2/M3/M4)."
  red "  Sua arquitetura é $ARCH. Use setup-mac-mini.sh (Docker) em vez disso."
  exit 1
fi
green "  Apple Silicon detectado ✓"

# ─── 2. Python 3.11 ─────────────────────────────────────────────────────────

step "2/7 — Verificando Python 3.11"

if ! command -v python3.11 >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    red "  Homebrew não encontrado. Instale: https://brew.sh/"
    exit 1
  fi
  yellow "  Python 3.11 não encontrado. Instalando via Homebrew..."
  brew install python@3.11
fi
green "  Python 3.11: $(python3.11 --version)"

# ─── 3. Venv ─────────────────────────────────────────────────────────────────

step "3/7 — Criando ambiente virtual em $INSTALL_DIR"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [[ ! -d venv ]]; then
  python3.11 -m venv venv
  green "  venv criado"
else
  green "  venv já existe — reusando"
fi

# shellcheck source=/dev/null
source venv/bin/activate

# ─── 4. Dependências ────────────────────────────────────────────────────────

step "4/7 — Instalando dependências (PyTorch com MPS support)"

# PyTorch 2.4+ tem suporte nativo a MPS no Apple Silicon
pip install --upgrade pip --quiet
pip install --quiet \
    "fastapi==0.115.0" \
    "uvicorn[standard]==0.30.6" \
    "transformers==4.45.2" \
    "torch==2.4.1" \
    "pydantic==2.9.2"

green "  Dependências instaladas"

python3 -c "import torch; print('  MPS available:', torch.backends.mps.is_available())"
python3 -c "import torch; print('  MPS built:', torch.backends.mps.is_built())"

# ─── 5. Copiar app.py + criar app-native.py (com MPS) ──────────────────────

step "5/7 — Copiando app.py (versão MPS-accelerated)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cat > "$INSTALL_DIR/app.py" <<'PYEOF'
"""
OpenMed Longevify — versão NATIVA Apple Silicon com Metal/MPS acceleration.

Detecta MPS automaticamente via torch.backends.mps.is_available(). Quando
disponível (Apple Silicon M1+), move o modelo pro device MPS — inferência
acelerada via GPU integrada Metal. Fallback transparente pra CPU.

Endpoints idênticos ao container Docker: /health, /pii/extract, /analyze.
"""
import os
import torch
from functools import lru_cache
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

PII_MODEL = os.getenv(
    "PII_MODEL",
    "OpenMed/OpenMed-PII-Portuguese-SnowflakeMed-Large-568M-v1",
)
DISEASE_MODEL = os.getenv(
    "DISEASE_MODEL",
    "OpenMed/OpenMed-NER-DiseaseDetect-SuperClinical-434M",
)
PHARMA_MODEL = os.getenv(
    "PHARMA_MODEL",
    "OpenMed/OpenMed-NER-PharmaDetect-SuperClinical-434M",
)
AUTH_TOKEN = os.getenv("OPENMED_API_TOKEN", "").strip() or None

# Detecta GPU Metal (Apple Silicon) — speedup ~5-10x vs CPU
USE_MPS = torch.backends.mps.is_available() and torch.backends.mps.is_built()
DEVICE = "mps" if USE_MPS else "cpu"

app = FastAPI(title="OpenMed Longevify (Native)", version="1.0.0")


@lru_cache(maxsize=4)
def load_pipeline(model_id: str):
    tok = AutoTokenizer.from_pretrained(model_id)
    mdl = AutoModelForTokenClassification.from_pretrained(model_id)
    if USE_MPS:
        mdl = mdl.to(DEVICE)
    return pipeline(
        "token-classification",
        model=mdl,
        tokenizer=tok,
        aggregation_strategy="simple",
        device=DEVICE if USE_MPS else -1,
    )


def check_auth(request: Request) -> None:
    if AUTH_TOKEN is None:
        return
    header = request.headers.get("authorization", "")
    if not header.startswith("Bearer ") or header[7:].strip() != AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="invalid token")


class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    lang: Literal["pt", "en"] = "pt"


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    task: Literal["disease", "pharma", "pii"] = "pii"


def to_entity(e: dict) -> dict:
    return {
        "word": e.get("word", ""),
        "entity_group": str(e.get("entity_group", "")).upper(),
        "score": float(e.get("score", 0.0)),
        "start": int(e.get("start", 0)),
        "end": int(e.get("end", 0)),
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "device": DEVICE,
        "mps_accelerated": USE_MPS,
        "models": {
            "pii": PII_MODEL,
            "disease": DISEASE_MODEL,
            "pharma": PHARMA_MODEL,
        },
        "auth_required": AUTH_TOKEN is not None,
    }


@app.post("/pii/extract")
def pii_extract(payload: ExtractRequest, request: Request):
    check_auth(request)
    pipe = load_pipeline(PII_MODEL)
    raw = pipe(payload.text)
    return {"entities": [to_entity(e) for e in raw]}


@app.post("/analyze")
def analyze(payload: AnalyzeRequest, request: Request):
    check_auth(request)
    model_by_task = {
        "disease": DISEASE_MODEL,
        "pharma": PHARMA_MODEL,
        "pii": PII_MODEL,
    }
    model_id = model_by_task[payload.task]
    pipe = load_pipeline(model_id)
    raw = pipe(payload.text)
    return {"entities": [to_entity(e) for e in raw], "model": model_id}
PYEOF

green "  app.py copiado"

# ─── 6. Token de auth ─────────────────────────────────────────────────────────

step "6/7 — Gerando token de auth"

TOKEN_FILE="$INSTALL_DIR/.token"
if [[ -z "${OPENMED_API_TOKEN:-}" ]]; then
  if [[ -f "$TOKEN_FILE" ]]; then
    OPENMED_API_TOKEN=$(cat "$TOKEN_FILE")
    green "  Token existente carregado de $TOKEN_FILE"
  else
    OPENMED_API_TOKEN=$(openssl rand -hex 32)
    echo "$OPENMED_API_TOKEN" > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"
    yellow "  Token gerado e salvo em $TOKEN_FILE (modo 600)"
  fi
fi

# ─── 7. launchd plist + smoke test ──────────────────────────────────────────

step "7/7 — Configurando como serviço (launchd) — sobrevive a reboot"

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$LAUNCHD_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${SERVICE_NAME}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/venv/bin/uvicorn</string>
    <string>app:app</string>
    <string>--host</string>
    <string>0.0.0.0</string>
    <string>--port</string>
    <string>${PORT}</string>
    <string>--workers</string>
    <string>1</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${INSTALL_DIR}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>OPENMED_API_TOKEN</key>
    <string>${OPENMED_API_TOKEN}</string>
    <key>HF_HOME</key>
    <string>${INSTALL_DIR}/cache</string>
    <key>TRANSFORMERS_CACHE</key>
    <string>${INSTALL_DIR}/cache</string>
    <key>HF_HUB_DISABLE_TELEMETRY</key>
    <string>1</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${INSTALL_DIR}/stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${INSTALL_DIR}/stderr.log</string>
</dict>
</plist>
EOF

# Recarrega serviço (idempotente)
launchctl unload "$LAUNCHD_PLIST" 2>/dev/null || true
launchctl load "$LAUNCHD_PLIST"

green "  Serviço $SERVICE_NAME carregado"
echo "  Logs em: $INSTALL_DIR/{stdout,stderr}.log"

# Aguarda servidor subir + primeiro modelo carregar
echo "  Aguardando servidor responder (modelos baixam ~5GB na 1ª vez — pode levar 10-15 min)..."
for i in {1..180}; do
  if curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 5
  if [[ $((i % 12)) -eq 0 ]]; then
    echo "    ainda baixando modelos... (${i}/180)"
  fi
  if [[ $i -eq 180 ]]; then
    red "  Não respondeu em 15min. Veja logs:"
    echo "    tail -f $INSTALL_DIR/stderr.log"
    exit 1
  fi
done

green "  Servidor respondendo ✓"
echo
echo "  /health:"
curl -s "http://localhost:${PORT}/health" | python3 -m json.tool | sed 's/^/    /'

# ─── Final ───────────────────────────────────────────────────────────────────

cat <<EOF

$(bold "Setup nativo concluído ✅")

  Serviço:     launchctl list | grep ${SERVICE_NAME}
  Endpoint:    http://localhost:${PORT}
  Token:       $OPENMED_API_TOKEN
               (também salvo em $TOKEN_FILE)

$(bold "Próximo passo: expor pra internet via Cloudflare Tunnel")

    brew install cloudflared
    cloudflared tunnel login
    cloudflared tunnel create openmed-longevify

  Configure ~/.cloudflared/config.yml:

    tunnel: openmed-longevify
    credentials-file: /Users/${USER}/.cloudflared/<UUID>.json
    ingress:
      - hostname: openmed.seudominio.com.br
        service: http://localhost:${PORT}
      - service: http_status:404

    cloudflared tunnel route dns openmed-longevify openmed.seudominio.com.br
    sudo cloudflared service install

$(bold "No Vercel longevify-app — Environment Variables:")

    OPENMED_API_URL=https://openmed.seudominio.com.br
    OPENMED_API_TOKEN=$OPENMED_API_TOKEN

  Redeploy do app.

$(bold "Comandos úteis:")

  Status:     launchctl list | grep ${SERVICE_NAME}
  Stop:       launchctl unload $LAUNCHD_PLIST
  Start:      launchctl load $LAUNCHD_PLIST
  Restart:    launchctl unload $LAUNCHD_PLIST && launchctl load $LAUNCHD_PLIST
  Logs:       tail -f $INSTALL_DIR/stdout.log
  Errors:     tail -f $INSTALL_DIR/stderr.log
  Test:       curl -H "Authorization: Bearer \$(cat $TOKEN_FILE)" \\
                -H "Content-Type: application/json" \\
                -d '{"text":"Carlos CPF 987.654.321-00"}' \\
                http://localhost:${PORT}/pii/extract

EOF
