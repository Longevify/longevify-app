"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamUploadStepProps {
  fileName?: string;
  lab?: string;
  collectionDate?: string;
  onChange: (data: {
    fileName?: string;
    lab?: string;
    collectionDate?: string;
  }) => void;
}

export function ExamUploadStep({
  fileName,
  lab,
  collectionDate,
  onChange,
}: ExamUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(f: File | null | undefined) {
    if (!f) return;
    onChange({ fileName: f.name, lab, collectionDate });
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          handleFile(f);
        }}
        className={cn(
          "flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed bg-surface p-6 text-center transition-colors",
          dragOver
            ? "border-brand-500 bg-brand-50/50"
            : "border-border",
        )}
      >
        {fileName ? (
          <div className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-border bg-white px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">
                  {fileName}
                </div>
                <div className="text-[11px] text-muted">
                  PDF anexado (mock — o arquivo não é enviado na Wave 1).
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({ fileName: undefined, lab, collectionDate })
              }
              className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink"
              aria-label="Remover arquivo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[14px] font-medium">
                Arraste o PDF do exame aqui
              </div>
              <div className="text-[12px] text-muted">
                Ou clique para selecionar. Tamanho máximo 25 MB.
              </div>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-9 items-center rounded-full border border-border bg-white px-4 text-[13px] font-medium hover:bg-brand-50/70"
            >
              Selecionar arquivo
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px]">
          <span className="font-medium text-ink">Laboratório</span>
          <input
            type="text"
            value={lab ?? ""}
            onChange={(e) =>
              onChange({ fileName, lab: e.target.value, collectionDate })
            }
            placeholder="Ex: DASA, Fleury, Sabin…"
            className="h-10 rounded-full border border-border bg-white px-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px]">
          <span className="font-medium text-ink">Data da coleta</span>
          <input
            type="date"
            value={collectionDate ?? ""}
            onChange={(e) =>
              onChange({ fileName, lab, collectionDate: e.target.value })
            }
            className="h-10 rounded-full border border-border bg-white px-4 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </label>
      </div>
    </div>
  );
}
