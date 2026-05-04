#!/usr/bin/env node
/**
 * Website probe: schrijft `public/price-probe-result.json` (geen wijziging aan gym-data.csv
 * of React-brondata). Toont ook een tabel in stdout.
 *
 * Run: npm run price-probe
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runPriceProbe } from "./probeCore.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "../../public/gym-data.csv");
const OUT_PATH = join(__dirname, "../../public/price-probe-result.json");

function pad(s, n) {
  const t = String(s ?? "");
  return t.length >= n ? t.slice(0, n - 1) + "…" : t + " ".repeat(n - t.length);
}

async function main() {
  console.log(`Price probe — CSV: ${CSV_PATH}\n`);

  const payload = await runPriceProbe(CSV_PATH, {
    logFetch: (name) => process.stdout.write(`Fetching ${name}…\n`),
  });

  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`\nGeschreven: ${OUT_PATH}\n`);

  const { results } = payload;
  console.log("=".repeat(120));
  console.log(
    `${pad("Gym", 28)} ${pad("OK", 5)} ${pad("HTTP", 6)} ${pad("Type", 14)} ${pad("€?", 4)} ${pad("#€", 4)} ${pad("Kind", 22)} Note`
  );
  console.log("-".repeat(120));
  for (const r of results) {
    console.log(
      `${pad(r.name, 28)} ${pad(r.ok ? "yes" : "no", 5)} ${pad(r.status, 6)} ${pad(r.contentType, 14)} ${pad(r.hasEuro ? "y" : "n", 4)} ${pad(String(r.euroishCount), 4)} ${pad(r.kind, 22)} ${r.note}`
    );
  }
  console.log("=".repeat(120));
  console.log(
    "\nLegenda: €? / #€ zijn heuristieken op de HTML-response, geen geparseerde productprijzen. Dashboard-tab «Data update» leest dit JSON-bestand."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
