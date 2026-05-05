#!/usr/bin/env node
/**
 * Preview do app em viewport desktop (1440x900).
 * Espelho de preview-mobile.mjs mas pra desktop.
 *
 * Uso:
 *   node scripts/preview-desktop.mjs <path>
 */

import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const targetPath = args[0] ?? "/home";
const baseUrl = "https://app.longevify.com.br";
const url = `${baseUrl}${targetPath}`;

const slug = targetPath.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
const outputPath = `/tmp/longevify-preview-desktop-${slug}.png`;

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function main() {
  console.log(`Opening ${url} in desktop 1440x900 viewport...`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  );

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));

  await page.screenshot({ path: outputPath, fullPage: false });
  console.log(`✓ Screenshot saved: ${outputPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
