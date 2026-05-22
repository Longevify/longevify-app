# OpenMed self-host pro Longevify
#
# Suporta tanto Apple Silicon (ARM64) quanto Intel (AMD64) automaticamente —
# python:3.11-slim tem builds nativos pra ambas arquiteturas.
#
# Hardware mínimo: 4GB RAM, 2 vCPU. Em Mac mini M-series, inferência <1s.
# Em Mac mini Intel, ~2-3s por requisição.
#
# Build (local):
#   docker build -t openmed-longevify .
# Run (local):
#   docker run -d --name openmed --restart always -p 8000:8000 openmed-longevify
# Health check:
#   curl http://localhost:8000/health

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/cache/hf \
    TRANSFORMERS_CACHE=/cache/hf \
    HF_HUB_DISABLE_TELEMETRY=1

WORKDIR /app

# Build deps mínimos: curl pra healthcheck, build-essential pra wheels
# nativos quando pip não tem ARM64 prebuild (raro hoje, mas seguro).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Pre-download dos pesos durante build → cold start fica rápido em produção
# (modelo já no /cache/hf quando container subir).
# Modelos: PT-BR PII (568M, ~2.3GB), Disease 434M, Pharma 434M.
ARG PII_MODEL=OpenMed/OpenMed-PII-Portuguese-SnowflakeMed-Large-568M-v1
ARG DISEASE_MODEL=OpenMed/OpenMed-NER-DiseaseDetect-SuperClinical-434M
ARG PHARMA_MODEL=OpenMed/OpenMed-NER-PharmaDetect-SuperClinical-434M
RUN python -c "from transformers import AutoTokenizer, AutoModelForTokenClassification; \
    [ (AutoTokenizer.from_pretrained(m), AutoModelForTokenClassification.from_pretrained(m)) \
      for m in ['${PII_MODEL}', '${DISEASE_MODEL}', '${PHARMA_MODEL}'] ]"

COPY app.py .

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# 1 worker apenas — modelos pesados, mais workers duplicam RAM. Pra mais
# throughput, escale com docker compose + multiple containers.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
