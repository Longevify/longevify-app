#!/usr/bin/env node
/**
 * Gera ícones do PWA + Capacitor a partir do SVG mestre.
 *
 * Uso:
 *   node scripts/generate-icons.mjs
 *
 * Outputs:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/icon-maskable-192.png  (com safe area de 10% padding)
 *   public/icons/icon-maskable-512.png
 *   public/icons/apple-touch-icon.png   (180x180)
 *   public/icons/favicon-32.png
 *   public/icons/favicon-16.png
 *   app/icon.png                          (Next 16 picks up auto)
 *   app/apple-icon.png                    (Next 16 picks up auto)
 *
 * Roda manualmente quando atualizar o SVG mestre. Não está no build pipeline
 * porque ícones não mudam toda hora.
 */

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// SVG mestre — verde gradient + letra L em branco
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f5d3f"/>
      <stop offset="100%" stop-color="#0d2818"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <text x="256" y="362" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" font-size="320" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="-12">L</text>
</svg>`;

// Pra maskable (Android adaptive icon), o ícone é cortado num círculo pelo
// launcher. Safe area: conteúdo vital nos 80% centrais. Adicionamos
// padding inflando o background.
const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f5d3f"/>
      <stop offset="100%" stop-color="#0d2818"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text x="256" y="332" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" font-size="240" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="-9">L</text>
</svg>`;

// Splash screen (2732x2732 cobre todos os dispositivos do Capacitor)
const SPLASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="#0d2818"/>
  <g transform="translate(1366,1300)">
    <rect x="-220" y="-220" width="440" height="440" rx="80" fill="#1f5d3f"/>
    <text x="0" y="100" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" font-size="280" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="-12">L</text>
  </g>
  <text x="1366" y="1700" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" font-size="80" font-weight="600" fill="#ffffff" text-anchor="middle" letter-spacing="-1">Longevify</text>
</svg>`;

const tasks = [
  { src: ICON_SVG, out: "public/icons/icon-192.png", size: 192 },
  { src: ICON_SVG, out: "public/icons/icon-512.png", size: 512 },
  { src: MASKABLE_SVG, out: "public/icons/icon-maskable-192.png", size: 192 },
  { src: MASKABLE_SVG, out: "public/icons/icon-maskable-512.png", size: 512 },
  { src: ICON_SVG, out: "public/icons/apple-touch-icon.png", size: 180 },
  { src: ICON_SVG, out: "public/icons/favicon-32.png", size: 32 },
  { src: ICON_SVG, out: "public/icons/favicon-16.png", size: 16 },
  { src: ICON_SVG, out: "app/icon.png", size: 512 },
  { src: ICON_SVG, out: "app/apple-icon.png", size: 180 },
  // Capacitor splash (cobre todos os tamanhos)
  { src: SPLASH_SVG, out: "public/icons/splash-2732.png", size: 2732 },
];

// Ícones específicos pro Capacitor (vamos usar pelo cap assets generator
// idealmente, mas o agente de mobile-app-developer faz isso). Aqui só
// geramos os que o web precisa + o "master" pra Lucas usar no Capacitor.

async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function generate() {
  console.log("Generating Longevify icons...\n");
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

  // Salva também o SVG mestre pra referência futura
  await writeFile(join(ROOT, "public/icons/icon-master.svg"), ICON_SVG);
  await writeFile(join(ROOT, "public/icons/splash-master.svg"), SPLASH_SVG);
  console.log("  ✓ public/icons/icon-master.svg (source)");
  console.log("  ✓ public/icons/splash-master.svg (source)");

  console.log(
    "\nDone. Pra atualizar Capacitor depois:\n  cd mobile && npx capacitor-assets generate --iconBackgroundColor '#0d2818' --splashBackgroundColor '#0d2818'\n",
  );
}

generate().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
