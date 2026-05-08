/**
 * Gera imagens de produtos via OpenAI gpt-image-1.
 * Versão JavaScript puro (.mjs) — roda com `node` direto, sem tsx.
 *
 * Modos:
 *   --missing            (default) gera 1 imagem hero pra cada produto sem `image`
 *   --regenerate-all     regenera todas as 16 imagens com prompt padronizado
 *                        (background mint, soft lighting, ângulo consistente)
 *   --variations <id>    gera 4 ângulos de câmera do produto especificado
 *   --all-variations     gera 4 ângulos pra todos os produtos COM imagem existente
 *   --dry-run            só mostra o que faria sem gastar API
 *
 * Como rodar:
 *   export OPENAI_API_KEY=sk-proj-...
 *   node scripts/generate-product-images.mjs --missing
 *
 * Custo (gpt-image-1, qualidade medium):
 *   - 1024x1024: ~$0.04 por imagem
 *   - 5 produtos sem imagem × 1 = ~$0.20
 *   - 16 produtos × 4 ângulos = ~$2.56
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MARKETPLACE_DIR = path.join(REPO_ROOT, "public", "marketplace");
const VARIATIONS_DIR = path.join(MARKETPLACE_DIR, "variations");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-image-1";

// ─── Catálogo (lido inline pra não precisar de TS importer) ──────────────────
// Pra cada produto: { id, name, kicker, image (opcional) }
// Source of truth: lib/products.ts (mantido em sync manual)
const PRODUCTS = [
  { id: "painel-basico", name: "Painel Básico", kicker: "Exame Diagnóstico", image: "/marketplace/painel-basico.png" },
  { id: "painel-avancado", name: "Painel Avançado", kicker: "Exame Diagnóstico", image: "/marketplace/painel-avancado.png" },
  { id: "microbioma-intestinal", name: "Teste de Microbioma Intestinal", kicker: "Exame Diagnóstico", image: "/marketplace/microbioma-intestinal.png" },
  { id: "vitamina-d", name: "Vitamina D 2.000 UI", kicker: "Suplemento Longevify", image: "/marketplace/vitamina-d.png" },
  { id: "vitamina-c", name: "Vitamina C Efervescente 1.000mg", kicker: "Suplemento Longevify", image: "/marketplace/vitamina-c.png" },
  { id: "whey-protein", name: "Whey Protein Natural", kicker: "Suplemento Longevify", image: "/marketplace/whey-protein.png" },
  { id: "magnesio-quelato", name: "Magnésio Quelato 200mg", kicker: "Suplemento Longevify", image: "/marketplace/magnesio-quelato.png" },
  { id: "melatonina", name: "Melatonina 1mg", kicker: "Suplemento Longevify", image: "/marketplace/melatonina.png" },
  { id: "omega-3", name: "Ômega 3 Óleo de Peixe 1.000mg", kicker: "Suplemento Longevify", image: "/marketplace/omega-3.png" },
  { id: "creatina", name: "Creatina Monohidratada Creapure", kicker: "Suplemento Longevify", image: "/marketplace/creatina.png" },
  { id: "zinco", name: "Zinco Quelato 25mg", kicker: "Suplemento Longevify", image: "/marketplace/zinco.png" },
  // SEM imagem (gerar):
  { id: "oura-ring-heritage", name: "Oura Ring Heritage", kicker: "Wearable" },
  { id: "garmin-epix-pro", name: "Garmin Epix Pro", kicker: "Wearable" },
  { id: "whoop-membership", name: "Whoop 4.0 + Mensalidade Anual", kicker: "Wearable" },
  { id: "withings-body-comp", name: "Withings Body Comp", kicker: "Equipamento" },
  { id: "freestyle-libre-3", name: "FreeStyle Libre 3 (kit 2 sensores)", kicker: "Equipamento" },
];

// ─── OpenAI call ─────────────────────────────────────────────────────────────

async function generateImage({ prompt, size = "1024x1024", quality = "medium" }) {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY env var is required. Run with:\n" +
        "  export OPENAI_API_KEY=sk-proj-...\n" +
        "  node scripts/generate-product-images.mjs --missing",
    );
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, prompt, n: 1, size, quality }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.error) throw new Error(`OpenAI error: ${json.error.message}`);
  if (!json.data?.[0]?.b64_json) {
    throw new Error(`No b64 image returned: ${JSON.stringify(json)}`);
  }
  return Buffer.from(json.data[0].b64_json, "base64");
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

function describeProductPhysically(product) {
  const hints = {
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

function heroPrompt(product) {
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

function variationPrompt(product, angle) {
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

// ─── Modes ───────────────────────────────────────────────────────────────────

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateMissingImages(dryRun) {
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
      console.error(`   ✗ failed: ${e.message}`);
    }
  }

  console.log(
    `\n✅ Done. Now update lib/products.ts to add 'image: "/marketplace/<id>.png"' for each generated product.`,
  );
}

async function generateVariations(productId, dryRun) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    console.error(`Product not found: ${productId}`);
    process.exit(1);
  }

  const angles = ["front", "side", "top-down", "back"];
  console.log(`🎨 Generating 4 variations for ${product.id}\n`);

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
      console.error(`   ✗ failed: ${e.message}`);
    }
  }
  console.log(`\n✅ Done. Variations in ${outDir}/`);
}

async function generateAllVariations(dryRun) {
  const withImage = PRODUCTS.filter((p) => p.image);
  console.log(`🎨 Generating 4 variations for ${withImage.length} products\n`);
  for (const p of withImage) {
    await generateVariations(p.id, dryRun);
  }
}

/**
 * Regenera TODAS as 16 imagens hero com prompt padronizado.
 * Útil pra padronizar background, lighting, ângulo entre os 11 PNGs
 * que vieram da equipe original (estilos diferentes) + os 5 novos
 * AI-generated.
 *
 * Custo: ~$0.64 (16 × $0.04). Sobrescreve PNGs existentes.
 */
async function regenerateAll(dryRun) {
  console.log(
    `🎨 Regenerando todas as ${PRODUCTS.length} imagens hero com prompt padronizado\n`,
  );
  if (dryRun) {
    PRODUCTS.forEach((p) => {
      console.log(`### ${p.id}`);
      console.log(heroPrompt(p));
      console.log();
    });
    return;
  }

  await ensureDir(MARKETPLACE_DIR);
  for (const product of PRODUCTS) {
    const outPath = path.join(MARKETPLACE_DIR, `${product.id}.png`);
    console.log(`🎨 Regenerating ${product.id}...`);
    try {
      const buf = await generateImage({ prompt: heroPrompt(product) });
      await fs.writeFile(outPath, buf);
      console.log(`   ✓ saved ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error(`   ✗ failed: ${e.message}`);
    }
  }
  console.log(`\n✅ Done. ${PRODUCTS.length} imagens padronizadas.`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  if (args.includes("--missing")) {
    await generateMissingImages(dryRun);
    return;
  }

  if (args.includes("--regenerate-all")) {
    await regenerateAll(dryRun);
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
  node scripts/generate-product-images.mjs --missing
  node scripts/generate-product-images.mjs --variations <product-id>
  node scripts/generate-product-images.mjs --all-variations
  node scripts/generate-product-images.mjs --missing --dry-run

Available product IDs:
${PRODUCTS.map((p) => `  - ${p.id}${p.image ? "  (has image)" : "  (no image)"}`).join("\n")}
`);
}

main().catch((e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});
