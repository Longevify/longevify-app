#!/usr/bin/env node
/**
 * Gera ícones do PWA + Capacitor a partir da logo Longevify (infinity).
 *
 * Uso:
 *   node scripts/generate-icons.mjs
 *
 * Outputs:
 *   public/icons/icon-{192,512}.png
 *   public/icons/icon-maskable-{192,512}.png  (com bg full-bleed pra
 *                                              Android adaptive crop)
 *   public/icons/apple-touch-icon.png         (180x180)
 *   public/icons/favicon-{16,32}.png
 *   app/icon.png                              (Next 16 pega auto)
 *   app/apple-icon.png                        (Next 16 pega auto)
 *   public/icons/splash-2732.png              (Capacitor splash)
 *
 * Roda manualmente quando atualizar `public/icons/logo-master.svg`.
 *
 * IMPORTANTE: depois de regerar, sincronizar Capacitor:
 *   cd mobile && npx cap sync
 *   (ou usar @capacitor/assets pra distribuir nos tamanhos iOS/Android)
 */

import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Logo principal (lê do arquivo mestre)
const ICON_SVG = await readFile(
  join(ROOT, "public/icons/logo-master.svg"),
  "utf-8",
);

/**
 * Versão MASKABLE do ícone — Android adaptive icons cortam num círculo
 * pelo launcher. Safe area: conteúdo vital nos 80% centrais. Pra isso,
 * inflamos o background pra cobrir 100% e diminuímos a logo.
 *
 * Usa o mesmo path da logo mas com viewBox maior (640x640) e a logo
 * centralizada nos 80% internos. Background full-bleed.
 */
const MASKABLE_SVG = ICON_SVG.replace(
  'viewBox="0 0 512 512"',
  'viewBox="-64 -64 640 640"',
);

// Splash screen Capacitor (2732x2732 cobre todos os device sizes)
// Logo + texto centralizados verticalmente, com padding generoso
const SPLASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="#0d2818"/>
  <g transform="translate(1100, 1100) scale(1)">
    <!-- Logo do tamanho 532x532 (usa o path original em coords 0..512) -->
    <path
      d="M 256 158.5
         A 130 130 0 1 1 256 353.5
         A 130 130 0 1 1 256 158.5
         Z"
      stroke="#d8eecf"
      stroke-width="46"
      stroke-linejoin="round"
      fill="none"
    />
  </g>
  <text
    x="1366"
    y="1820"
    font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
    font-size="120"
    font-weight="600"
    fill="#d8eecf"
    text-anchor="middle"
    letter-spacing="-2"
  >Longevify</text>
</svg>`;

const tasks = [
  // PWA standard
  { src: ICON_SVG, out: "public/icons/icon-192.png", size: 192 },
  { src: ICON_SVG, out: "public/icons/icon-512.png", size: 512 },
  // Maskable (Android adaptive)
  { src: MASKABLE_SVG, out: "public/icons/icon-maskable-192.png", size: 192 },
  { src: MASKABLE_SVG, out: "public/icons/icon-maskable-512.png", size: 512 },
  // Apple touch icon (Add to Home Screen Safari iOS)
  { src: ICON_SVG, out: "public/icons/apple-touch-icon.png", size: 180 },
  // Favicons
  { src: ICON_SVG, out: "public/icons/favicon-32.png", size: 32 },
  { src: ICON_SVG, out: "public/icons/favicon-16.png", size: 16 },
  // Next 16 auto-detected
  { src: ICON_SVG, out: "app/icon.png", size: 512 },
  { src: ICON_SVG, out: "app/apple-icon.png", size: 180 },
  // Capacitor splash master (cap-assets generate vai derivar tamanhos finais)
  { src: SPLASH_SVG, out: "public/icons/splash-2732.png", size: 2732 },
];

async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function generate() {
  console.log("Generating Longevify icons from logo-master.svg...\n");
  for (const t of tasks) {
    const outPath = join(ROOT, t.out);
    await ensureDir(outPath);
    const buf = await sharp(Buffer.from(t.src))
      .resize(t.size, t.size, { fit: "contain" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(outPath, buf);
    console.log(`  ✓ ${t.out} (${t.size}x${t.size})`);
  }
  await writeFile(join(ROOT, "public/icons/splash-master.svg"), SPLASH_SVG);
  console.log("  ✓ public/icons/splash-master.svg (source)");

  console.log(
    "\n✓ Done.\n\nPra atualizar Capacitor depois (precisa instalar @capacitor/assets):\n  cd mobile\n  npm install --save-dev @capacitor/assets\n  npx capacitor-assets generate \\\n    --iconBackgroundColor '#0d2818' \\\n    --splashBackgroundColor '#0d2818'\n",
  );
}

generate().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
