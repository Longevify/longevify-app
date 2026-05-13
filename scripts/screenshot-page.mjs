/**
 * Screenshot da página inteira /dados pra debug visual.
 */
import { chromium } from "playwright";

const DEV_URL = process.env.DEV_URL || "http://localhost:3000";
const OUT = process.argv.slice(2).find(a => a.endsWith(".png")) || "/tmp/page.png";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

await context.addCookies([
  { name: "longevify_demo_session", value: "1", url: DEV_URL },
]);

const page = await context.newPage();
page.on("console", (msg) => console.log(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => console.error("[pageerror]", err.message));

console.log("→", DEV_URL + "/dados");
await page.goto(DEV_URL + "/dados", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(4000); // dá tempo do WebGL renderizar

await page.screenshot({ path: OUT, fullPage: true });
console.log("✓ salvo", OUT);

await browser.close();
