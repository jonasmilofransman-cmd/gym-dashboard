import { useEffect, useMemo, useState } from "react";
import ScheduleDashboard from "./ScheduleDashboard.jsx";
import ConcurrentieView from "./ConcurrentieView.jsx";
import { BASE_GYMS as SCHEDULE_BASE_GYMS, CATEGORIES as SCHEDULE_CATEGORIES, getCat as scheduleGetCat, isOpenGym as scheduleIsOpenGym, tdur as scheduleTdur, tmin as scheduleTmin } from "./ScheduleDashboard.jsx";

const DASHBOARD_TABS = [
  ["schedule", "Rooster"],
  ["gymdata", "Gym data"],
];

const DARK_THEME = {
  bg: "#08080f",
  border: "#0f0f1e",
  border2: "#151528",
  text: "#e0e0e0",
  textMuted: "#404060",
  textSub: "#c0c0cc",
  btnBgA: "#141428",
};
const LIGHT_THEME = {
  bg: "#f4f4f8",
  border: "#e0e0ea",
  border2: "#d0d0e0",
  text: "#1a1a2e",
  textMuted: "#888899",
  textSub: "#444455",
  btnBgA: "#e8e8f8",
};

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
    let end = row.length;
    while (end > 0 && String(row[end - 1] ?? "").trim() === "") end--;
    rows.push(row.slice(0, end).map((c) => String(c ?? "").trim()));
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\"") {
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
  if (row.some((x) => String(x ?? "").trim() !== "")) pushRow();
  return rows;
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

function fmtTimeFromMinutes(mins) {
  if (!Number.isFinite(mins)) return "—";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function App() {
  const [dashboardTab, setDashboardTab] = useState("schedule");
  const [dark, setDark] = useState(true);
  const T = dark ? DARK_THEME : LIGHT_THEME;

  const [csvGyms, setCsvGyms] = useState([]); // { name, locatie, website, coords }
  const [gymDataTab, setGymDataTab] = useState("concurrentie"); // concurrentie | lessen
  const [gymDataActive, setGymDataActive] = useState([]); // array of names

  useEffect(() => {
    let cancelled = false;
    fetch("/gym-data.csv")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not found"))))
      .then((text) => {
        if (cancelled) return;
        const clean = text.replace(/^\uFEFF/, "");
        const rows = parseDelimited(clean, ";");
        const headerRowIndex = rows.findIndex((rr) => String(rr?.[0] ?? "").trim() === "Naam");
        const headerRow = headerRowIndex >= 0 ? rows[headerRowIndex] : rows[1] || [];
        const headers = headerRow.map((h, i) => (h && h.trim() ? h.trim() : `Kolom ${i + 1}`));
        const dataRows = rows.slice((headerRowIndex >= 0 ? headerRowIndex : 1) + 1);

        const idx = (name) => headers.indexOf(name);
        const LAT_I = idx("Breedtegraad");
        const LON_I = idx("Lengtegraad");

        const mapped = dataRows
          .map((row) => {
            const r = row ?? [];
            const name = String(r[0] ?? "").trim();
            if (!name) return null;
            const locatie = String(r[1] ?? "").trim();
            const website = String(r[2] ?? "").trim();
            const lat = LAT_I >= 0 ? parseCoord(r[LAT_I], "lat") : null;
            const lon = LON_I >= 0 ? parseCoord(r[LON_I], "lon") : null;
            const coords = lat != null && lon != null ? { lat, lon } : null;
            return { name, locatie, website, coords };
          })
          .filter(Boolean);

        setCsvGyms(mapped);
      })
      .catch(() => {
        if (cancelled) return;
        setCsvGyms([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Default: all gyms enabled in Gym data sidebar
    if (csvGyms.length) setGymDataActive(csvGyms.map((g) => g.name));
  }, [csvGyms.length]);

  const gymDataTabLabels = useMemo(
    () => [
      ["concurrentie", "Concurrentie"],
      ["lessen", "Lessen data"],
    ],
    []
  );

  const lessonStatsByCategory = useMemo(() => {
    // Use schedule base gyms (rooster data) to compute analytics.
    const selected = new Set(gymDataActive.map((n) => n.toLowerCase()));
    const gyms = SCHEDULE_BASE_GYMS.filter((g) => selected.has(String(g.name).toLowerCase()));

    const byCat = new Map();
    for (const cat of SCHEDULE_CATEGORIES) {
      byCat.set(cat.key, { cat, count: 0, sumStart: 0, sumDur: 0 });
    }

    for (const gym of gyms) {
      for (const s of gym.schedule || []) {
        if (scheduleIsOpenGym(s.cls)) continue;
        const cat = scheduleGetCat(s.cls);
        const start = scheduleTmin(s.time);
        const dur = scheduleTdur(s.time, s.end);
        const agg = byCat.get(cat.key) || byCat.get("overig");
        agg.count += 1;
        agg.sumStart += start;
        agg.sumDur += dur;
      }
    }

    return [...byCat.values()].filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
  }, [gymDataActive]);

  const toggleGymData = (name) =>
    setGymDataActive((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", background: T.bg, minHeight: "100vh", width: "100%", color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg};}
        button{font-family:inherit;cursor:pointer;}
      `}</style>

      <header
        style={{
          padding: "13px 24px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: T.bg,
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue',sans-serif",
            fontSize: 26,
            letterSpacing: 3,
            background: "linear-gradient(120deg,#e63946,#f4a261)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ATC
        </span>
        <span style={{ color: T.textMuted }}>|</span>
        <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>
          Rooster Analyse · Amsterdam
        </span>
        <div style={{ display: "flex", gap: 2, background: T.border2, borderRadius: 9, padding: 3, marginLeft: 20 }}>
          {DASHBOARD_TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setDashboardTab(k)}
              style={{
                padding: "6px 16px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                transition: "all .15s",
                letterSpacing: 0.3,
                background: dashboardTab === k ? T.btnBgA : "transparent",
                color: dashboardTab === k ? "#fff" : T.textMuted,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13 }}>{dark ? "🌙" : "☀️"}</span>
          <div
            onClick={() => setDark((d) => !d)}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              cursor: "pointer",
              background: dark ? "#2a2a4a" : "#c8c8d8",
              position: "relative",
              transition: "background .2s",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 3,
                left: dark ? 23 : 3,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: dark ? "#8080c0" : "#ffffff",
                boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                transition: "left .2s",
              }}
            />
          </div>
        </div>
      </header>

      {dashboardTab === "schedule" && (
        <ScheduleDashboard
          noHeader
          dark={dark}
          setDark={setDark}
          extraGymNames={csvGyms.map((g) => g.name)}
        />
      )}
      {dashboardTab === "gymdata" && (
        <div style={{ display: "flex", height: "calc(100vh - 53px)" }}>
          {/* Sidebar (same idea as rooster) */}
          <aside
            style={{
              width: 200,
              borderRight: `1px solid ${T.border}`,
              padding: "16px 12px",
              overflowY: "auto",
              flexShrink: 0,
              background: T.bg,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.8px", textTransform: "uppercase", color: T.textMuted }}>
                Gyms
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setGymDataActive(csvGyms.map((g) => g.name))}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    padding: "3px 7px",
                    borderRadius: 5,
                    border: `1px solid ${T.border2}`,
                    color: T.textMuted,
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  Alles aan
                </button>
                <button
                  onClick={() => setGymDataActive([])}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    padding: "3px 7px",
                    borderRadius: 5,
                    border: `1px solid ${T.border2}`,
                    color: T.textMuted,
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  Alles uit
                </button>
              </div>
            </div>
            {csvGyms.map((g, i) => {
              const active = gymDataActive.includes(g.name);
              const col = g.name.toLowerCase() === "atc" ? "#E63946" : ["#3a86ff", "#06d6a0", "#ffb703", "#8338ec", "#fb5607"][i % 5];
              return (
                <button
                  key={g.name}
                  onClick={() => toggleGymData(g.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "7px 8px",
                    borderRadius: 8,
                    marginBottom: 3,
                    background: active ? (dark ? "#0d0d18" : "#ffffff") : "transparent",
                    border: `1px solid ${active ? T.border2 : "transparent"}`,
                    opacity: active ? 1 : 0.3,
                    transition: "all .15s",
                    textAlign: "left",
                  }}
                >
                  <div style={{ width: 3, height: 30, borderRadius: 2, background: col, flexShrink: 0 }} />
                  <div style={{ fontSize: 11, fontWeight: g.name.toLowerCase() === "atc" ? 800 : 600, color: T.text }}>
                    {g.name}
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Main */}
          <main style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            <div style={{ display: "flex", gap: 2, background: dark ? "#0d0d18" : "#ffffff", border: `1px solid ${T.border2}`, borderRadius: 9, padding: 3, marginBottom: 18, width: "fit-content" }}>
              {gymDataTabLabels.map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setGymDataTab(k)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    transition: "all .15s",
                    letterSpacing: 0.3,
                    background: gymDataTab === k ? T.btnBgA : "transparent",
                    color: gymDataTab === k ? (dark ? "#fff" : T.text) : T.textMuted,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            {gymDataTab === "concurrentie" && (
              <ConcurrentieView dark={dark} visibleGymNames={gymDataActive} />
            )}

            {gymDataTab === "lessen" && (
              <div style={{ background: dark ? "#0d0d18" : "#ffffff", border: `1px solid ${T.border2}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.8px", textTransform: "uppercase", color: T.textMuted }}>
                    Gemiddelden per categorie
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead>
                      <tr>
                        {["Categorie", "Lessen", "Gem. start", "Gem. duur"].map((h) => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: h === "Categorie" ? "left" : "center", fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: T.textMuted, borderBottom: `1px solid ${T.border2}`, background: T.bg, whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lessonStatsByCategory.map(({ cat, count, sumStart, sumDur }) => {
                        const avgStart = sumStart / count;
                        const avgDur = sumDur / count;
                        return (
                          <tr key={cat.key} style={{ borderBottom: `1px solid ${T.border}` }}>
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{cat.label}</span>
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, fontWeight: 700, color: T.textSub }}>{count}</td>
                            <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, fontWeight: 700, color: T.textSub }}>{fmtTimeFromMinutes(avgStart)}</td>
                            <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, fontWeight: 700, color: T.textSub }}>{Math.round(avgDur)}m</td>
                          </tr>
                        );
                      })}
                      {lessonStatsByCategory.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: "16px 12px", textAlign: "center", color: T.textMuted }}>
                            Geen rooster-data gevonden voor de geselecteerde gyms (of gyms hebben geen lessen).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
