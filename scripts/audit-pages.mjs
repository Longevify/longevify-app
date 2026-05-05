#!/usr/bin/env node
/**
 * Bulk screenshot audit — captura TODAS as principais rotas em
 * viewport mobile (iPhone 14) + desktop (1440x900) e coleta erros
 * de console + navigation failures.
 *
 * Uso:
 *   node scripts/audit-pages.mjs
 *
 * Output:
 *   /tmp/longevify-audit/{slug}-{mobile|desktop}.png
 *   /tmp/longevify-audit/report.json
 */

import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.BASE_URL ?? "https://app.longevify.com.br";
const OUTPUT_DIR = "/tmp/longevify-audit";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const ROUTES = [
  { path: "/home", auth: true },
  { path: "/perfil", auth: true },
  { path: "/dados", auth: true },
  { path: "/protocolo", auth: true },
  { path: "/loja", auth: true },
  { path: "/concierge", auth: true },
  { path: "/wearables", auth: true },
  { path: "/coleta", auth: true },
  { path: "/coleta/agendar", auth: true },
  { path: "/planos", auth: true },
  { path: "/perfil/notificacoes", auth: true },
  { path: "/perfil/preferencias", auth: true },
  { path: "/perfil/suporte", auth: true },
  { path: "/onboarding", auth: true },
  { path: "/login", auth: false },
  { path: "/signup", auth: false },
  { path: "/reset-password", auth: false },
];

const VIEWPORTS = [
  {
    name: "mobile",
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "desktop",
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  },
];

function slugify(p) {
  return p.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "root";
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--hide-scrollbars",
    ],
  });

  const report = {
    base: BASE_URL,
    startedAt: new Date().toISOString(),
    findings: [],
  };

  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      const slug = slugify(route.path);
      const file = `${OUTPUT_DIR}/${slug}-${viewport.name}.png`;
      const consoleErrors = [];
      const networkFailures = [];
      let finalUrl = "";
      let renderError = null;

      try {
        const page = await browser.newPage();
        await page.setViewport({
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: viewport.deviceScaleFactor,
          isMobile: viewport.isMobile,
          hasTouch: viewport.hasTouch,
        });
        await page.setUserAgent(viewport.userAgent);

        page.on("console", (msg) => {
          const type = msg.type();
          if (type === "error" || type === "warning") {
            const text = msg.text();
            // Filter out known noise
            if (
              text.includes("Download the React DevTools") ||
              text.includes("DevTools") ||
              text.includes("React Hydration")
            ) {
              return;
            }
            consoleErrors.push({ type, text });
          }
        });

        page.on("pageerror", (err) => {
          consoleErrors.push({ type: "pageerror", text: err.message });
        });

        page.on("requestfailed", (req) => {
          const url = req.url();
          if (
            !url.includes("favicon") &&
            !url.includes("supabase") &&
            !url.includes("vercel.com") &&
            !url.includes("vercel-insights") &&
            !url.includes("vitals.vercel-insights")
          ) {
            networkFailures.push({
              url,
              method: req.method(),
              failure: req.failure()?.errorText ?? "unknown",
            });
          }
        });

        const response = await page.goto(`${BASE_URL}${route.path}`, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });
        finalUrl = page.url();
        const httpStatus = response?.status() ?? 0;

        // Wait extra para hydration
        await new Promise((r) => setTimeout(r, 1500));

        await page.screenshot({ path: file, fullPage: true });
        await page.close();

        report.findings.push({
          path: route.path,
          viewport: viewport.name,
          file,
          finalUrl,
          httpStatus,
          consoleErrors,
          networkFailures,
          screenshotOk: true,
        });
        console.log(
          `  ✓ ${viewport.name} ${route.path}${
            consoleErrors.length ? ` (${consoleErrors.length} console errors)` : ""
          }${
            networkFailures.length ? ` (${networkFailures.length} net failures)` : ""
          }`,
        );
      } catch (err) {
        renderError = err instanceof Error ? err.message : String(err);
        report.findings.push({
          path: route.path,
          viewport: viewport.name,
          file,
          renderError,
          consoleErrors,
          networkFailures,
          screenshotOk: false,
        });
        console.log(`  ✗ ${viewport.name} ${route.path}: ${renderError}`);
      }
    }
  }

  report.finishedAt = new Date().toISOString();
  await writeFile(
    `${OUTPUT_DIR}/report.json`,
    JSON.stringify(report, null, 2),
  );

  await browser.close();

  console.log(`\n✓ Audit complete. Report: ${OUTPUT_DIR}/report.json`);
  console.log(
    `  Total: ${report.findings.length} | Errors: ${report.findings.filter((f) => f.consoleErrors.length || f.networkFailures.length || !f.screenshotOk).length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
