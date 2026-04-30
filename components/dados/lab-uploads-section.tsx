"use client";

import { useRef, useState, useTransition, type ChangeEvent, type DragEvent } from "react";
import {
  Calendar,
  Eye,
  FileText,
  Loader2,
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
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [takenAt, setTakenAt] = useState("");
  const [labName, setLabName] = useState("");
  const [examKind, setExamKind] = useState("");
  const [notes, setNotes] = useState("");

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
    setDraftFile(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function clearDraft() {
    setDraftFile(null);
    setTakenAt("");
    setLabName("");
    setExamKind("");
    setNotes("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function submit() {
    if (!draftFile) return;
    const fd = new FormData();
    fd.append("file", draftFile);
    fd.append("takenAt", takenAt);
    fd.append("labName", labName);
    fd.append("examKind", examKind);
    fd.append("notes", notes);

    startUpload(async () => {
      const r = await uploadLabFile(fd);
      if (r.ok) {
        toast.success({
          title: "Exame anexado",
          description: `${draftFile.name} salvo no seu histórico.`,
        });
        clearDraft();
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
            Suba PDFs ou fotos de exames anteriores — quanto mais histórico, mais
            preciso fica o Concierge IA. Aceita PDF, PNG, JPG, HEIC, WEBP até 20 MB.
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-brand-50/30 px-6 py-8 text-center transition-colors cursor-pointer",
          dragOver && "border-brand-400 bg-brand-50",
          draftFile && "border-brand-400 bg-brand-50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME}
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleFiles(e.target.files)
          }
        />
        {draftFile ? (
          <>
            <FileText className="h-6 w-6 text-brand-700" />
            <div className="text-[14px] font-medium text-ink">
              {draftFile.name}
            </div>
            <div className="text-[12px] text-muted">
              {formatBytes(draftFile.size)} · {draftFile.type}
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
          </>
        )}
      </div>

      {draftFile ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4">
          <h3 className="text-[13px] font-semibold text-ink">
            Detalhes do exame (opcional)
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Data do exame" icon={Calendar}>
              <input
                type="date"
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="h-10 rounded-full border border-border bg-brand-50/30 px-4 text-[14px] text-ink outline-none focus:border-brand-400 focus:bg-white"
              />
            </Field>
            <Field label="Laboratório">
              <input
                type="text"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                placeholder="Ex: Fleury, Sabin, DASA…"
                className="h-10 rounded-full border border-border bg-brand-50/30 px-4 text-[14px] text-ink outline-none focus:border-brand-400 focus:bg-white"
              />
            </Field>
            <Field label="Tipo de exame">
              <select
                value={examKind}
                onChange={(e) => setExamKind(e.target.value)}
                className="h-10 rounded-full border border-border bg-brand-50/30 px-4 text-[14px] text-ink outline-none focus:border-brand-400 focus:bg-white"
              >
                {EXAM_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notas" full>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Algo que queira lembrar sobre esse exame…"
                className="rounded-2xl border border-border bg-brand-50/30 px-4 py-3 text-[14px] text-ink outline-none focus:border-brand-400 focus:bg-white resize-y"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={clearDraft} disabled={pendingUpload}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={submit} disabled={pendingUpload}>
              {pendingUpload ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                "Anexar exame"
              )}
            </Button>
          </div>
        </div>
      ) : null}

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
            {upload.status !== "uploaded" ? (
              <span>· {upload.status}</span>
            ) : null}
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

function Field({
  label,
  full,
  icon: Icon,
  children,
}: {
  label: string;
  full?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1.5 text-[12px]",
        full ? "sm:col-span-2" : "",
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-muted">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}
