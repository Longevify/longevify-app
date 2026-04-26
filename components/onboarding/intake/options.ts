// Listas reutilizáveis de opções (chips, radios) — labels em pt-BR.

import type {
  Acquisition,
  ActivityLevel,
  AlcoholFrequency,
  BiologicalSex,
  ContraceptiveMethod,
  DiagnosedCondition,
  DietPattern,
  Ethnicity,
  ExerciseType,
  FamilyEarlyEvent,
  FatigueFrequency,
  ImportantValue,
  MenopauseStatus,
  PrimaryGoal,
  SmokingStatus,
  SugarIntake,
} from "@/lib/intake/schema";

export const SEX_OPTIONS: { value: BiologicalSex; label: string }[] = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
];

export const ETHNICITY_OPTIONS: { value: Ethnicity; label: string }[] = [
  { value: "branca", label: "Branca" },
  { value: "preta", label: "Preta" },
  { value: "parda", label: "Parda" },
  { value: "amarela", label: "Amarela" },
  { value: "indigena", label: "Indígena" },
  { value: "prefiro-nao-dizer", label: "Prefiro não dizer" },
];

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  label: string;
  description?: string;
}[] = [
  { value: "sedentary", label: "Sedentário", description: "Pouco ou nenhum exercício" },
  { value: "light", label: "Leve", description: "1-2x por semana" },
  { value: "moderate", label: "Moderado", description: "3-4x por semana" },
  { value: "intense", label: "Intenso", description: "5+ vezes por semana" },
];

export const SMOKING_OPTIONS: { value: SmokingStatus; label: string }[] = [
  { value: "never", label: "Nunca fumei" },
  { value: "former", label: "Já parei" },
  { value: "current", label: "Fumante atual" },
];

export const ALCOHOL_OPTIONS: { value: AlcoholFrequency; label: string }[] = [
  { value: "never", label: "Nunca" },
  { value: "occasional", label: "Esporádico" },
  { value: "weekly", label: "Semanal" },
  { value: "daily", label: "Diário" },
];

export const CONDITION_OPTIONS: { value: DiagnosedCondition; label: string }[] = [
  { value: "hipertensao", label: "Hipertensão" },
  { value: "diabetes-tipo-2", label: "Diabetes tipo 2" },
  { value: "dislipidemia", label: "Dislipidemia (colesterol)" },
  { value: "doenca-cardiaca", label: "Doença cardíaca" },
  { value: "avc", label: "AVC prévio" },
  { value: "cancer", label: "Câncer" },
  { value: "autoimune", label: "Doença autoimune" },
  { value: "depressao", label: "Depressão" },
  { value: "ansiedade", label: "Ansiedade" },
  { value: "asma-dpoc", label: "Asma / DPOC" },
  { value: "doenca-renal", label: "Doença renal" },
  { value: "doenca-hepatica", label: "Doença hepática" },
  { value: "tireoide", label: "Tireoide" },
  { value: "outra", label: "Outra" },
  { value: "nenhuma", label: "Nenhuma" },
];

export const FAMILY_EARLY_OPTIONS: {
  value: FamilyEarlyEvent;
  label: string;
}[] = [
  { value: "infarto", label: "Infarto" },
  { value: "avc", label: "AVC" },
  { value: "cancer", label: "Câncer" },
  { value: "diabetes", label: "Diabetes" },
  { value: "alzheimer", label: "Alzheimer" },
  { value: "morte-subita", label: "Morte súbita" },
  { value: "nenhuma", label: "Nenhum dos anteriores" },
];

export const EXERCISE_TYPE_OPTIONS: {
  value: ExerciseType;
  label: string;
}[] = [
  { value: "musculacao", label: "Musculação" },
  { value: "corrida", label: "Corrida" },
  { value: "ciclismo", label: "Ciclismo" },
  { value: "natacao", label: "Natação" },
  { value: "yoga-pilates", label: "Yoga / Pilates" },
  { value: "esportes-coletivos", label: "Esportes coletivos" },
  { value: "caminhada", label: "Caminhada" },
  { value: "outro", label: "Outro" },
];

export const DIET_OPTIONS: {
  value: DietPattern;
  label: string;
  description?: string;
}[] = [
  { value: "ocidental", label: "Ocidental padrão", description: "Industrializados, carnes, processados" },
  { value: "mediterranea", label: "Mediterrânea", description: "Azeite, peixe, legumes, grãos" },
  { value: "cetogenica", label: "Cetogênica", description: "Baixíssimo carboidrato" },
  { value: "paleo", label: "Paleo" },
  { value: "vegetariana", label: "Vegetariana" },
  { value: "vegana", label: "Vegana" },
  { value: "outro", label: "Outra" },
];

export const SUGAR_OPTIONS: { value: SugarIntake; label: string }[] = [
  { value: "muito-alto", label: "Muito alto" },
  { value: "alto", label: "Alto" },
  { value: "moderado", label: "Moderado" },
  { value: "baixo", label: "Baixo" },
  { value: "quase-zero", label: "Quase zero" },
];

export const FATIGUE_OPTIONS: { value: FatigueFrequency; label: string }[] = [
  { value: "sempre", label: "Sempre" },
  { value: "frequente", label: "Frequentemente" },
  { value: "as-vezes", label: "Às vezes" },
  { value: "raro", label: "Raramente" },
  { value: "nunca", label: "Nunca" },
];

export const CONTRACEPTIVE_OPTIONS: {
  value: ContraceptiveMethod;
  label: string;
}[] = [
  { value: "nenhum", label: "Nenhum" },
  { value: "pilula", label: "Pílula" },
  { value: "diu-hormonal", label: "DIU hormonal" },
  { value: "diu-cobre", label: "DIU de cobre" },
  { value: "outro", label: "Outro" },
];

export const MENOPAUSE_OPTIONS: { value: MenopauseStatus; label: string }[] = [
  { value: "pre", label: "Pré-menopausa" },
  { value: "peri", label: "Perimenopausa" },
  { value: "pos", label: "Pós-menopausa" },
  { value: "nao-sei", label: "Não sei" },
];

export const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: "longevidade", label: "Longevidade saudável" },
  { value: "performance", label: "Otimizar performance" },
  { value: "prevencao", label: "Prevenir doença específica" },
  { value: "perder-peso", label: "Perder peso" },
  { value: "energia", label: "Mais energia" },
  { value: "saude-mental", label: "Saúde mental" },
  { value: "outro", label: "Outro" },
];

export const IMPORTANT_VALUE_OPTIONS: {
  value: ImportantValue;
  label: string;
}[] = [
  { value: "viver-mais", label: "Viver mais" },
  { value: "viver-melhor", label: "Viver melhor" },
  { value: "performance-fisica", label: "Performance física" },
  { value: "performance-mental", label: "Performance mental" },
  { value: "estetica", label: "Estética" },
  { value: "fertilidade", label: "Fertilidade" },
  { value: "envelhecimento-ativo", label: "Envelhecimento ativo" },
];

export const ACQUISITION_OPTIONS: { value: Acquisition; label: string }[] = [
  { value: "amigo", label: "Indicação de amigo" },
  { value: "instagram", label: "Instagram" },
  { value: "busca", label: "Busca (Google)" },
  { value: "podcast", label: "Podcast" },
  { value: "medico", label: "Médico" },
  { value: "outro", label: "Outro" },
];
