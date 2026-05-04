import { useCallback, useEffect, useMemo, useRef } from "react";
import { CATEGORIES } from "./ScheduleDashboard.jsx";
import {
  barColorForGym,
  contractMonthLabel,
  gymData,
  isCompetitor,
  isOwnedAtc,
  isOwnedEttaki,
  minimalInstap,
} from "./gymCostMasterData.js";
import {
  costPerHourFromSchedule,
  costPerLessonFromSchedule,
  getLessonCategoryKeysForCostGym,
  getScheduleTrainingStatsForCategoryKeys,
  gymPassesScheduleCategoryFilter,
} from "./gymCostScheduleStats.js";
import { labelToCsvNaamLower } from "./gymSidebarCsvMap.js";
import { ATC_RED, ETTAKI_YELLOW } from "./gymColors.js";
/** Contract-segment tegels (niet verwarren met merk-kleuren) */
const TILE_SEGMENT_MONTHLY = "#06d6a0";
const TILE_SEGMENT_QUARTER = "#3a86ff";
const COLOR_MARKET = "#378ADD";
const COLOR_AVG_LINE = "#E24B4A";
const DROPIN_BAR = "#E24B4A";

const CATEGORY_AXIS_LABELS = [
  { v: 1, short: "1 = Maandelijks" },
  { v: 3, short: "3 = Kwartaal" },
  { v: 6, short: "6 = Halfjaar" },
  { v: 12, short: "12 = Jaarlijks" },
  { v: 24, short: "24 = 24 mnd" },
];

function euroTick(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `€${n}`;
}

function CustomLegend({ items }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: it.type === "line" ? "transparent" : it.color,
              border: it.type === "line" ? `2px dashed ${it.color}` : `1px solid ${it.color}55`,
              boxSizing: "border-box",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 10, fontWeight: 700, color: it.textColor || "inherit" }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

function makeAverageLinePlugin({ average, color, dashed = [6, 6], label }) {
  return {
    id: `avgLineY-${String(average)}-${label || ""}`,
    afterDraw(chart) {
      const yScale = chart?.scales?.y;
      if (!yScale) return;
      const area = chart.chartArea;
      if (!area) return;
      const y = yScale.getPixelForValue(average);
      if (!Number.isFinite(y)) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(dashed);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.moveTo(area.left, y);
      ctx.lineTo(area.right, y);
      ctx.stroke();
      if (label) {
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = "700 10px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(label, area.right, Math.max(area.top + 10, y - 6));
      }
      ctx.restore();
    },
  };
}

function makeAverageVerticalLinePlugin({ average, color, dashed = [6, 6], label }) {
  return {
    id: `avgLineX-${String(average)}-${label || ""}`,
    afterDraw(chart) {
      const xScale = chart?.scales?.x;
      if (!xScale) return;
      const area = chart.chartArea;
      if (!area) return;
      const x = xScale.getPixelForValue(average);
      if (!Number.isFinite(x)) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(dashed);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.moveTo(x, area.top);
      ctx.lineTo(x, area.bottom);
      ctx.stroke();
      if (label) {
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = "700 10px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(label, x, Math.max(area.top + 10, area.top + 4));
      }
      ctx.restore();
    },
  };
}

function ChartCanvas({ canvasId, height, makeConfig }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const ChartCtor = typeof window !== "undefined" ? window.Chart : null;
    if (!ChartCtor) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvas.getContext("2d");
    const config = makeConfig?.();
    if (!config) return;
    try {
      chartRef.current = new ChartCtor(ctx, config);
    } catch (e) {
      console.error("[ChartCanvas]", canvasId, e);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [makeConfig]);

  return (
    <div style={{ height, position: "relative" }}>
      <canvas id={canvasId} ref={canvasRef} />
    </div>
  );
}

const ALL_SCHEDULE_CAT_KEYS = CATEGORIES.map((c) => c.key);

export default function GymDataKostenSection({ T, dark, activeScheduleCats, visibleGymNames }) {
  const filterCatKeys = activeScheduleCats ?? ALL_SCHEDULE_CAT_KEYS;

  const visibleGymFilterSet = useMemo(() => {
    if (!Array.isArray(visibleGymNames)) return null;
    return new Set(visibleGymNames.map((n) => String(n).toLowerCase().trim()));
  }, [visibleGymNames]);

  const statsByName = useMemo(() => {
    const m = {};
    for (const g of gymData) {
      m[g.name] = getScheduleTrainingStatsForCategoryKeys(g.name, filterCatKeys, ALL_SCHEDULE_CAT_KEYS);
    }
    return m;
  }, [filterCatKeys]);

  const lessonKeysByGymName = useMemo(() => {
    const m = {};
    for (const g of gymData) {
      m[g.name] = getLessonCategoryKeysForCostGym(g.name);
    }
    return m;
  }, []);

  const statsFor = (g) => statsByName[g.name];

  const filtered = useMemo(() => {
    const keys = activeScheduleCats ?? ALL_SCHEDULE_CAT_KEYS;
    let list = gymData.filter((g) => gymPassesScheduleCategoryFilter(g.name, keys, ALL_SCHEDULE_CAT_KEYS));
    if (visibleGymFilterSet != null) {
      list = list.filter((g) => visibleGymFilterSet.has(labelToCsvNaamLower(g.name)));
    }
    return list;
  }, [activeScheduleCats, visibleGymFilterSet]);

  const atcGym = useMemo(() => filtered.find(isOwnedAtc) ?? null, [filtered]);
  const ettakiGym = useMemo(() => filtered.find(isOwnedEttaki) ?? null, [filtered]);

  const competitors = useMemo(() => filtered.filter(isCompetitor), [filtered]);

  const marketAvgInstap = useMemo(() => {
    if (!competitors.length) return null;
    const sum = competitors.reduce((a, g) => a + minimalInstap(g), 0);
    return Math.round(sum / competitors.length);
  }, [competitors]);

  const duursteInstap = useMemo(() => {
    if (!filtered.length) return null;
    let best = filtered[0];
    let max = minimalInstap(best);
    for (let i = 1; i < filtered.length; i++) {
      const g = filtered[i];
      const m = minimalInstap(g);
      if (m > max) {
        max = m;
        best = g;
      }
    }
    return { gym: best, value: max };
  }, [filtered]);

  const segmentBuckets = useMemo(() => {
    const m1 = [];
    const m3 = [];
    const m6_12 = [];
    const m24 = [];
    for (const g of filtered) {
      const c = g.contract;
      if (c === 1) m1.push(g.name);
      else if (c === 3) m3.push(g.name);
      else if (c === 6 || c === 12) m6_12.push(g.name);
      else if (c === 24) m24.push(g.name);
    }
    return { m1, m3, m6_12, m24 };
  }, [filtered]);

  const marketAvgLesson = useMemo(() => {
    if (!competitors.length) return null;
    const sum = competitors.reduce((a, g) => a + costPerLessonFromSchedule(g.price, statsFor(g)), 0);
    return parseFloat((sum / competitors.length).toFixed(2));
  }, [competitors, statsByName]);

  const marketAvgHour = useMemo(() => {
    if (!competitors.length) return null;
    const sum = competitors.reduce((a, g) => a + costPerHourFromSchedule(g.price, statsFor(g)), 0);
    return parseFloat((sum / competitors.length).toFixed(2));
  }, [competitors, statsByName]);

  const atcLesson = atcGym ? costPerLessonFromSchedule(atcGym.price, statsFor(atcGym)) : null;
  const ettakiLesson = ettakiGym ? costPerLessonFromSchedule(ettakiGym.price, statsFor(ettakiGym)) : null;
  const atcHour = atcGym ? costPerHourFromSchedule(atcGym.price, statsFor(atcGym)) : null;
  const ettakiHour = ettakiGym ? costPerHourFromSchedule(ettakiGym.price, statsFor(ettakiGym)) : null;

  const maxInstapFiltered = duursteInstap?.value ?? 1;
  const anchorInstaps = [atcGym, ettakiGym].filter(Boolean).map((g) => minimalInstap(g));
  const minAnchorInstap = anchorInstaps.length ? Math.min(...anchorInstaps) : 1;
  const ratioInsight =
    Number.isFinite(maxInstapFiltered) && minAnchorInstap > 0
      ? Math.round(maxInstapFiltered / minAnchorInstap)
      : 27;

  const insight2Atc = atcLesson != null ? atcLesson.toFixed(2).replace(".", ",") : "—";
  const insight2Et = ettakiLesson != null ? ettakiLesson.toFixed(2).replace(".", ",") : "—";
  const atcDrop = atcGym?.dropIn != null ? atcGym.dropIn.toFixed(2).replace(".", ",") : null;

  const insight3Atc = atcHour != null ? atcHour.toFixed(2).replace(".", ",") : "—";
  const insight3Et = ettakiHour != null ? ettakiHour.toFixed(2).replace(".", ",") : "—";

  const atcSt = atcGym ? statsFor(atcGym) : null;
  const ettSt = ettakiGym ? statsFor(ettakiGym) : null;

  const sectionTitle = (t) => (
    <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 0.2, color: T.textSub, marginBottom: 10 }}>{t}</div>
  );

  const metricCard = (label, value, sub, accentColor) => (
    <div
      style={{
        flex: "1 1 160px",
        minWidth: 160,
        background: dark ? "#0d0d18" : "#ffffff",
        border: `1px solid ${T.border2}`,
        borderLeftWidth: accentColor ? 3 : 1,
        borderLeftColor: accentColor || T.border2,
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: T.textMuted }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900, color: T.textSub }}>{value}</div>
      {sub != null && (
        <div style={{ marginTop: 3, fontSize: 10, fontWeight: 700, color: T.textMuted }}>{sub}</div>
      )}
    </div>
  );

  const tile = (title, count, names, borderColor) => (
    <div
      style={{
        flex: "1 1 200px",
        minWidth: 180,
        background: dark ? "#0d0d18" : "#ffffff",
        border: `1px solid ${T.border2}`,
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
      }}
    >
      <div style={{ width: 4, flexShrink: 0, background: borderColor }} />
      <div style={{ padding: "10px 12px", flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: T.textSub }}>{title}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: T.textSub, marginTop: 4 }}>{count}</div>
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            fontWeight: 600,
            color: T.textMuted,
            lineHeight: 1.35,
            maxHeight: 120,
            overflowY: "auto",
          }}
        >
          {names.length ? names.join(" · ") : "—"}
        </div>
      </div>
    </div>
  );

  const insightBox = (borderColor, children) => (
    <div style={{ background: dark ? "#0d0d18" : "#ffffff", border: `1px solid ${T.border2}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex" }}>
        <div style={{ width: 3, background: borderColor }} />
        <div style={{ padding: "12px 14px", color: T.textSub, fontSize: 12, fontWeight: 650, lineHeight: 1.45 }}>{children}</div>
      </div>
    </div>
  );

  const contractBarSorted = useMemo(
    () => [...filtered].sort((a, b) => minimalInstap(a) - minimalInstap(b)),
    [filtered],
  );

  const lessonBarSorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          costPerLessonFromSchedule(a.price, statsFor(a)) - costPerLessonFromSchedule(b.price, statsFor(b)),
      ),
    [filtered, statsByName],
  );

  const hourBarSorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          costPerHourFromSchedule(a.price, statsFor(a)) - costPerHourFromSchedule(b.price, statsFor(b)),
      ),
    [filtered, statsByName],
  );

  const dropInPairs = useMemo(
    () => filtered.filter((g) => g.dropIn != null && Number.isFinite(g.price)),
    [filtered],
  );

  const hourChartHeight = Math.max(120, filtered.length * 28 + 60);

  const categoryChartData = useMemo(() => {
    const atc = atcGym;
    const et = ettakiGym;
    const atcKeys = atc ? lessonKeysByGymName[atc.name] : null;
    const ettKeys = et ? lessonKeysByGymName[et.name] : null;
    const statsOneCat = (g, catKey) =>
      getScheduleTrainingStatsForCategoryKeys(g.name, [catKey], ALL_SCHEDULE_CAT_KEYS);
    const market = CATEGORIES.map((cat) => {
      const comps = filtered.filter(
        (g) => isCompetitor(g) && lessonKeysByGymName[g.name]?.has(cat.key),
      );
      if (!comps.length) return null;
      const sum = comps.reduce(
        (a, g) => a + costPerHourFromSchedule(g.price, statsOneCat(g, cat.key)),
        0,
      );
      return parseFloat((sum / comps.length).toFixed(2));
    });
    const atcData = CATEGORIES.map((cat) =>
      atc && atcKeys?.has(cat.key)
        ? costPerHourFromSchedule(atc.price, statsOneCat(atc, cat.key))
        : null,
    );
    const ettData = CATEGORIES.map((cat) =>
      et && ettKeys?.has(cat.key) ? costPerHourFromSchedule(et.price, statsOneCat(et, cat.key)) : null,
    );
    return { market, atcData, ettData };
  }, [filtered, atcGym, ettakiGym, lessonKeysByGymName]);

  const makeContractBarConfig = useCallback(() => {
    if (!contractBarSorted.length) return null;
    const labels = contractBarSorted.map((g) => g.name);
    const values = contractBarSorted.map((g) => minimalInstap(g));
    const colors = contractBarSorted.map(barColorForGym);
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
            borderRadius: 5,
            barPercentage: 0.9,
            categoryPercentage: 0.9,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `€${Number(ctx.raw).toFixed(2)} minimale instap`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: T.textMuted, maxRotation: 45, minRotation: 45, font: { size: 9 } },
            grid: { display: false },
          },
          y: {
            ticks: { color: T.textMuted, callback: euroTick },
            grid: { color: `${T.border2}` },
          },
        },
      },
    };
  }, [contractBarSorted, T]);

  const scatterPoints = useMemo(
    () => filtered.map((g) => ({ x: g.contract, y: g.price, g })),
    [filtered],
  );

  const makeScatterConfig = useCallback(() => {
    if (!scatterPoints.length) return null;
    // Gebruik `line` + showLine:false i.p.v. `scatter`: sommige Chart.js-bundels registreren ScatterController niet.
    return {
      type: "line",
      data: {
        datasets: [
          {
            label: "Gyms",
            data: scatterPoints.map((p) => ({ x: p.x, y: p.y })),
            showLine: false,
            parsing: false,
            borderWidth: 0,
            pointBackgroundColor: scatterPoints.map((p) => barColorForGym(p.g)),
            pointBorderWidth: 0,
            pointRadius: scatterPoints.map((p) =>
              isOwnedAtc(p.g) || isOwnedEttaki(p.g) ? 8 : 6,
            ),
            pointHoverRadius: scatterPoints.map((p) =>
              isOwnedAtc(p.g) || isOwnedEttaki(p.g) ? 9 : 7,
            ),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: () => "",
              label: (ctx) => {
                const p = scatterPoints[ctx.dataIndex];
                if (!p) return "";
                const cl = contractMonthLabel(p.g.contract);
                return `${p.g.name}: €${p.g.price.toFixed(2)} — ${cl}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            position: "bottom",
            title: { display: true, text: "Contractduur (maanden)", color: T.textMuted, font: { size: 10 } },
            ticks: {
              color: T.textMuted,
              font: { size: 9 },
              callback(val) {
                const found = CATEGORY_AXIS_LABELS.find((c) => c.v === val);
                return found ? found.short : val;
              },
              stepSize: 1,
            },
            suggestedMin: 0,
            suggestedMax: 26,
            grid: { color: `${T.border2}` },
          },
          y: {
            type: "linear",
            title: { display: true, text: "Maandprijs (€)", color: T.textMuted, font: { size: 10 } },
            ticks: { color: T.textMuted, callback: euroTick },
            grid: { color: `${T.border2}` },
          },
        },
      },
    };
  }, [scatterPoints, T]);

  const hasRosterFallback = useMemo(
    () => filtered.some((g) => !statsFor(g).fromSchedule),
    [filtered, statsByName],
  );

  const lessonAvgLine = marketAvgLesson;
  const makeLessonBarConfig = useCallback(() => {
    if (!lessonBarSorted.length) return null;
    const labels = lessonBarSorted.map((g) => g.name);
    const values = lessonBarSorted.map((g) => costPerLessonFromSchedule(g.price, statsFor(g)));
    const colors = lessonBarSorted.map(barColorForGym);
    const plugins = [];
    if (lessonAvgLine != null && Number.isFinite(lessonAvgLine)) {
      plugins.push(
        makeAverageLinePlugin({
          average: lessonAvgLine,
          color: COLOR_AVG_LINE,
          label: `Gem. markt €${lessonAvgLine.toFixed(2)}`,
        }),
      );
    }
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
            borderRadius: 5,
            barPercentage: 0.9,
            categoryPercentage: 0.9,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const g = lessonBarSorted[ctx.dataIndex];
                const st = g ? statsFor(g) : null;
                const main = `€${Number(ctx.raw).toFixed(2)} per les (rooster: ${st?.lessonsPerWeek ?? "—"} lessen/week → ${st?.sessionsPerMonth ?? "—"} sess./mnd)`;
                if (!g) return main;
                const extra = [];
                if (g.price1x != null)
                  extra.push(`1×/week-plan: €${(g.price1x / 4).toFixed(2)} per les`);
                if (g.price2x != null)
                  extra.push(`2×/week-plan: €${(g.price2x / 8).toFixed(2)} per les`);
                return extra.length ? [main, ...extra].join("\n") : main;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: T.textMuted, maxRotation: 45, minRotation: 45, font: { size: 9 } },
            grid: { display: false },
          },
          y: {
            ticks: { color: T.textMuted, callback: euroTick },
            grid: { color: `${T.border2}` },
          },
        },
      },
      plugins,
    };
  }, [lessonBarSorted, lessonAvgLine, T, statsByName]);

  const makeDropInGroupedConfig = useCallback(() => {
    if (!dropInPairs.length) return null;
    const labels = dropInPairs.map((g) => g.name);
    const dropVals = dropInPairs.map((g) => parseFloat(Number(g.dropIn).toFixed(2)));
    const subVals = dropInPairs.map((g) => costPerLessonFromSchedule(g.price, statsFor(g)));
    const subColors = dropInPairs.map(barColorForGym);
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Losse les",
            data: dropVals,
            backgroundColor: DROPIN_BAR,
            borderRadius: 5,
            barPercentage: 0.85,
            categoryPercentage: 0.75,
          },
          {
            label: "Abonnement per les",
            data: subVals,
            backgroundColor: subColors,
            borderRadius: 5,
            barPercentage: 0.85,
            categoryPercentage: 0.75,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const raw = Number(ctx.raw);
                if (ctx.datasetIndex === 0) return `Losse les: €${raw.toFixed(2)}`;
                const g = dropInPairs[ctx.dataIndex];
                const st = g ? statsFor(g) : null;
                return `Abonnement per les: €${raw.toFixed(2)} (rooster: ${st?.sessionsPerMonth ?? "—"} sess./mnd)`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: false,
            ticks: { color: T.textMuted, maxRotation: 45, minRotation: 45, font: { size: 8 } },
            grid: { display: false },
          },
          y: { stacked: false, ticks: { color: T.textMuted, callback: euroTick }, grid: { color: `${T.border2}` } },
        },
      },
    };
  }, [dropInPairs, T, statsByName]);

  const hourAvgLine = marketAvgHour;
  const makeHourHorizontalConfig = useCallback(() => {
    if (!hourBarSorted.length) return null;
    const labels = hourBarSorted.map((g) => g.name);
    const values = hourBarSorted.map((g) => costPerHourFromSchedule(g.price, statsFor(g)));
    const colors = hourBarSorted.map(barColorForGym);
    const plugins = [];
    if (hourAvgLine != null && Number.isFinite(hourAvgLine)) {
      plugins.push(
        makeAverageVerticalLinePlugin({
          average: hourAvgLine,
          color: COLOR_AVG_LINE,
          label: `Gem. €${hourAvgLine.toFixed(2)}`,
        }),
      );
    }
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
            borderRadius: 5,
            barPercentage: 0.85,
            categoryPercentage: 0.85,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const g = hourBarSorted[ctx.dataIndex];
                const st = g ? statsFor(g) : null;
                return `€${Number(ctx.raw).toFixed(2)}/uur (rooster: gem. ${st?.avgMinutes ?? "—"} min/les, ${st?.sessionsPerMonth ?? "—"} sess./mnd)`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: T.textMuted, callback: euroTick },
            grid: { color: `${T.border2}` },
          },
          y: {
            ticks: { color: T.textMuted, font: { size: 9 } },
            grid: { display: false },
          },
        },
      },
      plugins,
    };
  }, [hourBarSorted, hourAvgLine, T, statsByName]);

  const makeHourCategoryConfig = useCallback(() => {
    const { market, atcData, ettData } = categoryChartData;
    const labels = CATEGORIES.map((c) => c.label);
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "ATC",
            data: atcData,
            backgroundColor: ATC_RED,
            borderRadius: 4,
          },
          {
            label: "EttakiGym",
            data: ettData,
            backgroundColor: ETTAKI_YELLOW,
            borderRadius: 4,
          },
          {
            label: "Markt gem.",
            data: market,
            backgroundColor: COLOR_MARKET,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw;
                if (v == null || v === "") return "";
                return `${ctx.dataset.label}: €${Number(v).toFixed(2)}/uur`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: T.textMuted, font: { size: 9 }, maxRotation: 45, minRotation: 0 },
            grid: { display: false },
          },
          y: { ticks: { color: T.textMuted, callback: euroTick }, grid: { color: `${T.border2}` } },
        },
      },
    };
  }, [categoryChartData, T]);

  const divider = <div style={{ height: 1, background: T.border2, opacity: 0.6, margin: "1.5rem 0" }} />;

  return (
    <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.8px", textTransform: "uppercase", color: T.textMuted }}>
          Gym Data
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, color: T.textSub, marginTop: 4 }}>Gym Data — Kosten</div>
      </div>

      {/* SECTION 1 */}
      {sectionTitle("Contractduur & minimale instapkosten")}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {metricCard("ATC instapkosten", "€60", "1 maand min.", ATC_RED)}
        {metricCard("Ettaki instapkosten", "€69", "1 maand min.", ETTAKI_YELLOW)}
        {metricCard(
          "Markt gem. instap",
          marketAvgInstap != null ? `€${marketAvgInstap}` : "—",
          "gewogen gemiddelde",
        )}
        {metricCard(
          "Duurste instap",
          duursteInstap != null ? `€${Math.round(duursteInstap.value).toLocaleString("nl-NL")}` : "—",
          duursteInstap != null ? `${duursteInstap.gym.name} (${duursteInstap.gym.contract} mnd)` : "",
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {tile("Maandelijks", segmentBuckets.m1.length, segmentBuckets.m1, TILE_SEGMENT_MONTHLY)}
        {tile("Kwartaal (3 mnd)", segmentBuckets.m3.length, segmentBuckets.m3, TILE_SEGMENT_QUARTER)}
        {tile("Halfjaar / Jaar", segmentBuckets.m6_12.length, segmentBuckets.m6_12, COLOR_MARKET)}
        {tile("24 maanden", segmentBuckets.m24.length, segmentBuckets.m24, COLOR_AVG_LINE)}
      </div>

      <div style={{ background: dark ? "#0d0d18" : "#ffffff", border: `1px solid ${T.border2}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: T.textSub }}>Minimale instapkosten per gym</div>
          <CustomLegend
            items={[
              { label: "ATC", color: ATC_RED, type: "bar", textColor: T.textMuted },
              { label: "EttakiGym", color: ETTAKI_YELLOW, type: "bar", textColor: T.textMuted },
              { label: "Overige", color: COLOR_MARKET, type: "bar", textColor: T.textMuted },
            ]}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          {!contractBarSorted.length ? (
            <div style={{ height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontSize: 12 }}>
              Geen gyms in deze selectie.
            </div>
          ) : (
            <ChartCanvas canvasId="contractBarChart" height={360} makeConfig={makeContractBarConfig} />
          )}
        </div>
      </div>

      <div style={{ background: dark ? "#0d0d18" : "#ffffff", border: `1px solid ${T.border2}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: T.textSub }}>Prijs vs. contractduur — positionering</div>
          <CustomLegend
            items={[
              { label: "ATC", color: ATC_RED, type: "bar", textColor: T.textMuted },
              { label: "EttakiGym", color: ETTAKI_YELLOW, type: "bar", textColor: T.textMuted },
              { label: "Anderen", color: COLOR_MARKET, type: "bar", textColor: T.textMuted },
            ]}
          />
        </div>
        <div style={{ fontSize: 10, color: T.textMuted, marginTop: 4, lineHeight: 1.4 }}>
          {CATEGORY_AXIS_LABELS.map((c) => c.short).join(" · ")}
        </div>
        <div style={{ marginTop: 10 }}>
          {!scatterPoints.length ? (
            <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontSize: 12 }}>
              Geen gyms in deze selectie.
            </div>
          ) : (
            <ChartCanvas canvasId="contractScatter" height={320} makeConfig={makeScatterConfig} />
          )}
        </div>
      </div>

      {insightBox(
        ATC_RED,
        <>
          💡 ATC en EttakiGym combineren een lage prijs met de kortste contractduur — de minimale instap (€60 en €69) is tot {ratioInsight}× lager dan de duurste concurrent. Dit is een krachtig verkoopargument richting nieuwe leden die nog twijfelen.
        </>,
      )}

      {divider}

      {/* SECTION 2 */}
      {sectionTitle("Kosten per les")}
      <div
        style={{
          fontSize: 11,
          color: T.textMuted,
          lineHeight: 1.45,
          marginBottom: 12,
          padding: "10px 12px",
          background: dark ? "#0d0d18" : "#ffffff",
          border: `1px solid ${T.border2}`,
          borderRadius: 8,
        }}
      >
        <strong style={{ color: T.textSub }}>Berekening:</strong> aantal niet–Open Mat lessen per week en gemiddelde lesduur uit het{" "}
        <strong>rooster in deze app</strong>. Sessies per maand ≈ ronding van (lessen/week × 52 ÷ 12). Zonder roosterdata: fallback 8
        sessies/mnd en 60 min (zie onder).
        {hasRosterFallback && (
          <span style={{ display: "block", marginTop: 6, color: "#f59e0b", fontWeight: 700 }}>
            Let op: minimaal één gym in deze selectie heeft geen rooster in de app — daarvoor geldt de fallback.
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {metricCard(
          "ATC kosten/les",
          atcLesson != null ? `€${atcLesson.toFixed(2)}` : "—",
          null,
        )}
        {metricCard(
          "Ettaki kosten/les",
          ettakiLesson != null ? `€${ettakiLesson.toFixed(2)}` : "—",
          null,
        )}
        {metricCard(
          "Markt gemiddelde/les",
          marketAvgLesson != null ? `€${marketAvgLesson.toFixed(2)}` : "—",
          null,
        )}
      </div>

      <div style={{ background: dark ? "#0d0d18" : "#ffffff", border: `1px solid ${T.border2}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: T.textSub }}>Kosten per les — onbeperkt abonnement</div>
          <CustomLegend
            items={[
              { label: "ATC", color: ATC_RED, type: "bar", textColor: T.textMuted },
              { label: "EttakiGym", color: ETTAKI_YELLOW, type: "bar", textColor: T.textMuted },
              { label: "Overige", color: COLOR_MARKET, type: "bar", textColor: T.textMuted },
              {
                label: marketAvgLesson != null ? `Gem. markt €${marketAvgLesson.toFixed(2)}` : "Gem. markt",
                color: COLOR_AVG_LINE,
                type: "line",
                textColor: T.textMuted,
              },
            ]}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          {!lessonBarSorted.length ? (
            <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontSize: 12 }}>
              Geen gyms in deze selectie.
            </div>
          ) : (
            <ChartCanvas canvasId="lessonBarChart" height={320} makeConfig={makeLessonBarConfig} />
          )}
        </div>
      </div>

      <div style={{ background: dark ? "#0d0d18" : "#ffffff", border: `1px solid ${T.border2}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: T.textSub }}>Losse les vs. abonnement per les</div>
          <CustomLegend
            items={[
              { label: "Losse les", color: DROPIN_BAR, type: "bar", textColor: T.textMuted },
              { label: "Abonnement per les", color: COLOR_MARKET, type: "bar", textColor: T.textMuted },
            ]}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          {!dropInPairs.length ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontSize: 12 }}>
              Geen gyms met zowel losse les als maandprijs in deze selectie.
            </div>
          ) : (
            <ChartCanvas canvasId="lessonDropInChart" height={280} makeConfig={makeDropInGroupedConfig} />
          )}
        </div>
      </div>

      {insightBox(
        ETTAKI_YELLOW,
        <>
          💡 Op basis van het rooster kost een les bij ATC €{insight2Atc}
          {atcSt ? ` (${atcSt.lessonsPerWeek} lessen/week, gem. ${atcSt.avgMinutes} min)` : ""} en bij EttakiGym €{insight2Et}
          {ettSt ? ` (${ettSt.lessonsPerWeek} lessen/week, gem. ${ettSt.avgMinutes} min)` : ""} — beide ruim onder het marktgemiddelde
          {marketAvgLesson != null ? ` (€${marketAvgLesson.toFixed(2)})` : ""}.
          {atcDrop != null && atcLesson != null && atcGym
            ? ` De losse les van ATC (€${atcDrop}) is ${Number(atcGym.dropIn) > atcLesson ? "duurder" : "goedkoper"} dan het abonnement per les, wat abonnees beloont.`
            : ""}
        </>,
      )}

      {divider}

      {/* SECTION 3 */}
      {sectionTitle("Kosten per uur")}
      <div
        style={{
          fontSize: 11,
          color: T.textMuted,
          lineHeight: 1.45,
          marginBottom: 12,
          padding: "10px 12px",
          background: dark ? "#0d0d18" : "#ffffff",
          border: `1px solid ${T.border2}`,
          borderRadius: 8,
        }}
      >
        Zelfde roosterbron als hierboven: €/uur = (maandprijs ÷ sessies per maand) ÷ (gemiddelde lesduur in uur).
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {metricCard("ATC kosten/uur", atcHour != null ? `€${atcHour.toFixed(2)}` : "—", null)}
        {metricCard("Ettaki kosten/uur", ettakiHour != null ? `€${ettakiHour.toFixed(2)}` : "—", null)}
        {metricCard(
          "Markt gemiddelde/uur",
          marketAvgHour != null ? `€${marketAvgHour.toFixed(2)}` : "—",
          null,
        )}
      </div>

      <div style={{ background: dark ? "#0d0d18" : "#ffffff", border: `1px solid ${T.border2}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: T.textSub }}>Kosten per uur — gesorteerd</div>
          <CustomLegend
            items={[
              { label: "ATC", color: ATC_RED, type: "bar", textColor: T.textMuted },
              { label: "EttakiGym", color: ETTAKI_YELLOW, type: "bar", textColor: T.textMuted },
              { label: "Overige", color: COLOR_MARKET, type: "bar", textColor: T.textMuted },
              {
                label: marketAvgHour != null ? `Gem. markt €${marketAvgHour.toFixed(2)}` : "Gem. markt",
                color: COLOR_AVG_LINE,
                type: "line",
                textColor: T.textMuted,
              },
            ]}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          {!hourBarSorted.length ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontSize: 12 }}>
              Geen gyms in deze selectie.
            </div>
          ) : (
            <ChartCanvas canvasId="hourHorizontalChart" height={hourChartHeight} makeConfig={makeHourHorizontalConfig} />
          )}
        </div>
      </div>

      <div style={{ background: dark ? "#0d0d18" : "#ffffff", border: `1px solid ${T.border2}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: T.textSub }}>ATC & Ettaki vs. markt — kosten/uur per categorie</div>
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 4, lineHeight: 1.35, maxWidth: 720 }}>
              Per kolom: maandabonnement gedeeld door het aantal trainingsuren per maand, obv alleen lessen in die roostercategorie
              (uren = som lesduur in de week × 52/12). Overige grafieken hierboven: zelfde logica obv categorieën die je in de sidebar
              aan hebt staan.
            </div>
          </div>
          <CustomLegend
            items={[
              { label: "ATC", color: ATC_RED, type: "bar", textColor: T.textMuted },
              { label: "EttakiGym", color: ETTAKI_YELLOW, type: "bar", textColor: T.textMuted },
              { label: "Markt gem.", color: COLOR_MARKET, type: "bar", textColor: T.textMuted },
            ]}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <ChartCanvas canvasId="hourCategoryChart" height={320} makeConfig={makeHourCategoryConfig} />
        </div>
      </div>

      {insightBox(
        ATC_RED,
        <>
          💡 Met de gemiddelde lesduur uit het rooster kost een uur sporten bij ATC €{insight3Atc}
          {atcSt ? ` (gem. ${atcSt.avgMinutes} min/les)` : ""} en bij EttakiGym €{insight3Et}
          {ettSt ? ` (gem. ${ettSt.avgMinutes} min/les)` : ""} — vergelijkbaar met een kop koffie. Ter vergelijking: een personal trainer kost
          gemiddeld €50–€80 per uur.
        </>,
      )}
    </div>
  );
}
