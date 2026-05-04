import { useEffect, useMemo, useState } from "react";
import { labelForProductType } from "./gymPricingTaxonomy.js";
import { getGymAccentColor, getGymNameColor, isAtcName } from "./gymColors.js";

/** Zelfde basis als ConcurrentieView (kosten-tab). */
const DARK = {
  bg: "#08080f",
  surface: "#0d0d18",
  border: "#0f0f1e",
  border2: "#151528",
  text: "#e0e0e0",
  textMuted: "#404060",
  textSub: "#c0c0cc",
  row: "#0f0f1e",
};
const LIGHT = {
  bg: "#f4f4f8",
  surface: "#ffffff",
  border: "#e0e0ea",
  border2: "#d0d0e0",
  text: "#1a1a2e",
  textMuted: "#888899",
  textSub: "#444455",
  row: "#f0f0f8",
};

const SECTIONS = [
  {
    id: "abonnement",
    title: "Abonnement",
    subtitle: "Maandprijzen en ‘× per week’ uit de site-tekst.",
    beschrijving:
      "Alles wat op een doorlopend lidmaatschap lijkt: onbeperkt trainen, vaste dagen per week, of een algemene maandprijs zonder verdere splitsing.",
  },
  {
    id: "addon",
    title: "Fitness / add-on",
    subtitle: "Open gym, apparatuur, krachtruimte.",
    beschrijving:
      "Regels die wijzen op gebruik van de sportschool of toestellen naast lessen (add-on of apart pakket).",
  },
  {
    id: "jeugd",
    title: "Jeugd",
    subtitle: "Jeugd- en kids-tarieven.",
    beschrijving: "Bedragen waar de tekst rondom jeugd, kids of vergelijkbare leeftijd suggereert.",
  },
  {
    id: "losse_verkoop",
    title: "Losse verkoop",
    subtitle: "Proefles, dagpas, drop-in.",
    beschrijving: "Eenmalig meedoen, proefweek of los tarief zonder vast abonnement in deze regel.",
  },
  {
    id: "deals",
    title: "Deals langer contract",
    subtitle: "Jaar, kwartaal, korting bij binden.",
    beschrijving: "Tekst die wijst op voordeel bij langere looptijd of jaarcontract (niet de standaard maandregel).",
  },
  {
    id: "extra",
    title: "Extra & onbekend",
    subtitle: "Overig; handmatig checken.",
    beschrijving:
      "Alle €-treffers die niet in bovenstaande hokjes passen. Hier zie je wat er ‘onder extra’ uit de site komt.",
  },
  {
    id: "structured",
    title: "Structured data",
    subtitle: "JSON-LD in de bron.",
    beschrijving: "Formele product- of prijsblokken die de site in schema.org aan zoekmachines doorgeeft.",
  },
  {
    id: "status",
    title: "Status",
    subtitle: "Niet ingelezen.",
    beschrijving: "Geen bruikbare URL, netwerkfout, of pagina zonder bruikbare scrape-resultaten.",
  },
];

function typeLabel(suggested) {
  if (!suggested) return "—";
  if (suggested === "freq_week") return "Frequentie (week)";
  if (suggested === "abonnement") return "Abonnement (algemeen)";
  return labelForProductType(suggested);
}

function bucketFor(suggested, source, rowKind) {
  if (rowKind === "skip" || rowKind === "error") return "status";
  if (source === "json-ld") return "structured";
  const t = suggested;
  if (t === "fitness_addon") return "addon";
  if (t === "jeugd") return "jeugd";
  if (t === "proefles" || t === "losse_les") return "losse_verkoop";
  if (t === "deal_lang_contract") return "deals";
  if (t === "onbeperkt" || t === "abonnement" || t === "freq_week" || (typeof t === "string" && t.startsWith("freq_week_"))) {
    return "abonnement";
  }
  return "extra";
}

/** Eén zin: wat deze rij betekent in mensentaal. */
function korteToelichtingVoorRij(r) {
  if (r.rowKind === "skip") {
    return "Geen werkende website-link in gym-data.csv; deze gym is niet opgehaald.";
  }
  if (r.rowKind === "error") {
    return "De pagina kon niet geladen worden of bevatte geen bruikbare prijsfragmenten (SPA’s tonen soms pas na JavaScript).";
  }
  if (r.source === "json-ld") {
    return "Prijs- of productinformatie uit gestructureerde data (JSON-LD) in de HTML-bron.";
  }
  if (r.source === "html-flat") {
    return "Bedrag gevonden nadat de HTML plat is gemaakt (vangt ook tekst in scripts mee).";
  }
  if (r.source === "html-text") {
    return "Bedrag uit zichtbare paginatekst (zonder scripts), zoals een bezoeker die snel ziet.";
  }
  const sug = r.suggestedRaw;
  const b = r.bucket;
  if (b === "abonnement") {
    if (sug === "onbeperkt") return "Woorden suggereren onbeperkt meedoen; controleer welk lesaanbod echt inbegrepen is.";
    if (sug && String(sug).startsWith("freq_week")) return "Tekst past bij een vast aantal trainingsdagen per week (maandprijs).";
    if (sug === "abonnement") return "Duidelijk een abonnementstarief, maar niet specifiek 1×/2× of onbeperkt.";
    return "Abonnement-achtig bedrag; exact product staat op de site van de gym.";
  }
  if (b === "addon") return "Duidt op fitnessruimte, apparatuur of open gym naast je lessenpakket.";
  if (b === "jeugd") return "Context noemt jeugd/kids; tarief kan andere voorwaarden hebben dan volwassenen.";
  if (b === "losse_verkoop") {
    if (sug === "proefles") return "Eenmalige proef of intro; geen volledig lidmaatschap in deze regel.";
    return "Los meedoen of kort passen (drop-in, dagpas, trial); geen doorlopend abonnement hier.";
  }
  if (b === "deals") return "Mogelijk voordeel bij langere bindperiode of jaarafspraak; lees de site voor voorwaarden.";
  if (b === "extra") return "Niet automatisch ingedeeld; lees het fragment en verplaats desnoods naar je eigen tarieflijst.";
  return "Geëxtraheerd uit de website; altijd handmatig verifiëren.";
}

export default function GymDataScrapeSection({ dark, visibleGymNames }) {
  const T = dark ? DARK : LIGHT;
  const visible = useMemo(() => new Set((visibleGymNames || []).map((n) => String(n).trim())), [visibleGymNames]);

  const [payload, setPayload] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/gym-pricing-scrape.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!cancelled) {
          setPayload(d);
          setErr(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPayload(null);
          setErr(String(e?.message || e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const flatRows = useMemo(() => {
    const list = Array.isArray(payload?.gyms) ? payload.gyms : [];
    const out = [];
    for (const g of list) {
      if (!visible.has(String(g.gym || "").trim())) continue;
      const url = g.finalUrl || g.url;
      if (g.skipped) {
        out.push({
          key: `${g.gym}-skip`,
          bucket: bucketFor(null, null, "skip"),
          gym: g.gym,
          price: "—",
          productLabel: "—",
          suggestedRaw: null,
          context: g.skipReason || "Overgeslagen",
          source: "—",
          url,
          rowKind: "skip",
        });
        continue;
      }
      if (!g.ok && (!g.items || g.items.length === 0)) {
        out.push({
          key: `${g.gym}-err`,
          bucket: bucketFor(null, null, "error"),
          gym: g.gym,
          price: "—",
          productLabel: "—",
          suggestedRaw: null,
          context: g.error || `HTTP ${g.status}`,
          source: "fetch",
          url,
          rowKind: "error",
        });
        continue;
      }
      const jn = Array.isArray(g.jsonLd) ? g.jsonLd : [];
      jn.forEach((j, i) => {
        const ctx = `${j.summary || ""} ${j.detail || ""}`.trim().slice(0, 420);
        out.push({
          key: `${g.gym}-ld-${i}`,
          bucket: "structured",
          gym: g.gym,
          price: "—",
          productLabel: "JSON-LD",
          suggestedRaw: null,
          context: ctx || "—",
          source: "json-ld",
          url,
          rowKind: "ok",
        });
      });
      (g.items || []).forEach((it, i) => {
        const sug = it.suggestedProductType ?? null;
        out.push({
          key: `${g.gym}-h-${i}`,
          bucket: bucketFor(sug, it.source || "html-text", "ok"),
          gym: g.gym,
          price: it.price || "—",
          productLabel: typeLabel(sug),
          suggestedRaw: sug,
          context: it.context || "—",
          source: it.source || "html-text",
          url,
          rowKind: "ok",
        });
      });
    }
    return out;
  }, [payload, visible]);

  const sectionsWithRows = useMemo(() => {
    const byId = Object.fromEntries(SECTIONS.map((s) => [s.id, []]));
    for (const r of flatRows) {
      if (byId[r.bucket]) byId[r.bucket].push(r);
    }
    return SECTIONS.map((meta) => ({ ...meta, rows: byId[meta.id] || [] })).filter((s) => s.rows.length > 0);
  }, [flatRows]);

  const when = payload?.scrapedAt
    ? new Date(payload.scrapedAt).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "min(1200px, 100%)" }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>Website scrape</h2>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: T.textSub, marginBottom: 8, maxWidth: 920 }}>
          {payload?.disclaimer ||
            "Prijzen uit HTML (heuristisch). Per blok: korte uitleg wat die categorie inhoudt; per rij: kolom \"Korte toelichting\"."}
        </p>
        {when && (
          <p style={{ fontSize: 11, color: T.textMuted }}>
            Laatste scrape: <strong style={{ color: T.textSub }}>{when}</strong>
          </p>
        )}
      </div>

      {err && <p style={{ fontSize: 12, color: "#f87171" }}>Kon JSON niet laden ({err}).</p>}

      {!err && flatRows.length === 0 && (
        <div
          style={{
            padding: 18,
            borderRadius: 10,
            border: `1px dashed ${T.border2}`,
            background: T.surface,
            color: T.textMuted,
            fontSize: 13,
          }}
        >
          Geen scrape-data of geen gyms geselecteerd. Voer <code style={{ fontSize: 11 }}>npm run scrape:pricing</code> uit.
        </div>
      )}

      {sectionsWithRows.map((section) => (
        <div
          key={section.id}
          style={{
            background: T.surface,
            border: `1px solid ${T.border2}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border2}`, background: T.bg }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "1.6px",
                textTransform: "uppercase",
                color: T.textMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span>{section.title}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.textSub }}>{section.rows.length} regels</span>
            </div>
            <div style={{ fontSize: 11, color: T.textSub, marginTop: 4, fontWeight: 600 }}>{section.subtitle}</div>
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 8, lineHeight: 1.5, maxWidth: 900 }}>
              {section.beschrijving}
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  {["Gym", "Prijs", "Productsoort (hint)", "Korte toelichting", "Fragment", "Bron", "Site"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
                        textAlign: h === "Gym" || h === "Korte toelichting" || h === "Fragment" ? "left" : "center",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: T.textMuted,
                        borderBottom: `1px solid ${T.border2}`,
                        background: T.bg,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((r) => {
                  const tip = korteToelichtingVoorRij(r);
                  const isAtc = isAtcName(r.gym);
                  const col = getGymAccentColor({ name: r.gym, isAtc });
                  const nameColor = getGymNameColor({ name: r.gym, isAtc }, T.textSub);
                  return (
                    <tr
                      key={r.key}
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        background: isAtc ? (dark ? "#130608" : "#ffecec") : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isAtc ? (dark ? "#180a0e" : "#ffe2e2") : T.row;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isAtc ? (dark ? "#130608" : "#ffecec") : "transparent";
                      }}
                    >
                      <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 3, height: 20, borderRadius: 2, background: col, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: isAtc ? 800 : 600, color: nameColor }}>{r.gym}</span>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "9px 12px",
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          color: r.price && r.price !== "—" ? "#ffb703" : T.textMuted,
                          fontFamily: "ui-monospace,monospace",
                        }}
                      >
                        {r.price}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "center", fontSize: 10, fontWeight: 600, color: T.textSub }}>
                        {r.productLabel}
                      </td>
                      <td style={{ padding: "9px 12px", fontSize: 10, lineHeight: 1.45, color: T.textMuted, maxWidth: 260 }}>
                        {tip}
                      </td>
                      <td style={{ padding: "9px 12px", fontSize: 10, lineHeight: 1.45, color: T.textSub, maxWidth: 320 }}>
                        {r.context}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "center", fontSize: 10, color: T.textMuted }}>{r.source}</td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}>
                        {r.url ? (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 10, fontWeight: 700, color: "#3a86ff", textDecoration: "none" }}
                          >
                            ↗
                          </a>
                        ) : (
                          <span style={{ color: T.textMuted }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
