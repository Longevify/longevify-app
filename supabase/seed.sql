-- Longevify — seed catalog tables (biomarker_definitions + products)
-- Safe to re-run (uses upsert).

-- -------------------------------------------------------------------------
-- biomarker_definitions (10 markers matching lib/mock-data.ts)
-- -------------------------------------------------------------------------
insert into public.biomarker_definitions
  (id, name, category_id, category_label, unit, optimal_min, optimal_max, normal_min, normal_max, reference_label, description)
values
  ('ldl', 'LDL Colesterol', 'cardiac', 'Cardiovascular', 'mg/dL', 0, 70, 70, 100, '< 100',
   'O LDL transporta colesterol ao fígado e tecidos. Níveis elevados aumentam risco cardiovascular.'),
  ('apob', 'Apolipoproteína B (ApoB)', 'cardiac', 'Cardiovascular', 'mg/dL', 0, 60, null, null, '< 60',
   'Marcador precoce de risco cardiovascular — mede o número de partículas aterogênicas.'),
  ('vitd', 'Vitamina D', 'nutrients', 'Nutrientes', 'ng/dL', 50, 80, 30, 50, '30 – 80',
   'Essencial para saúde óssea, função imune e regulação hormonal.'),
  ('ferritin', 'Ferritina', 'nutrients', 'Sangue', 'ng/dL', 50, 150, null, null, '50 – 150',
   'Reserva de ferro corporal. Níveis baixos sugerem deficiência.'),
  ('hdl', 'HDL Colesterol', 'cardiac', 'Cardiovascular', 'mg/dL', 46, 100, null, null, '> 46',
   'HDL — colesterol ''bom'' — protetor cardiovascular.'),
  ('hba1c', 'Hemoglobina Glicada (A1c)', 'metabolic', 'Metabólico', '%', 0, 5.4, 5.4, 5.7, '< 5.7',
   'Média da glicemia nos últimos 2-3 meses. Indicador-chave de risco metabólico.'),
  ('tsh', 'TSH', 'thyroid', 'Tireoide', 'µUI/mL', 0.5, 2.5, 0.4, 4.5, '0.5 – 2.5',
   'Hormônio que regula a tireoide.'),
  ('crp', 'PCR Ultra-sensível', 'immune', 'Inflamação', 'mg/L', 0, 1, 1, 3, '< 1',
   'Marcador de inflamação sistêmica.'),
  ('testo', 'Testosterona Total', 'hormonal', 'Hormonal', 'ng/dL', 500, 900, 300, 1000, '500 – 900',
   'Importante para massa muscular, libido e saúde óssea.'),
  ('alt', 'ALT (TGP)', 'hepatic', 'Hepática', 'U/L', 0, 33, null, null, '< 33',
   'Enzima hepática — marcador de saúde do fígado.')
on conflict (id) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  category_label = excluded.category_label,
  unit = excluded.unit,
  optimal_min = excluded.optimal_min,
  optimal_max = excluded.optimal_max,
  normal_min = excluded.normal_min,
  normal_max = excluded.normal_max,
  reference_label = excluded.reference_label,
  description = excluded.description;

-- -------------------------------------------------------------------------
-- products (14 items matching lib/products.ts)
-- -------------------------------------------------------------------------
insert into public.products
  (id, name, brand, category, badge, price_brl, short_description, long_description, benefits, usage, targets_biomarkers, rating, reviews_count)
values
  ('omega-3-nordic', 'Ômega 3 Ultimate (EPA/DHA)', 'Nordic Naturals', 'suplemento', 'Curadoria', 389,
   'Óleo de peixe de alta pureza com 2g de EPA+DHA por dose, padrão-ouro em estudos cardiometabólicos.',
   'Fórmula em triglicerídeos naturais, destilada molecularmente para remover metais pesados e PCBs. Concentração de 1280 mg de EPA + 720 mg de DHA por porção, dentro da faixa terapêutica usada em estudos de redução de triglicerídeos e suporte cardiovascular. Terceirizada em testes IFOS — certificação 5 estrelas para pureza e frescor. Embalagem com 60 cápsulas softgel.',
   '["Reduz triglicerídeos e apoia perfil lipídico","Suporte anti-inflamatório sistêmico","Saúde cerebral e cognitiva","Sem refluxo sabor limão"]'::jsonb,
   '2 cápsulas ao dia, preferencialmente junto das refeições principais.',
   '["ldl","hdl","crp","apob"]'::jsonb, 4.8, 1243),

  ('vitd3-k2', 'Vitamina D3 5000 UI + K2 MK-7', 'Thorne', 'suplemento', 'Top', 229,
   'Combinação sinérgica de D3 colecalciferol com K2 MK-7 para saúde óssea e cardiovascular.',
   'Vitamina D3 na forma colecalciferol (a mesma produzida pela pele) acoplada a 180 mcg de K2 MK-7 all-trans, que direciona o cálcio para ossos e dentes em vez de artérias. Formulação em MCT para absorção superior. Recomendada para níveis séricos de 25(OH)D abaixo de 50 ng/mL, tipicamente por 12 semanas de retomada.',
   '["Eleva 25(OH)D para faixa ótima","Direciona cálcio para ossos","Suporte imunológico","Base MCT, absorção rápida"]'::jsonb,
   '1 cápsula ao dia, junto a refeição com gordura — idealmente pela manhã.',
   '["vitd"]'::jsonb, 4.9, 2187),

  ('magnesio-glicinato', 'Magnésio Glicinato 400mg', 'Pure Encapsulations', 'suplemento', null, 179,
   'Forma quelada de magnésio com alta biodisponibilidade e excelente tolerância gastrointestinal.',
   'O magnésio é cofator de mais de 300 reações enzimáticas, incluindo síntese de ATP, regulação neuromuscular e sinalização de insulina. A forma glicinato (bisglicinato) é quelada a dois aminoácidos de glicina, evitando efeito laxativo comum em formas como óxido e citrato. Suporte a sono profundo e variabilidade da frequência cardíaca.',
   '["Melhora a qualidade do sono profundo","Reduz cãibras e tensão muscular","Suporte à regulação glicêmica","Sem efeito laxativo"]'::jsonb,
   '2 cápsulas 30-60 minutos antes de dormir.',
   '["hba1c","crp"]'::jsonb, 4.7, 892),

  ('creatina-mono', 'Creatina Monohidratada Creapure', 'Kion', 'suplemento', 'Top', 219,
   'Creatina Creapure pura, o suplemento mais estudado do mundo para performance e longevidade.',
   'Creatina monohidratada grau Creapure (Alzchem, Alemanha), padrão-ouro de pureza. Mais de 500 estudos clínicos suportam benefícios em força, potência, recuperação, neuroproteção e massa óssea. Dose diária de 5g mantém saturação muscular de fosfocreatina sem necessidade de fase de carga.',
   '["Aumenta força e potência muscular","Suporte cognitivo e neuroproteção","Preservação de massa magra com a idade","Melhora recuperação entre sessões"]'::jsonb,
   '5g (1 colher) ao dia, misturada em água ou shake, em qualquer horário.',
   '["testo","hba1c"]'::jsonb, 4.9, 3104),

  ('coq10-ubiquinol', 'Coenzima Q10 Ubiquinol 100mg', 'Jarrow Formulas', 'suplemento', null, 349,
   'Forma ativa (ubiquinol) da CoQ10, essencial para produção mitocondrial de ATP e saúde cardíaca.',
   'Ubiquinol é a forma reduzida da CoQ10, com biodisponibilidade até 4x superior à ubiquinona especialmente após os 40 anos, quando a capacidade de conversão diminui. Essencial para a cadeia de transporte de elétrons nas mitocôndrias. Particularmente indicada para usuários de estatinas, que depletam CoQ10 endógena.',
   '["Suporte mitocondrial e energético","Proteção cardíaca","Antioxidante potente","Repõe CoQ10 depletada por estatinas"]'::jsonb,
   '1 cápsula ao dia, com refeição contendo gordura.',
   '["ldl","apob"]'::jsonb, 4.6, 567),

  ('nmn-tru-niagen', 'Tru Niagen NR 300mg', 'ChromaDex', 'suplemento', 'Novo', 599,
   'Precursor de NAD+ (nicotinamida ribosídeo) patenteado com mais de 25 estudos clínicos em humanos.',
   'NR é um precursor direto de NAD+, coenzima central em metabolismo energético, reparo de DNA e sinalização de longevidade via sirtuínas. Níveis de NAD+ caem 40-50% entre os 40 e 60 anos. Suplementação com NR eleva NAD+ sanguíneo de forma dose-dependente em humanos. Tru Niagen é a forma mais clinicamente validada disponível.',
   '["Eleva NAD+ sanguíneo","Suporte à função mitocondrial","Ativação de sirtuínas de longevidade","25+ estudos clínicos em humanos"]'::jsonb,
   '1 cápsula ao dia pela manhã, com ou sem alimento.',
   '["hba1c","alt","crp"]'::jsonb, 4.5, 412),

  ('longevify-essentials', 'Longevify Essentials Daily', 'Longevify', 'longevify-original', 'Exclusivo', 449,
   'Multivitamínico premium formulado pela equipe médica Longevify em doses terapêuticas.',
   'Base diária com 32 micronutrientes em formas ativas (metilfolato, P-5-P, metilcobalamina, quelatos minerais). Dosagens ajustadas para o perfil de usuário com hábito preventivo — sem ferro, sem cálcio em excesso, com foco em cofatores de metilação e metabolismo mitocondrial. Substitui 4-5 frascos avulsos com melhor custo-benefício.',
   '["Formas ativas de vitaminas do complexo B","Quelatos minerais de alta absorção","Sem ferro (evita sobrecarga)","Formulado por médicos Longevify"]'::jsonb,
   '2 cápsulas ao dia, com a primeira refeição.',
   '["vitd","ferritin"]'::jsonb, 4.9, 156),

  ('longevify-protein-plant', 'Longevify Protein Plant', 'Longevify', 'longevify-original', 'Exclusivo', 329,
   'Blend vegetal de ervilha e arroz com perfil completo de aminoácidos, 25g de proteína por dose.',
   'Proteína vegetal combinando isolado de ervilha e concentrado de arroz integral, cobrindo todos os aminoácidos essenciais incluindo os BCAAs em proporção comparável ao whey. Baixo em FODMAPs, sem soja, sem açúcar adicionado. Adoçado com estévia orgânica. Suporta síntese proteica e preservação de massa magra.',
   '["25g de proteína completa por dose","Sem lactose, soja ou glúten","Baixo em FODMAPs","Aminograma comparável ao whey"]'::jsonb,
   '1 dose (35g) pós-treino ou entre refeições, em 300 ml de água ou leite vegetal.',
   '["testo","ferritin"]'::jsonb, 4.7, 284),

  ('oura-ring-heritage', 'Oura Ring Heritage Gen 3', 'Oura', 'wearable', 'Top', 2499,
   'Anel inteligente que mede sono, HRV, temperatura corporal e prontidão com precisão clínica.',
   'Oura Ring Gen 3 oferece o rastreamento de sono e recuperação mais validado cientificamente do mercado wearable. Mede estágios de sono, variabilidade da frequência cardíaca, frequência respiratória, temperatura corporal de pele e SpO2. Integra com Longevify via API para cruzamento com biomarcadores. Bateria de até 7 dias.',
   '["Tracking de sono com precisão clínica","HRV noturno contínuo","Temperatura corporal para detecção precoce","Bateria de 7 dias"]'::jsonb,
   'Uso contínuo no dedo indicador ou anelar, sincroniza via app Oura.',
   '["crp","hba1c"]'::jsonb, 4.7, 1890),

  ('garmin-epix-pro', 'Garmin Epix Pro Sapphire 47mm', 'Garmin', 'wearable', null, 7990,
   'Relógio multiesportivo premium com VO2max, lactate threshold e tela AMOLED protegida por safira.',
   'Top de linha da Garmin para atletas e entusiastas de performance. Mede VO2max, limiar de lactato, carga de treino e status de recuperação com algoritmos Firstbeat. GPS multibanda, mapas topográficos, lanterna LED embutida. Bateria de até 16 dias em uso smartwatch, 42h em GPS contínuo.',
   '["VO2max e limiar de lactato","GPS multibanda de alta precisão","Mapas topográficos offline","Bateria de 16 dias"]'::jsonb,
   'Uso contínuo no pulso. Sincroniza via Garmin Connect.',
   '["hba1c","testo"]'::jsonb, 4.8, 742),

  ('whoop-4', 'Whoop 4.0 (Membership 12 meses)', 'Whoop', 'wearable', null, 1890,
   'Pulseira focada em carga de treino, recuperação e strain — sem tela, foco puro em dados.',
   'Whoop é uma assinatura anual que inclui a pulseira 4.0 (sem custo separado de hardware). Mede continuamente HRV, frequência cardíaca, SpO2, temperatura de pele e sono com amostragem de alta frequência. Algoritmos de strain e recovery ajudam a calibrar intensidade de treino. Sem tela: filosofia ''screenless'' para reduzir distração.',
   '["Strain e recovery diários","HRV contínuo 24/7","Bateria recarregável sem remover","Sem tela, sem distração"]'::jsonb,
   'Uso contínuo 24/7 no pulso ou bíceps (com sleeve). Sincroniza via app Whoop.',
   '["crp","hba1c"]'::jsonb, 4.5, 1120),

  ('apple-watch-ultra', 'Apple Watch Ultra 2', 'Apple', 'wearable', null, 9299,
   'Smartwatch esportivo Apple com ECG, SpO2, temperatura do pulso e GPS dual-frequency.',
   'Apple Watch Ultra 2 traz ECG de derivação única, SpO2 noturno, sensor de temperatura do pulso e GPS de banda dupla. Case em titânio, certificação IP6X e MIL-STD-810H, visor Always-On de 3000 nits. Longevify não revende o Ultra diretamente — este item é informativo para usuários que já possuem ou pretendem comprar pela Apple.',
   '["ECG derivação única","Temperatura do pulso para ciclo e sono","GPS banda dupla","Ecossistema Apple Health"]'::jsonb,
   'Compra direta via Apple. Integração com Longevify via Apple HealthKit.',
   '["crp"]'::jsonb, 4.8, 3420),

  ('withings-body-comp', 'Withings Body Comp', 'Withings', 'equipamento', null, 1490,
   'Balança de bioimpedância que mede composição corporal, idade vascular e saúde dos nervos.',
   'Withings Body Comp mede peso, percentual de gordura, massa muscular segmentada, água corporal, massa óssea, gordura visceral, idade vascular (rigidez arterial estimada) e atividade do nervo (VNS score). Sincroniza via Wi-Fi com app Health Mate e pode integrar com Longevify via Withings API. Até 8 perfis de usuário.',
   '["Composição corporal segmentada","Idade vascular estimada","Sincronia Wi-Fi automática","8 perfis familiares"]'::jsonb,
   'Pesagem diária pela manhã, descalço, após acordar e usar o banheiro.',
   '["hba1c","ldl","apob"]'::jsonb, 4.6, 678),

  ('cgm-libre-3-kit', 'FreeStyle Libre 3 — Kit inicial', 'Abbott', 'equipamento', 'Novo', 1290,
   'Kit com 2 sensores CGM (28 dias) para monitorar glicose intersticial em tempo real.',
   'O FreeStyle Libre 3 mede glicose intersticial a cada minuto, sem necessidade de picadas em dedo, com sensor do tamanho de uma moeda aplicado no braço. Kit inicial Longevify inclui 2 sensores (cobertura de 28 dias) e orientação da equipe médica para interpretar glicemia pós-prandial, variabilidade e curva em jejum. Ideal para investigação metabólica mesmo fora de quadro diabético.',
   '["Glicose intersticial contínua","Picos pós-prandiais e variabilidade","Sem picadas em dedo","Orientação médica incluída"]'::jsonb,
   'Aplicar no braço. Cada sensor dura 14 dias. Leitura via celular.',
   '["hba1c"]'::jsonb, 4.7, 523)
on conflict (id) do update set
  name = excluded.name,
  brand = excluded.brand,
  category = excluded.category,
  badge = excluded.badge,
  price_brl = excluded.price_brl,
  short_description = excluded.short_description,
  long_description = excluded.long_description,
  benefits = excluded.benefits,
  usage = excluded.usage,
  targets_biomarkers = excluded.targets_biomarkers,
  rating = excluded.rating,
  reviews_count = excluded.reviews_count;
