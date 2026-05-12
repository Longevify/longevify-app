# Geração de imagens de produtos via OpenAI

Script: `scripts/generate-product-images.mjs` (JavaScript puro, roda com Node)

Gera imagens hero + variações de ângulo dos produtos da loja usando
**gpt-image-1** da OpenAI. Único arquivo do repo que depende da OpenAI
API — todo o resto do app usa Moonshot/Anthropic.

> Existe também uma versão `.ts` (`generate-product-images.ts`) mantida
> pra referência/typecheck, mas a versão recomendada pra rodar é a
> `.mjs` — sem dependência de tsx/ts-node, só Node 18+ nativo.

## Como rodar (5 passos)

Abre o **Terminal** no Mac:

```bash
# 1. Vai pra pasta do projeto
cd ~/Desktop/longevify/longevify-app

# 2. Pega a versão mais nova do código
git pull origin main

# 3. Cola sua OPENAI_API_KEY (sk-proj-...) sem aparecer na tela
echo "Cole sua OPENAI_API_KEY (sk-proj-...) e dê Enter:"
read -s OPENAI_API_KEY
export OPENAI_API_KEY

# 4. Dry-run: mostra os prompts sem gastar API
node scripts/generate-product-images.mjs --missing --dry-run

# 5. Se os prompts parecerem ok, gera de verdade (~1 min, custo ~$0.20)
node scripts/generate-product-images.mjs --missing
```

Imagens vão pra `public/marketplace/<id>.png`.

## O que cada modo faz

| Modo | Comando | Custo |
|------|---------|-------|
| `--missing` | `node scripts/generate-product-images.mjs --missing` | ~$0.20 (5 × $0.04) |
| `--variations <id>` | `node scripts/generate-product-images.mjs --variations oura-ring-heritage` | ~$0.16 (4 × $0.04) |
| `--all-variations` | `node scripts/generate-product-images.mjs --all-variations` | ~$2.56 (16 × 4 × $0.04) |
| `--dry-run` | adiciona em qualquer modo pra só ver prompts | Grátis |

### `--missing` (default — 5 imagens)

Gera 1 hero shot pra cada produto sem `image` em `lib/products.ts`:

- `oura-ring-heritage` (wearable)
- `garmin-epix-pro` (wearable)
- `whoop-membership` (wearable)
- `withings-body-comp` (equipamento)
- `freestyle-libre-3` (equipamento)

### `--variations <product-id>` (4 ângulos)

Gera 4 ângulos (front, side, top-down, back) pro produto especificado.
Salva em `public/marketplace/variations/<product-id>/<angle>.png`.

**Caveat sobre coerência**: cada chamada do OpenAI é independente, então
o produto NÃO É IDÊNTICO entre ângulos — pode mudar tom, formato, label.
Pra coerência forte (mesmo produto, ângulos diferentes), o caminho seria
usar image-to-image edit do gpt-image-1 (passa a primeira imagem como
referência). Não está implementado ainda.

## Após rodar

1. Verifica visualmente:
   ```bash
   open public/marketplace
   ```
2. Se uma ficou ruim, deleta e roda só ela:
   ```bash
   rm public/marketplace/oura-ring-heritage.png
   node scripts/generate-product-images.mjs --missing
   ```
3. Atualiza `lib/products.ts` adicionando o campo `image` (ou peça pro
   Claude fazer isso depois que mostrar o resultado).
4. Commit:
   ```bash
   git add public/marketplace lib/products.ts
   git commit -m "feat(loja): imagens AI-generated pros 5 produtos sem hero"
   git push
   ```

## Troubleshooting

### `OPENAI_API_KEY env var is required`

Você esqueceu de exportar. Repete o passo 3.

### `OpenAI API error 401`

Key inválida ou sem créditos. Ver [platform.openai.com/usage](https://platform.openai.com/usage).

### `OpenAI API error 429`

Rate limit. Espera 1 min e roda de novo.

### `command not found: node`

Instala Node 20+ via [nodejs.org](https://nodejs.org/).

### `tsx` rodando como shell script (erro com `(`...

O tsx está corrompido. Use a versão `.mjs` que não depende dele:
`node scripts/generate-product-images.mjs ...` em vez de `npx tsx ...`.

## 3D 360° real

OpenAI image gen **NÃO faz 3D rotacionável** com coerência. Pra ter
visualização 360° real do produto:

1. **Polycam** ou **Luma AI** — fotografa 30+ ângulos do produto físico
   com seu iPhone, eles geram modelo 3D `.glb`. Custo $0-15/modelo.
2. **Tripo3D** ou **Meshy** — APIs que geram 3D a partir de 1 imagem.
   ~$0.30-1 por modelo.
3. **Frontend**: usa `<model-viewer>` (Google web component) ou Three.js
   pra renderizar `.glb` no app.

Não está implementado nesse script — é stack separado.
