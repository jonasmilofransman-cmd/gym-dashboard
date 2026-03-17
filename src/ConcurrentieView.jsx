import { useEffect, useMemo, useState } from "react";

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
  // allow "€ 60,00", "79.5", "54,95"
  const cleaned = s
    .replace(/[€\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
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

async function geocode(address) {
  const key = `geo:v1:${address}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = await res.json();
  const first = json?.[0];
  if (!first) return null;
  const coords = { lat: Number(first.lat), lon: Number(first.lon) };
  if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return null;

  try {
    localStorage.setItem(key, JSON.stringify(coords));
  } catch {
    // ignore
  }
  return coords;
}

// ─── CONCURRENTIE DATA (fallback palette) ────────────────────────────────────
const PALETTE = [
  "#3a86ff", "#06d6a0", "#ffb703", "#8338ec", "#fb5607",
  "#2ec4b6", "#f77f00", "#4cc9f0", "#80b918", "#9d4edd",
];

// ─── CONCURRENTIE VIEW ────────────────────────────────────────────────────────
export default function ConcurrentieView() {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [subTab, setSubTab] = useState("overzicht");
  const [sortBy, setSortBy] = useState("prijs");
  const [filterAanbod, setFilterAanbod] = useState(null);

  const CONCURRENTEN = gyms;

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
        const LAT_I = idx("Breedtegraad");
        const LON_I = idx("Lengtegraad");

        const mapped = dataRows
          .map((r) => {
            const row = r ?? [];
            const naam = String(row[0] ?? "").trim();
            if (!naam) return null;
            const locatie = String(row[1] ?? "").trim();
            const website = String(row[2] ?? "").trim();

            const afstandAtcKm = parseKm(String(row[3] ?? "").trim());
            const afstandEttakiKm = parseKm(String(row[4] ?? "").trim());

            const lat = LAT_I >= 0 ? parseCoord(row[LAT_I], "lat") : null;
            const lon = LON_I >= 0 ? parseCoord(row[LON_I], "lon") : null;
            const coords = lat != null && lon != null ? { lat, lon } : null;

            return {
              naam,
              isAtc: naam.trim().toLowerCase() === "atc",
              locatie,
              website,
              afstandAtc: afstandAtcKm != null ? `${afstandAtcKm} km` : "",
              afstandEttaki: afstandEttakiKm != null ? `${afstandEttakiKm} km` : "",
              coords,
              aanbod: {
                mma: "—", bjj: "—", kickboksen: "—", boksen: "—", wrestling: "—", bokszak: "—",
                jeugd: "—", vrouwen: "—", beginners: "—", sparren: "—", wedstrijd: "—", openGym: "—",
              },
              kosten: {
                onbeperkt: parseEuro(String(row[5] ?? "")),
                week1: parseEuro(String(row[6] ?? "")),
                week2: parseEuro(String(row[7] ?? "")),
                losses: parseEuro(String(row[8] ?? "")),
                extra: parseEuro(String(row[9] ?? "")),
                contract: String(row[10] ?? "").trim() || "—",
                jeugd: parseEuro(String(row[11] ?? "")),
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
          if (!g.coords) return g;
          const atcKm = needsAtc && atcCoords ? haversineKm(g.coords, atcCoords) : null;
          const ettakiKm = needsEttaki && ettakiCoords ? haversineKm(g.coords, ettakiCoords) : null;
          return {
            ...g,
            afstandAtc: needsAtc && atcKm != null ? `${atcKm.toFixed(1)} km` : g.afstandAtc,
            afstandEttaki: needsEttaki && ettakiKm != null ? `${ettakiKm.toFixed(1)} km` : g.afstandEttaki,
          };
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

  const AANBOD_KEYS = [
    { key:"mma", label:"MMA" },
    { key:"bjj", label:"BJJ" },
    { key:"kickboksen", label:"Kickboksen" },
    { key:"boksen", label:"Boksen" },
    { key:"wrestling", label:"Wrestling" },
    { key:"bokszak", label:"Bokszak" },
    { key:"jeugd", label:"Jeugd" },
    { key:"vrouwen", label:"Vrouwen" },
    { key:"beginners", label:"Beginners" },
    { key:"sparren", label:"Sparren" },
    { key:"wedstrijd", label:"Wedstrijd" },
    { key:"openGym", label:"Open Gym" },
  ];

  const sorted = useMemo(() => {
    const num = (v, fallback) => (Number.isFinite(v) ? v : fallback);
    return [...CONCURRENTEN].sort((a, b) => {
      if (sortBy === "merkScore") return num(b.merk?.totaal, -1) - num(a.merk?.totaal, -1);
      if (sortBy === "googleRating") return num(b.reputatie?.googleRating, -1) - num(a.reputatie?.googleRating, -1);
      if (sortBy === "instagram") return num(b.reputatie?.instagram, -1) - num(a.reputatie?.instagram, -1);
      if (sortBy === "prijs") return num(a.kosten?.onbeperkt, 999) - num(b.kosten?.onbeperkt, 999);
      return String(a.naam || "").localeCompare(String(b.naam || ""));
    });
  }, [CONCURRENTEN, sortBy]);

  const filtered = filterAanbod
    ? sorted.filter(g => g.aanbod[filterAanbod] === "Ja")
    : sorted;

  const ja = v => v === "Ja";
  const addon = v => v === "Add-on";

  const Pill = ({ val }) => {
    if (val == null || val === "" || val === "—") {
      return (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
          background: "#ffffff08", color: "#303050", border: "1px solid #1a1a2e", whiteSpace: "nowrap",
        }}>—</span>
      );
    }
    const isJa = val === "Ja";
    const isAddon = val === "Add-on";
    const isNee = val === "Nee";
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
        background: isJa ? "#06d6a018" : isAddon ? "#ffb70318" : "#ffffff08",
        color: isJa ? "#06d6a0" : isAddon ? "#ffb703" : "#303050",
        border: `1px solid ${isJa ? "#06d6a030" : isAddon ? "#ffb70330" : "#1a1a2e"}`,
        whiteSpace: "nowrap",
      }}>{val}</span>
    );
  };

  const Stars = ({ rating }) => {
    if (!Number.isFinite(rating)) return <span style={{ color: "#303050", fontWeight: 800, fontSize: 13 }}>—</span>;
    const color = rating >= 4.8 ? "#06d6a0" : rating >= 4.5 ? "#ffb703" : "#E63946";
    return (
      <span style={{ color, fontWeight: 800, fontSize: 13 }}>
        ★ {rating}
      </span>
    );
  };

  const ScoreBar = ({ val, max = 25 }) => {
    if (!Number.isFinite(val)) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: "#0a0a14", borderRadius: 3, overflow: "hidden" }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#303050", minWidth: 24, textAlign: "right" }}>—</span>
        </div>
      );
    }
    const pct = (val / max) * 100;
    const color = pct >= 80 ? "#06d6a0" : pct >= 60 ? "#ffb703" : pct >= 40 ? "#3a86ff" : "#505068";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: "#0a0a14", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width .4s" }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color, minWidth: 24, textAlign: "right" }}>{val}</span>
      </div>
    );
  };

  const subTabs = [
    { key: "overzicht", label: "Overzicht" },
    { key: "aanbod", label: "Aanbod" },
    { key: "kosten", label: "Kosten" },
    { key: "reputatie", label: "Reputatie" },
    { key: "merk", label: "Merk & Imago" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {loading && (
        <div style={{ background: "#0d0d18", border: "1px solid #151528", borderRadius: 10, padding: 16, color: "#404060", fontSize: 12 }}>
          Data laden…
        </div>
      )}
      {!loading && CONCURRENTEN.length === 0 && (
        <div style={{ background: "#0d0d18", border: "1px solid #151528", borderRadius: 10, padding: 16, color: "#404060", fontSize: 12 }}>
          Geen gyms gevonden in <code style={{ background: "#08080f", padding: "2px 6px", borderRadius: 6, border: "1px solid #151528" }}>/gym-data.csv</code>.
        </div>
      )}
      {/* Sub-tab nav */}
      <div style={{ display: "flex", gap: 2, background: "#0d0d18", border: "1px solid #151528", borderRadius: 9, padding: 3, width: "fit-content" }}>
        {subTabs.map(({ key, label }) => (
          <button key={key} onClick={() => setSubTab(key)} style={{
            padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700,
            border: "none", transition: "all .15s", letterSpacing: .3,
            background: subTab === key ? "#141428" : "transparent",
            color: subTab === key ? "#fff" : "#404060",
          }}>{label}</button>
        ))}
      </div>

      {/* ── OVERZICHT ── */}
      {subTab === "overzicht" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              { label: "Gyms in lijst", val: CONCURRENTEN.length, color: "#3a86ff" },
              { label: "Afstand ATC ingevuld", val: `${CONCURRENTEN.filter(g => String(g.afstandAtc||"").trim()).length}/${CONCURRENTEN.length}`, color: "#ffb703" },
              { label: "Afstand Ettaki ingevuld", val: `${CONCURRENTEN.filter(g => String(g.afstandEttaki||"").trim()).length}/${CONCURRENTEN.length}`, color: "#8338ec" },
              { label: "Prijs onbeperkt (min)", val: (() => { const vals = CONCURRENTEN.map(g => g.kosten?.onbeperkt).filter(Number.isFinite); return vals.length ? `€${Math.min(...vals)}` : "—"; })(), color: "#E63946" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: "#0d0d18", border: "1px solid #151528", borderRadius: 10, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#404060", marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -1 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Sorteer + filter */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "#404060", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>Sorteren:</span>
            {[["merkScore","Merk"], ["googleRating","Rating"], ["instagram","Instagram"], ["prijs","Prijs"], ["naam","Naam"]].map(([k,l]) => (
              <button key={k} onClick={() => setSortBy(k)} style={{
                fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                border: `1px solid ${sortBy===k?"#3a86ff40":"#151528"}`,
                background: sortBy===k?"#0d1525":"transparent",
                color: sortBy===k?"#3a86ff":"#404060", cursor: "pointer",
              }}>{l}</button>
            ))}
            <span style={{ fontSize: 10, color: "#404060", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginLeft: 8 }}>Filter aanbod:</span>
            <select onChange={e => setFilterAanbod(e.target.value || null)} style={{
              fontSize: 10, background: "#0d0d18", border: "1px solid #151528", color: "#c0c0cc",
              borderRadius: 6, padding: "4px 8px", cursor: "pointer",
            }}>
              <option value="">Alle gyms</option>
              {AANBOD_KEYS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>

          {/* Gym kaarten */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
            {filtered.map((gym, i) => {
              const accentColor = gym.isAtc ? "#E63946" : PALETTE[i % PALETTE.length];
              const aanbodCount = Object.values(gym.aanbod).filter(v => v === "Ja").length;
              return (
                <div key={gym.naam} style={{
                  background: "#0d0d18", border: `1px solid ${gym.isAtc ? "#E6394630" : "#151528"}`,
                  borderRadius: 10, overflow: "hidden",
                  boxShadow: gym.isAtc ? "0 0 0 1px #E6394620" : "none",
                }}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #101020", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 3, height: 40, borderRadius: 2, background: accentColor, flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: gym.isAtc ? "#E63946" : "#c0c0cc" }}>{gym.naam}</span>
                        {gym.isAtc && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "#E6394620", color: "#E63946", border: "1px solid #E6394640" }}>ATC</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#404060" }}>{gym.locatie}</div>
                      <div style={{ fontSize: 10, color: "#303050", marginTop: 2 }}>📍 {gym.afstandAtc} van ATC</div>
                    </div>
                    <Stars rating={gym.reputatie.googleRating} />
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Merk score */}
                    <div>
                      <div style={{ fontSize: 9, color: "#404060", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>Merk & Imago</div>
                      <ScoreBar val={gym.merk.totaal} max={25} />
                    </div>
                    {/* Stats row */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: "#505068" }}>
                        <span style={{ color: "#c0c0cc", fontWeight: 700 }}>{gym.reputatie.googleReviews}</span> reviews
                      </span>
                      <span style={{ color: "#1a1a2e" }}>·</span>
                      <span style={{ fontSize: 10, color: "#505068" }}>
                        <span style={{ color: "#8338ec", fontWeight: 700 }}>
                          {gym.reputatie.instagram >= 1000 ? `${(gym.reputatie.instagram/1000).toFixed(1)}K` : gym.reputatie.instagram}
                        </span> IG
                      </span>
                      <span style={{ color: "#1a1a2e" }}>·</span>
                      <span style={{ fontSize: 10, color: "#505068" }}>
                        <span style={{ color: accentColor, fontWeight: 700 }}>{aanbodCount}</span> disciplines
                      </span>
                      {gym.kosten.onbeperkt && (
                        <>
                          <span style={{ color: "#1a1a2e" }}>·</span>
                          <span style={{ fontSize: 10, color: "#505068" }}>
                            <span style={{ color: "#ffb703", fontWeight: 700 }}>€{gym.kosten.onbeperkt}</span>/mnd
                          </span>
                        </>
                      )}
                    </div>
                    {/* Aanbod pills */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {AANBOD_KEYS.filter(k => gym.aanbod[k.key] !== "Nee").map(({ key, label }) => (
                        <Pill key={key} val={gym.aanbod[key]} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AANBOD TAB ── */}
      {subTab === "aanbod" && (
        <div style={{ background: "#0d0d18", border: "1px solid #151528", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#404060", borderBottom: "1px solid #151528", background: "#08080f", position: "sticky", left: 0, minWidth: 160 }}>Gym</th>
                  {AANBOD_KEYS.map(({ label }) => (
                    <th key={label} style={{ padding: "10px 10px", textAlign: "center", fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#404060", borderBottom: "1px solid #151528", background: "#08080f", whiteSpace: "nowrap" }}>{label}</th>
                  ))}
                  <th style={{ padding: "10px 10px", textAlign: "center", fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#404060", borderBottom: "1px solid #151528", background: "#08080f" }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {CONCURRENTEN.map((gym, i) => {
                  const accentColor = gym.isAtc ? "#E63946" : PALETTE[i % PALETTE.length];
                  const score = Object.values(gym.aanbod).filter(v => v === "Ja").length;
                  return (
                    <tr key={gym.naam} style={{ borderBottom: "1px solid #0c0c18", background: gym.isAtc ? "#130608" : "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.background = gym.isAtc ? "#180a0e" : "#0f0f1e"}
                      onMouseLeave={e => e.currentTarget.style.background = gym.isAtc ? "#130608" : "transparent"}>
                      <td style={{ padding: "9px 14px", whiteSpace: "nowrap", position: "sticky", left: 0, background: "inherit" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 3, height: 20, borderRadius: 2, background: accentColor, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: gym.isAtc ? 800 : 600, color: gym.isAtc ? "#E63946" : "#c0c0cc" }}>{gym.naam}</span>
                        </div>
                      </td>
                      {AANBOD_KEYS.map(({ key }) => (
                        <td key={key} style={{ padding: "9px 10px", textAlign: "center" }}>
                          <Pill val={gym.aanbod[key]} />
                        </td>
                      ))}
                      <td style={{ padding: "9px 10px", textAlign: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: accentColor }}>{score}/12</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── KOSTEN TAB ── */}
      {subTab === "kosten" && (
        <div style={{ background: "#0d0d18", border: "1px solid #151528", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  {["Gym", "Onbeperkt /mnd", "1x /week", "2x /week", "Losse les", "Extra", "Contract", "Jeugd /mnd"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: h === "Gym" ? "left" : "center", fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#404060", borderBottom: "1px solid #151528", background: "#08080f", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...CONCURRENTEN].sort((a,b) => (a.kosten.onbeperkt||999)-(b.kosten.onbeperkt||999)).map((gym, i) => {
                  const col = gym.isAtc ? "#E63946" : PALETTE[i % PALETTE.length];
                  const fmt = v => v ? `€${v}` : <span style={{ color: "#252535" }}>—</span>;
                  return (
                    <tr key={gym.naam} style={{ borderBottom: "1px solid #0c0c18", background: gym.isAtc ? "#130608" : "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.background = gym.isAtc ? "#180a0e" : "#0f0f1e"}
                      onMouseLeave={e => e.currentTarget.style.background = gym.isAtc ? "#130608" : "transparent"}>
                      <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 3, height: 20, borderRadius: 2, background: col, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: gym.isAtc ? 800 : 600, color: gym.isAtc ? "#E63946" : "#c0c0cc" }}>{gym.naam}</span>
                        </div>
                      </td>
                      {[gym.kosten.onbeperkt, gym.kosten.week1, gym.kosten.week2, gym.kosten.losses, gym.kosten.extra].map((v, j) => (
                        <td key={j} style={{ padding: "9px 12px", textAlign: "center", fontSize: 12, fontWeight: v ? 700 : 400, color: v ? "#ffb703" : "#252535" }}>{fmt(v)}</td>
                      ))}
                      <td style={{ padding: "9px 12px", textAlign: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: gym.kosten.contract === "Maandelijks" ? "#06d6a0" : gym.kosten.contract === "Jaarlijks" ? "#E63946" : "#404060" }}>
                          {gym.kosten.contract || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "center", fontSize: 12, fontWeight: gym.kosten.jeugd ? 700 : 400, color: gym.kosten.jeugd ? "#3a86ff" : "#252535" }}>{fmt(gym.kosten.jeugd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REPUTATIE TAB ── */}
      {subTab === "reputatie" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Instagram ranking bar chart */}
          <div style={{ background: "#0d0d18", border: "1px solid #151528", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.8px", textTransform: "uppercase", color: "#303050", marginBottom: 16 }}>Instagram volgers ranking</div>
            {[...CONCURRENTEN].filter(g => Number.isFinite(g.reputatie?.instagram)).sort((a,b) => (b.reputatie.instagram||0) - (a.reputatie.instagram||0)).map((gym, i) => {
              const col = gym.isAtc ? "#E63946" : PALETTE[i % PALETTE.length];
              const max = Math.max(...CONCURRENTEN.map(g => g.reputatie?.instagram).filter(Number.isFinite), 1);
              const pct = (gym.reputatie.instagram / max) * 100;
              return (
                <div key={gym.naam} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 140, fontSize: 10, fontWeight: gym.isAtc ? 800 : 500, color: gym.isAtc ? "#E63946" : "#505068", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gym.naam}</div>
                  <div style={{ flex: 1, height: 20, background: "#0a0a14", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 8, minWidth: 4 }}>
                      {pct > 10 && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{gym.reputatie.instagram >= 1000 ? `${(gym.reputatie.instagram/1000).toFixed(1)}K` : gym.reputatie.instagram}</span>}
                    </div>
                  </div>
                  {pct <= 10 && <span style={{ fontSize: 10, color: "#404060", flexShrink: 0 }}>{gym.reputatie.instagram}</span>}
                </div>
              );
            })}
            {CONCURRENTEN.filter(g => Number.isFinite(g.reputatie?.instagram)).length === 0 && (
              <div style={{ fontSize: 12, color: "#404060" }}>Geen reputatie-data in deze CSV.</div>
            )}
          </div>
          {/* Google rating tabel */}
          <div style={{ background: "#0d0d18", border: "1px solid #151528", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Gym", "Google ★", "Reviews", "Facebook", "Instagram", "YouTube", "TikTok"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: h === "Gym" ? "left" : "center", fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#404060", borderBottom: "1px solid #151528", background: "#08080f", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...CONCURRENTEN].filter(g => Number.isFinite(g.reputatie?.googleRating)).sort((a,b) => (b.reputatie.googleRating||0) - (a.reputatie.googleRating||0)).map((gym, i) => {
                    const col = gym.isAtc ? "#E63946" : PALETTE[i % PALETTE.length];
                    const YN = v => <span style={{ color: v === "Ja" ? "#06d6a0" : "#252535", fontWeight: 700, fontSize: 11 }}>{v === "Ja" ? "✓" : "✗"}</span>;
                    return (
                      <tr key={gym.naam} style={{ borderBottom: "1px solid #0c0c18", background: gym.isAtc ? "#130608" : "transparent" }}
                        onMouseEnter={e => e.currentTarget.style.background = gym.isAtc ? "#180a0e" : "#0f0f1e"}
                        onMouseLeave={e => e.currentTarget.style.background = gym.isAtc ? "#130608" : "transparent"}>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 3, height: 20, borderRadius: 2, background: col, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: gym.isAtc ? 800 : 600, color: gym.isAtc ? "#E63946" : "#c0c0cc" }}>{gym.naam}</span>
                          </div>
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "center" }}><Stars rating={gym.reputatie.googleRating} /></td>
                        <td style={{ padding: "9px 12px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#c0c0cc" }}>{gym.reputatie.googleReviews}</td>
                        <td style={{ padding: "9px 12px", textAlign: "center" }}><YN v={gym.reputatie.facebook} /></td>
                        <td style={{ padding: "9px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#8338ec" }}>
                          {gym.reputatie.instagram >= 1000 ? `${(gym.reputatie.instagram/1000).toFixed(1)}K` : gym.reputatie.instagram}
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "center" }}><YN v={gym.reputatie.youtube} /></td>
                        <td style={{ padding: "9px 12px", textAlign: "center" }}><YN v={gym.reputatie.tiktok} /></td>
                      </tr>
                    );
                  })}
                  {CONCURRENTEN.filter(g => Number.isFinite(g.reputatie?.googleRating)).length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "14px 12px", color: "#404060", fontSize: 12, textAlign: "center" }}>
                        Geen reputatie-data in deze CSV.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MERK & IMAGO TAB ── */}
      {subTab === "merk" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#0d0d18", border: "1px solid #151528", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Gym", "Professionaliteit", "Website", "Social Media", "Branding", "Visuele ID", "Totaal /25"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: h === "Gym" ? "left" : "center", fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#404060", borderBottom: "1px solid #151528", background: "#08080f", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...CONCURRENTEN].filter(g => Number.isFinite(g.merk?.totaal)).sort((a,b) => (b.merk.totaal||0) - (a.merk.totaal||0)).map((gym, i) => {
                    const col = gym.isAtc ? "#E63946" : PALETTE[i % PALETTE.length];
                    const ScoreDot = ({ val }) => {
                      const c = val >= 4 ? "#06d6a0" : val >= 3 ? "#ffb703" : "#E63946";
                      return (
                        <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>
                          {[1,2,3,4,5].map(n => (
                            <div key={n} style={{ width: 8, height: 8, borderRadius: 2, background: n <= val ? c : "#1a1a2e" }} />
                          ))}
                        </div>
                      );
                    };
                    return (
                      <tr key={gym.naam} style={{ borderBottom: "1px solid #0c0c18", background: gym.isAtc ? "#130608" : "transparent" }}
                        onMouseEnter={e => e.currentTarget.style.background = gym.isAtc ? "#180a0e" : "#0f0f1e"}
                        onMouseLeave={e => e.currentTarget.style.background = gym.isAtc ? "#130608" : "transparent"}>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 3, height: 20, borderRadius: 2, background: col, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: gym.isAtc ? 800 : 600, color: gym.isAtc ? "#E63946" : "#c0c0cc" }}>{gym.naam}</span>
                          </div>
                        </td>
                        <td style={{ padding: "9px 12px" }}><ScoreDot val={gym.merk.professionaliteit} /></td>
                        <td style={{ padding: "9px 12px" }}><ScoreDot val={gym.merk.website} /></td>
                        <td style={{ padding: "9px 12px" }}><ScoreDot val={gym.merk.socialmedia} /></td>
                        <td style={{ padding: "9px 12px" }}><ScoreDot val={gym.merk.branding} /></td>
                        <td style={{ padding: "9px 12px" }}><ScoreDot val={gym.merk.visueel} /></td>
                        <td style={{ padding: "9px 12px" }}>
                          <ScoreBar val={gym.merk.totaal} max={25} />
                        </td>
                      </tr>
                    );
                  })}
                  {CONCURRENTEN.filter(g => Number.isFinite(g.merk?.totaal)).length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "14px 12px", color: "#404060", fontSize: 12, textAlign: "center" }}>
                        Geen merk/imago-data in deze CSV.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
