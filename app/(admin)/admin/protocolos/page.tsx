import { ClipboardList } from "lucide-react";

export default function ProtocolosStubPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <span className="text-[12px] font-medium uppercase tracking-wider text-muted">
          Clínica
        </span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
          Protocolos
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Biblioteca de protocolos da equipe médica Longevify.
        </p>
      </header>
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-border bg-surface p-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700">
          <ClipboardList className="h-5 w-5" />
        </span>
        <h2 className="text-[16px] font-semibold">Em breve</h2>
        <p className="max-w-md text-[13px] text-muted">
          Montagem visual de protocolos, associação a pacientes e export em PDF
          ainda estão em desenvolvimento. Por enquanto o protocolo é editado
          como texto livre na página de cada paciente.
        </p>
      </div>
    </div>
  );
}
