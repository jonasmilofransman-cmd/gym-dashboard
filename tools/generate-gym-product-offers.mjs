#!/usr/bin/env node
/**
 * Bouwt `public/gym-product-offers.json` met vaste `productType`-taxonomie
 * (zie `src/gymPricingTaxonomy.js`). Extra/add-on uit CSV wordt gesplitst
 * zodat elk onderdeel zichtbaar is.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSemicolonCsv, rowsToObjects } from "./price-scrape-probe/parseCsv.mjs";
import { gymData, contractMonthLabel } from "../src/gymCostMasterData.js";
import { labelToCsvNaamLower } from "../src/gymSidebarCsvMap.js";
import { categoryForProductType } from "../src/gymPricingTaxonomy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "../public/gym-data.csv");
const OUT_PATH = join(__dirname, "../public/gym-product-offers.json");
const OVERRIDE_PATH = join(__dirname, "gym-product-offers-overrides.json");

const ONB_KEY = "Maandabonnement onbeperkt";
const LOSSE_KEY = "Losseles prijs";
const EXTRA_KEY = "Extra/add-on";
const CONTRACT_KEY = "Contractduur (maandelijks / 6 maanden / jaar)";
const JEUGD_KEY = "Jeugd 1x per maand";
const PROEFLES_KEY = "Proefles";
const FITNESS_ADDON_KEY = "Fitness add-on";

function masterForCsvName(csvName) {
  const n = String(csvName || "").toLowerCase().trim();
  const byLabel = gymData.find((g) => labelToCsvNaamLower(g.name) === n);
  if (byLabel) return byLabel;
  return gymData.find((g) => g.name.toLowerCase().trim() === n) ?? null;
}

function isEmptyish(val) {
  const s = String(val ?? "").trim();
  if (!s) return true;
  return /^(geen info|niet mogenlijk|niet mogelijk|n\/a|—|-|)$/i.test(s);
}

function formatEuroNum(n) {
  if (n == null || !Number.isFinite(n)) return null;
  const t = Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
  return `€${t}`;
}

function o(productType, productId, product, price, description, source) {
  return {
    productType,
    productId,
    category: categoryForProductType(productType),
    product,
    price: price || "—",
    description: description || "",
    source,
  };
}

function weekColumnKey(row, n) {
  const re = new RegExp(`^${n}x per week abonnement`, "i");
  for (const k of Object.keys(row)) {
    if (re.test(String(k).trim())) return k;
  }
  return null;
}

function monthColumnKey(row, n) {
  const re = new RegExp(`^${n}x per maand`, "i");
  for (const k of Object.keys(row)) {
    if (re.test(String(k).trim())) return k;
  }
  return null;
}

function maxWeekNFromRow(row) {
  let m = 0;
  for (const k of Object.keys(row)) {
    const x = String(k).match(/^(\d+)x per week abonnement/i);
    if (x) m = Math.max(m, parseInt(x[1], 10));
  }
  return Math.max(3, m);
}

function maxMonthNFromRow(row) {
  let m = 0;
  for (const k of Object.keys(row)) {
    const x = String(k).match(/^(\d+)x per maand/i);
    if (x) m = Math.max(m, parseInt(x[1], 10));
  }
  return m;
}

function splitExtraFragments(raw) {
  const s = String(raw ?? "").trim();
  if (!s || isEmptyish(s)) return [];
  const parts = s
    .split(/\s*[;•|]\s*|\s*\n\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length ? parts : [s];
}

function extractPriceToken(text) {
  const m = String(text).match(/€\s*[\d.,]+|[\d.,]+\s*(?:€|eur)/i);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

function classifyFragment(part) {
  const p = part.toLowerCase();
  if (/fitness|open\s*gym|apparatuur|krachtruimte|krachtzone|gym\s*only|vrij\s*train|toestellen/i.test(p)) return "fitness_addon";
  if (/proefles|probeerles|intro\s*les|gratis\s*les|trial/i.test(p)) return "proefles";
  if (
    /jaarabonnement|\d+\s*maanden.*(?!per)|\d+\s*jaar|per\s*jaar|€\s*1[\d.,]*\s*per\s*jaar|halfjaar|kwartaal.*(korting|deal)|langer.*(contract|duur)|incasso.*(jaar|periode)/i.test(
      part
    )
  ) {
    return "deal_lang_contract";
  }
  return "extra";
}

function inferOverrideProductType(productId) {
  const p = String(productId || "");
  if (/^vg_jaar/.test(p)) return "deal_lang_contract";
  if (/^vg_fit_only/.test(p)) return "fitness_addon";
  if (/^vg_dag|^vg_week|^vg_maand/.test(p)) return "losse_les";
  if (/^vg_contract/.test(p)) return "voorwaarden_contract";
  if (/^vg_inschrijf|^vg_multi/.test(p)) return "extra";
  if (/^vg_reg|^vg_dal|^vg_running|^vg_student/.test(p)) return "abonnement_variant";
  if (/^vg_/.test(p)) return "abonnement_variant";
  return "abonnement_variant";
}

function enrichOffer(offer) {
  const out = { ...offer };
  if (!out.productType) out.productType = inferOverrideProductType(out.productId);
  if (!out.category) out.category = categoryForProductType(out.productType);
  return out;
}

function buildOffersForRow(rowObj, gymName) {
  const master = masterForCsvName(gymName);
  const list = [];
  const pricing = rowObj;
  const extraRaw = String(pricing[EXTRA_KEY] ?? "").trim();
  const fragments = splitExtraFragments(extraRaw);
  const usedFragmentIdx = new Set();

  const consumeMatching = (predicate) => {
    const out = [];
    fragments.forEach((frag, i) => {
      if (usedFragmentIdx.has(i)) return;
      if (predicate(frag)) {
        usedFragmentIdx.add(i);
        out.push(frag);
      }
    });
    return out;
  };

  const fitnessFrags = consumeMatching((f) => classifyFragment(f) === "fitness_addon");
  const proefFrags = consumeMatching((f) => classifyFragment(f) === "proefles");
  const dealFrags = consumeMatching((f) => classifyFragment(f) === "deal_lang_contract");

  list.push(
    o(
      "onbeperkt",
      "onbeperkt_maand",
      "Onbeperkt — alle groepslessen (volgens gym)",
      String(pricing[ONB_KEY] ?? "").trim() || "—",
      "Je mag naar elke les binnen je abonnement (exact aanbod op de site van de gym).",
      "csv"
    )
  );

  const maxW = maxWeekNFromRow(pricing);
  for (let n = 1; n <= maxW; n++) {
    const key = weekColumnKey(pricing, n);
    let raw = key ? String(pricing[key] ?? "").trim() : "";
    let src = "csv";
    if (isEmptyish(raw) && master) {
      const fld = n === 1 ? master.price1x : n === 2 ? master.price2x : null;
      if (Number.isFinite(fld)) {
        raw = formatEuroNum(fld);
        src = "master";
      }
    }
    const price = raw || "—";
    list.push(
      o(
        `freq_week_${n}`,
        `freq_week_${n}`,
        `${n}× per week (maandprijs)`,
        price,
        key
          ? `Uit kolom "${key}" in gym-data.csv.${src === "master" ? " Aangevuld uit kostenmaster." : ""}`
          : "Geen aparte kolom in gym-data.csv — vul `Nx per week abonnement (Prijs per maand)` toe of zet tarief in overrides.",
        src
      )
    );
  }

  const maxM = maxMonthNFromRow(pricing);
  for (let n = 1; n <= maxM; n++) {
    const key = monthColumnKey(pricing, n);
    const raw = key ? String(pricing[key] ?? "").trim() : "";
    list.push(
      o(
        `freq_month_${n}`,
        `freq_month_${n}`,
        `${n}× per maand`,
        raw || "—",
        `Uit kolom "${key}".`,
        "csv"
      )
    );
  }

  const fitCol = pricing[FITNESS_ADDON_KEY];
  const fitFromCol = fitCol && String(fitCol).trim() && !isEmptyish(fitCol);
  if (fitFromCol) {
    list.push(
      o(
        "fitness_addon",
        "fitness_addon_csv",
        "Fitness / sportschool-apparatuur add-on",
        String(fitCol).trim(),
        "Gebruik van fitnessruimte, apparatuur of open gym naast lessen (volgens gym).",
        "csv"
      )
    );
  } else if (fitnessFrags.length) {
    fitnessFrags.forEach((frag, i) => {
      const price = extractPriceToken(frag) || "—";
      list.push(
        o(
          "fitness_addon",
          `fitness_addon_extra_${i}`,
          "Fitness / apparatuur (uit extra-regel)",
          price,
          frag,
          "csv"
        )
      );
    });
  } else {
    list.push(
      o(
        "fitness_addon",
        "fitness_addon_leeg",
        "Fitness / sportschool-apparatuur add-on",
        "—",
        "Geen aparte prijs in CSV. Staat soms in Extra/add-on — check gesplitste regels hieronder.",
        "csv"
      )
    );
  }

  const proefCol = pricing[PROEFLES_KEY];
  if (proefCol && String(proefCol).trim() && !isEmptyish(proefCol)) {
    list.push(
      o("proefles", "proefles_csv", "Proefles", String(proefCol).trim(), "Eenmalige proefles of introductie.", "csv")
    );
  } else if (proefFrags.length) {
    proefFrags.forEach((frag, i) => {
      list.push(
        o(
          "proefles",
          `proefles_extra_${i}`,
          "Proefles (uit extra-regel)",
          extractPriceToken(frag) || "—",
          frag,
          "csv"
        )
      );
    });
  } else {
    list.push(
      o(
        "proefles",
        "proefles_leeg",
        "Proefles",
        "—",
        "Geen kolom Proefles in CSV en niet herkend in Extra — handmatig in overrides toevoegen kan.",
        "csv"
      )
    );
  }

  list.push(
    o(
      "losse_les",
      "losse_les",
      "Losse les / drop-in / dagpas",
      String(pricing[LOSSE_KEY] ?? "").trim() || "—",
      "Eenmalige les of los tarief (geen lopend abonnement).",
      "csv"
    )
  );

  list.push(
    o(
      "jeugd",
      "jeugd",
      "Jeugdabonnement",
      String(pricing[JEUGD_KEY] ?? "").trim() || "—",
      "Alle jeugd-tarieven die in deze kolom passen; meerdere jeugdproducten kun je in overrides splitsen.",
      "csv"
    )
  );

  dealFrags.forEach((frag, i) => {
    list.push(
      o(
        "deal_lang_contract",
        `deal_lang_extra_${i}`,
        "Deal / voordeel langer contract (uit extra-regel)",
        extractPriceToken(frag) || "—",
        frag,
        "csv"
      )
    );
  });

  list.push(
    o(
      "voorwaarden_contract",
      "voorwaarden_contract",
      "Contractduur / minimale looptijd",
      String(pricing[CONTRACT_KEY] ?? "").trim() || "—",
      "Minimale looptijd, opzegtermijn of facturatie-eenheid (geen productprijs).",
      "csv"
    )
  );

  fragments.forEach((frag, i) => {
    if (usedFragmentIdx.has(i)) return;
    const price = extractPriceToken(frag);
    list.push(
      o(
        "extra",
        `extra_detail_${i}`,
        "Extra product",
        price || frag || "—",
        price ? `Volledige regel: ${frag}` : frag,
        "csv"
      )
    );
  });

  if (fragments.length === 0 && extraRaw && !isEmptyish(extraRaw)) {
    list.push(
      o(
        "extra",
        "extra_monolith",
        "Extra / add-on (volledige cel)",
        extractPriceToken(extraRaw) || extraRaw,
        "Cel kon niet automatisch splitsen — inhoud volledig hierboven in prijs-kolom of beschrijving.",
        "csv"
      )
    );
  }

  if (!master) return list.map(enrichOffer);

  if (Number.isFinite(master.dropIn) && isEmptyish(pricing[LOSSE_KEY])) {
    list.push(
      o(
        "losse_les",
        "losse_les_master",
        "Losse les / drop-in",
        formatEuroNum(master.dropIn),
        "Aangevuld uit interne kostenmaster.",
        "master"
      )
    );
  }
  if (Number.isFinite(master.contract) && isEmptyish(pricing[CONTRACT_KEY])) {
    list.push(
      o(
        "voorwaarden_contract",
        "voorwaarden_master",
        "Contract (indicatie)",
        "—",
        `Bindperiode uit kostenmaster: ${contractMonthLabel(master.contract)}.`,
        "master"
      )
    );
  }

  return list.map(enrichOffer);
}

function main() {
  const raw = readFileSync(CSV_PATH, "utf8").replace(/^\uFEFF/, "");
  const rows = parseSemicolonCsv(raw);
  const { data } = rowsToObjects(rows);

  const gyms = {};
  for (const row of data) {
    const name = String(row.Naam ?? "").trim();
    if (!name) continue;
    gyms[name] = buildOffersForRow(row, name);
  }

  let overrides = { gyms: {} };
  if (existsSync(OVERRIDE_PATH)) {
    overrides = JSON.parse(readFileSync(OVERRIDE_PATH, "utf8"));
  }
  for (const [gymName, offers] of Object.entries(overrides.gyms || {})) {
    if (Array.isArray(offers) && offers.length) {
      gyms[gymName] = offers.map(enrichOffer);
    }
  }

  const vondelZuid = gyms["Vondel Gym Zuid"];
  if (vondelZuid?.length > 12) {
    const slug = (name) => (name.includes("Oost") ? "oost" : name.includes("West") ? "west" : "zuid");
    for (const alt of ["Vondel Gym Oost", "Vondel Gym West"]) {
      const s = slug(alt);
      gyms[alt] = vondelZuid.map((offer) => enrichOffer({
        ...offer,
        productId: `${offer.productId}_${s}`,
      }));
    }
  }

  const payload = {
    version: 3,
    generatedAt: new Date().toISOString(),
    sourceCsv: CSV_PATH,
    gyms,
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${OUT_PATH} (${Object.keys(gyms).length} gyms) v${payload.version}`);
}

main();
