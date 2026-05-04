import { useEffect, useMemo, useState } from "react";
import { contractMonthLabel } from "./gymCostMasterData.js";
import { masterGymForCsvName } from "./gymMasterLookup.js";
import { labelForProductType, sortRankForProductType, categoryForProductType } from "./gymPricingTaxonomy.js";

const DARK = {
  surface: "#0d0d18",
  border2: "#151528",
  text: "#e0e0e0",
  textMuted: "#5a5a78",
  textSub: "#b8b8cc",
  row: "#0f0f1e",
  rowAlt: "#12121f",
  badge: "#2d4a7c",
  badgeManual: "#4a2d5c",
};
const LIGHT = {
  surface: "#ffffff",
  border2: "#d0d0e0",
  text: "#1a1a2e",
  textMuted: "#6a6a80",
  textSub: "#444455",
  row: "#f8f8fc",
  rowAlt: "#f0f0f8",
  badge: "#dbeafe",
  badgeManual: "#f3e8ff",
};

const CSV_FALLBACK = [
  {
    headerKey: "Maandabonnement onbeperkt",
    productType: "onbeperkt",
    productId: "onbeperkt_maand",
    product: "Onbeperkt — alle groepslessen (volgens gym)",
    hint: "Je mag naar elke les binnen je abonnement (exact aanbod op de site van de gym).",
  },
  {
    headerKey: "1x per week abonnement (Prijs per maand)",
    productType: "freq_week_1",
    productId: "freq_week_1",
    product: "1× per week (maandprijs)",
    hint: "Frequentie-abonnement.",
  },
  {
    headerKey: "2x per week abonnement (Prijs per maand)",
    productType: "freq_week_2",
    productId: "freq_week_2",
    product: "2× per week (maandprijs)",
    hint: "Frequentie-abonnement.",
  },
  {
    headerKey: null,
    productType: "freq_week_3",
    productId: "freq_week_3_placeholder",
    product: "3× per week (maandprijs)",
    hint: "Geen kolom in CSV — voeg `3x per week abonnement (Prijs per maand)` toe of gebruik overrides.",
  },
  {
    headerKey: "Losseles prijs",
    productType: "losse_les",
    productId: "losse_les",
    product: "Losse les / drop-in / dagpas",
    hint: "Eenmalige les of los tarief.",
  },
  {
    headerKey: "Extra/add-on",
    productType: "extra",
    productId: "extra_csv",
    product: "Extra / add-on (hele cel)",
    hint: "Alles wat niet in andere vaste producten past; voor splitsing: `npm run gen:offers` met nieuwe generator-CSV.",
  },
  {
    headerKey: "Contractduur (maandelijks / 6 maanden / jaar)",
    productType: "voorwaarden_contract",
    productId: "voorwaarden_contract",
    product: "Contractduur / minimale looptijd",
    hint: "Bindperiode of facturatie-eenheid.",
  },
  {
    headerKey: "Jeugd 1x per maand",
    productType: "jeugd",
    productId: "jeugd",
    product: "Jeugdabonnement",
    hint: "Jeugd-tarieven in deze kolom.",
  },
];

function isEmptyish(val) {
  const s = String(val ?? "").trim();
  if (!s) return true;
  return /^(geen info|niet mogenlijk|niet mogelijk|n\/a|—|-|)$/i.test(s);
}

function formatCell(val) {
  const s = String(val ?? "").trim();
  return s || "—";
}

function formatEuroNum(n) {
  if (n == null || !Number.isFinite(n)) return null;
  const t = Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
  return `€${t}`;
}

function buildFallbackLineItems(pricing, master) {
  const lines = [];
  for (let i = 0; i < CSV_FALLBACK.length; i++) {
    const row = CSV_FALLBACK[i];
    if (row.productId === "freq_week_3_placeholder") {
      lines.push({
        productType: row.productType,
        productId: row.productId,
        category: categoryForProductType(row.productType),
        product: row.product,
        price: "—",
        description: row.hint,
        source: "csv",
      });
      continue;
    }
    const raw = row.headerKey != null ? pricing?.[row.headerKey] : undefined;
    lines.push({
      productType: row.productType,
      productId: row.productId,
      category: categoryForProductType(row.productType),
      product: row.product,
      price: formatCell(raw),
      description: row.hint,
      source: "csv",
    });
  }
  lines.push({
    productType: "fitness_addon",
    productId: "fitness_addon_fb",
    category: categoryForProductType("fitness_addon"),
    product: "Fitness / sportschool-apparatuur add-on",
    price: "—",
    description: "Geen live JSON — voeg kolom Fitness add-on toe of draai `npm run gen:offers`.",
    source: "csv",
  });
  lines.push({
    productType: "proefles",
    productId: "proefles_fb",
    category: categoryForProductType("proefles"),
    product: "Proefles",
    price: "—",
    description: "Geen live JSON — voeg kolom Proefles toe of draai `npm run gen:offers`.",
    source: "csv",
  });
  lines.push({
    productType: "deal_lang_contract",
    productId: "deal_lang_fb",
    category: categoryForProductType("deal_lang_contract"),
    product: "Deal langer contract",
    price: "—",
    description: "Jaar-/halfjaar-deals staan vaak in Extra of op de site.",
    source: "csv",
  });

  if (!master) return lines;
  if (Number.isFinite(master.dropIn) && isEmptyish(pricing[CSV_FALLBACK.find((x) => x.productType === "losse_les")?.headerKey])) {
    lines.push({
      productType: "losse_les",
      productId: "losse_les_master",
      category: categoryForProductType("losse_les"),
      product: "Losse les / drop-in",
      price: formatEuroNum(master.dropIn),
      description: "Aangevuld uit interne kostenmaster.",
      source: "master",
    });
  }
  const w1 = pricing?.["1x per week abonnement (Prijs per maand)"];
  if (Number.isFinite(master.price1x) && isEmptyish(w1)) {
    lines.push({
      productType: "freq_week_1",
      productId: "freq_week_1_master",
      category: categoryForProductType("freq_week_1"),
      product: "1× per week (maandprijs)",
      price: formatEuroNum(master.price1x),
      description: "Aangevuld uit interne kostenmaster.",
      source: "master",
    });
  }
  const w2 = pricing?.["2x per week abonnement (Prijs per maand)"];
  if (Number.isFinite(master.price2x) && isEmptyish(w2)) {
    lines.push({
      productType: "freq_week_2",
      productId: "freq_week_2_master",
      category: categoryForProductType("freq_week_2"),
      product: "2× per week (maandprijs)",
      price: formatEuroNum(master.price2x),
      description: "Aangevuld uit interne kostenmaster.",
      source: "master",
    });
  }
  if (Number.isFinite(master.contract) && isEmptyish(pricing["Contractduur (maandelijks / 6 maanden / jaar)"])) {
    lines.push({
      productType: "voorwaarden_contract",
      productId: "voorwaarden_master",
      category: categoryForProductType("voorwaarden_contract"),
      product: "Contract (indicatie)",
      price: "—",
      description: `Bindperiode uit kostenmaster: ${contractMonthLabel(master.contract)}.`,
      source: "master",
    });
  }
  return lines;
}

function sourceBadge(source, dark, T) {
  const s = String(source || "csv").toLowerCase();
  if (s === "master") {
    return (
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          padding: "3px 6px",
          borderRadius: 5,
          background: T.badge,
          color: dark ? "#a8c4ff" : "#1e40af",
        }}
      >
        Master
      </span>
    );
  }
  if (s === "manual") {
    return (
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          padding: "3px 6px",
          borderRadius: 5,
          background: T.badgeManual,
          color: dark ? "#e9c4ff" : "#6b21a8",
        }}
      >
        Handmatig
      </span>
    );
  }
  return <span style={{ fontSize: 9, fontWeight: 700, color: T.textMuted }}>CSV</span>;
}

export default function GymDataTarievenSection({ dark, csvGyms, visibleGymNames }) {
  const T = dark ? DARK : LIGHT;
  const visible = useMemo(() => new Set((visibleGymNames || []).map((n) => String(n).trim())), [visibleGymNames]);

  const [offersPayload, setOffersPayload] = useState(null);
  const [offersError, setOffersError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/gym-product-offers.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (!cancelled) {
          setOffersPayload(data);
          setOffersError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setOffersPayload(null);
          setOffersError(String(e?.message || e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tableRows = useMemo(() => {
    const out = [];
    const gyms = [...(csvGyms || [])].filter((g) => visible.has(String(g.name || "").trim()));
    gyms.sort((a, b) => String(a.name).localeCompare(String(b.name), "nl", { sensitivity: "base" }));

    const useJson =
      offersPayload?.version >= 3 && offersPayload?.gyms && !offersError;

    for (const g of gyms) {
      const pricing = g.pricing && typeof g.pricing === "object" ? g.pricing : {};
      const master = masterGymForCsvName(g.name);

      let items;
      if (useJson && Array.isArray(offersPayload.gyms[g.name]) && offersPayload.gyms[g.name].length) {
        items = offersPayload.gyms[g.name].map((row) => ({
          gym: g.name,
          productType: row.productType || "extra",
          productId: row.productId,
          category: row.category || categoryForProductType(row.productType || "extra"),
          product: row.product,
          price: row.price ?? "—",
          description: row.description ?? "",
          source: row.source || "csv",
        }));
      } else {
        items = buildFallbackLineItems(pricing, master).map((row) => ({
          gym: g.name,
          productType: row.productType,
          productId: row.productId,
          category: row.category,
          product: row.product,
          price: row.price,
          description: row.description,
          source: row.source,
        }));
      }

      for (const item of items) out.push(item);
    }
    return out;
  }, [csvGyms, visible, offersPayload, offersError]);

  const sortedRows = useMemo(() => {
    return [...tableRows].sort((a, b) => {
      const ra = sortRankForProductType(a.productType);
      const rb = sortRankForProductType(b.productType);
      if (ra !== rb) return ra - rb;
      return String(a.gym).localeCompare(String(b.gym), "nl") || String(a.product).localeCompare(String(b.product), "nl");
    });
  }, [tableRows]);

  return (
    <div style={{ maxWidth: "min(1200px, 100%)" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>Alle tarieven</h2>
      <p style={{ fontSize: 12, lineHeight: 1.55, color: T.textSub, marginBottom: 8, maxWidth: 960 }}>
        Vaste <strong style={{ color: T.text }}>productsoorten</strong>: frequentie (1×, 2×, 3× … per week of per maand
        zodra er kolommen zijn), <strong>onbeperkt</strong>, <strong>fitness-/apparatuur-add-on</strong>,{" "}
        <strong>jeugd</strong>, <strong>proefles</strong>, <strong>losse les</strong>, <strong>deals bij lang contract</strong>,{" "}
        <strong>contractvoorwaarden</strong>, en <strong>extra</strong> (elk onderdeel uit de Extra-cel apart zichtbaar).
        Data: <code style={{ fontSize: 11 }}>public/gym-product-offers.json</code> via{" "}
        <code style={{ fontSize: 11 }}>npm run gen:offers</code>. Handmatig uitbreiden:{" "}
        <code style={{ fontSize: 11 }}>tools/gym-product-offers-overrides.json</code> (veld{" "}
        <code style={{ fontSize: 11 }}>productType</code> per regel).
      </p>
      {offersError && (
        <p style={{ fontSize: 11, color: "#f87171", marginBottom: 12 }}>
          Kon offers-JSON niet laden ({offersError}) — fallback op vereenvoudigde CSV-weergave (geen extra-split).
        </p>
      )}

      {sortedRows.length === 0 ? (
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            border: `1px dashed ${T.border2}`,
            color: T.textMuted,
            fontSize: 13,
          }}
        >
          Geen gyms geselecteerd in de sidebar.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${T.border2}` }}>
          <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: dark ? "#141428" : "#e8e8f0", color: T.textSub, textAlign: "left" }}>
                <th style={{ padding: "10px 10px", fontWeight: 800, whiteSpace: "nowrap" }}>Gym</th>
                <th style={{ padding: "10px 8px", fontWeight: 800, whiteSpace: "nowrap" }}>Productsoort</th>
                <th style={{ padding: "10px 8px", fontWeight: 800, whiteSpace: "nowrap" }}>Categorie</th>
                <th style={{ padding: "10px 10px", fontWeight: 800 }}>Product</th>
                <th style={{ padding: "10px 10px", fontWeight: 800, whiteSpace: "nowrap" }}>Prijs</th>
                <th style={{ padding: "10px 10px", fontWeight: 800 }}>Wat je krijgt</th>
                <th style={{ padding: "10px 8px", fontWeight: 800, whiteSpace: "nowrap" }}>Bron</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, i) => {
                const bg = i % 2 === 0 ? T.row : T.rowAlt;
                return (
                  <tr
                    key={`${row.gym}-${row.productId || row.product}-${i}`}
                    style={{ background: bg, color: T.text, borderTop: `1px solid ${T.border2}` }}
                  >
                    <td style={{ padding: "8px 10px", fontWeight: 700, verticalAlign: "top", whiteSpace: "nowrap" }}>{row.gym}</td>
                    <td style={{ padding: "8px 8px", verticalAlign: "top", color: T.textSub, fontWeight: 700, maxWidth: 160 }}>
                      {labelForProductType(row.productType)}
                    </td>
                    <td style={{ padding: "8px 8px", verticalAlign: "top", color: T.textMuted, fontWeight: 600 }}>{row.category}</td>
                    <td style={{ padding: "8px 10px", verticalAlign: "top", fontWeight: 600 }}>{row.product}</td>
                    <td style={{ padding: "8px 10px", verticalAlign: "top", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                      {row.price}
                    </td>
                    <td style={{ padding: "8px 10px", verticalAlign: "top", color: T.textSub, lineHeight: 1.45 }}>{row.description}</td>
                    <td style={{ padding: "8px 8px", verticalAlign: "top" }}>{sourceBadge(row.source, dark, T)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
