import { useEffect, useMemo, useState } from "react";

const DARK_THEME = {
  surface: "#0d0d18",
  border: "#0f0f1e",
  border2: "#151528",
  text: "#e0e0e0",
  textMuted: "#404060",
  textSub: "#c0c0cc",
  row: "#0f0f1e",
  rowAlt: "#12121f",
  link: "#7eb8ff",
};
const LIGHT_THEME = {
  surface: "#ffffff",
  border: "#e0e0ea",
  border2: "#d0d0e0",
  text: "#1a1a2e",
  textMuted: "#888899",
  textSub: "#444455",
  row: "#f8f8fc",
  rowAlt: "#f0f0f8",
  link: "#2563eb",
};

function kindLabel(kind) {
  switch (kind) {
    case "http":
      return "HTTP";
    case "skip":
      return "Geen URL";
    case "social_instagram":
      return "Instagram";
    case "social_facebook":
      return "Facebook";
    case "embed_calendar_not_pricing":
      return "Agenda-embed";
    default:
      return String(kind || "—");
  }
}

export default function GymDataPriceProbeSection({ dark, visibleGymNames }) {
  const T = dark ? DARK_THEME : LIGHT_THEME;
  const [payload, setPayload] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/price-probe-result.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data) => {
        if (!cancelled) {
          setPayload(data);
          setLoadError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPayload(null);
          setLoadError(String(e?.message || e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleSet = useMemo(() => new Set((visibleGymNames || []).map((n) => String(n).trim())), [visibleGymNames]);

  const rows = useMemo(() => {
    const list = Array.isArray(payload?.results) ? payload.results : [];
    const filtered = list.filter((r) => visibleSet.has(String(r?.name ?? "").trim()));
    return [...filtered].sort((a, b) => String(a.name).localeCompare(String(b.name), "nl", { sensitivity: "base" }));
  }, [payload, visibleSet]);

  const generatedLabel = payload?.generatedAt
    ? new Date(payload.generatedAt).toLocaleString("nl-NL", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  if (loadError) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          border: `1px solid ${T.border2}`,
          background: T.surface,
          color: "#e24b4a",
          fontSize: 13,
        }}
      >
        Kon <code style={{ fontSize: 12 }}>price-probe-result.json</code> niet laden ({loadError}).
      </div>
    );
  }

  if (!payload) {
    return (
      <div style={{ padding: 24, color: T.textMuted, fontSize: 13 }}>
        Laden…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>Data update</h2>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: T.textSub, maxWidth: 720 }}>
          Resultaten van de website-probe (bereikbaarheid HTML en heuristiek op €-tekens). Dit is géén vervanging
          van je handmatige prijsdata — alleen een technische check. Bestand:{" "}
          <code style={{ fontSize: 11, color: T.text }}>public/price-probe-result.json</code>.
        </p>
        {generatedLabel ? (
          <p style={{ fontSize: 11, color: T.textMuted, marginTop: 10 }}>
            Laatste run: <strong style={{ color: T.textSub }}>{generatedLabel}</strong>
          </p>
        ) : (
          <p style={{ fontSize: 11, color: T.textMuted, marginTop: 10 }}>
            Nog geen probe uitgevoerd. In de map <code style={{ fontSize: 11 }}>gym-dashboard</code>:{" "}
            <code style={{ fontSize: 11 }}>npm run price-probe</code>
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            border: `1px dashed ${T.border2}`,
            color: T.textMuted,
            fontSize: 13,
          }}
        >
          Geen rijen voor de huidige gym-selectie — of het JSON-bestand is leeg. Selecteer gyms in de sidebar en/of
          voer de probe opnieuw uit.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${T.border2}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: dark ? "#141428" : "#e8e8f0", color: T.textSub, textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontWeight: 800 }}>Gym</th>
                <th style={{ padding: "10px 8px", fontWeight: 800 }}>OK</th>
                <th style={{ padding: "10px 8px", fontWeight: 800 }}>HTTP</th>
                <th style={{ padding: "10px 8px", fontWeight: 800 }}>Type</th>
                <th style={{ padding: "10px 8px", fontWeight: 800 }}>€?</th>
                <th style={{ padding: "10px 8px", fontWeight: 800 }}>#€</th>
                <th style={{ padding: "10px 8px", fontWeight: 800 }}>Soort</th>
                <th style={{ padding: "10px 12px", fontWeight: 800 }}>Opmerking</th>
                <th style={{ padding: "10px 12px", fontWeight: 800 }}>URL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const bg = i % 2 === 0 ? T.row : T.rowAlt;
                const linkHref = r.finalUrl || (String(r.url).startsWith("http") ? r.url : null);
                return (
                  <tr key={`${r.name}-${i}`} style={{ background: bg, color: T.text, borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "8px 12px", fontWeight: 700 }}>{r.name}</td>
                    <td style={{ padding: "8px", color: r.ok ? "#4ade80" : "#f87171", fontWeight: 800 }}>{r.ok ? "ja" : "nee"}</td>
                    <td style={{ padding: "8px", color: T.textMuted, fontFamily: "ui-monospace,monospace" }}>{r.status}</td>
                    <td style={{ padding: "8px", color: T.textMuted }}>{r.contentType}</td>
                    <td style={{ padding: "8px", fontWeight: 700 }}>{r.hasEuro ? "ja" : "nee"}</td>
                    <td style={{ padding: "8px", color: T.textMuted }}>{r.euroishCount}</td>
                    <td style={{ padding: "8px", color: T.textSub }}>{kindLabel(r.kind)}</td>
                    <td style={{ padding: "8px 12px", color: T.textSub, maxWidth: 280 }}>{r.note}</td>
                    <td style={{ padding: "8px 12px", maxWidth: 200, wordBreak: "break-all" }}>
                      {linkHref ? (
                        <a href={linkHref} target="_blank" rel="noopener noreferrer" style={{ color: T.link, fontWeight: 600 }}>
                          link
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
      )}
    </div>
  );
}
