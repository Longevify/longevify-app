export interface ImproveActions {
  rotina: string[];
  alimentacao: string[];
  suplementacao: string[];
  exercicio: string[];
  sono: string[];
}

export interface BiomarkerKnowledge {
  id: string;
  whatItIs: string;
  whyItMatters: string;
  factors: string[];
  improve: ImproveActions;
  relatedBiomarkerIds: string[];
  rangeContext: string;
  disclaimer?: string;
}

export const BIOMARKER_KNOWLEDGE: Record<string, BiomarkerKnowledge> = {
  ldl: {
    id: "ldl",
    whatItIs:
      "O LDL é uma lipoproteína que carrega colesterol do fígado para os tecidos. Quando essas partículas circulam em excesso, elas se infiltram na parede arterial e iniciam o processo de aterosclerose — o acúmulo de placas que, ao longo de décadas, leva a infarto e AVC.",
    whyItMatters:
      "O LDL é o fator causal mais bem estabelecido de doença cardiovascular aterosclerótica. Quanto mais baixo o LDL e mais cedo ele é mantido baixo, menor a exposição cumulativa das artérias a colesterol — o que se traduz em anos a mais de vida saudável. Para protocolos de longevidade, alvos abaixo de 70 mg/dL são considerados ideais, especialmente quando combinados a ApoB baixo.",
    factors: [
      "Consumo de gorduras saturadas (carnes gordurosas, manteiga, óleo de coco)",
      "Gordura trans industrial e ultraprocessados",
      "Fatores genéticos — variantes em LDLR, APOB, PCSK9",
      "Hipotireoidismo e resistência à insulina elevam o LDL",
      "Excesso de gordura visceral e sedentarismo",
      "Fibra solúvel insuficiente na dieta",
      "Uso de certos medicamentos (corticoides, alguns diuréticos)",
    ],
    improve: {
      rotina: [
        "Meça LDL e ApoB a cada 6 meses até atingir alvo, depois anualmente",
        "Reduza álcool a menos de 7 doses por semana",
        "Pare de fumar — tabagismo oxida o LDL e multiplica o risco",
      ],
      alimentacao: [
        "Troque gorduras saturadas por mono e poli-insaturadas: azeite extravirgem, abacate, nozes",
        "Inclua 25–35g de fibra/dia, priorizando aveia, feijão, lentilha e psyllium",
        "Adicione 2g/dia de esteróis vegetais (fitosteróis) — reduz LDL em 8–10%",
        "Inclua peixes gordos (sardinha, salmão, cavala) 2–3 vezes por semana",
      ],
      suplementacao: [
        "Psyllium: 10g/dia reduz LDL em ~7%",
        "Berberina: 500mg 2–3x/dia pode reduzir LDL em ~10–25% (meta-análise Lan et al., J Ethnopharmacol 2015) — atenção: interage com CYP3A4 (ciclosporina, antifúngicos azólicos, alguns ARVs). Confirme com seu médico antes de combinar com estatina ou medicação contínua",
        "Ômega-3 (EPA/DHA): 2g/dia — efeito modesto no LDL, mas melhora ApoB",
        "Levedura vermelha do arroz só sob orientação médica — risco de miopatia",
      ],
      exercicio: [
        "150–300 min/semana de zona 2 (corrida leve, bike, caminhada rápida)",
        "2–3 sessões de treino de força semanais — melhora sensibilidade à insulina",
        "Evite sedentarismo prolongado: pausas ativas a cada 60 min",
      ],
      sono: [
        "7–9h por noite — privação crônica piora o perfil lipídico",
        "Suspeita de apneia do sono (ronco alto + pausas respiratórias presenciadas + sonolência diurna ou STOP-BANG ≥3) → confirme com polissonografia ou poligrafia portátil; SAOS não tratada piora perfil lipídico e cardiovascular",
      ],
    },
    relatedBiomarkerIds: ["apob", "hdl", "hba1c"],
    rangeContext:
      "Diretrizes oficiais variam por risco: SBC/AHA usam <100 para baixo risco e <70 em alto risco; ESC 2019 vai mais agressivo (<55 em muito alto risco, <40 em recorrência). Para protocolos de longevidade em adultos sem evento prévio, <70 é alvo razoável quando combinado com ApoB baixa — sempre individualizar conforme idade, histórico familiar e calcium score.",
  },

  apob: {
    id: "apob",
    whatItIs:
      "A ApoB é a proteína presente em cada partícula aterogênica (LDL, VLDL, IDL, Lp(a)). Medir ApoB dá a contagem exata dessas partículas — é um termômetro mais preciso do risco cardiovascular do que o LDL sozinho.",
    whyItMatters:
      "Em cerca de 20–30% das pessoas, o LDL-C é discordante da ApoB: alguém pode ter LDL 'normal' com muitas partículas pequenas e densas, o verdadeiro motor da aterosclerose. Meta-análises mostram que ApoB prediz eventos cardiovasculares melhor do que LDL. Médicos de longevidade consideram ApoB o marcador lipídico de primeira linha.",
    factors: [
      "Produção hepática elevada por resistência à insulina e fígado gorduroso",
      "Dieta rica em carboidratos refinados e frutose",
      "Excesso de gordura visceral",
      "Genética (Lp(a) herdada, variantes em APOB)",
      "Hipotireoidismo subclínico",
      "Consumo excessivo de gordura saturada",
    ],
    improve: {
      rotina: [
        "Alinhe ApoB abaixo de 60 mg/dL para longevidade; abaixo de 80 como mínimo",
        "Dose Lp(a) uma vez na vida — se alta, mira ApoB ainda mais baixa",
        "Monitore junto com LDL a cada 6 meses",
      ],
      alimentacao: [
        "Reduza açúcares adicionados — a OMS recomenda <10% das calorias totais (≈50g em dieta de 2000 kcal) e idealmente <5% (≈25g) para benefício máximo cardiometabólico",
        "Priorize gorduras monoinsaturadas: azeite, abacate, oleaginosas",
        "Aumente fibra solúvel — aveia, feijão, chia, linhaça",
        "Minimize álcool — a via hepática sobrepõe síntese de VLDL",
      ],
      suplementacao: [
        "Ômega-3 EPA/DHA: 2–4g/dia reduz triglicérides e partículas VLDL",
        "Berberina: 500mg 2–3x/dia — efeito tipo metformina, baixa ApoB",
        "Psyllium ou beta-glucana antes das refeições",
      ],
      exercicio: [
        "Zona 2 150–300 min/semana — melhora clearance hepático de partículas",
        "Treino de força 2–3x/semana — reduz gordura visceral",
        "HIIT 1–2x/semana para melhorar sensibilidade à insulina",
      ],
      sono: [
        "7–9h noturnas — sono curto eleva triglicérides e partículas aterogênicas",
        "Evite refeição pesada nas 3h antes de dormir",
      ],
    },
    relatedBiomarkerIds: ["ldl", "hdl", "hba1c"],
    rangeContext:
      "Abaixo de 90 mg/dL é considerado 'normal' no Brasil, mas para prevenção primária de alto padrão o alvo é abaixo de 60 mg/dL. Pacientes com histórico cardiovascular devem mirar abaixo de 50.",
  },

  vitd: {
    id: "vitd",
    whatItIs:
      "Vitamina D (mensurada como 25-hidroxivitamina D) é um hormônio esteroide produzido na pele sob luz UVB e ativado no fígado e rins. Atua em mais de 200 genes — regula cálcio, função imune, humor e inflamação.",
    whyItMatters:
      "Deficiência crônica está associada a maior risco de fraturas, infecções respiratórias, quedas em idosos, doenças autoimunes e mortalidade por todas as causas. Para longevidade, mirar 40–60 ng/mL é o consenso — suficiente para funções imunes sem entrar no risco de hipercalcemia.",
    factors: [
      "Exposição solar limitada (trabalho indoor, clima, proteção solar)",
      "Pele mais escura requer 3–5x mais exposição solar para a mesma síntese",
      "Obesidade sequestra vitamina D no tecido adiposo",
      "Idade — a síntese cutânea cai 50% após os 70",
      "Má absorção (doença celíaca, cirurgia bariátrica, inflamação intestinal)",
      "Baixa ingestão alimentar (poucos alimentos contêm quantidade significativa)",
      "Uso de corticoides e anticonvulsivantes",
    ],
    improve: {
      rotina: [
        "Meça níveis a cada 3 meses ao iniciar suplementação, depois anualmente",
        "Exposição solar segura: 15–20 min com braços/pernas expostos, fora do pico UV",
        "Reavalie dose se houver mudança de peso significativa",
      ],
      alimentacao: [
        "Peixes gordos: salmão selvagem, sardinha, cavala (400–1000 UI por porção)",
        "Gema de ovo — 2 ovos fornecem cerca de 80 UI",
        "Cogumelos expostos ao sol (shiitake, shimeji) — fonte vegetal de D2",
        "Leite e iogurte fortificados em algumas marcas",
      ],
      suplementacao: [
        "Vitamina D3 (colecalciferol) 1.000–4.000 UI/dia é a faixa de manutenção segura recomendada pela Endocrine Society e SBEM 2018 sem monitoramento. Doses acima (5.000+ UI/dia) podem ser necessárias para repor deficiência mas devem ser tituladas por dosagem sérica de 25(OH)D — risco de hipercalcemia em uso crônico sem monitorar",
        "Tome junto com refeição que contenha gordura para melhor absorção",
        "Considere vitamina K2 (MK-7) 100–200 mcg/dia — alguns estudos observacionais sugerem benefício no direcionamento de cálcio ao osso (Rotterdam Study, NEJM-PURE), mas RCTs com desfecho duro ainda são limitados",
        "Magnésio suficiente (300–400mg/dia) é cofator para ativação da vitamina D",
      ],
      exercicio: [
        "Treinos ao ar livre pela manhã combinam exercício e síntese cutânea",
        "Treino de força preserva densidade óssea — sinergia com vitamina D",
      ],
      sono: [
        "Estudos observacionais associam baixa 25(OH)D a pior qualidade do sono; RCTs com reposição são poucos e de efeito modesto — o sono melhora mais com higiene de sono e tratamento de SAOS do que com suplementação isolada de vitamina D",
        "Tome o suplemento pela manhã — doses noturnas podem atrapalhar a melatonina",
      ],
    },
    relatedBiomarkerIds: ["ferritin", "crp", "testo"],
    rangeContext:
      "Laboratórios costumam marcar 'suficiente' acima de 30 ng/mL, mas evidências para longevidade, função imune e densidade óssea apontam para 40–60 ng/mL. Acima de 100 ng/mL pode causar hipercalcemia — não vá além sem monitoramento.",
  },

  ferritin: {
    id: "ferritin",
    whatItIs:
      "A ferritina é a proteína que estoca ferro dentro das células. O exame reflete as reservas corporais de ferro — é o primeiro marcador a cair em deficiência e sobe antes de a anemia aparecer.",
    whyItMatters:
      "Ferro é cofator para hemoglobina, enzimas mitocondriais e síntese de neurotransmissores. Baixa ferritina causa fadiga, queda de cabelo, má performance cognitiva e física mesmo sem anemia. Por outro lado, ferritina muito alta (acima de 300 em homens) pode indicar hemocromatose ou inflamação e acelera o envelhecimento por estresse oxidativo.",
    factors: [
      "Perda sanguínea (menstruação abundante, sangramento digestivo oculto)",
      "Má absorção — celíaca, gastrite atrófica, uso crônico de IBP",
      "Dieta pobre em ferro heme (vegetarianos, veganos)",
      "Inflamação crônica eleva ferritina mesmo com estoques baixos",
      "Exercício de alta intensidade aumenta demanda de ferro",
      "Hemocromatose hereditária causa sobrecarga",
      "Doação frequente de sangue pode baixar as reservas",
    ],
    improve: {
      rotina: [
        "Se ferritina estiver abaixo de 50, investigue causa antes de suplementar",
        "Meça junto com PCR — ferritina elevada sem PCR alta sugere sobrecarga real",
        "Reavalie em 8–12 semanas após início de suplementação",
      ],
      alimentacao: [
        "Ferro heme: carne vermelha magra, frango escuro, fígado (1x/semana)",
        "Ferro não-heme: lentilha, feijão, espinafre — combine com vitamina C",
        "Evite chá e café nas refeições — taninos reduzem absorção em 60–80%",
        "Cálcio em excesso compete com ferro — não junte laticínio com refeição de ferro",
      ],
      suplementacao: [
        "Bisglicinato de ferro 25–50mg em dias alternados — melhor absorção que sulfato",
        "Tome em jejum com vitamina C (200mg) ou suco de laranja",
        "Evite proton pump inhibitors nos dias de suplementação",
        "Lactoferrina 200mg é alternativa gentle para estômagos sensíveis",
      ],
      exercicio: [
        "Atletas de endurance têm maior demanda — monitore ferritina anualmente",
        "Exercício intenso pode causar hemólise em pisadas — use tênis amortecido",
      ],
      sono: [
        "Ferro baixo piora síndrome das pernas inquietas e sono REM",
        "Reponha antes de investigar distúrbios do sono inexplicados",
      ],
    },
    relatedBiomarkerIds: ["crp", "vitd"],
    rangeContext:
      "Faixa de referência laboratorial padrão (Mayo Clinic): ♂ 24–336 ng/mL, ♀ 11–307 ng/mL. Em populações específicas o ponto de corte clínico para deficiência funcional pode ser maior — atletas de endurance e mulheres em idade fértil costumam funcionar melhor com ferritina ≥50 ng/mL (sintomas como fadiga, queda de cabelo, brain fog aparecem mesmo com hemoglobina normal quando ferritina <30–50). Para longevidade, mirar 50–150 ng/mL é razoável; valores muito altos (>300 ♂ ou >200 ♀ sem causa óbvia) devem ser investigados — hemocromatose, MASLD, síndrome metabólica.",
    disclaimer:
      "Ferritina pode estar falsamente elevada em estados inflamatórios. Se o valor estiver acima da faixa, dose também PCR e saturação de transferrina antes de concluir sobrecarga.",
  },

  hdl: {
    id: "hdl",
    whatItIs:
      "O HDL participa do chamado 'transporte reverso de colesterol', captando colesterol dos tecidos e devolvendo ao fígado. Historicamente chamado de 'colesterol bom', mas evidência recente mostra que o número absoluto isolado é menos preditivo que se imaginava — a capacidade funcional do HDL (efflux capacity, medida em pesquisa) e a soma de fatores cardiometabólicos importam mais.",
    whyItMatters:
      "HDL baixo é marcador de resistência à insulina, sedentarismo e inflamação — e associa-se a maior risco cardiovascular. Porém, elevar HDL artificialmente com medicamentos não reduziu eventos em ensaios clínicos. O HDL é sentinela de um estilo de vida saudável, não alvo terapêutico direto.",
    factors: [
      "Atividade física regular — maior determinante modificável",
      "Tabagismo reduz HDL de forma dose-dependente",
      "Gordura visceral e resistência à insulina baixam HDL",
      "Álcool em quantidade moderada pode elevar (mas o saldo é negativo)",
      "Genética responde por grande parte da variação individual",
      "Estrogênio eleva HDL — mulheres pré-menopausa têm valores mais altos",
      "Dieta low-fat extrema pode reduzir HDL",
    ],
    improve: {
      rotina: [
        "Pare de fumar — pode elevar HDL em 5–10 mg/dL em 12 meses",
        "Mantenha circunferência abdominal abaixo de 94cm (homens) / 80cm (mulheres)",
        "Limite álcool; se consumir, máximo 7 doses/semana",
      ],
      alimentacao: [
        "Azeite extravirgem 2–4 colheres/dia — sinergia mediterrânea com HDL",
        "Castanhas e nozes 30g/dia: associados a redução de mortalidade cardiovascular (Bao et al., NEJM 2013) e melhora modesta no perfil lipídico — efeito sobre HDL é pequeno mas o efeito cardioprotetor agregado é consistente",
        "Peixes gordos 2–3x/semana",
        "Reduza carboidratos refinados — triglicérides altos reduzem HDL",
      ],
      suplementacao: [
        "Ômega-3 EPA/DHA 2–4g/dia: efeito modesto no HDL, mas reduz triglicérides",
        "Niacina foi historicamente usada pra elevar HDL — descontinuada como estratégia cardiovascular após AIM-HIGH (2011) e HPS2-THRIVE (2014) mostrarem que não reduz eventos e adiciona toxicidade. Não busque elevar HDL com niacina.",
        "Antioxidantes da dieta (azeite, frutas vermelhas, vegetais) são preferíveis a suplementos isolados",
      ],
      exercicio: [
        "Zona 2 ≥150 min/semana — melhor alavanca para elevar HDL",
        "HIIT 1–2x/semana — potencializa resposta",
        "Treino de força 2–3x/semana complementa o efeito aeróbico",
      ],
      sono: [
        "Privação de sono crônica reduz HDL e eleva triglicérides",
        "Trate apneia — melhora perfil lipídico em 3–6 meses",
      ],
    },
    relatedBiomarkerIds: ["ldl", "apob", "hba1c"],
    rangeContext:
      "Para homens, acima de 40 é considerado aceitável; acima de 60 é protetor. Mulheres: acima de 50 aceitável, acima de 60 protetor. Valores muito altos (>100) podem indicar disfunção do transporte e não são necessariamente positivos.",
  },

  hba1c: {
    id: "hba1c",
    whatItIs:
      "A hemoglobina glicada reflete a média de glicose no sangue nos últimos 2–3 meses. Quando a glicose circula, ela se liga à hemoglobina de forma irreversível — quanto maior a exposição, maior a fração glicada.",
    whyItMatters:
      "HbA1c é um dos mais fortes preditores contínuos de envelhecimento acelerado: a curva de risco cardiovascular, declínio cognitivo, câncer e mortalidade global sobe progressivamente acima de ~5,5%, com aceleração clara a partir de pré-diabetes. Para longevidade, o alvo funcional é abaixo de 5,4% — mantendo a resistência à insulina sob controle.",
    factors: [
      "Ingestão de carboidratos refinados e açúcares",
      "Sedentarismo — músculo em repouso não absorve glicose",
      "Gordura visceral e fígado gorduroso causam resistência à insulina",
      "Sono curto ou irregular piora sensibilidade à insulina",
      "Estresse crônico eleva cortisol e glicose",
      "Genética e história familiar de diabetes",
      "Anemia e hemoglobinopatias podem distorcer o resultado",
    ],
    improve: {
      rotina: [
        "Monitor contínuo de glicose por 2 semanas/ano para mapear picos pós-prandiais",
        "Mantenha peso corporal e circunferência abdominal estáveis",
        "Jejum intermitente 14–16h noturnas pode melhorar sensibilidade à insulina",
      ],
      alimentacao: [
        "Ordem dos alimentos: fibras e proteína antes de carboidratos reduz picos em 30–50%",
        "Prefira carboidratos integrais: arroz integral, quinoa, batata-doce",
        "Elimine bebidas açucaradas e sucos",
        "Vinagre (1–2 colheres de sopa diluídas) antes de refeição rica em carboidrato pode atenuar o pico glicêmico — efeito modesto, mas inofensivo e barato",
      ],
      suplementacao: [
        "Berberina 500mg 2–3x/dia — efeito semelhante à metformina na HbA1c",
        "Ômega-3 2–4g/dia melhora perfil glicêmico",
        "Magnésio 300–400mg/dia — cofator da sinalização da insulina",
        "Inositol (myo+D-chiro) melhora sensibilidade, especialmente em SOP",
      ],
      exercicio: [
        "Caminhada de 10–15 min após cada refeição reduz picos em 12–20%",
        "Zona 2 150–300 min/semana melhora sensibilidade hepática",
        "Treino de força 2–3x/semana — músculo é o maior reservatório de glicose",
        "HIIT 1–2x/semana — forte efeito sobre sensibilidade à insulina",
      ],
      sono: [
        "7–9h — 5h de sono por 4 noites já reduz sensibilidade à insulina em 30%",
        "Mantenha horário consistente — irregularidade circadiana piora a glicemia",
      ],
    },
    relatedBiomarkerIds: ["ldl", "apob", "crp"],
    rangeContext:
      "Abaixo de 5,7% é considerado 'normal' pela ADA; entre 5,7 e 6,4% é pré-diabetes; acima de 6,5% é diabetes. Para longevidade, o alvo é abaixo de 5,4% — ponto em que o risco vascular começa a subir.",
  },

  tsh: {
    id: "tsh",
    whatItIs:
      "O TSH é o hormônio estimulador da tireoide, produzido pela hipófise. Ele age como termostato: sobe quando a tireoide produz pouco T3/T4 e cai quando produz muito. É o primeiro marcador a alterar em disfunções tireoidianas.",
    whyItMatters:
      "A tireoide regula metabolismo basal, temperatura corporal, humor, função cognitiva e lipídios. Hipotireoidismo subclínico (TSH 4–10) está associado a fadiga, ganho de peso, dislipidemia e pior performance cognitiva. Manter TSH entre 0,5 e 2,5 é o ótimo funcional para a maioria dos adultos.",
    factors: [
      "Deficiência de iodo, selênio ou zinco",
      "Doença autoimune (Hashimoto é a principal causa no Brasil)",
      "Estresse crônico e cortisol elevado suprimem a conversão T4→T3",
      "Restrição calórica extrema ou dietas de longa duração",
      "Disruptores endócrinos (BPA, ftalatos, certos agrotóxicos)",
      "Gravidez e pós-parto alteram função tireoidiana",
      "Medicações — lítio, amiodarona, interferon",
    ],
    improve: {
      rotina: [
        "Meça TSH anualmente junto com T4 livre e anti-TPO se houver histórico familiar",
        "Reduza exposição a BPA — evite enlatados e plásticos #3 e #7",
        "Avalie estresse crônico — cortisol elevado abafa função tireoidiana",
      ],
      alimentacao: [
        "Iodo suficiente: frutos do mar, algas (com moderação), sal iodado",
        "Selênio: 2 castanhas-do-brasil/dia já cobre necessidade",
        "Zinco: carnes, sementes de abóbora, ostras",
        "Evite excesso de goitrogênicos crus (couve, brócolis em grandes quantidades) se houver hipotireoidismo",
      ],
      suplementacao: [
        "Selênio 100–200 µg/dia em Hashimoto (anti-TPO+) pode reduzir títulos de anti-TPO em meta-análises (Toulis et al., Thyroid 2010), mas o impacto sobre desfecho clínico (progressão para hipotireoidismo, qualidade de vida) ainda é incerto — discuta com endócrino",
        "Zinco 15–25mg/dia: cofator na conversão periférica T4→T3, suplementar quando ingestão dietética baixa",
        "Tirosina oral isolada NÃO melhora função tireoidiana em pessoas com dieta adequada — a tireoide precisa de tirosina + iodo via tireoglobulina, mas não há evidência de que suplementação oral aumente síntese hormonal",
        "Evite excesso de iodo (>500 µg/dia) em Hashimoto — pode piorar autoimunidade (evidência mecanística + alguns estudos epidemiológicos)",
      ],
      exercicio: [
        "Exercício moderado e consistente apoia função tireoidiana",
        "Evite excesso de endurance sem reposição calórica — pode suprimir conversão",
        "Treino de força 2x/semana preserva massa muscular em hipotireoidismo",
      ],
      sono: [
        "7–9h — privação eleva TSH e prejudica conversão periférica",
        "Ritmo circadiano regular é crítico para função tireoidiana",
      ],
    },
    relatedBiomarkerIds: ["ldl", "ferritin", "vitd"],
    rangeContext:
      "Laboratórios usam 0,4–4,5 µUI/mL como 'normal', mas a literatura de longevidade mira 0,5–2,5. Valores entre 2,5 e 4,5 em pessoa sintomática devem ser investigados com T4 livre e anti-TPO.",
    disclaimer:
      "TSH flutua — avalie em jejum, pela manhã, e interprete junto com T4 livre. Não ajuste medicação com base em um único exame.",
  },

  crp: {
    id: "crp",
    whatItIs:
      "A PCR ultra-sensível mede inflamação sistêmica de baixo grau. É uma proteína produzida pelo fígado em resposta a sinais inflamatórios — um resumo numérico de quanto 'fogo baixo' está queimando no corpo.",
    whyItMatters:
      "Inflamação crônica é motor comum de doença cardiovascular, neurodegeneração, câncer e diabetes. Uma PCR elevada sem causa aguda (infecção, trauma) sinaliza envelhecimento acelerado. O alvo para longevidade é abaixo de 1 mg/L — idealmente abaixo de 0,5.",
    factors: [
      "Gordura visceral é fonte primária de inflamação crônica",
      "Dieta ultraprocessada e rica em açúcar",
      "Sedentarismo",
      "Tabagismo e poluição do ar",
      "Infecções dentárias (periodontite é causa silenciosa comum)",
      "Sono insuficiente ou fragmentado",
      "Estresse psicológico crônico",
      "Doenças autoimunes e alergias não tratadas",
    ],
    improve: {
      rotina: [
        "Faça checagem odontológica a cada 6 meses — doença periodontal eleva PCR",
        "Reduza estresse com meditação 10–15 min/dia — evidência mostra queda de PCR",
        "Evite repetir o exame durante infecção aguda — pode enganar a interpretação",
      ],
      alimentacao: [
        "Padrão mediterrâneo: vegetais, azeite, peixes — reduz PCR em 15–30%",
        "Cúrcuma com pimenta-preta 1g/dia — efeito anti-inflamatório documentado",
        "Chá verde 2–3 xícaras/dia — polifenóis com efeito sistêmico",
        "Elimine açúcar adicionado e óleos refinados (soja, milho, girassol)",
      ],
      suplementacao: [
        "Ômega-3 EPA/DHA 2–4g/dia — reduz PCR em ~30% com uso consistente",
        "Curcumina (forma biodisponível): 500mg 2x/dia",
        "Vitamina D se deficiente — modula inflamação",
        "Probióticos de cepas com evidência (Lactobacillus rhamnosus, Bifidobacterium)",
      ],
      exercicio: [
        "Exercício regular reduz PCR cronicamente, apesar de elevar agudamente",
        "Zona 2 e treino de força combinados: maior efeito anti-inflamatório",
        "Evite overtraining — cargas excessivas elevam inflamação",
      ],
      sono: [
        "Sono crônico curto (<6h) ou fragmentado eleva marcadores inflamatórios incluindo PCR (meta-análise Irwin et al., Sleep 2016) — magnitude modesta no PCR isolado mas efeito agregado relevante quando há outros gatilhos inflamatórios",
        "Trate apneia — forte fonte de inflamação sistêmica",
      ],
    },
    relatedBiomarkerIds: ["ldl", "apob", "hba1c"],
    rangeContext:
      "Abaixo de 1 mg/L é considerado baixo risco; entre 1 e 3 mg/L é risco intermediário; acima de 3 é alto risco. Valores acima de 10 sugerem infecção ou processo agudo — repita após 4 semanas.",
    disclaimer:
      "PCR pode estar transitoriamente elevada após exercício intenso, vacinação ou infecções leves. Repita se houver dúvida — interprete o padrão, não um número isolado.",
  },

  testo: {
    id: "testo",
    whatItIs:
      "A testosterona total é o principal hormônio androgênico, produzido majoritariamente nos testículos em homens e em menor quantidade nos ovários e suprarrenais em mulheres. Regula libido, massa muscular, densidade óssea, humor e metabolismo.",
    whyItMatters:
      "Níveis ótimos de testosterona sustentam composição corporal, função sexual, cognição e disposição. Declínio abaixo do ideal — comum após os 40 — está associado a sarcopenia, gordura visceral, depressão e maior mortalidade. Para homens, alvos funcionais ficam entre 500–900 ng/dL; o limite inferior do lab pode mascarar déficit real.",
    factors: [
      "Sono insuficiente — 5h por uma semana reduz testosterona em 15%",
      "Gordura visceral converte testosterona em estradiol via aromatase",
      "Estresse crônico e cortisol elevado suprimem produção",
      "Exercício excessivo sem recuperação reduz níveis",
      "Deficiência de zinco, magnésio ou vitamina D",
      "Uso de álcool regular, especialmente cerveja (fitoestrógenos)",
      "Disruptores endócrinos — BPA, ftalatos, pesticidas",
      "Opioides e corticoides suprimem o eixo",
    ],
    improve: {
      rotina: [
        "Meça pela manhã (7–10h), em jejum — pico diurno",
        "Dose também testosterona livre e SHBG para interpretação completa",
        "Elimine álcool excessivo — especialmente pós-treino",
      ],
      alimentacao: [
        "Gorduras saudáveis suficientes: 25–35% das calorias (azeite, ovos, abacate)",
        "Zinco: ostras, carnes vermelhas, sementes de abóbora",
        "Dietas muito baixas em carboidrato a longo prazo + déficit calórico crônico podem reduzir testosterona em atletas de endurance (Whittaker & Wu, J Steroid Biochem 2021). Em adultos sedentários ou recreacionais comendo o suficiente, o impacto é menor",
        "Soja em consumo normal (até 1–2 porções/dia) NÃO suprime testosterona — meta-análise Hamilton-Reeves et al., Fertil Steril 2010. Doses muito altas de isoflavonas (≥100 mg/dia, equivalente a >1L de leite de soja/dia) podem ter efeito marginal",
      ],
      suplementacao: [
        "Vitamina D 2000–5000 UI/dia se deficiente — reposição eleva testosterona",
        "Zinco 15–25mg/dia se ingestão baixa",
        "Magnésio 300–400mg/dia — cofator de síntese",
        "Ashwagandha KSM-66 600mg/dia — evidência de elevação modesta em homens estressados",
      ],
      exercicio: [
        "Treino de força composto (agachamento, levantamento terra) 2–3x/semana",
        "HIIT 1–2x/semana — efeito agudo na testosterona",
        "Evite overtraining sustentado sem reposição calórica adequada — RED-S (Relative Energy Deficiency in Sport) reduz testosterona; balanço energético importa mais que volume bruto de treino",
        "Priorize recuperação entre sessões pesadas",
      ],
      sono: [
        "7–9h não negociáveis — o pico diurno de testosterona ocorre ao amanhecer e depende fortemente da arquitetura de sono REM/profundo; privação reduz testosterona total em ~10–15% após 1 semana (Leproult & Van Cauter, JAMA 2011)",
        "Horário consistente — variação grande piora eixo hormonal",
        "Quarto escuro e frio (18–20°C) otimiza arquitetura do sono",
      ],
    },
    relatedBiomarkerIds: ["vitd", "hba1c", "crp"],
    rangeContext:
      "Faixa laboratorial padrão para homens adultos é 300–1000 ng/dL, mas abaixo de 500 geralmente já cursa com sintomas. Alvo funcional para longevidade é 600–900 ng/dL. Para mulheres, a faixa é muito menor (15–70 ng/dL) e não deve ser interpretada pela referência masculina.",
    disclaimer:
      "Valores variam com hora do dia, estresse recente e idade. Antes de considerar reposição, investigue causas modificáveis (sono, peso, álcool) por 3–6 meses. Reposição hormonal requer avaliação médica especializada.",
  },

  alt: {
    id: "alt",
    whatItIs:
      "A ALT (alanina aminotransferase, ou TGP) é uma enzima produzida majoritariamente no fígado. Quando hepatócitos sofrem dano, ALT vaza para o sangue. É o marcador mais sensível de lesão hepática em estágio inicial.",
    whyItMatters:
      "ALT elevada em adultos sem consumo importante de álcool é hoje marcador chave de esteatose hepática (fígado gorduroso metabólico). A condição afeta mais de 30% dos adultos e é motor silencioso de resistência à insulina, dislipidemia e risco cardiovascular. Valores 'normais' altos (25–40) já podem indicar dano subclínico.",
    factors: [
      "Gordura visceral e obesidade central",
      "Resistência à insulina e síndrome metabólica",
      "Consumo de álcool — mesmo moderado eleva ALT",
      "Uso de medicamentos hepatotóxicos (estatinas, paracetamol em excesso, alguns antibióticos)",
      "Hepatites virais (B e C)",
      "Hepatite autoimune e doença celíaca",
      "Exercício intenso recente pode elevar transitoriamente",
      "Suplementos mal regulados (chás, anabolizantes, extratos concentrados)",
    ],
    improve: {
      rotina: [
        "Mantenha circunferência abdominal abaixo de 94cm (homens) / 80cm (mulheres)",
        "Peso estável — perdas de 5–10% reduzem ALT e revertem esteatose",
        "Reduza álcool a menos de 7 doses/semana, idealmente a zero se ALT elevada",
      ],
      alimentacao: [
        "Café 2–3 xícaras/dia — forte efeito hepatoprotetor documentado",
        "Padrão mediterrâneo com foco em vegetais, azeite e peixes",
        "Elimine frutose adicionada (refrigerantes, xaropes) — causa direto de esteatose",
        "Reduza carboidratos refinados; mantenha fibras acima de 25g/dia",
      ],
      suplementacao: [
        "Ômega-3 EPA/DHA 2–4g/dia reduz gordura hepática em 15–20%",
        "Vitamina E 400–800 UI/dia tem evidência em NASH biopsy-comprovada em não-diabéticos (PIVENS trial 2010) — para ALT borderline assintomático sem confirmação histológica a evidência é fraca; discuta com hepatologista antes de doses altas",
        "Berberina 500mg 2x/dia ajuda sensibilidade à insulina hepática",
        "Cuidado com chás 'detox' e suplementos sem procedência — podem ser hepatotóxicos",
      ],
      exercicio: [
        "Zona 2 150–300 min/semana reduz gordura hepática independente de perda de peso",
        "Treino de força 2–3x/semana melhora sensibilidade à insulina",
        "HIIT 1–2x/semana potencializa efeito",
      ],
      sono: [
        "7–9h — sono curto piora resistência à insulina e esteatose",
        "Evite refeições pesadas 3h antes de dormir",
      ],
    },
    relatedBiomarkerIds: ["hba1c", "ldl", "apob"],
    rangeContext:
      "Faixa laboratorial vai até 33 U/L (alguns labs até 40 ou 50), mas evidências apontam que ALT acima de 25 em homens e 20 em mulheres já pode sinalizar esteatose subclínica. Valores acima de 50 devem ser investigados com ultrassom hepático.",
    disclaimer:
      "Uma medida isolada pode refletir exercício intenso ou infecção recente. Repita em 4–6 semanas e investigue com hepatologista se persistir acima de 50.",
  },
};

export function getBiomarkerKnowledge(id: string): BiomarkerKnowledge | null {
  return BIOMARKER_KNOWLEDGE[id] ?? null;
}
