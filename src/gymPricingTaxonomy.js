/**
 * Vaste productsoorten voor tarieven-tab en generator.
 * `productType` is de stabiele sleutel; UI toont `labelForProductType`.
 */

export const PRODUCT_TYPES = {
  onbeperkt: "Onbeperkt (alle lessen)",
  fitness_addon: "Fitness / apparatuur add-on",
  jeugd: "Jeugdabonnement",
  proefles: "Proefles",
  losse_les: "Losse les / drop-in / pas",
  deal_lang_contract: "Deal langer contract",
  voorwaarden_contract: "Contract / looptijd",
  abonnement_variant: "Abonnement (variant)",
  extra: "Extra (overig)",
};

/** Sortering: eerst kern-abonnementen, dan add-ons, los, deals, voorwaarden, extra. */
const TYPE_ORDER = [
  "onbeperkt",
  "abonnement_variant",
  "fitness_addon",
  "jeugd",
  "proefles",
  "losse_les",
  "deal_lang_contract",
  "voorwaarden_contract",
  "extra",
];

export function labelForProductType(type) {
  if (!type) return "—";
  if (String(type).startsWith("freq_week_")) {
    const n = String(type).replace("freq_week_", "");
    return `${n}× per week (maandprijs)`;
  }
  if (String(type).startsWith("freq_month_")) {
    const n = String(type).replace("freq_month_", "");
    return `${n}× per maand`;
  }
  return PRODUCT_TYPES[type] || type;
}

export function categoryForProductType(type) {
  if (!type) return "Overig";
  if (type === "onbeperkt" || type.startsWith("freq_week_") || type.startsWith("freq_month_") || type === "abonnement_variant") {
    return "Abonnement";
  }
  if (type === "fitness_addon") return "Add-on";
  if (type === "jeugd") return "Jeugd";
  if (type === "proefles" || type === "losse_les") return "Losse verkoop";
  if (type === "deal_lang_contract") return "Deals";
  if (type === "voorwaarden_contract") return "Voorwaarden";
  if (type === "extra") return "Extra (detail)";
  return "Overig";
}

export function sortRankForProductType(type) {
  const t = String(type || "");
  if (t === "onbeperkt") return 5;
  if (t === "abonnement_variant") return 12;
  const mWeek = t.match(/^freq_week_(\d+)$/);
  if (mWeek) return 20 + parseInt(mWeek[1], 10);
  const mMonth = t.match(/^freq_month_(\d+)$/);
  if (mMonth) return 60 + parseInt(mMonth[1], 10);
  const idx = TYPE_ORDER.indexOf(t);
  if (idx >= 0) return 200 + idx;
  return 999;
}
