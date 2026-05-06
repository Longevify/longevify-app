/**
 * Gera imagens de produtos via OpenAI gpt-image-1.
 *
 * Modos:
 *   --missing            (default) gera 1 imagem hero pra cada produto sem `image`
 *   --variations <id>    gera 4 ângulos de câmera do produto especificado
 *                        (front, side, top-down, back). Cada uma 1024x1024.
 *   --all-variations     gera 4 ângulos pra todos os produtos COM imagem
 *                        existente (refresh com mais ângulos pro showcase)
 *   --dry-run            só mostra o que faria sem gastar API
 *
 * Como rodar:
 *   export OPENAI_API_KEY=sk-proj-...
 *   npx tsx scripts/generate-product-images.ts --missing
 *   # ou
 *   npx tsx scripts/generate-product-images.ts --variations oura-ring-heritage
 *
 * Custo (gpt-image-1, qualidade medium):
 *   - 1024x1024: ~$0.04 por imagem
 *   - 5 produtos sem imagem × 1 = ~$0.20
 *   - 16 produtos × 4 ângulos = ~$2.56
 *
 * Output:
 *   - Imagens hero salvas em public/marketplace/<id>.png
 *   - Variações salvas em public/marketplace/variations/<id>/<angle>.png
 *
 * Após rodar:
 *   - Atualiza lib/products.ts manualmente OR roda --update-types
 *   - git add public/marketplace + lib/products.ts
 *   - commit + push (script NÃO faz commit)
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PRODUCTS, type Product } from "../lib/products";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MARKETPLACE_DIR = path.join(REPO_ROOT, "public", "marketplace");
const VARIATIONS_DIR = path.join(MARKETPLACE_DIR, "variations");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-image-1";

interface OpenAIImageResponse {
  data: Array<{ b64_json?: string; url?: string }>;
  error?: { message: string };
}

interface GenerateOpts {
  prompt: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  quality?: "low" | "medium" | "high";
}

async function generateImage(opts: GenerateOpts): Promise<Buffer> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY env var is required. Run with:\n" +
        "  export OPENAI_API_KEY=sk-proj-...\n" +
        "  npx tsx scripts/generate-product-images.ts --missing",
    );
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: opts.prompt,
      n: 1,
      size: opts.size ?? "1024x1024",
      quality: opts.quality ?? "medium",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as OpenAIImageResponse;
  if (json.error) throw new Error(`OpenAI error: ${json.error.message}`);
  if (!json.data?.[0]?.b64_json) {
    throw new Error(`No b64 image returned: ${JSON.stringify(json)}`);
  }
  return Buffer.from(json.data[0].b64_json, "base64");
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

/**
 * Prompt pra hero shot do produto. Estilo: photo realistic packshot,
 * fundo limpo (branco off-white com leve gradient mint suave) consistente
 * com o brand Longevify (#f4faf6 background, accents em verde escuro).
 */
function heroPrompt(product: Product): string {
  const productHints = describeProductPhysically(product);
  return [
    `Professional product photography of ${product.name} — ${productHints}.`,
    `Style: clean studio packshot, soft diffused lighting from front-left,`,
    `subtle shadow underneath the product. Background: clean off-white with`,
    `very subtle mint-green gradient (#f4faf6 to #e7f5ec, top-left to bottom-right).`,
    `Centered composition, 80% of frame filled with the product, 10% padding.`,
    `Square 1:1 aspect ratio. Brand-aligned with Longevify (premium health/wellness).`,
    `Photorealistic, no text, no logos other than what's naturally on the product,`,
    `no people, no hands. Color palette: muted whites, mint greens, deep forest accents.`,
  ].join(" ");
}

function variationPrompt(
  product: Product,
  angle: "front" | "side" | "top-down" | "back",
): string {
  const angleDesc = {
    front: "front view, slight 5° tilt down, eye-level",
    side: "side profile view, 90° rotated, showing thickness/depth",
    "top-down": "top-down 45° view from above, showing top of product",
    back: "back view (rear of product), eye-level",
  }[angle];

  return (
    heroPrompt(product) +
    ` Camera angle: ${angleDesc}. Same product as a hero shot but rotated to this angle.`
  );
}

/**
 * Hint físico do produto pra ajudar o LLM a gerar com fidelidade visual.
 * Sem isso, gpt-image-1 inventa formas/cores aleatórias.
 */
function describeProductPhysically(product: Product): string {
  const hints: Record<string, string> = {
    "painel-basico":
      "a sleek diagnostic test kit box, mint green and off-white packaging, minimalist design, blood collection tube visible on box",
    "painel-avancado":
      "a premium diagnostic test kit box, dark green and gold accents, larger than the basic version, multiple blood collection tubes",
    "microbioma-intestinal":
      "a stool sample home collection kit box, tan/beige color, with collection tube inside",
    "vitamina-d":
      "an amber pill bottle with white cap, label showing 'Vitamina D 2000 UI', soft gel capsules visible through the bottle",
    "vitamina-c":
      "a tube of effervescent tablets, citrus orange label, 1000mg vitamin C, premium pharmacy packaging",
    "whey-protein":
      "a 900g matte black or sage green protein powder canister with white scoop and minimalist Longevify label",
    "magnesio-quelato":
      "a frosted glass pill bottle with mint green label, 'Magnésio Quelato 200mg', white capsules",
    melatonina:
      "a small amber pill bottle with deep blue/navy label, 'Melatonina 1mg', tiny capsules",
    "omega-3":
      "an amber pill bottle with golden cap, 'Ômega 3 1000mg', visible amber-colored fish oil softgel capsules",
    creatina:
      "a 300g matte white powder canister with mint green Longevify branding, 'Creatina Creapure', white scoop visible",
    zinco:
      "a small pharmacy bottle with grey/silver label, 'Zinco Quelato 25mg', white capsules visible",
    "oura-ring-heritage":
      "a sleek titanium smart ring, brushed silver matte finish, with subtle inner sensor LEDs visible",
    "garmin-epix-pro":
      "a premium AMOLED smartwatch with stainless steel bezel, dark face, sport band, displaying a watchface with running metrics",
    "whoop-membership":
      "a minimalist black fabric wristband with no display, woven texture, small charging dot visible",
    "withings-body-comp":
      "a modern bioimpedance bathroom scale, sleek glass top, dark grey or black, minimal LED display showing weight",
    "freestyle-libre-3":
      "a small round white circular sensor (about a coin size) with a peel-off backing, alongside a smartphone screenshot showing glucose data",
  };
  return hints[product.id] ?? `a premium ${product.kicker.toLowerCase()} product`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateMissingImages(dryRun: boolean) {
  const missing = PRODUCTS.filter((p) => !p.image);
  console.log(
    `📸 ${missing.length} products without image: ${missing.map((p) => p.id).join(", ")}\n`,
  );

  if (missing.length === 0) return;
  if (dryRun) {
    console.log("--dry-run mode, skipping API calls. Prompts that would be used:\n");
    missing.forEach((p) => {
      console.log(`### ${p.id}`);
      console.log(heroPrompt(p));
      console.log();
    });
    return;
  }

  await ensureDir(MARKETPLACE_DIR);

  for (const product of missing) {
    const outPath = path.join(MARKETPLACE_DIR, `${product.id}.png`);
    console.log(`🎨 Generating ${product.id}...`);
    try {
      const buf = await generateImage({ prompt: heroPrompt(product) });
      await fs.writeFile(outPath, buf);
      console.log(`   ✓ saved ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error(`   ✗ failed: ${(e as Error).message}`);
    }
  }

  console.log(
    `\n✅ Done. Now update lib/products.ts to add 'image: "/marketplace/<id>.png"' for each generated product.`,
  );
}

async function generateVariations(productId: string, dryRun: boolean) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    console.error(`Product not found: ${productId}`);
    process.exit(1);
  }

  const angles: Array<"front" | "side" | "top-down" | "back"> = [
    "front",
    "side",
    "top-down",
    "back",
  ];

  console.log(
    `🎨 Generating 4 variations for ${product.id} (front, side, top-down, back)\n`,
  );

  if (dryRun) {
    angles.forEach((a) => {
      console.log(`### ${a}`);
      console.log(variationPrompt(product, a));
      console.log();
    });
    return;
  }

  const outDir = path.join(VARIATIONS_DIR, product.id);
  await ensureDir(outDir);

  for (const angle of angles) {
    const outPath = path.join(outDir, `${angle}.png`);
    console.log(`🎨 ${product.id} / ${angle}...`);
    try {
      const buf = await generateImage({ prompt: variationPrompt(product, angle) });
      await fs.writeFile(outPath, buf);
      console.log(`   ✓ saved ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error(`   ✗ failed: ${(e as Error).message}`);
    }
  }

  console.log(`\n✅ Done. Variations in ${outDir}/`);
}

async function generateAllVariations(dryRun: boolean) {
  const withImage = PRODUCTS.filter((p) => p.image);
  console.log(`🎨 Generating 4 variations for ${withImage.length} products\n`);
  for (const p of withImage) {
    await generateVariations(p.id, dryRun);
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  if (args.includes("--missing")) {
    await generateMissingImages(dryRun);
    return;
  }

  if (args.includes("--all-variations")) {
    await generateAllVariations(dryRun);
    return;
  }

  const variationsIdx = args.indexOf("--variations");
  if (variationsIdx >= 0) {
    const id = args[variationsIdx + 1];
    if (!id) {
      console.error("Usage: --variations <product-id>");
      process.exit(1);
    }
    await generateVariations(id, dryRun);
    return;
  }

  console.log(`Usage:
  npx tsx scripts/generate-product-images.ts --missing
  npx tsx scripts/generate-product-images.ts --variations <product-id>
  npx tsx scripts/generate-product-images.ts --all-variations
  npx tsx scripts/generate-product-images.ts --missing --dry-run

Examples:
  npx tsx scripts/generate-product-images.ts --missing
  npx tsx scripts/generate-product-images.ts --variations oura-ring-heritage

Available product IDs:
${PRODUCTS.map((p) => `  - ${p.id}${p.image ? "  (has image)" : "  (no image)"}`).join("\n")}
`);
}

main().catch((e) => {
  console.error("\n❌", (e as Error).message);
  process.exit(1);
});
