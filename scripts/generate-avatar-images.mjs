/**
 * Gera os 2 avatares corporais (male + female) usados em /dados via
 * OpenAI gpt-image-1.
 *
 * Estilo: manequim médico 3D, completamente branco (matte), pose neutra
 * frontal, fundo transparente — referência visual estilo Function Health.
 *
 * Uso:
 *   export OPENAI_API_KEY=sk-proj-...
 *   node scripts/generate-avatar-images.mjs           # gera os 2 PNGs
 *   node scripts/generate-avatar-images.mjs --female  # só feminino
 *   node scripts/generate-avatar-images.mjs --male    # só masculino
 *   node scripts/generate-avatar-images.mjs --dry-run # só mostra o prompt
 *
 * Custo (gpt-image-1, qualidade medium, 1024x1536):
 *   ~$0.06 por imagem · 2 imagens = ~$0.12 total
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO_ROOT, "public", "avatars");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-image-1";
const SIZE = "1024x1536"; // formato vertical (corpo inteiro)
const QUALITY = "medium";

const BASE_PROMPT = (sex) => {
  const buildHint =
    sex === "female"
      ? "slim narrow build, slightly hourglass overall outline, no surface details at all"
      : "broader shoulders build, straight outline, no surface details at all";
  return `
A pure white 3D rendered abstract artist's posing doll figure, like a smooth white wooden mannequin used by painters but with completely matte porcelain surface,
${buildHint},
standing upright in neutral pose facing the camera, arms straight at sides, legs together,
full figure visible from head to feet,
completely smooth featureless surface — no face, no hair, no clothing lines, no skin texture, just abstract geometric volumes,
the figure looks like a virtual avatar used in fitness tracking applications,
clean studio render, pure white background (#ffffff), soft top-down lighting with gentle cool gray shading to show form,
centered composition, vertical orientation, figure fills 80% of the frame vertically,
minimalist data visualization style
`.trim().replace(/\n+/g, " ");
};

async function generateImage(prompt) {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY env var is required.\n" +
        "  export OPENAI_API_KEY=sk-proj-...\n" +
        "  node scripts/generate-avatar-images.mjs",
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
      prompt,
      n: 1,
      size: SIZE,
      quality: QUALITY,
    }),
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

async function generateOne(sex, dryRun) {
  const prompt = BASE_PROMPT(sex);
  const filename = `body-${sex}.png`;
  const outPath = path.join(OUT_DIR, filename);

  console.log(`\n— ${sex.toUpperCase()} →  ${path.relative(REPO_ROOT, outPath)}`);
  console.log(`  prompt: ${prompt.slice(0, 120)}…`);

  if (dryRun) {
    console.log("  (dry-run — sem chamada à API)");
    return;
  }

  const buf = await generateImage(prompt);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(outPath, buf);
  console.log(`  ✓ salvo (${(buf.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyFemale = args.includes("--female");
  const onlyMale = args.includes("--male");

  const targets = onlyFemale
    ? ["female"]
    : onlyMale
      ? ["male"]
      : ["male", "female"];

  console.log(
    `\nGerando ${targets.length} avatar(es) ${dryRun ? "[DRY RUN]" : ""}\n  modelo: ${MODEL}  ·  size: ${SIZE}  ·  quality: ${QUALITY}`,
  );

  for (const sex of targets) {
    try {
      await generateOne(sex, dryRun);
    } catch (err) {
      console.error(`  ✗ falhou: ${err.message}`);
      process.exitCode = 1;
    }
  }
  console.log("\nFeito.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
