#!/usr/bin/env node
/**
 * Preview do app em viewport mobile (iPhone 14, 390x844 @ 3x).
 *
 * Uso:
 *   node scripts/preview-mobile.mjs <path>
 *
 * Ex:
 *   node scripts/preview-mobile.mjs /home
 *   node scripts/preview-mobile.mjs /perfil
 *
 * Output:
 *   /tmp/longevify-preview-{path-slug}.png
 *
 * Usa o Google Chrome instalado no Mac (não baixa Chromium próprio).
 */

import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const targetPath = args[0] ?? "/home";
const baseUrl = "https://app.longevify.com.br";
const url = `${baseUrl}${targetPath}`;

const slug = targetPath.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
const outputPath = `/tmp/longevify-preview-${slug}.png`;

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function main() {
  console.log(`Opening ${url} in iPhone 14 viewport...`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--hide-scrollbars",
    ],
  });

  const page = await browser.newPage();

  // iPhone 14 viewport
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  // iOS Safari user agent
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  );

  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

  // Aguarda mais 1s pra animations / fonts assentarem
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({
    path: outputPath,
    fullPage: true,
  });

  console.log(`✓ Screenshot saved: ${outputPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
