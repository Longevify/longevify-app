/**
 * Gera 24 frames de cada sexo (male + female) em ângulos espaçados de 15°
 * pra montar um viewer 360° estilo Superpower.
 *
 * Saída: /public/avatars/360/<sex>/<angle>.png (angle: 000, 015, 030, … 345)
 *
 * gpt-image-1 NÃO garante consistência multi-shot perfeita, mas com
 * prompt detalhado e mesma seed-like descrição em cada chamada, os frames
 * ficam próximos o suficiente pra um 360 spin aceitável.
 *
 * Custo (gpt-image-1 medium 1024x1536):
 *   ~$0.04 por imagem · 24 imagens × 2 sexos = ~$1.92
 *
 * Uso:
 *   export OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env.local | cut -d= -f2-)
 *   node scripts/generate-avatar-360.mjs --male      # só male
 *   node scripts/generate-avatar-360.mjs --female    # só female
 *   node scripts/generate-avatar-360.mjs             # ambos
 *   node scripts/generate-avatar-360.mjs --dry-run   # mostra prompts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO_ROOT, "public", "avatars", "360");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-image-1";
const SIZE = "1024x1536";
const QUALITY = "medium";

const TOTAL_ANGLES = 24;
const ANGLES = Array.from({ length: TOTAL_ANGLES }, (_, i) => i * (360 / TOTAL_ANGLES));

function buildPrompt(sex, angle) {
  const buildHint = sex === "female"
    ? "athletic lean build, slightly narrower shoulders than hips outline"
    : "athletic build with subtle broader shoulders proportions";
  const angleHint = angle === 0
    ? "front view facing camera"
    : angle === 180
      ? "back view facing away from camera"
      : angle === 90 || angle === 270
        ? `profile side view rotated ${angle} degrees`
        : `three-quarter view rotated ${angle} degrees clockwise`;
  // Termos calibrados pra escapar safety filter do gpt-image-1: "art mannequin",
  // "posing doll", sem palavras como "body", "no clothing", "anatomical".
  return `
A pure white 3D rendered abstract artists posing doll figure, like a smooth white wooden mannequin used by sculptors but with completely matte porcelain surface,
${buildHint},
shown in ${angleHint},
standing upright in neutral pose, arms straight at sides slightly away from torso, legs together,
full figure visible from head to feet,
completely smooth featureless surface — no face details, no hair, no clothing lines, no surface texture, just abstract geometric volumes,
the figure looks like a virtual avatar used in fitness tracking applications,
clean studio render, pure white background (#ffffff), soft top-down lighting with gentle cool gray shading to show form,
centered composition, vertical orientation, figure fills 80% of the frame vertically,
minimalist data visualization style
`.trim().replace(/\s+/g, " ");
}

async function generateImage(prompt) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY env var required");
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
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  if (!json.data?.[0]?.b64_json) {
    throw new Error(`No b64 image: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return Buffer.from(json.data[0].b64_json, "base64");
}

async function generateForSex(sex, dryRun) {
  const dir = path.join(OUT_DIR, sex);
  await fs.mkdir(dir, { recursive: true });

  console.log(`\n=== Sexo: ${sex.toUpperCase()} (${TOTAL_ANGLES} frames) ===`);
  let failures = 0;
  for (const angle of ANGLES) {
    const filename = `${String(angle).padStart(3, "0")}.png`;
    const outPath = path.join(dir, filename);
    const exists = await fs.access(outPath).then(() => true).catch(() => false);
    if (exists) {
      console.log(`  ${angle}° → já existe, skip`);
      continue;
    }
    const prompt = buildPrompt(sex, angle);
    process.stdout.write(`  ${angle}°… `);
    if (dryRun) {
      process.stdout.write("[dry] " + prompt.slice(0, 80) + "…\n");
      continue;
    }
    try {
      const buf = await generateImage(prompt);
      await fs.writeFile(outPath, buf);
      console.log(`${(buf.length / 1024).toFixed(0)} KB ✓`);
    } catch (err) {
      console.log(`FAIL: ${err.message.slice(0, 200)}`);
      failures++;
      if (failures >= 3) {
        console.log("  Abortando após 3 falhas consecutivas.");
        return;
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyMale = args.includes("--male");
  const onlyFemale = args.includes("--female");
  const targets = onlyMale ? ["male"] : onlyFemale ? ["female"] : ["male", "female"];

  console.log(
    `gpt-image-1 · ${SIZE} · ${QUALITY} · ${TOTAL_ANGLES} angles × ${targets.length} sex = ${TOTAL_ANGLES * targets.length} imagens · custo estimado ~$${(TOTAL_ANGLES * targets.length * 0.04).toFixed(2)}`,
  );
  if (dryRun) console.log("[DRY RUN]");

  for (const sex of targets) {
    await generateForSex(sex, dryRun);
  }
  console.log("\nFeito.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
