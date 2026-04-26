"use client";

import { useState } from "react";
import { Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MedicalEntity } from "@/lib/openmed/client";

interface ExtractionResult {
  diseases: MedicalEntity[];
  medications: MedicalEntity[];
  pii: MedicalEntity[];
}

interface MedicalExtractorProps {
  /** Texto inicial (ex: vindo de um histórico médico salvo) */
  initialText?: string;
  className?: string;
  placeholder?: string;
}

/**
 * Free-text input com extração automática via OpenMed.
 * Útil em /perfil ("conte sua história médica") e /admin (texto do laudo).
 *
 * Quando o user digita um parágrafo e clica "Analisar", batemos no
 * /api/medical-nlp/extract e mostramos as entidades estruturadas embaixo.
 */
export function MedicalExtractor({
  initialText = "",
  className,
  placeholder,
}: MedicalExtractorProps) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/medical-nlp/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: "pt" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Erro desconhecido");
        return;
      }
      setResult(data as ExtractionResult);
    } catch {
      setError("Falha de rede ao chamar o analisador.");
    } finally {
      setLoading(false);
    }
  }

  const totalFound = result
    ? result.diseases.length + result.medications.length + result.pii.length
    : 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="rounded-2xl border border-border bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">
            Análise médica via OpenMed
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            placeholder ??
            "Conte sua história médica em texto livre. Ex: \"tomo losartana 50mg pra hipertensão e atorvastatina 20mg. Alergia a dipirona. Mãe teve infarto aos 60.\""
          }
          rows={5}
          className="w-full resize-y rounded-xl border border-border bg-brand-50/30 px-3 py-2 text-[14px] leading-relaxed text-ink outline-none placeholder:text-muted/70 focus:border-brand-400 focus:bg-white"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted">
            Modelos OpenMed (Apache 2.0) via HuggingFace · multilíngue
          </span>
          <Button
            onClick={analyze}
            disabled={loading || !text.trim()}
            size="sm"
            variant="primary"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analisando…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Analisar com OpenMed
              </>
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="flex items-start gap-2 border-[#FBE1E1] bg-[#FDECEC] p-3 text-[13px] text-[#B6333A]">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <div>
            <strong>Não foi possível analisar.</strong> {error}
          </div>
        </Card>
      ) : null}

      {result ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <EntityGroup
            title="Doenças & condições"
            entities={result.diseases}
            empty="Nenhuma condição mencionada"
            color="bg-[#FBE7D1] text-[#A85A1B]"
          />
          <EntityGroup
            title="Medicações"
            entities={result.medications}
            empty="Nenhum medicamento mencionado"
            color="bg-[#DFF5E9] text-[#0E7B45]"
          />
          <EntityGroup
            title="Dados sensíveis (PII)"
            entities={result.pii}
            empty="Nenhum dado pessoal detectado"
            color="bg-[#E7ECFD] text-[#3B44C2]"
          />
        </div>
      ) : null}

      {result && totalFound === 0 ? (
        <p className="text-[12px] text-muted">
          O modelo não encontrou entidades específicas. Tente um texto mais
          detalhado ou em português.
        </p>
      ) : null}
    </div>
  );
}

function EntityGroup({
  title,
  entities,
  empty,
  color,
}: {
  title: string;
  entities: MedicalEntity[];
  empty: string;
  color: string;
}) {
  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
          {title}
        </h4>
        <span className="text-[11px] text-muted">{entities.length}</span>
      </div>
      {entities.length === 0 ? (
        <p className="text-[12px] text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {entities.map((e, i) => (
            <li
              key={`${e.start}-${i}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium",
                color,
              )}
              title={`${e.label} · ${(e.confidence * 100).toFixed(0)}%`}
            >
              {e.text}
              <span className="text-[9.5px] opacity-70">
                {(e.confidence * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
