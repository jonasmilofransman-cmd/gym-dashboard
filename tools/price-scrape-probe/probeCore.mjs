/**
 * Shared logic: build probe payload from CSV + network checks.
 * Used by probe.mjs CLI and can be imported by other Node tooling.
 */

import { readFileSync } from "node:fs";
import { parseSemicolonCsv, rowsToObjects } from "./parseCsv.mjs";

export const PROBE_JSON_VERSION = 1;

const UA =
  "GymDashboardPriceProbe/0.1 (+https://example.local; contact: local-dev only)";
const TIMEOUT_MS = 18_000;

function stripTrackingParams(url) {
  try {
    const u = new URL(url.trim());
    const drop = [
      "gclid",
      "fbclid",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gad_source",
      "gad_campaignid",
    ];
    for (const k of drop) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return url.trim();
  }
}

function looksLikeHttpUrl(s) {
  const t = String(s ?? "").trim();
  return /^https?:\/\//i.test(t);
}

function classifyUrl(url) {
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com")) return "social_instagram";
  if (lower.includes("facebook.com")) return "social_facebook";
  if (lower.includes("gymly.io/embed")) return "embed_calendar_not_pricing";
  return "http";
}

async function probeOne({ name, url }) {
  const kind = classifyUrl(url);
  if (kind !== "http") {
    return {
      name,
      url,
      ok: false,
      status: "—",
      contentType: "—",
      kind,
      hasEuro: false,
      euroishCount: 0,
      note: kind === "embed_calendar_not_pricing" ? "URL is calendar embed, not tarieven" : "Social URL — geen tarievenpagina verwacht",
      finalUrl: null,
    };
  }

  const cleanUrl = stripTrackingParams(url);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(cleanUrl, {
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
    const buf = await res.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf).slice(0, 500_000);
    const hasEuro = /€|&euro;|&#128;|eur\s*[:\s]?\s*[\d.,]+/i.test(text);
    const euroish = text.match(/€\s*[\d.,]+|[\d.,]+\s*€/g) || [];
    const uniqueish = new Set(euroish.map((x) => x.replace(/\s+/g, " ").slice(0, 24)));
    return {
      name,
      url: cleanUrl,
      ok: res.ok,
      status: String(res.status),
      finalUrl: res.url,
      contentType: ct.split(";")[0].trim(),
      kind: "http",
      hasEuro,
      euroishCount: uniqueish.size,
      note: res.ok ? (hasEuro ? "HTML bevat €-achtige patronen" : "Geen simpele €-patronen in eerste ~500kB") : `HTTP niet OK`,
    };
  } catch (e) {
    const msg = e?.name === "AbortError" ? `Timeout ${TIMEOUT_MS}ms` : String(e?.message || e);
    return {
      name,
      url: cleanUrl,
      ok: false,
      status: "ERR",
      contentType: "—",
      kind: "http",
      hasEuro: false,
      euroishCount: 0,
      note: msg,
      finalUrl: null,
    };
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {string} csvPath absolute path to gym-data.csv
 * @param {{ logFetch?: (name: string) => void }} [opts]
 */
export async function runPriceProbe(csvPath, opts = {}) {
  const raw = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseSemicolonCsv(raw);
  const { data } = rowsToObjects(rows);

  const targets = [];
  for (const row of data) {
    const name = String(row.Naam ?? "").trim();
    const website = String(row.Website ?? "").trim();
    if (!name) continue;
    if (!looksLikeHttpUrl(website)) {
      targets.push({ name, url: website, skip: true, skipReason: "Geen http(s)-URL in CSV" });
    } else {
      targets.push({ name, url: website, skip: false });
    }
  }

  const results = [];
  for (const t of targets) {
    if (t.skip) {
      results.push({
        name: t.name,
        url: t.url || "—",
        ok: false,
        status: "—",
        contentType: "—",
        kind: "skip",
        hasEuro: false,
        euroishCount: 0,
        note: t.skipReason,
        finalUrl: null,
      });
      continue;
    }
    opts.logFetch?.(t.name);
    results.push(await probeOne(t));
  }

  return {
    version: PROBE_JSON_VERSION,
    generatedAt: new Date().toISOString(),
    sourceCsv: csvPath,
    results,
  };
}
