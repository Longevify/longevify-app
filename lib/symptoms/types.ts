export interface SymptomDef {
  id: string;
  label: string;
  emoji?: string;
}

export const SYMPTOMS: SymptomDef[] = [
  { id: "fadiga", label: "Fadiga" },
  { id: "dor-cabeca", label: "Dor de cabeça" },
  { id: "tontura", label: "Tontura" },
  { id: "insonia", label: "Insônia" },
  { id: "ansiedade", label: "Ansiedade" },
  { id: "dor-muscular", label: "Dor muscular" },
  { id: "dor-articular", label: "Dor articular" },
  { id: "digestivo", label: "Problemas digestivos" },
  { id: "humor", label: "Alteração de humor" },
  { id: "alergia", label: "Alergia" },
  { id: "libido", label: "Libido baixa" },
  { id: "foco", label: "Falta de foco" },
  { id: "taquicardia", label: "Taquicardia" },
];

export interface SymptomReport {
  symptomId: string;
  severity: number; // 1-10
  note?: string;
}

export interface SymptomEntry {
  // dia ISO YYYY-MM-DD (local)
  date: string;
  reports: SymptomReport[];
  createdAt: string; // ISO completo
}
