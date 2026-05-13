/**
 * Tira screenshot do avatar 3D em /dados pra inspecionar visualmente
 * durante iteração do design. Lê DEV_URL (default http://localhost:3001).
 *
 * Uso:
 *   node scripts/screenshot-avatar.mjs              # default: salva avatar.png
 *   node scripts/screenshot-avatar.mjs --out a.png  # custom output
 *   node scripts/screenshot-avatar.mjs --female     # gira avatar pra female via state
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const DEV_URL = process.env.DEV_URL || "http://localhost:3001";
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const OUT = outIdx >= 0
  ? path.resolve(REPO_ROOT, args[outIdx + 1])
  : path.join(REPO_ROOT, "tmp-avatar.png");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

// modo demo: cookie que getCurrentUser reconhece em current-user.ts
await context.addCookies([
  {
    name: "longevify_demo_session",
    value: "1",
    url: DEV_URL,
  },
]);

const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.error("[console error]", msg.text());
});

console.log(`→ navegando ${DEV_URL}/dados`);
await page.goto(`${DEV_URL}/dados`, { waitUntil: "networkidle", timeout: 90000 });

// dá tempo do canvas WebGL renderizar
await page.waitForTimeout(2500);

const aside = page.locator("aside").nth(1); // 2º aside = avatar (1º é CategoryList)
const exists = await aside.count();
if (exists === 0) {
  console.warn("⚠️  aside do avatar não encontrado — tirando full page");
  await page.screenshot({ path: OUT, fullPage: false });
} else {
  await aside.screenshot({ path: OUT });
}

console.log(`✓ salvo ${path.relative(REPO_ROOT, OUT)}`);

await browser.close();
