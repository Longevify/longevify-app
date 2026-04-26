import type { Biomarker, Patient } from "@/lib/mock-data";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findById(biomarkers: Biomarker[], id: string): Biomarker | undefined {
  return biomarkers.find((b) => b.id === id);
}

interface Pattern {
  id: string;
  keywords: string[];
  build: (ctx: {
    patient: Patient;
    biomarkers: Biomarker[];
    get: (id: string) => Biomarker | undefined;
  }) => string;
}

const PATTERNS: Pattern[] = [
  {
    id: "ldl",
    keywords: ["ldl", "colesterol ruim", "colesterol alto", "colesterol ldl"],
    build: ({ get }) => {
      const ldl = get("ldl");
      const hdl = get("hdl");
      const apob = get("apob");
      if (!ldl) return "";
      return `Seu LDL está em ${ldl.value} ${ldl.unit}, acima da faixa ótima (${ldl.referenceLabel} ${ldl.unit}) — por isso aparece como o marcador cardiovascular mais crítico do painel. A boa notícia: seu ApoB está ${apob?.value} ${apob?.unit} (ótimo) e o HDL ${hdl?.value} ${hdl?.unit} (ótimo), então o número de partículas aterogênicas e a proteção já estão a seu favor. Para baixar o LDL em 8–12 semanas, três alavancas costumam render o maior delta: (1) **fibra solúvel 10 g/dia** — 40 g de aveia em flocos + 1 colher de psyllium + feijão/lentilha quase diariamente; (2) **ômega-3 (EPA+DHA) 2 g/dia**, preferencialmente com refeição gordurosa; (3) **zona 2 150 min/semana**, em blocos de 30–45 min. Reduzir gordura saturada (<7 % das calorias) e substituir por monoinsaturada (azeite, abacate, castanhas) potencializa o efeito. Reavalie com painel lipídico completo em 90 dias — se não descer de 100 mg/dL, conversamos sobre estatina em dose baixa.`;
    },
  },
  {
    id: "apob",
    keywords: ["apob", "apolipoproteina", "apo b"],
    build: ({ get }) => {
      const apob = get("apob");
      const ldl = get("ldl");
      if (!apob) return "";
      return `Seu ApoB está em ${apob.value} ${apob.unit}, dentro da faixa ótima (${apob.referenceLabel} ${apob.unit}). ApoB é, hoje, o melhor marcador isolado de risco cardiovascular porque conta **partículas** aterogênicas, não só o colesterol transportado por elas. Estar abaixo de 60 significa baixa densidade de LDL-P/VLDL-P circulante — um fator protetor forte ao longo da vida. O ponto de atenção é que seu LDL (${ldl?.value} ${ldl?.unit}) está acima de 100, o que sugere partículas maiores e "fofas" carregando mais colesterol por partícula — menos perigoso do que partículas pequenas e densas, mas ainda assim vale reduzir o colesterol intra-partícula com fibra, ômega-3 e zona 2. Mantenha ApoB sob vigilância anual; se subir para >80, aí sim precisamos revisar estratégia.`;
    },
  },
  {
    id: "vitd",
    keywords: ["vitamina d", "vit d", "vitd", "25-oh", "25 oh"],
    build: ({ get }) => {
      const v = get("vitd");
      if (!v) return "";
      return `Sua vitamina D está em ${v.value} ${v.unit} — dentro da faixa de referência (${v.referenceLabel} ${v.unit}), porém **abaixo da faixa ótima (50–80)** que associamos a melhor função imune, óssea e modulação hormonal. Para alvos de longevidade, trabalhamos com 50–70 ng/dL. Protocolo prático: (1) **suplementar 2.000–4.000 UI/dia de vitamina D3 junto com K2 (MK-7 90–180 mcg) e gordura** (ela é lipossolúvel — tome com refeição que tenha azeite, abacate ou ovo); (2) 20 min de sol direto em braços/pernas entre 10h e 15h quando possível; (3) manter magnésio adequado (glicinato 300–400 mg/dia), porque sem magnésio a D3 não é bem ativada. Reavalie o 25-OH-D em 12 semanas — a maioria das pessoas sai de 42 para 60+ nesse período. Evite doses mega (>10.000 UI/dia) sem novo exame.`;
    },
  },
  {
    id: "tireoide",
    keywords: ["tireoide", "tireóide", "tsh", "tiroide", "t3", "t4"],
    build: ({ get }) => {
      const tsh = get("tsh");
      if (!tsh) return "";
      return `Sua tireoide está **bem regulada**. O TSH está em ${tsh.value} ${tsh.unit}, dentro da faixa ótima (${tsh.referenceLabel} ${tsh.unit}) — que é mais estreita do que a faixa laboratorial clássica (0,4–4,5). TSH entre 1,0 e 2,5 é associado a melhor energia, metabolismo e humor em adultos jovens. Para um panorama completo de tireoide, o ideal é complementar com T4 livre, T3 livre, TPO-Ab e TG-Ab pelo menos uma vez — isso descarta Hashimoto subclínico (autoimune) e mostra se a conversão T4→T3 está eficiente. Enquanto os sintomas estiverem bons (energia estável, sem queda de cabelo fora do normal, intestino regulado, temperatura corporal normal), mantém-se a vigilância anual. Sinais que pedem exame antes: fadiga persistente, ganho de peso sem causa, sensação de frio ou constipação.`;
    },
  },
  {
    id: "sono",
    keywords: ["sono", "dormir", "insonia", "insônia", "acordar", "dormindo"],
    build: () =>
      `Sono é provavelmente a alavanca de maior ROI para o seu score. O Longevify não tem sensor de sono ainda, então não consigo ver seu dado, mas os pilares que movem biomarcadores são: (1) **consistência** — mesmo horário de dormir/acordar (±30 min) 7 dias da semana; (2) **luz** — 10 min de sol nos olhos em até 1 h após acordar; evitar luz forte/telas 1 h antes de dormir; (3) **temperatura** — quarto a 18–20 °C, banho morno 60–90 min antes de deitar; (4) **cafeína** até 10 h da manhã; (5) **álcool** o mais longe possível do deitar — ele fragmenta o sono REM. Se sua percepção é que acorda cansado ou ronca, vale polissonografia para descartar apneia — ela mascara melhorias de todos os outros marcadores. Dose-alvo: **7h30–8h30 de sono**, com >85 % de eficiência. Magnésio glicinato 300 mg 1 h antes de deitar costuma melhorar arquitetura de sono sem efeito residual no dia seguinte.`,
  },
  {
    id: "score",
    keywords: ["score", "longevify score", "pontuacao", "pontuação", "nota"],
    build: ({ patient, biomarkers }) => {
      const out = biomarkers.filter((b) => b.status === "out");
      const normal = biomarkers.filter((b) => b.status === "normal");
      return `Seu Longevify Score atual é **${patient.longevifyScore}/100 (On Track)**, subindo de forma consistente — você saiu de 58 em jan/24 para ${patient.longevifyScore} agora, um ganho de +${patient.longevifyScore - 58} pontos em ~2 anos. A composição do score leva em conta biomarcadores, idade biológica, tendências e consistência. Para chegar a 80+, as duas alavancas mais produtivas no seu caso são: (1) **zerar os marcadores "out"** — hoje você tem ${out.length} marcador(es) fora da faixa (principalmente LDL ${out.map((b) => `${b.value} ${b.unit}`).join(", ")}), cada um que entra na faixa ótima tende a render +3 a +6 pontos; (2) **puxar os "normais" pra ótimos** — ${normal.length} marcador(es) em zona monitorada (vitamina D é o mais fácil: suplementação correta resolve em 12 semanas). Chegar a 90 é factível em 9–12 meses com protocolo estruturado, mas exige disciplina em sono, treino e dieta — não é só suplementação.`;
    },
  },
  {
    id: "idade-biologica",
    keywords: [
      "idade biologica",
      "idade biológica",
      "bio age",
      "biologica",
      "biológica",
      "25 anos",
    ],
    build: ({ patient }) => {
      const diff = patient.chronologicalAge - patient.biologicalAge;
      return `Sua idade biológica estimada é **${patient.biologicalAge} anos**, contra ${patient.chronologicalAge} de idade cronológica — ${diff > 0 ? `você está ${diff} anos "mais novo"` : `você está ${Math.abs(diff)} anos "mais velho"`} que a data do RG. O cálculo combina biomarcadores como PCR ultra-sensível, HbA1c, perfil lipídico, função hepática, hormônios e marcadores inflamatórios num modelo tipo PhenoAge/GrimAge adaptado. Traduzindo: o seu corpo, no agregado, funciona como o de alguém de 25. Vale lembrar que essa métrica é uma **média sistêmica** — órgãos envelhecem em ritmos diferentes, então manter vigilância multi-sistema é mais útil do que caçar a idade biológica isoladamente. Fatores que te seguram nos 25: HbA1c 5,1 %, PCR 0,6 mg/L, testosterona 620 ng/dL, ApoB 38. O que pode te puxar pra baixo: LDL 103 e vitamina D 42. Corrigir esses dois tende a tirar mais 1–2 anos do seu biological age na próxima reavaliação.`;
    },
  },
  {
    id: "suplementos",
    keywords: [
      "suplemento",
      "suplementos",
      "suplementacao",
      "suplementação",
      "vitamina",
      "tomar",
    ],
    build: ({ get }) => {
      const vitd = get("vitd");
      const ldl = get("ldl");
      return `Com base no seu painel, a pilha de suplementação que faz mais sentido hoje é enxuta e direcionada — não shotgun. Em ordem de impacto:\n\n1. **Vitamina D3 2.000–4.000 UI/dia + K2 (MK-7) 90–180 mcg** — seu nível está em ${vitd?.value} ${vitd?.unit}, a meta é 60+. Tomar com refeição gordurosa.\n2. **Ômega-3 (EPA+DHA) 2 g/dia** — ataca o LDL (${ldl?.value} ${ldl?.unit}) e é anti-inflamatório sistêmico. Priorize marcas com selo IFOS; capriche na dose de EPA.\n3. **Magnésio glicinato 300–400 mg à noite** — melhora sono, ativação da vitamina D e sensibilidade à insulina.\n4. **Creatina monohidratada 3–5 g/dia** — robustez muscular, memória e densidade óssea; custa pouco, evidência forte.\n5. **Psyllium 5–10 g/dia** — opera como "suplemento" mas tecnicamente é fibra: efeito direto no LDL.\n\nO que **não** recomendo comprar no seu caso: multivitamínicos genéricos, antioxidantes em alta dose, "boosters" de testosterona (seu T total está ótimo em 620 ng/dL). Reavalie vitamina D, lipídios e ferritina em 90 dias.`;
    },
  },
  {
    id: "melhorar",
    keywords: [
      "melhorar",
      "ajudar",
      "otimizar",
      "o que fazer",
      "plano",
      "protocolo",
    ],
    build: ({ patient, biomarkers, get }) => {
      const ldl = get("ldl");
      const vitd = get("vitd");
      const out = biomarkers.filter((b) => b.status === "out").length;
      return `Seu painel é sólido — Longevify Score ${patient.longevifyScore}, idade biológica ${patient.biologicalAge}, ${out} marcador(es) fora da faixa. Se tivesse que escolher o **protocolo mais enxuto que mais move a agulha** nos próximos 90 dias, seria este:\n\n1. **LDL 103 → <100** (meta ótima <70): fibra solúvel 10 g/dia, ômega-3 2 g/dia, zona 2 150 min/semana.\n2. **Vitamina D 42 → 60**: D3 3.000 UI/dia + K2 (MK-7) 180 mcg, com gordura, por 90 dias.\n3. **Sono consistente**: janela fixa de 7h30–8h30, luz solar pela manhã, magnésio glicinato 300 mg pré-sono.\n4. **Treino estruturado**: 3×/semana força composta + 2×/semana zona 2 45 min + 1 sessão de HIIT curta (4×4).\n5. **Dieta com teto de gordura saturada <7 %** e 1,6 g/kg de proteína; mantém o que já funciona (HbA1c 5,1 % é ouro).\n\nReavaliar em 12 semanas. Esse protocolo, seguido com disciplina, costuma empurrar o score de ${patient.longevifyScore} para 76–80 e derrubar ${ldl?.value || 103} para 85–92 mg/dL e ${vitd?.value || 42} para 58–65 ng/dL.`;
    },
  },
  {
    id: "hba1c",
    keywords: [
      "hba1c",
      "hemoglobina glicada",
      "glicada",
      "a1c",
      "glicose",
      "diabetes",
      "insulina",
    ],
    build: ({ get }) => {
      const a1c = get("hba1c");
      if (!a1c) return "";
      return `Sua HbA1c está em ${a1c.value} % — **ótima**, abaixo da faixa de "normal" (${a1c.referenceLabel}) e dentro da zona de longevidade (<5,4 %). A glicada reflete a média de glicemia dos últimos 60–90 dias, então é um dos melhores proxys de saúde metabólica de longo prazo. Estar em 5,1 % significa que seu sistema pâncreas-insulina-tecido está sensível e eficiente — isso é um dos principais motivos pelo qual sua idade biológica está em 25. Para preservar esse número nos próximos 10–20 anos: (1) manter padrão alimentar com carbo complexo + proteína em toda refeição; (2) caminhar 10 min após almoço/jantar (corta pico glicêmico em 20–30 %); (3) continuar treino de força — músculo é o maior sumidouro de glicose do corpo; (4) dormir bem — privação de sono eleva resistência à insulina em 24–48h. Se quiser monitorar em tempo real, considere um CGM (sensor contínuo) por 14 dias — dá visibilidade sobre quais alimentos específicos te elevam.`;
    },
  },
  {
    id: "hdl",
    keywords: ["hdl", "colesterol bom"],
    build: ({ get }) => {
      const hdl = get("hdl");
      if (!hdl) return "";
      return `Seu HDL está em ${hdl.value} ${hdl.unit}, dentro da faixa ótima (${hdl.referenceLabel} ${hdl.unit}). HDL é o colesterol "bom" — transporta colesterol de volta ao fígado e tem função anti-inflamatória vascular. Um HDL acima de 46 em homens já é protetor; acima de 55 é considerado ideal para longevidade. As alavancas que sustentam HDL alto: (1) treino aeróbico regular, especialmente zona 2; (2) monoinsaturadas (azeite extra-virgem, abacate, castanhas); (3) álcool com parcimônia — doses baixas aumentam HDL mas o custo metabólico não compensa; (4) não fumar. Vale ressaltar: HDL muito alto (>90) sem estilo de vida que justifique pode ser marcador de disfunção de transporte reverso — não é o seu caso. Mantém o que está fazendo.`;
    },
  },
  {
    id: "crp",
    keywords: ["pcr", "inflamacao", "inflamação", "crp", "ultra sensivel", "ultra-sensível"],
    build: ({ get }) => {
      const crp = get("crp");
      if (!crp) return "";
      return `Sua PCR ultra-sensível está em ${crp.value} ${crp.unit}, dentro da faixa ótima (${crp.referenceLabel} ${crp.unit}). PCR-us é o melhor marcador prático de **inflamação sistêmica de baixo grau** — a chamada "inflammaging", que é um dos hallmarks do envelhecimento. Abaixo de 1 mg/L indica baixo risco cardiovascular inflamatório e bom funcionamento imune de base. O que mantém PCR baixa: sono reparador, gordura visceral baixa, exercício regular, dieta rica em polifenóis (azeite, frutas vermelhas, chá verde, cacau) e ausência de infecções crônicas (incluindo saúde periodontal). Se a PCR subir acima de 3 mg/L num próximo exame sem infecção aguda evidente, vale investigar: composição corporal, qualidade de sono, saúde intestinal e dentária. No seu cenário, mantém a vigilância a cada 6–12 meses.`;
    },
  },
  {
    id: "testosterona",
    keywords: ["testosterona", "testo", "hormonio masculino", "hormônio masculino"],
    build: ({ get }) => {
      const t = get("testo");
      if (!t) return "";
      return `Sua testosterona total está em ${t.value} ${t.unit}, dentro da faixa ótima (${t.referenceLabel} ${t.unit}) — excelente para ${t.value >= 600 ? "qualquer idade, especialmente aos 27" : "sua idade"}. Testosterona em faixa ótima sustenta massa muscular, densidade óssea, libido, humor, cognição e sensibilidade à insulina. Para manter nessa zona nos próximos 15–20 anos: (1) treino de força pesado 3–4×/semana com foco em compostos (agachamento, terra, supino, remada); (2) dormir 7h30+ — privação derruba testosterona 10–15 % em 1 semana; (3) gordura corporal <20 % — tecido adiposo converte testosterona em estradiol via aromatase; (4) zinco (15 mg/dia via dieta) e magnésio adequados; (5) evitar álcool crônico. Vale complementar em exames futuros com **testosterona livre, SHBG, estradiol e LH** para ter imagem completa do eixo — só o total não conta toda a história.`;
    },
  },
  {
    id: "ferritina",
    keywords: ["ferritina", "ferro", "anemia"],
    build: ({ get }) => {
      const f = get("ferritin");
      if (!f) return "";
      return `Sua ferritina está em ${f.value} ${f.unit}, na faixa ótima (${f.referenceLabel} ${f.unit}). Ferritina reflete o estoque de ferro — importante para transporte de oxigênio, função mitocondrial e energia. Em homens adultos, o ideal é **80–150** (você está em ${f.value}). Ferritina baixa (<50) associa-se a fadiga, cabelo quebradiço, queda de performance aeróbica; ferritina alta (>200) pode indicar inflamação, sobrecarga de ferro ou fígado gorduroso — vale cruzar com saturação de transferrina e ALT. Como seu ALT está em faixa ótima também, não há sinal de sobrecarga hepática. Mantém como está; em homens, ferro da dieta normal (carne vermelha, feijão, folhas escuras) costuma ser suficiente. Não suplementar ferro sem deficiência confirmada — excesso é oxidante.`;
    },
  },
  {
    id: "alt",
    keywords: ["alt", "tgp", "figado", "fígado", "hepatica", "hepática"],
    build: ({ get }) => {
      const alt = get("alt");
      if (!alt) return "";
      return `Seu ALT (TGP) está em ${alt.value} ${alt.unit}, faixa ótima (${alt.referenceLabel} ${alt.unit}). ALT é uma enzima intracelular do hepatócito — quando o fígado está agredido (álcool, esteatose, vírus, medicamentos), ela vaza para o sangue e sobe. Estar em 22 sugere fígado saudável, sem sinais de esteatose hepática relevante. Para proteger o fígado em regime de longevidade: (1) álcool o mais próximo de zero possível (é o agressor #1); (2) peso e gordura visceral controlados — esteatose é hoje a principal causa de problema hepático silencioso; (3) manter HbA1c <5,7 % (você está em 5,1 %, já cumpre); (4) café 2–3 xícaras/dia tem associação protetora; (5) cúrcuma e cardo mariano têm alguma evidência modesta, mas não são prioritários. Em painéis futuros, pedir também **AST, GGT e bilirrubinas** completa o panorama hepático.`;
    },
  },
];

export function getFallbackReply(
  userMessage: string,
  patient: Patient,
  biomarkers: Biomarker[],
): string {
  const text = norm(userMessage);
  const get = (id: string) => findById(biomarkers, id);

  for (const p of PATTERNS) {
    if (p.keywords.some((kw) => text.includes(norm(kw)))) {
      const reply = p.build({ patient, biomarkers, get });
      if (reply) return reply;
    }
  }

  return defaultReply(patient, biomarkers);
}

function defaultReply(patient: Patient, biomarkers: Biomarker[]): string {
  const out = biomarkers.filter((b) => b.status === "out");
  const normal = biomarkers.filter((b) => b.status === "normal");
  const optimal = biomarkers.filter((b) => b.status === "optimal");
  const scoreStatusLabel =
    patient.scoreStatus === "on-track"
      ? "On Track"
      : patient.scoreStatus === "attention"
        ? "Atenção"
        : "Em Risco";

  const outNames = out.map((b) => `${b.name} (${b.value} ${b.unit})`).join(", ");

  return `Resumo rápido do seu painel, ${patient.firstName}: Longevify Score **${patient.longevifyScore}/100 (${scoreStatusLabel})**, idade biológica **${patient.biologicalAge} anos** (${patient.chronologicalAge - patient.biologicalAge} a mais jovem que a cronológica). Dos seus biomarcadores medidos hoje: **${optimal.length} em faixa ótima**, **${normal.length} em normal (monitorar)** e **${out.length} fora da faixa**${out.length > 0 ? ` — ${outNames}` : ""}.\n\nPosso te ajudar com qualquer um desses pontos em detalhe. Algumas perguntas que respondo bem:\n- "Por que meu LDL está em 103?" (ou qualquer biomarcador específico)\n- "Como melhorar meu sono?"\n- "Quais suplementos realmente me ajudam?"\n- "O que a idade biológica 25 significa?"\n- "Meu score pode chegar a 90?"\n\nO que você quer atacar primeiro?`;
}
