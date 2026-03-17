import { useState } from "react";
import ScheduleDashboard from "./ScheduleDashboard.jsx";
import ConcurrentieView from "./ConcurrentieView.jsx";

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
  btnBgA: "#141428",
};
const LIGHT_THEME = {
  bg: "#f4f4f8",
  border: "#e0e0ea",
  border2: "#d0d0e0",
  text: "#1a1a2e",
  textMuted: "#888899",
  btnBgA: "#e8e8f8",
};

export default function App() {
  const [dashboardTab, setDashboardTab] = useState("schedule");
  const [dark, setDark] = useState(true);
  const T = dark ? DARK_THEME : LIGHT_THEME;

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
        <ScheduleDashboard noHeader dark={dark} setDark={setDark} />
      )}
      {dashboardTab === "gymdata" && (
        <div style={{ height: "calc(100vh - 53px)", overflowY: "auto", padding: "18px 20px", background: T.bg }}>
          <ConcurrentieView />
        </div>
      )}
    </div>
  );
}
