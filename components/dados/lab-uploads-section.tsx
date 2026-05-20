"use client";

import {
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  Eye,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDatePtBR } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  deleteLabUpload,
  getLabUploadSignedUrl,
  reparseLabUpload,
  updateLabUpload,
  uploadLabFile,
} from "@/app/(app)/dados/lab-actions";
import type { LabUpload } from "@/lib/labs/server";

interface LabUploadsSectionProps {
  uploads: LabUpload[];
  enabled: boolean;
}

const ACCEPTED_MIME =
  "application/pdf,image/png,image/jpeg,image/heic,image/heif,image/webp";

const EXAM_KIND_OPTIONS = [
  { value: "", label: "—" },
  { value: "sangue", label: "Sangue" },
  { value: "urina", label: "Urina" },
  { value: "imagem", label: "Imagem" },
  { value: "genetico", label: "Genético" },
  { value: "outro", label: "Outro" },
];

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function LabUploadsSection({ uploads, enabled }: LabUploadsSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingUpload, startUpload] = useTransition();
  const [pendingDelete, startDelete] = useTransition();

  // Lucas (2026-05-20): "no histórico anexado, não precisa pedir data,
  // nem nada, você mesmo adiciona isso ao analisar o pdf." Antes o form
  // pedia takenAt/labName/examKind/notes — agora é zero-touch: o user
  // sobe o arquivo, a gente extrai data + laboratório via Opus 4.7
  // durante o parse.

  if (!enabled) {
    return (
      <Card className="flex flex-col gap-2 border-brand-200 bg-brand-50/40 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <Upload className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold leading-tight">
              Anexar exames antigos
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Disponível só pra usuários autenticados. Faça login pra começar a
              alimentar seu histórico.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  /**
   * Recebe FileList, valida tamanho/extensão, e dispara upload direto —
   * sem form intermediário. Data e laboratório serão extraídos pelo
   * Opus 4.7 durante o parse automático.
   */
  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.size > 20 * 1024 * 1024) {
      toast.error({
        title: "Arquivo muito grande",
        description: "Máximo 20 MB.",
      });
      return;
    }
    uploadDirectly(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function uploadDirectly(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    // Sem takenAt/labName/examKind/notes — vem do parse AI.

    startUpload(async () => {
      const r = await uploadLabFile(fd);
      if (r.ok) {
        toast.success({
          title: "Exame anexado",
          description: `${file.name} — extraindo data e biomarcadores com IA...`,
        });
        if (inputRef.current) inputRef.current.value = "";
      } else {
        toast.error({ title: "Não conseguimos enviar", description: r.error });
      }
    });
  }

  function handleDelete(id: string, fileName: string) {
    if (!window.confirm(`Apagar "${fileName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    startDelete(async () => {
      const r = await deleteLabUpload(id);
      if (r.ok) {
        toast.success({ title: "Exame removido" });
      } else {
        toast.error({ title: "Erro ao apagar", description: r.error });
      }
    });
  }

  async function handleView(id: string) {
    const r = await getLabUploadSignedUrl(id);
    if (r.ok && r.data) {
      window.open(r.data.url, "_blank", "noopener,noreferrer");
    } else {
      toast.error({
        title: "Não conseguimos gerar o link",
        description: r.ok ? "Sem URL" : r.error,
      });
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
          <Upload className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold leading-tight">
            Anexar exames antigos
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Suba PDFs ou fotos de exames anteriores. A IA extrai{" "}
            <strong className="font-semibold text-ink">
              data, laboratório e biomarcadores
            </strong>{" "}
            automaticamente — você não precisa preencher nada. Aceita PDF, PNG,
            JPG, HEIC, WEBP até 20 MB.
          </p>
        </div>
      </div>

      {/* Dropzone — upload direto, sem form de metadados.
          Lucas (2026-05-20): "no histórico anexado, não precisa pedir
          data, nem nada, você mesmo adiciona isso ao analisar o pdf." */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!pendingUpload) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !pendingUpload && inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-brand-50/30 px-6 py-8 text-center transition-colors",
          pendingUpload
            ? "cursor-wait border-brand-300 bg-brand-50/60"
            : "cursor-pointer",
          !pendingUpload && dragOver && "border-brand-400 bg-brand-50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME}
          disabled={pendingUpload}
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleFiles(e.target.files)
          }
        />
        {pendingUpload ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
            <div className="text-[14px] font-medium text-ink">
              Enviando arquivo…
            </div>
            <div className="text-[12px] text-muted">
              IA vai extrair data + biomarcadores em ~10s
            </div>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted" />
            <div className="text-[14px] font-medium text-ink">
              Arraste o arquivo aqui ou clique pra selecionar
            </div>
            <div className="text-[12px] text-muted">
              PDF, PNG, JPG, HEIC, WEBP — até 20 MB
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-brand-700">
              <Sparkles className="h-3 w-3" />
              Extração automática de data, laboratório e biomarcadores
            </div>
          </>
        )}
      </div>

      {/* Lista de uploads existentes */}
      {uploads.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-[13px] font-semibold text-ink">
            Histórico anexado ({uploads.length})
          </h3>
          <ul className="flex flex-col divide-y divide-border">
            {uploads.map((u) => (
              <UploadRow
                key={u.id}
                upload={u}
                onView={() => handleView(u.id)}
                onDelete={() => handleDelete(u.id, u.fileName)}
                pendingDelete={pendingDelete}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function UploadRow({
  upload,
  onView,
  onDelete,
  pendingDelete,
}: {
  upload: LabUpload;
  onView: () => void;
  onDelete: () => void;
  pendingDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [takenAt, setTakenAt] = useState(upload.takenAt ?? "");
  const [labName, setLabName] = useState(upload.labName ?? "");
  const [examKind, setExamKind] = useState(upload.examKind ?? "");
  const [pendingSave, startSave] = useTransition();

  function save() {
    startSave(async () => {
      const r = await updateLabUpload(upload.id, {
        takenAt: takenAt || null,
        labName: labName || null,
        examKind: examKind || null,
      });
      if (r.ok) {
        setEditing(false);
        toast.success({ title: "Atualizado" });
      } else {
        toast.error({ title: "Erro", description: r.error });
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate text-[14px] font-medium text-ink">
            {upload.fileName}
          </span>
        </div>
        {editing ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="h-8 rounded-full border border-border bg-white px-3 text-[12px]"
            />
            <input
              type="text"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="Laboratório"
              className="h-8 rounded-full border border-border bg-white px-3 text-[12px]"
            />
            <select
              value={examKind}
              onChange={(e) => setExamKind(e.target.value)}
              className="h-8 rounded-full border border-border bg-white px-3 text-[12px]"
            >
              {EXAM_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
            {upload.takenAt ? (
              <span>{formatDatePtBR(upload.takenAt)}</span>
            ) : (
              <span className="italic">sem data</span>
            )}
            {upload.labName ? <span>· {upload.labName}</span> : null}
            {upload.examKind ? <span>· {upload.examKind}</span> : null}
            <span>· {formatBytes(upload.sizeBytes)}</span>
            <ParseStatusBadge upload={upload} />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {editing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={pendingSave}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={pendingSave}>
              {pendingSave ? "..." : "Salvar"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-3.5 w-3.5" />
              Ver
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={pendingDelete}
              className="text-[#B6333A] hover:bg-[#FDECEC]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

/**
 * Badge de status do parse AI + botão "Reprocessar" quando falha ou
 * fica travado em "uploaded". Lucas (2026-05-19): "quando eu anexei
 * meu exame de sangue antigo, os dados não entraram no sistema
 * automaticamente". Status flow:
 *   uploaded   → ainda não disparou parse (trigger auto manda agora)
 *   processing → AI analisando — mostra spinner
 *   parsed     → biomarcadores extraídos com sucesso (mostra badge verde)
 *   failed     → erro no parse — mostra botão "Tentar de novo"
 */
function ParseStatusBadge({ upload }: { upload: LabUpload }) {
  const [pending, startReparse] = useTransition();

  const handleReparse = () => {
    startReparse(async () => {
      const r = await reparseLabUpload(upload.id);
      if (r.ok) {
        toast.success({
          title: "Exame processado",
          description: `${r.data?.biomarkers_extracted ?? 0} biomarcadores extraídos.`,
        });
      } else {
        toast.error({ title: "Erro ao processar", description: r.error });
      }
    });
  };

  if (pending) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-700">
        · Processando...
      </span>
    );
  }

  switch (upload.status) {
    case "parsed":
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700">
          · Analisado ✓
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 text-amber-700">
          · Analisando…
        </span>
      );
    case "failed":
      return (
        <>
          <span className="text-rose-700">· Erro no parse</span>
          <button
            type="button"
            onClick={handleReparse}
            className="text-[11.5px] font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Tentar de novo
          </button>
        </>
      );
    case "uploaded":
      return (
        <button
          type="button"
          onClick={handleReparse}
          className="text-[11.5px] font-semibold text-brand-700 underline-offset-2 hover:underline"
        >
          · Analisar com AI
        </button>
      );
    default:
      return null;
  }
}

