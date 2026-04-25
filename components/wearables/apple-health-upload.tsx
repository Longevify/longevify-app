"use client";

import { CheckCircle2, FileWarning, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseAppleHealthXML } from "@/lib/apple-health-parser";
import type { DailyHealthMetrics } from "@/lib/wearables-mock";

type UploadState =
  | { kind: "idle" }
  | { kind: "parsing"; name: string }
  | { kind: "ok"; name: string; count: number; days: number }
  | { kind: "empty"; name: string }
  | { kind: "error"; message: string };

export function AppleHealthUpload({
  onParsed,
}: {
  onParsed?: (metrics: DailyHealthMetrics[]) => void;
}) {
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setState({ kind: "parsing", name: file.name });
    try {
      const text = await file.text();
      const parsed = parseAppleHealthXML(text);
      if (!parsed.length) {
        setState({ kind: "empty", name: file.name });
        return;
      }
      onParsed?.(parsed);
      setState({
        kind: "ok",
        name: file.name,
        count: parsed.reduce(
          (acc, d) => acc + (d.steps > 0 ? 1 : 0) + (d.sleepMinutes > 0 ? 1 : 0),
          0,
        ),
        days: parsed.length,
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Falha ao ler o arquivo",
      });
    }
  }

  return (
    <Card className="flex flex-col gap-4 border-dashed bg-brand-50/40 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-900 text-white">
          <Upload className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="text-[15px] font-semibold">
            Upload do export do Apple Health
          </div>
          <p className="mt-1 text-[13px] text-muted">
            No iPhone: Saúde {">"} foto do seu perfil {">"} Exportar Todos os Dados.
            Descompacte o arquivo ZIP e envie o <span className="font-mono">export.xml</span>.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xml,application/xml,text/xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={state.kind === "parsing"}
        >
          {state.kind === "parsing" ? "Processando..." : "Selecionar arquivo XML"}
        </Button>
        <span className="text-[12px] text-muted">
          Processado localmente no navegador — nada é enviado para o servidor.
        </span>
      </div>

      <Feedback state={state} />
    </Card>
  );
}

function Feedback({ state }: { state: UploadState }) {
  if (state.kind === "idle") return null;
  if (state.kind === "parsing") {
    return (
      <div className="text-[13px] text-muted">
        Analisando <span className="font-mono">{state.name}</span>... arquivos
        grandes podem demorar alguns segundos.
      </div>
    );
  }
  if (state.kind === "ok") {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-[#DFF5E9] px-3 py-2 text-[13px] text-[#0E7B45]">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-medium">Arquivo processado</div>
          <div>
            {state.days} dias de métricas extraídos de{" "}
            <span className="font-mono">{state.name}</span>.
          </div>
        </div>
      </div>
    );
  }
  if (state.kind === "empty") {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-[#FBF0D4] px-3 py-2 text-[13px] text-[#8A6A13]">
        <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          Nenhum registro reconhecido em{" "}
          <span className="font-mono">{state.name}</span>. Confirme que é o{" "}
          <span className="font-mono">export.xml</span> original do Apple Health.
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-xl bg-[#FBE1E1] px-3 py-2 text-[13px] text-[#B6333A]">
      <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-medium">Erro ao processar</div>
        <div>{state.message}</div>
      </div>
    </div>
  );
}
