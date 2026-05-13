/**
 * Screenshot da página /dados com cliques em categorias diferentes
 * pra validar a feature de destaque por região.
 *
 * Salva 3 screenshots:
 *   - /tmp/page-all.png       (categoria default "Todos os Dados", sem destaque)
 *   - /tmp/page-cardiac.png   (clica "Saúde Cardíaca" — peito destaca)
 *   - /tmp/page-thyroid.png   (clica "Saúde da Tireoide" — pescoço destaca)
 */
import { chromium } from "playwright";

const DEV_URL = process.env.DEV_URL || "http://localhost:3000";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

await context.addCookies([
  { name: "longevify_demo_session", value: "1", url: DEV_URL },
]);

const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[err]", msg.text());
});

console.log("→", DEV_URL + "/dados");
await page.goto(DEV_URL + "/dados", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(4500); // WebGL warmup

await page.screenshot({ path: "/tmp/page-all.png", fullPage: false });
console.log("✓ /tmp/page-all.png");

// Clica "Saúde Cardíaca"
const cardiaca = page.getByRole("button", { name: /Saúde Cardíaca/i }).first();
await cardiaca.click();
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/page-cardiac.png", fullPage: false });
console.log("✓ /tmp/page-cardiac.png");

// Clica "Saúde da Tireoide"
const tireoide = page.getByRole("button", { name: /Saúde da Tireoide/i }).first();
await tireoide.click();
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/page-thyroid.png", fullPage: false });
console.log("✓ /tmp/page-thyroid.png");

await browser.close();
