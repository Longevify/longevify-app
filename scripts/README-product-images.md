# Geração de imagens de produtos via OpenAI

Script: `scripts/generate-product-images.ts`

Gera imagens hero + variações de ângulo dos produtos da loja usando
**gpt-image-1** da OpenAI. Único arquivo do repo que depende da OpenAI
API — todo o resto do app usa Moonshot/Anthropic.

## Pré-requisitos

1. **OPENAI_API_KEY** com créditos disponíveis. Pega em
   [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. **tsx** instalado (já vem como dev dep do projeto).

## Como rodar (passo a passo)

Abre o terminal na raiz de `longevify-app/`.

```bash
# 1. Exporta a key (NÃO commita ela em nenhum arquivo!)
export OPENAI_API_KEY=sk-proj-...

# 2. Dry-run primeiro pra ver os prompts que serão usados (não gasta API)
npx tsx scripts/generate-product-images.ts --missing --dry-run

# 3. Se os prompts parecem OK, roda de verdade
npx tsx scripts/generate-product-images.ts --missing
```

Imagens vão pra `public/marketplace/<product-id>.png`. **Não precisa
commit do .png** — Vercel serve direto da pasta. Mas commitar é OK
(garante prod não depende de regenerar).

## O que cada modo faz

### `--missing` (default — 5 imagens)

Gera 1 hero shot pra cada produto sem `image` em `lib/products.ts`:

- `oura-ring-heritage` (wearable)
- `garmin-epix-pro` (wearable)
- `whoop-membership` (wearable)
- `withings-body-comp` (equipamento)
- `freestyle-libre-3` (equipamento)

**Custo**: ~$0.20 (5 imagens × $0.04 cada, qualidade medium 1024×1024).

### `--variations <product-id>` (4 ângulos)

Gera 4 variações de ângulo de câmera (front, side, top-down, back) pro
produto especificado. Salva em
`public/marketplace/variations/<product-id>/<angle>.png`.

```bash
npx tsx scripts/generate-product-images.ts --variations oura-ring-heritage
```

**Custo**: ~$0.16 por produto (4 × $0.04).

**Caveat sobre coerência**: cada chamada do OpenAI é independente, então
o produto NÃO É IDÊNTICO entre ângulos — pode mudar tom, formato, label.
Pra coerência forte (mesmo produto, ângulos diferentes), o caminho seria
usar image-to-image edit do gpt-image-1 (passa a primeira imagem como
referência). Não está implementado nesse script ainda — rodada atual é
só "interpretação independente do prompt em cada ângulo".

### `--all-variations` (todos os 16 produtos)

Gera 4 ângulos pra TODOS os produtos com imagem existente.

**Custo**: ~$2.56 (16 × 4 × $0.04).

### `--dry-run`

Adiciona em qualquer modo pra ver os prompts sem gastar API.

## Após rodar

1. Verifica visualmente as imagens em `public/marketplace/`:
   ```bash
   open public/marketplace
   ```
2. Se uma ficou ruim, deleta e roda só ela:
   ```bash
   rm public/marketplace/oura-ring-heritage.png
   npx tsx scripts/generate-product-images.ts --missing
   ```
3. Atualiza `lib/products.ts` adicionando o campo `image` em cada
   produto novo (próximo PR ou edição manual):
   ```ts
   {
     id: "oura-ring-heritage",
     // ...
     image: "/marketplace/oura-ring-heritage.png",  // ← adiciona
     // ...
   }
   ```
4. Commit:
   ```bash
   git add public/marketplace lib/products.ts
   git commit -m "feat(loja): imagens AI-generated pros 5 produtos sem hero"
   ```

## 3D 360° real

OpenAI image gen **NÃO faz 3D rotacionável** com coerência. Pra ter
visualização 360° real do produto:

1. **Polycam** ou **Luma AI** — fotografa 30+ ângulos do produto físico
   com seu iPhone, eles geram modelo 3D `.glb`. Custa $0-15/modelo.
2. **Tripo3D** ou **Meshy** — APIs que geram 3D a partir de 1 imagem.
   ~$0.30-1 por modelo. Resultado bom pra objetos simples.
3. **Frontend**: usa `<model-viewer>` (Google web component) ou Three.js
   pra renderizar o `.glb` no app com rotação por drag.

Não está implementado nesse script — é stack separado.

## Troubleshooting

### `OPENAI_API_KEY env var is required`

Você esqueceu de exportar a key. Roda:
```bash
export OPENAI_API_KEY=sk-proj-... && npx tsx scripts/generate-product-images.ts --missing
```

### `OpenAI API error 401`

Key inválida ou sem créditos. Ver
[platform.openai.com/usage](https://platform.openai.com/usage).

### Imagem ficou esquisita / não parece o produto

O prompt usa "physical hints" definidos em `describeProductPhysically()`
no script. Edita esses hints pra dar mais detalhe pro modelo. Re-roda só
o produto problemático.

### Custo subindo demais

Mude `quality: "medium"` pra `"low"` em `scripts/generate-product-images.ts`
(linha do `quality:`). Reduz pra ~$0.01 por imagem mas qualidade cai
visivelmente — só pra dev/teste.
