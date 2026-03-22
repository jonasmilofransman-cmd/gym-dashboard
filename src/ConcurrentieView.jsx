import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  DayPicker,
  GymDayLessonCard,
  findGymScheduleByName,
} from "./ScheduleDashboard.jsx";

// ─── THEME (match ScheduleDashboard) ─────────────────────────────────────────
const DARK_THEME = {
  bg: "#08080f",
  surface: "#0d0d18",
  border: "#0f0f1e",
  border2: "#151528",
  text: "#e0e0e0",
  textMuted: "#404060",
  textSub: "#c0c0cc",
  row: "#0f0f1e",
  btnBgA: "#141428",
};
const LIGHT_THEME = {
  bg: "#f4f4f8",
  surface: "#ffffff",
  border: "#e0e0ea",
  border2: "#d0d0e0",
  text: "#1a1a2e",
  textMuted: "#888899",
  textSub: "#444455",
  row: "#f0f0f8",
  btnBgA: "#e8e8f8",
};

const ALL_CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

function GymRoosterDetails({ gymNaam, theme }) {
  const [day, setDay] = useState("Ma");
  const gym = useMemo(() => findGymScheduleByName(gymNaam), [gymNaam]);
  return (
    <details style={{ marginTop: 4 }}>
      <summary
        style={{
          cursor: "pointer",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.4px",
          color: theme.textMuted,
          listStyle: "none",
        }}
      >
        Rooster (per dag)
      </summary>
      <div style={{ marginTop: 10 }}>
        <DayPicker day={day} setDay={setDay} theme={theme} rowStyle={{ marginBottom: 10 }} />
        <GymDayLessonCard gym={gym} day={day} activeCats={ALL_CATEGORY_KEYS} theme={theme} />
      </div>
    </details>
  );
}

// ─── CSV + DISTANCE HELPERS ──────────────────────────────────────────────────
function parseDelimited(text, delimiter = ";") {
  // Handles quoted values + newlines inside quotes.
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cur);
    cur = "";
  };
  const pushRow = () => {
    // Trim trailing empty columns (your file has lots of trailing delimiters)
    let end = row.length;
    while (end > 0 && String(row[end - 1] ?? "").trim() === "") end--;
    rows.push(row.slice(0, end).map((c) => String(c ?? "").trim()));
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\"") {
      // Escaped double-quote inside quotes
      const next = text[i + 1];
      if (inQuotes && next === "\"") {
        cur += "\"";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && c === delimiter) {
      pushCell();
      continue;
    }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      pushCell();
      pushRow();
      continue;
    }
    cur += c;
  }
  pushCell();
  // Avoid adding an extra empty row at EOF
  if (row.some((x) => String(x ?? "").trim() !== "")) pushRow();
  return rows;
}

function parseEuro(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || /geen info/i.test(s) || /niet mog/i.test(s) || s === "x") return null;
  // supports: "€ 60,00", "79.5", "54,95", "1.234,56", "1,234.56"
  let cleaned = s.replace(/[€\s]/g, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    // Decide decimal separator by the last occurrence
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      // comma is decimal, dot is thousands
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // dot is decimal, comma is thousands
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(",", ".");
  } else {
    // dot-decimal or integer; keep as-is
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseKm(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s === "x") return null;
  const cleaned = s.toLowerCase().replace("km", "").trim().replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseCoord(value, kind) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s === "x") return null;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (kind === "lat" && (n < -90 || n > 90)) return null;
  if (kind === "lon" && (n < -180 || n > 180)) return null;
  return n;
}

function haversineKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function normalizeUrl(url) {
  const s = String(url || "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  // If someone pasted an address instead of a URL, don't force a link.
  if (s.includes(" ") || s.includes(",")) return null;
  return `https://${s}`;
}

// ─── CONCURRENTIE DATA (fallback palette) ────────────────────────────────────
const PALETTE = [
  "#3a86ff", "#06d6a0", "#ffb703", "#8338ec", "#fb5607",
  "#2ec4b6", "#f77f00", "#4cc9f0", "#80b918", "#9d4edd",
];

// ─── CONCURRENTIE VIEW ────────────────────────────────────────────────────────
export default function ConcurrentieView({ dark = true, visibleGymNames }) {
  const T = dark ? DARK_THEME : LIGHT_THEME;
  // Optional filtering from outer sidebar
  // visibleGymNames: array of gym names to show
  // (kept optional so ConcurrentieView still works standalone)
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [subTab, setSubTab] = useState("overzicht");
  const [sortBy, setSortBy] = useState("prijs");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/gym-data.csv")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not found"))))
      .then((text) => {
        if (cancelled) return;
        const clean = text.replace(/^\uFEFF/, "");
        const rows = parseDelimited(clean, ";");
        const headerRowIndex = rows.findIndex((r) => String(r?.[0] ?? "").trim() === "Naam");
        const headerRow = headerRowIndex >= 0 ? rows[headerRowIndex] : rows[1] || [];
        const headers = headerRow.map((h, i) => (h && h.trim() ? h.trim() : `Kolom ${i + 1}`));
        const dataRows = rows.slice((headerRowIndex >= 0 ? headerRowIndex : 1) + 1);

        const idx = (name) => headers.indexOf(name);
        const I_NAAM = idx("Naam");
        const I_LOCATIE = idx("Locatie");
        const I_WEBSITE = idx("Website");
        const I_AFSTAND_ATC = idx("Afstand ATC");
        const I_AFSTAND_ETTAKI = idx("Afstand Ettaki Gym");
        const I_ONBEPERKT = idx("Maandabonnement onbeperkt");
        const I_WEEK1 = idx("1x per week abonnement (Prijs per maand)");
        const I_WEEK2 = idx("2x per week abonnement (Prijs per maand)");
        const I_LOSSES = idx("Losseles prijs");
        const I_EXTRA = idx("Extra/add-on");
        const I_CONTRACT = idx("Contractduur (maandelijks / 6 maanden / jaar)");
        const I_JEUGD = idx("Jeugd 1x per maand");
        const LAT_I = idx("Breedtegraad");
        const LON_I = idx("Lengtegraad");

        const get = (row, i) => (i >= 0 ? String(row[i] ?? "").trim() : "");

        const mapped = dataRows
          .map((r) => {
            const row = r ?? [];
            const naam = (I_NAAM >= 0 ? get(row, I_NAAM) : get(row, 0)) || "";
            if (!naam) return null;
            const locatie = I_LOCATIE >= 0 ? get(row, I_LOCATIE) : get(row, 1);
            const website = I_WEBSITE >= 0 ? get(row, I_WEBSITE) : get(row, 2);

            const afstandAtcKm = I_AFSTAND_ATC >= 0 ? parseKm(get(row, I_AFSTAND_ATC)) : null;
            const afstandEttakiKm = I_AFSTAND_ETTAKI >= 0 ? parseKm(get(row, I_AFSTAND_ETTAKI)) : null;

            const lat = LAT_I >= 0 ? parseCoord(row[LAT_I], "lat") : null;
            const lon = LON_I >= 0 ? parseCoord(row[LON_I], "lon") : null;
            const coords = lat != null && lon != null ? { lat, lon } : null;

            return {
              naam,
              isAtc: naam.trim().toLowerCase() === "atc",
              locatie,
              website,
              kmAtc: afstandAtcKm,
              kmEttaki: afstandEttakiKm,
              afstandAtc: afstandAtcKm != null ? `${afstandAtcKm} km` : "",
              afstandEttaki: afstandEttakiKm != null ? `${afstandEttakiKm} km` : "",
              coords,
              aanbod: {
                mma: "—", bjj: "—", kickboksen: "—", boksen: "—", wrestling: "—", bokszak: "—",
                jeugd: "—", vrouwen: "—", beginners: "—", sparren: "—", wedstrijd: "—", openGym: "—",
              },
              kosten: {
                onbeperkt: parseEuro(I_ONBEPERKT >= 0 ? get(row, I_ONBEPERKT) : get(row, 5)),
                week1: parseEuro(I_WEEK1 >= 0 ? get(row, I_WEEK1) : get(row, 6)),
                week2: parseEuro(I_WEEK2 >= 0 ? get(row, I_WEEK2) : get(row, 7)),
                losses: parseEuro(I_LOSSES >= 0 ? get(row, I_LOSSES) : get(row, 8)),
                extra: parseEuro(I_EXTRA >= 0 ? get(row, I_EXTRA) : get(row, 9)),
                contract: (I_CONTRACT >= 0 ? get(row, I_CONTRACT) : get(row, 10)) || "—",
                jeugd: parseEuro(I_JEUGD >= 0 ? get(row, I_JEUGD) : get(row, 11)),
              },
              reputatie: { googleRating: null, googleReviews: null, facebook: "—", instagram: null, youtube: "—", tiktok: "—" },
              merk: { professionaliteit: null, website: null, socialmedia: null, branding: null, visueel: null, totaal: null },
            };
          })
          .filter(Boolean);

        // If distances are blank/"x", compute instantly from coords (no geocoding)
        const atc = mapped.find((g) => g.naam.trim().toLowerCase() === "atc");
        const ettaki = mapped.find((g) => g.naam.trim().toLowerCase() === "ettakigym");
        const atcCoords = atc?.coords ?? null;
        const ettakiCoords = ettaki?.coords ?? null;
        const withDistances = mapped.map((g) => {
          const needsAtc = !String(g.afstandAtc || "").trim();
          const needsEttaki = !String(g.afstandEttaki || "").trim();
          let kmAtc = g.kmAtc;
          let kmEttaki = g.kmEttaki;
          let afstandAtc = g.afstandAtc;
          let afstandEttaki = g.afstandEttaki;
          if (!g.coords) return { ...g, kmAtc, kmEttaki, afstandAtc, afstandEttaki };
          const atcKm = needsAtc && atcCoords ? haversineKm(g.coords, atcCoords) : null;
          const ettakiKm = needsEttaki && ettakiCoords ? haversineKm(g.coords, ettakiCoords) : null;
          if (needsAtc && atcKm != null) {
            kmAtc = atcKm;
            afstandAtc = `${atcKm.toFixed(1)} km`;
          }
          if (needsEttaki && ettakiKm != null) {
            kmEttaki = ettakiKm;
            afstandEttaki = `${ettakiKm.toFixed(1)} km`;
          }
          return { ...g, kmAtc, kmEttaki, afstandAtc, afstandEttaki };
        });

        setGyms(withDistances);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setGyms([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    const num = (v, fallback) => (Number.isFinite(v) ? v : fallback);
    const tie = (a, b) => String(a.naam || "").localeCompare(String(b.naam || ""), "nl");
    const kmRank = (v) => (Number.isFinite(v) ? v : Infinity);

    return [...gyms].sort((a, b) => {
      let c = 0;
      if (sortBy === "merkScore") c = num(b.merk?.totaal, -1) - num(a.merk?.totaal, -1);
      else if (sortBy === "googleRating") c = num(b.reputatie?.googleRating, -1) - num(a.reputatie?.googleRating, -1);
      else if (sortBy === "instagram") c = num(b.reputatie?.instagram, -1) - num(a.reputatie?.instagram, -1);
      else if (sortBy === "prijs") c = num(a.kosten?.onbeperkt, 999) - num(b.kosten?.onbeperkt, 999);
      else if (sortBy === "afstandAtc") {
        const da = kmRank(a.kmAtc);
        const db = kmRank(b.kmAtc);
        c = da === db ? tie(a, b) : da - db;
      } else if (sortBy === "afstandEttaki") {
        const da = kmRank(a.kmEttaki);
        const db = kmRank(b.kmEttaki);
        c = da === db ? tie(a, b) : da - db;
      } else {
        c = tie(a, b);
      }
      return c;
    });
  }, [gyms, sortBy]);

  const visible = useMemo(() => {
    if (!Array.isArray(visibleGymNames)) return sorted;
    const set = new Set(visibleGymNames.map((n) => String(n).toLowerCase()));
    return sorted.filter((g) => set.has(String(g.naam).toLowerCase()));
  }, [sorted, visibleGymNames]);

  const ja = v => v === "Ja";
  const addon = v => v === "Add-on";

  const Pill = ({ val }) => {
    const isEmpty = val == null || val === "" || val === "—" ||
      (typeof val === "string" && (val.trim() === "—" || val.endsWith(" —")));
    if (isEmpty) {
      return (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
          background: T.btnBgA, color: T.textMuted, border: `1px solid ${T.border2}`, whiteSpace: "nowrap",
        }}>—</span>
      );
    }
    const isJa = val === "Ja";
    const isAddon = val === "Add-on";
    const isNee = val === "Nee";
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
        background: isJa ? "#06d6a018" : isAddon ? "#ffb70318" : T.btnBgA,
        color: isJa ? "#06d6a0" : isAddon ? "#ffb703" : T.textMuted,
        border: `1px solid ${isJa ? "#06d6a030" : isAddon ? "#ffb70330" : T.border2}`,
        whiteSpace: "nowrap",
      }}>{val}</span>
    );
  };

  const subTabs = [
    { key: "overzicht", label: "Overzicht" },
    { key: "kosten", label: "Kosten" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, color: T.text }}>
      {loading && (
        <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 10, padding: 16, color: T.textMuted, fontSize: 12 }}>
          Data laden…
        </div>
      )}
      {!loading && gyms.length === 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 10, padding: 16, color: T.textMuted, fontSize: 12 }}>
          Geen gyms gevonden in <code style={{ background: T.bg, padding: "2px 6px", borderRadius: 6, border: `1px solid ${T.border2}` }}>/gym-data.csv</code>.
        </div>
      )}
      {/* Sub-tab nav */}
      <div style={{ display: "flex", gap: 2, background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 9, padding: 3, width: "fit-content" }}>
        {subTabs.map(({ key, label }) => (
          <button key={key} onClick={() => setSubTab(key)} style={{
            padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700,
            border: "none", transition: "all .15s", letterSpacing: .3,
            background: subTab === key ? T.btnBgA : "transparent",
            color: subTab === key ? (dark ? "#fff" : T.text) : T.textMuted,
          }}>{label}</button>
        ))}
      </div>

      {/* ── OVERZICHT ── */}
      {subTab === "overzicht" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Sorteren */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>Sorteren:</span>
            {[
              ["prijs", "Prijs"],
              ["naam", "Naam"],
              ["afstandAtc", "Afstand ATC"],
              ["afstandEttaki", "Afstand Ettaki"],
            ].map(([k, l]) => (
              <button type="button" key={k} onClick={() => setSortBy(k)} style={{
                fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                border: `1px solid ${sortBy===k?"#3a86ff40":T.border2}`,
                background: sortBy===k ? (dark ? "#0d1525" : "#eaf1ff") : "transparent",
                color: sortBy===k?"#3a86ff":T.textMuted, cursor: "pointer",
              }}>{l}</button>
            ))}
          </div>

          {/* Gym kaarten */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
            {visible.map((gym, i) => {
              const accentColor = gym.isAtc ? "#E63946" : PALETTE[i % PALETTE.length];
              const websiteUrl = normalizeUrl(gym.website);
              return (
                <div key={gym.naam} style={{
                  background: T.surface, border: `1px solid ${gym.isAtc ? "#E6394630" : T.border2}`,
                  borderRadius: 10, overflow: "hidden",
                  boxShadow: gym.isAtc ? "0 0 0 1px #E6394620" : "none",
                }}>
                  <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 3, height: 40, borderRadius: 2, background: accentColor, flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: gym.isAtc ? "#E63946" : T.textSub }}>{gym.naam}</span>
                        {gym.isAtc && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "#E6394620", color: "#E63946", border: "1px solid #E6394640" }}>ATC</span>}
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>{gym.locatie}</div>
                      {websiteUrl && (
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: "inline-block", marginTop: 6, fontSize: 10, fontWeight: 700, color: "#3a86ff", textDecoration: "none" }}
                        >
                          Website openen ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {Number.isFinite(gym.kosten?.onbeperkt) && (
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#ffb703" }}>
                        €{gym.kosten.onbeperkt} / maand
                      </div>
                    )}

                    {/* Distances: only at bottom, always show both */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                      <Pill val={gym.afstandAtc ? `ATC ${gym.afstandAtc}` : "ATC —"} />
                      <Pill val={gym.afstandEttaki ? `Ettaki ${gym.afstandEttaki}` : "Ettaki —"} />
                    </div>

                    <GymRoosterDetails gymNaam={gym.naam} theme={T} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── KOSTEN TAB ── */}
      {subTab === "kosten" && (
        <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  {["Gym", "Onbeperkt /mnd", "1x /week", "2x /week", "Losse les", "Extra", "Contract", "Jeugd /mnd"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: h === "Gym" ? "left" : "center", fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: T.textMuted, borderBottom: `1px solid ${T.border2}`, background: T.bg, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...visible].sort((a,b) => (a.kosten.onbeperkt||999)-(b.kosten.onbeperkt||999)).map((gym, i) => {
                  const col = gym.isAtc ? "#E63946" : PALETTE[i % PALETTE.length];
                  const fmt = v => v ? `€${v}` : <span style={{ color: T.textMuted }}>—</span>;
                  return (
                    <tr key={gym.naam} style={{ borderBottom: `1px solid ${T.border}`, background: gym.isAtc ? (dark ? "#130608" : "#ffecec") : "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.background = gym.isAtc ? (dark ? "#180a0e" : "#ffe2e2") : T.row}
                      onMouseLeave={e => e.currentTarget.style.background = gym.isAtc ? (dark ? "#130608" : "#ffecec") : "transparent"}>
                      <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 3, height: 20, borderRadius: 2, background: col, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: gym.isAtc ? 800 : 600, color: gym.isAtc ? "#E63946" : T.textSub }}>{gym.naam}</span>
                        </div>
                      </td>
                      {[gym.kosten.onbeperkt, gym.kosten.week1, gym.kosten.week2, gym.kosten.losses, gym.kosten.extra].map((v, j) => (
                        <td key={j} style={{ padding: "9px 12px", textAlign: "center", fontSize: 12, fontWeight: v ? 700 : 400, color: v ? "#ffb703" : T.textMuted }}>{fmt(v)}</td>
                      ))}
                      <td style={{ padding: "9px 12px", textAlign: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: gym.kosten.contract === "maandelijks" || gym.kosten.contract === "Maandelijks" ? "#06d6a0" : gym.kosten.contract === "Jaarlijks" ? "#E63946" : T.textMuted }}>
                          {gym.kosten.contract || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "center", fontSize: 12, fontWeight: gym.kosten.jeugd ? 700 : 400, color: gym.kosten.jeugd ? "#3a86ff" : T.textMuted }}>{fmt(gym.kosten.jeugd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
