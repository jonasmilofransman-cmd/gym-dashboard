#!/usr/bin/env node
/**
 * Haalt HTML van gym-websites (CSV) op, zoekt €-bedragen + korte context en
 * JSON-LD waar aanwezig. Schrijft public/gym-pricing-scrape.json.
 *
 * Dit is heuristisch: geen garantie dat alle producten uit de taxonomie
 * correct worden herkend. Controleer handmatig + gebruik overrides.
 *
 * Run: npm run scrape:pricing
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";
import { parseSemicolonCsv, rowsToObjects } from "../price-scrape-probe/parseCsv.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "../../public/gym-data.csv");
const OUT_PATH = join(__dirname, "../../public/gym-pricing-scrape.json");

const UA =
  "GymDashboardPricingScrape/0.1 (+local research; respect robots; low frequency)";
const TIMEOUT_MS = 22_000;
const DELAY_MS = 450;
const MAX_TEXT = 450_000;
const MAX_ITEMS_PER_GYM = 55;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripTrackingParams(url) {
  try {
    const u = new URL(url.trim());
    for (const k of [
      "gclid",
      "fbclid",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gad_source",
      "gad_campaignid",
    ]) {
      u.searchParams.delete(k);
    }
    return u.toString();
  } catch {
    return String(url || "").trim();
  }
}

function looksLikeHttpUrl(s) {
  return /^https?:\/\//i.test(String(s ?? "").trim());
}

/** Platte JSON / RSC-hydrate payloads: zelfde bedragen als DOM maar zonder leesbare context. */
function isNoiseFlatPayload(sourceTag, context) {
  if (sourceTag !== "html-flat") return false;
  const c = String(context || "");
  return (
    /\\"children\\"|flex items-baseline|"text-4xl font-bold"/.test(c) ||
    (/€[\d.,]+/.test(c) && c.length > 80 && !/\b(per|maand|week|les|lid|abo)\b/i.test(c))
  );
}

function normalizePriceKey(priceStr) {
  const s = String(priceStr || "").replace(/\s/g, "").replace("€", "");
  const withDot = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(withDot);
  return Number.isFinite(n) ? n.toFixed(2) : s;
}

function extractFreqWeekN(local) {
  const c = String(local || "").toLowerCase();
  const m =
    c.match(/\b([1-9]|1[0-2])\s*(?:x|×|keer)\s*(?:per\s*)?(?:week|wk)\b/) ||
    c.match(/\b([1-9]|1[0-2])\s*(?:times?|x)\s*per\s*week\b/) ||
    c.match(/\b(?:week|wk)\s*[:\-]?\s*([1-9]|1[0-2])\s*(?:x|×|keer)\b/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > 12) return null;
  return `freq_week_${n}`;
}

/** Laatste frequentie in segment (dichtst bij € = meest rechts in `before`). */
function extractFreqWeekLastIn(segment) {
  const c = String(segment || "").toLowerCase();
  const re =
    /\b([1-9]|1[0-2])\s*(?:x|×|keer)\s*(?:per\s*)?(?:week|wk)\b|\b([1-9]|1[0-2])\s*(?:times?|x)\s*per\s*week\b/g;
  let m;
  let last = null;
  while ((m = re.exec(c)) !== null) {
    const n = parseInt(m[1] || m[2], 10);
    if (n >= 1 && n <= 12) last = `freq_week_${n}`;
  }
  return last;
}

/** Tekst ná € tot aan volgende € (zelfde prijsblok). */
function sliceAfterUntilNextEuro(after) {
  const s = String(after || "");
  const cut = s.search(/€/);
  return cut === -1 ? s.slice(0, 130) : s.slice(0, cut);
}

/** Frequentie bij dit bedrag: eerst tekst ná € tot volgende €, anders dichtstbij vóór. */
function extractFreqWeekNearPrice(before, after) {
  const afterChunk = sliceAfterUntilNextEuro(after);
  const fromAfter = extractFreqWeekN(afterChunk);
  if (fromAfter) return fromAfter;
  const fromBefore = extractFreqWeekLastIn(before.slice(-95));
  if (fromBefore) return fromBefore;
  return extractFreqWeekLastIn(`${before.slice(-110)} ${afterChunk}`);
}

/** Alleen 'onbeperkt' in de buurt van dit bedrag (niet ver weg bij andere blokken). */
function hasRealUnlimited(_local, before, after) {
  const around = `${before.slice(-80)} ${after.slice(0, 85)}`.toLowerCase().replace(/\s+/g, " ");
  if (/\b(?:trial|proef)\s*week\s*\d*\s*(?:dagen\s*)?onbeperkt\s+voor\b/i.test(around)) return false;
  if (/\b(?:trial|proef)\s*week\b[\s\S]{0,42}\bonbeperkt\s+voor\b/i.test(around)) return false;
  return /\b(onbeperkt|unlimited|ongelimiteerd|alle\s+lessen|all\s+access|all\s+classes|100%\s*toegang)\b/i.test(
    around,
  );
}

/**
 * Classificatie rond één €-treffer: gebruikt venster vóór/na het bedrag zodat
 * nabije "trial" of verre "jeugd" andere producten niet overschrijft.
 */
function classifyPriceHit(fullText, priceStart, priceEnd, sourceTag, contextForDebug, priceToken = "") {
  const beforeRaw = fullText.slice(Math.max(0, priceStart - 110), priceStart);
  const afterRaw = fullText.slice(priceEnd, Math.min(fullText.length, priceEnd + 110));
  const before = beforeRaw.toLowerCase();
  const after = afterRaw.toLowerCase();
  const local = `${before} ${after}`.replace(/\s+/g, " ");
  const tok = String(priceToken || "").toLowerCase();
  const hasMoInToken = /\/\s*(?:mo|maand|month)\b/i.test(tok.replace(/\s+/g, ""));

  if (isNoiseFlatPayload(sourceTag, contextForDebug)) return null;

  const hasMaandTarief =
    hasMoInToken ||
    /\b(per\s*maand|\/\s*maand|\/maand|maandelijks|\/mo\b|\/\s*mo\b|p\/m\b|\/month|monthly\b|lidmaatschappen?\s*vanaf|lidmaatschappenvanaf|lidmaatschap|maandabonnement|abonnements|memberships?\b|recurring\s*subscription|rolling\s*monthly)\b/i.test(
      local,
    ) ||
    /lidmaatschappenvanaf/i.test(local) ||
    /\/\s*4\s*weken\b/i.test(local);

  const hasOnbeperktAll = hasRealUnlimited(local, before, after);

  const dealExtra =
    /\(\+€|\+\s*€|extra\s*€|per\s*4\s*weken\).*contract|jaar\s*contract|kwartaal|half\s*jaar|6\s*maanden\s*contract|12\s*maanden\s*commit/i.test(
      local,
    );

  if (dealExtra && /\(\+€|\+\s*€/i.test(before.slice(-40) + after.slice(0, 40))) {
    return "deal_lang_contract";
  }

  const dropInTight = /\b(drop\s*-?\s*in|dropping\s+in)\b/i.test(before.slice(-85) + after.slice(0, 40));
  if (dropInTight) return "losse_les";

  const dropIn =
    /\b(drop\s*-?\s*in|dropping\s+in|dagpas|losse\s*les|single\s*(class|session)|guest\s*pass|day\s*pass|mat\s*fees?|strippenkaart|10[-\s]*lesson|lesson\s*card)\b/i.test(
      local,
    );
  if (dropIn && !hasMaandTarief) return "losse_les";

  const beforeSoftBreakEarly = beforeRaw.slice(-70).replace(/([a-z])([A-Z])/g, "$1 $2");
  if (/proefles/i.test(beforeSoftBreakEarly) && /\beenmalige\b/i.test(after.slice(0, 40))) {
    return "proefles";
  }

  const proefTight =
    /\b(proefles|proefweek|proef\s*training|(?:trial|proef)\s*week\s*\d*|free\s*trial|gratis\s*proef|intro\s*les|introductieles)\b/i.test(
      `${before.slice(-75)} ${after.slice(0, 75)}`,
    );
  const trialLoose = /\btrial\b|\bintro\b/i.test(`${before.slice(-50)} ${after.slice(0, 50)}`);
  if ((proefTight || trialLoose) && !hasMaandTarief) return "proefles";
  if (proefTight && hasMaandTarief) {
    const tightAround = `${before.slice(-55)} ${after.slice(0, 40)}`;
    if (/\bonbeperkt\s+voor\b/i.test(tightAround)) return "proefles";
    const maandNear =
      /\b(per\s*maand|\/\s*maand|\/maand|lidmaatschappen?\s*vanaf|lidmaatschappenvanaf)\b/i.test(tightAround) ||
      /lidmaatschappenvanaf/i.test(tightAround);
    if (maandNear) {
      /* Lidmaatschapstarief: negeer verderop op de regel "trial week". */
    } else {
      return "proefles";
    }
  }

  const adultProductRow = /\b(volwassen|volwassenen|studenten|student|combi\s|adults?|all\s*access|flex)\b/i.test(
    before.slice(-65),
  );
  const jeugdNear =
    /\b(jeugd|jongeren|youth|teen|12\s*[-–]\s*17|under\s*18)\b/i.test(before.slice(-95)) ||
    /\b(kickboksen|bjj|jiu[-\s]?jitsu)\s+jeugd\b/i.test(before.slice(-95)) ||
    /\bbjj\s*[-–]\s*jeugd\b/i.test(before.slice(-95)) ||
    /\bkids\s*[\(:]/i.test(before.slice(-95));
  if (jeugdNear && !adultProductRow) {
    const fw = extractFreqWeekNearPrice(before, after);
    if (fw) return fw;
    return "jeugd";
  }

  if (hasOnbeperktAll) return "onbeperkt";

  const fwAll = extractFreqWeekNearPrice(before, after);
  if (fwAll && (hasMaandTarief || /\/mo\b|\/\s*mo\b|groepsles|membership/i.test(local))) return fwAll;

  const fitnessOnly =
    /\b(alleen\s+)?open\s+gym\b|\bgym\s*only\b|\b(krachtruimte|apparatuur|equipment|toestellen)\b/i.test(local) &&
    !hasOnbeperktAll &&
    !hasMaandTarief &&
    !/\b(brons|bronz|silver|gold|platin|lidmaatschap|membership|abonnement)\b/i.test(local);
  if (fitnessOnly) return "fitness_addon";

  if (hasMaandTarief) {
    if (hasOnbeperktAll) return "onbeperkt";
    const fw = extractFreqWeekNearPrice(before, after);
    if (fw) return fw;
    return "abonnement";
  }

  if (/\b(jaar|annual|jaarlijks|kwartaal|halfjaar)\b/i.test(local) && /\b(contract|vooruit|up\s*front|vooraf)\b/i.test(local)) {
    return "deal_lang_contract";
  }

  if (/\b(inschrijf|aanmelding|registration)\b/i.test(local) && /\b(eenmalig|one[-\s]*time)\b/i.test(local)) {
    return "extra";
  }

  if (fwAll) return fwAll;
  if (hasOnbeperktAll) return "onbeperkt";

  if (/\b(lidmaatschap|abonnement|member|subscription)\b/i.test(local)) return "abonnement";

  const a40 = after.slice(0, 40);
  const b40 = before.slice(-45);
  if (
    hasMoInToken ||
    /\/\s*mo\b|\/mo\b|per\s*maand|\/\s*maand\b/i.test(`${b40} ${a40}`) ||
    /^\s*mo/i.test(a40)
  ) {
    return "abonnement";
  }

  return null;
}

function urlKind(url) {
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com") || lower.includes("facebook.com")) return "social";
  if (lower.includes("gymly.io/embed")) return "embed";
  return "http";
}

function extractJsonLdOffers(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const stack = Array.isArray(data) ? data : [data];
      for (const node of stack) {
        walkJsonLd(node, out, 0);
      }
    } catch {
      /* invalid JSON-LD */
    }
  }
  return out.slice(0, 15);
}

function walkJsonLd(node, out, depth) {
  if (depth > 12 || node == null) return;
  if (typeof node === "object" && !Array.isArray(node)) {
    const t = node["@type"];
    const types = Array.isArray(t) ? t : t ? [t] : [];
    if (types.some((x) => /Offer|Product|Service|PriceSpecification/i.test(String(x)))) {
      const name = node.name || node.description || node.priceCurrency || "JSON-LD";
      const price = node.price || node.lowPrice || node.highPrice || node.value;
      if (price != null || node.priceSpecification) {
        out.push({
          source: "json-ld",
          summary: String(name).slice(0, 200),
          detail: JSON.stringify(node).slice(0, 500),
        });
      }
    }
    for (const v of Object.values(node)) walkJsonLd(v, out, depth + 1);
  } else if (Array.isArray(node)) {
    for (const v of node) walkJsonLd(v, out, depth + 1);
  }
}

function extractEuroSnippetsFromPlainText(text, sourceTag) {
  const items = [];
  /* Optioneel /mo, /maand, / MAAND — hoort bijzelfde prijs, anders valt /mo weg en wijst classificatie mis. */
  const re =
    /€\s*[\d]{1,3}(?:[.,]\d{2,3})?(?:[.,]\d{3})?\s*(?:\/\s*(?:mo|maand|month|MAAND|4\s*wk|4\s*weken))?/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const idx = m.index;
    const priceEnd = idx + m[0].length;
    const start = Math.max(0, idx - 120);
    const end = Math.min(text.length, priceEnd + 120);
    const context = text.slice(start, end).replace(/\s+/g, " ").trim();
    const suggestedProductType = classifyPriceHit(text, idx, priceEnd, sourceTag, context, m[0].replace(/\s+/g, ""));
    if (suggestedProductType == null && isNoiseFlatPayload(sourceTag, context)) continue;
    items.push({
      source: sourceTag,
      price: m[0].replace(/\s+/g, ""),
      context,
      suggestedProductType,
    });
  }
  return items;
}

function extractEuroSnippets($) {
  $("script, style, noscript, iframe, svg").remove();
  let text = $("body").text() || "";
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);
  return extractEuroSnippetsFromPlainText(text, "html-text");
}

/** Fallback voor SPA’s: alle tags plat (styles weg), o.a. JSON in scripts blijft leesbaar. */
function extractEuroSnippetsFromFlattenedHtml(html) {
  const noStyle = String(html).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  const flat = noStyle.replace(/<[^>]+>/g, " ");
  const text = flat.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
  return extractEuroSnippetsFromPlainText(text, "html-flat");
}

const SOURCE_RANK = { "html-text": 3, "html-flat": 1 };

function normalizeContextFingerprint(ctx) {
  return String(ctx || "")
    .toLowerCase()
    .replace(/&[a-z]+;/gi, " ")
    .replace(/€\s*[\d.,]+/g, "@")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 88);
}

/** Verwijdert bijna-dezelfde regel bij gelijk bedrag (bijv. DOM vs platte HTML). */
function collapseNearDuplicatePrices(items) {
  const out = [];
  for (const it of items) {
    const pk = normalizePriceKey(it.price);
    const fp = normalizeContextFingerprint(it.context);
    let replaced = false;
    for (let i = 0; i < out.length; i++) {
      const o = out[i];
      if (normalizePriceKey(o.price) !== pk) continue;
      const ofp = normalizeContextFingerprint(o.context);
      if (fp === ofp) {
        if ((SOURCE_RANK[it.source] ?? 0) > (SOURCE_RANK[o.source] ?? 0)) out[i] = it;
        replaced = true;
        break;
      }
      const minL = Math.min(fp.length, ofp.length);
      if (minL < 22) continue;
      let k = 0;
      while (k < minL && fp[k] === ofp[k]) k++;
      if (k >= 22) {
        if ((SOURCE_RANK[it.source] ?? 0) > (SOURCE_RANK[o.source] ?? 0)) out[i] = it;
        replaced = true;
        break;
      }
    }
    if (!replaced) out.push(it);
  }
  return out;
}

/**
 * Voorkomt dubbele regels (zelfde bedrag + quasi-zelfde context, DOM + platte HTML).
 * Bij gelijkheid: html-text wint.
 */
function dedupeItems(arr) {
  const best = new Map();
  for (const it of arr) {
    const pk = normalizePriceKey(it.price);
    const fp = normalizeContextFingerprint(it.context);
    const key = `${pk}|${fp}`;
    const prev = best.get(key);
    const rank = SOURCE_RANK[it.source] ?? 0;
    if (!prev || rank > (SOURCE_RANK[prev.source] ?? 0)) {
      best.set(key, it);
    }
  }
  const out = [...best.values()];
  out.sort((a, b) => {
    const ra = SOURCE_RANK[a.source] ?? 0;
    const rb = SOURCE_RANK[b.source] ?? 0;
    if (rb !== ra) return rb - ra;
    return String(a.context).localeCompare(String(b.context));
  });
  return out.slice(0, MAX_ITEMS_PER_GYM);
}

async function fetchHtml(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
      },
    });
    const ct = res.headers.get("content-type") || "";
    if (!/html/i.test(ct) && res.ok) {
      return { ok: false, status: res.status, finalUrl: res.url, error: `unexpected type: ${ct}` };
    }
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf).slice(0, 600_000);
    return { ok: res.ok, status: res.status, finalUrl: res.url, html };
  } catch (e) {
    return {
      ok: false,
      status: "ERR",
      finalUrl: url,
      error: e?.name === "AbortError" ? `timeout ${TIMEOUT_MS}ms` : String(e?.message || e),
    };
  } finally {
    clearTimeout(t);
  }
}

async function scrapeOne({ name, url }) {
  const kind = urlKind(url);
  if (kind !== "http") {
    return {
      gym: name,
      url,
      finalUrl: null,
      ok: false,
      skipped: true,
      skipReason: kind === "social" ? "Social media — geen scrape" : "Embed-URL — geen tarievenpagina",
      items: [],
      jsonLd: [],
    };
  }

  const cleanUrl = stripTrackingParams(url);
  const res = await fetchHtml(cleanUrl);
  if (!res.html) {
    return {
      gym: name,
      url: cleanUrl,
      finalUrl: res.finalUrl,
      ok: false,
      status: res.status,
      error: res.error || `HTTP ${res.status}`,
      items: [],
      jsonLd: [],
    };
  }

  const jsonLd = extractJsonLdOffers(res.html);
  let items = [];
  try {
    const $ = load(res.html);
    const fromDom = extractEuroSnippets($);
    const fromFlat = extractEuroSnippetsFromFlattenedHtml(res.html);
    items = dedupeItems([...fromDom, ...fromFlat]);
    /* Tweede pass: zeer korte dubbele alleen op bedrag + eerste woorden (zelfde homepage, iets andere witruimte). */
    items = collapseNearDuplicatePrices(items);
  } catch (e) {
    return {
      gym: name,
      url: cleanUrl,
      finalUrl: res.finalUrl,
      ok: false,
      status: res.status,
      error: `parse: ${e?.message || e}`,
      items: [],
      jsonLd,
    };
  }

  return {
    gym: name,
    url: cleanUrl,
    finalUrl: res.finalUrl,
    ok: res.ok,
    status: res.status,
    items,
    jsonLd,
  };
}

async function main() {
  const raw = readFileSync(CSV_PATH, "utf8").replace(/^\uFEFF/, "");
  const { data } = rowsToObjects(parseSemicolonCsv(raw));

  const gyms = [];
  for (const row of data) {
    const name = String(row.Naam ?? "").trim();
    const website = String(row.Website ?? "").trim();
    if (!name) continue;
    if (!looksLikeHttpUrl(website)) {
      gyms.push({
        gym: name,
        url: website,
        ok: false,
        skipped: true,
        skipReason: "Geen http(s)-URL in CSV",
        items: [],
        jsonLd: [],
      });
      continue;
    }
    process.stderr.write(`Scrape ${name}…\n`);
    gyms.push(await scrapeOne({ name, url: website }));
    await sleep(DELAY_MS);
  }

  const payload = {
    version: 3,
    scrapedAt: new Date().toISOString(),
    disclaimer:
      "Versie 3: classificatie op venster rond elk bedrag, /mo en / MAAND in de prijs-match, frequentie uit het juiste blok, minder dubbele regels (DOM wint). Nog steeds heuristisch; SPA’s zonder prijs in HTML blijven leeg zonder headless browser.",
    sourceCsv: CSV_PATH,
    gyms,
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  process.stdout.write(`\nGeschreven: ${OUT_PATH} (${gyms.length} gyms)\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
