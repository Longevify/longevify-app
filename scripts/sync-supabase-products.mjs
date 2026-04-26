#!/usr/bin/env node
/**
 * Sincroniza tabela products do Supabase com o catalogo de lib/products.ts
 * - Deleta TODOS os produtos antigos
 * - Insere os atuais com pricing novo
 *
 * Run: node scripts/sync-supabase-products.mjs
 */

import { readFile } from "node:fs/promises";

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsTs = await readFile(resolve(__dirname, "../lib/products.ts"), "utf8");
const start = productsTs.indexOf("export const PRODUCTS: Product[] = [");
const arrStart = productsTs.indexOf("[", start);

// Mais simples: importa via tsx? Não está disponível. Vamos usar dynamic import com .ts? Não.
// Solução: extrai os campos necessários via regex simples (id, name, brand, category, kicker, priceBRL, image)
const PRODUCT_BLOCK = /\{\s*id:\s*"([^"]+)"[\s\S]*?\}\s*,?\s*(?=\{\s*id:|\];)/g;
const products = [];
let m;
while ((m = PRODUCT_BLOCK.exec(productsTs)) !== null) {
  const block = m[0];
  const get = (field, kind = "string") => {
    const re =
      kind === "string"
        ? new RegExp(`${field}:\\s*"([^"]*)"`)
        : new RegExp(`${field}:\\s*([0-9]+(?:\\.[0-9]+)?)`);
    const mm = block.match(re);
    if (!mm) return null;
    return kind === "string" ? mm[1] : Number(mm[1]);
  };
  const id = get("id");
  if (!id) continue;
  products.push({
    id,
    name: get("name"),
    brand: get("brand"),
    category: get("category"),
    badge: get("badge"),
    price_brl: get("priceBRL", "number"),
    short_description: get("shortDescription"),
    long_description: get("longDescription"),
    image_url: get("image"),
  });
}

console.log(`Parsed ${products.length} products from lib/products.ts`);

// 1) Apaga tudo
console.log("Deleting old products...");
const del = await fetch(`${SUPA_URL}/rest/v1/products?id=neq.placeholder`, {
  method: "DELETE",
  headers,
});
console.log("DELETE status:", del.status);

// 2) Insere o novo catalogo
console.log("Inserting new products...");
const ins = await fetch(`${SUPA_URL}/rest/v1/products`, {
  method: "POST",
  headers: { ...headers, Prefer: "return=representation" },
  body: JSON.stringify(products),
});
const text = await ins.text();
console.log("INSERT status:", ins.status, "body:", text.slice(0, 400));
