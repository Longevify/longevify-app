/**
 * Screenshot da /dados em 2 viewports (mobile iPhone-ish + desktop) e
 * cliques pra validar interação.
 */
import { chromium, devices } from "playwright";

const DEV_URL = process.env.DEV_URL || "http://localhost:3000";

async function snap({ name, viewport, dpr, clicks = [] }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: dpr ?? 2,
  });
  await context.addCookies([
    { name: "longevify_demo_session", value: "1", url: DEV_URL },
  ]);

  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`[${name}/err]`, m.text());
  });

  console.log(`→ ${name} (${viewport.width}x${viewport.height})`);
  await page.goto(DEV_URL + "/dados", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(4500);

  await page.screenshot({ path: `/tmp/${name}.png`, fullPage: false });
  console.log(`✓ /tmp/${name}.png`);

  let i = 0;
  for (const click of clicks) {
    const loc = page.getByRole("button", { name: click.name }).first();
    await loc.click();
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `/tmp/${name}-${click.label}.png`, fullPage: false });
    console.log(`✓ /tmp/${name}-${click.label}.png`);
    i++;
  }

  await browser.close();
}

await snap({
  name: "desktop",
  viewport: { width: 1440, height: 900 },
  clicks: [
    { name: /Saúde Cardíaca/i, label: "cardiac" },
    { name: /Saúde Hepática/i, label: "hepatic" },
  ],
});

await snap({
  name: "mobile",
  viewport: { width: 390, height: 844 },
  clicks: [
    { name: /Coração/i, label: "cardiac" },
  ],
});
