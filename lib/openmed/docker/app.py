"""
OpenMed self-host pro Longevify — FastAPI service.

Expõe NER médico via 3 endpoints:
  GET  /health                  → {status, models, auth_required}
  POST /pii/extract  {text}     → {entities: [{word, entity_group, score, start, end}]}
  POST /analyze      {text,task}→ entities pro modelo escolhido
                                  task ∈ "disease" | "pharma" | "pii"

O cliente TypeScript em `lib/openmed/client.ts` chama esses endpoints quando
a env var `OPENMED_API_URL` está setada no app Vercel. Sem URL, app usa
fallback HuggingFace Inference (modelos em inglês via HF gratuito).

Auth opcional: setar `OPENMED_API_TOKEN` no container — requests sem
header `Authorization: Bearer <token>` retornam 401. Recomendado em
produção, mesmo com Cloudflare Tunnel no meio.
"""

import os
from functools import lru_cache
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

# Modelos default — sobrescreve via env se quiser experimentar variantes
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

app = FastAPI(title="OpenMed Longevify", version="1.0.0")


@lru_cache(maxsize=4)
def load_pipeline(model_id: str):
    """
    Carrega pipeline NER. Cacheado por model_id — modelo só é carregado
    1x na vida do container. Em Apple Silicon, transformers usa CPU nativo
    automaticamente; se torch detectar MPS (Metal), usa GPU integrada.
    """
    tok = AutoTokenizer.from_pretrained(model_id)
    mdl = AutoModelForTokenClassification.from_pretrained(model_id)
    return pipeline(
        "token-classification",
        model=mdl,
        tokenizer=tok,
        aggregation_strategy="simple",
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
