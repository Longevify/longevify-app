import type { Exercise } from "./types";

/**
 * Lucas (2026-05-25): Lucas reportou "Falha ao gerar treino —
 * no-exercise-catalog". O exercise_catalog table está vazio em prod
 * (migration 0012 nunca foi aplicada, ou foi resetada). Pra não
 * depender de SQL aplicado, mantemos um seed in-memory que serve
 * de fallback quando getExerciseCatalog() retorna vazio.
 *
 * Também é usado pra popular a lista de vídeos quando o DB não tem
 * video_url (migration 0013 também ausente).
 *
 * Source of truth: este arquivo. Quando Lucas roda a migration via
 * Supabase Studio, o catálogo do DB sobrescreve isto e fica idêntico.
 */
export const EXERCISE_CATALOG_SEED: Exercise[] = [
  // ─── chest ─────────────────────────────────────────────────────────
  {
    id: "bench_press",
    name: "Supino reto",
    muscleGroup: "chest",
    equipment: "barbell",
    category: "compound",
    description:
      "Pegada um pouco mais aberta que ombros, escápulas retraídas, desce até peito tocar a barra.",
    videoUrl: "https://www.youtube.com/embed/rT7DgCr-3pg",
  },
  {
    id: "incline_db_press",
    name: "Supino inclinado halteres",
    muscleGroup: "chest",
    equipment: "dumbbell",
    category: "compound",
    description: "Banco 30-45°. Halteres descem até alinhar com peito.",
    videoUrl: "https://www.youtube.com/embed/wkD8rjkodUI",
  },
  {
    id: "push_up",
    name: "Flexão",
    muscleGroup: "chest",
    equipment: "bodyweight",
    category: "compound",
    description: "Core firme, corpo reto, desce até ~5cm do chão.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "cable_fly",
    name: "Crucifixo cabo",
    muscleGroup: "chest",
    equipment: "cable",
    category: "isolation",
    description:
      "Cotovelos levemente flexionados, descreve arco fechando à frente do peito.",
    videoUrl: "https://www.youtube.com/embed/Iwe6AmxVf7o",
  },
  {
    id: "dips",
    name: "Mergulho (dips)",
    muscleGroup: "chest",
    equipment: "bodyweight",
    category: "compound",
    description: "Tronco levemente inclinado pra frente pra ativar mais peito.",
    videoUrl: "https://www.youtube.com/embed/1Tq3QdYUuHs",
  },
  // ─── back ──────────────────────────────────────────────────────────
  {
    id: "deadlift",
    name: "Levantamento terra",
    muscleGroup: "back",
    equipment: "barbell",
    category: "compound",
    description:
      "Costas neutras, quadril e joelhos estendem juntos. Barra colada nas pernas.",
    videoUrl: "https://www.youtube.com/embed/op9kVnSso6Q",
  },
  {
    id: "pull_up",
    name: "Barra fixa",
    muscleGroup: "back",
    equipment: "bodyweight",
    category: "compound",
    description:
      "Pegada pronada na largura dos ombros. Sobe até queixo passar a barra.",
    videoUrl: "https://www.youtube.com/embed/eGo4IYlbE5g",
  },
  {
    id: "barbell_row",
    name: "Remada curvada",
    muscleGroup: "back",
    equipment: "barbell",
    category: "compound",
    description:
      "Tronco ~45°, barra puxada até abdômen, cotovelos próximos ao corpo.",
    videoUrl: "https://www.youtube.com/embed/Z2n58m2i4jg",
  },
  {
    id: "lat_pulldown",
    name: "Puxada alta",
    muscleGroup: "back",
    equipment: "cable",
    category: "compound",
    description:
      "Pegada um pouco mais aberta que ombros. Puxa até a barra encostar no peito.",
    videoUrl: "https://www.youtube.com/embed/3-9NTKfFEM4",
  },
  {
    id: "seated_row",
    name: "Remada sentada",
    muscleGroup: "back",
    equipment: "cable",
    category: "compound",
    description: "Cotovelos próximos ao corpo, retrai escápula no final.",
    videoUrl: "https://www.youtube.com/embed/-yjT_xkRRoY",
  },
  // ─── legs ──────────────────────────────────────────────────────────
  {
    id: "squat",
    name: "Agachamento livre",
    muscleGroup: "legs",
    equipment: "barbell",
    category: "compound",
    description: "Profundidade até coxa paralela ao chão. Joelhos alinhados.",
    videoUrl: "https://www.youtube.com/embed/8iPEnn-ltC8",
  },
  {
    id: "front_squat",
    name: "Agachamento frontal",
    muscleGroup: "legs",
    equipment: "barbell",
    category: "compound",
    description: "Barra apoiada nos deltoides frontais. Tronco mais ereto.",
    videoUrl: "https://www.youtube.com/embed/JB2oyawG9KI",
  },
  {
    id: "romanian_deadlift",
    name: "Stiff (RDL)",
    muscleGroup: "legs",
    equipment: "barbell",
    category: "compound",
    description: "Foco em posterior de coxa. Quadril vai pra trás, joelhos pouco flexionados.",
    videoUrl: "https://www.youtube.com/embed/SZxYHrLEunQ",
  },
  {
    id: "leg_press",
    name: "Leg press",
    muscleGroup: "legs",
    equipment: "machine",
    category: "compound",
    description: "Pés na largura dos ombros, joelhos não passam dos pés.",
    videoUrl: "https://www.youtube.com/embed/IZxyjW7MPJQ",
  },
  {
    id: "walking_lunge",
    name: "Afundo caminhando",
    muscleGroup: "legs",
    equipment: "dumbbell",
    category: "compound",
    description: "Passo longo, joelho da frente alinhado com o pé.",
    videoUrl: "https://www.youtube.com/embed/yT_xkW3uvNI",
  },
  {
    id: "leg_curl",
    name: "Mesa flexora",
    muscleGroup: "legs",
    equipment: "machine",
    category: "isolation",
    description: "Isolamento de posterior de coxa.",
    videoUrl: "https://www.youtube.com/embed/F488k67BTzI",
  },
  // ─── shoulders ─────────────────────────────────────────────────────
  {
    id: "overhead_press",
    name: "Desenvolvimento militar",
    muscleGroup: "shoulders",
    equipment: "barbell",
    category: "compound",
    description: "Core travado, barra sobe em linha reta acima da cabeça.",
    videoUrl: "https://www.youtube.com/embed/2-LAMcpzODU",
  },
  {
    id: "lateral_raise",
    name: "Elevação lateral",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    category: "isolation",
    description: "Eleva halteres lateralmente até linha dos ombros. Pouco peso.",
    videoUrl: "https://www.youtube.com/embed/3WSI_a3PRDQ",
  },
  {
    id: "rear_delt_fly",
    name: "Crucifixo invertido",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    category: "isolation",
    description: "Foco em deltoide posterior. Tronco inclinado pra frente.",
    videoUrl: "https://www.youtube.com/embed/EA7u4Q_8HQ0",
  },
  // ─── arms ──────────────────────────────────────────────────────────
  {
    id: "barbell_curl",
    name: "Rosca direta",
    muscleGroup: "arms",
    equipment: "barbell",
    category: "isolation",
    description: "Cotovelos colados ao corpo, não usa balanço.",
    videoUrl: "https://www.youtube.com/embed/kwG2ipFRgfo",
  },
  {
    id: "hammer_curl",
    name: "Rosca martelo",
    muscleGroup: "arms",
    equipment: "dumbbell",
    category: "isolation",
    description: "Pegada neutra (palmas pra dentro). Pega braquial e antebraço.",
    videoUrl: "https://www.youtube.com/embed/zC3nLlEvin4",
  },
  {
    id: "tricep_pushdown",
    name: "Tríceps na polia",
    muscleGroup: "arms",
    equipment: "cable",
    category: "isolation",
    description: "Cotovelos travados ao corpo, extensão completa.",
    videoUrl: "https://www.youtube.com/embed/2-LAMcpzODU",
  },
  {
    id: "skullcrusher",
    name: "Tríceps testa",
    muscleGroup: "arms",
    equipment: "barbell",
    category: "isolation",
    description: "Cotovelos fixos. Barra desce até a testa, sobe estendendo só cotovelo.",
    videoUrl: "https://www.youtube.com/embed/d_KZxkY_0cM",
  },
  // ─── core ──────────────────────────────────────────────────────────
  {
    id: "plank",
    name: "Prancha",
    muscleGroup: "core",
    equipment: "bodyweight",
    category: "isolation",
    description: "Core firme, corpo reto, sem deixar quadril cair.",
    videoUrl: "https://www.youtube.com/embed/Z57CtFmRMxA",
  },
  {
    id: "hanging_leg_raise",
    name: "Elevação de pernas na barra",
    muscleGroup: "core",
    equipment: "bodyweight",
    category: "isolation",
    description: "Pendurado na barra, eleva pernas controlando o movimento.",
    videoUrl: "https://www.youtube.com/embed/Pr1ieGZ5atk",
  },
  {
    id: "cable_crunch",
    name: "Abdominal cabo",
    muscleGroup: "core",
    equipment: "cable",
    category: "isolation",
    description: "Ajoelhado, traz cotovelos em direção aos joelhos.",
    videoUrl: "https://www.youtube.com/embed/3qjoXDTuyOE",
  },
  // ─── full body ─────────────────────────────────────────────────────
  {
    id: "clean_and_press",
    name: "Clean + push press",
    muscleGroup: "full_body",
    equipment: "barbell",
    category: "compound",
    description: "Movimento explosivo: terra → puxada alta → push press.",
    videoUrl: "https://www.youtube.com/embed/_iZSe8txCSc",
  },
  {
    id: "kettlebell_swing",
    name: "Kettlebell swing",
    muscleGroup: "full_body",
    equipment: "kettlebell",
    category: "compound",
    description: "Hip hinge explosivo. Posterior de coxa + glúteo + core.",
    videoUrl: "https://www.youtube.com/embed/cZX4ouvVoyA",
  },
  {
    id: "burpee",
    name: "Burpee",
    muscleGroup: "full_body",
    equipment: "bodyweight",
    category: "compound",
    description: "Flexão → salto vertical. Condicionamento.",
    videoUrl: "https://www.youtube.com/embed/qLBImHhCXSw",
  },
];
