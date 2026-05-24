import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Ui";
import { listAllForStats, type StatsRow } from "../lib/db";
import {
  appUsage,
  averageWpm,
  currentStreakDays,
  filterRange,
  formatCompactWords,
  formatDurationHm,
  formatThousands,
  hourHeatmap,
  longestStreakDays,
  type Range,
  rangeDays,
  rangeStartMs,
  timeSavedMs,
  totalWords,
  wordsPerDay,
} from "../lib/stats";

const RANGE_BUTTONS: Array<[Range, string]> = [
  ["7d", "7 días"],
  ["30d", "30 días"],
  ["90d", "90 días"],
  ["all", "Total"],
];

function previousRangeRows(rows: StatsRow[], range: Range): StatsRow[] {
  if (range === "all") return [];
  const days = rangeDays(range);
  const start = rangeStartMs(range);
  const prevStart = start - days * 86_400_000;
  return rows.filter((r) => r.created_at >= prevStart && r.created_at < start);
}

function deltaPct(curr: number, prev: number): string | null {
  if (prev <= 0) return null;
  const pct = ((curr - prev) / prev) * 100;
  if (!Number.isFinite(pct)) return null;
  const sign = pct >= 0 ? "+" : "−";
  return `${sign}${Math.abs(pct).toFixed(1).replace(".", ",")}% vs anterior`;
}

function deltaWpm(curr: number, prev: number): string | null {
  if (prev <= 0) return null;
  const d = curr - prev;
  if (d === 0) return "igual que antes";
  const sign = d > 0 ? "+" : "−";
  return `${sign}${Math.abs(d)} wpm`;
}

function BigStat({
  value,
  label,
  sub,
  accent = false,
  hasBorder = true,
}: {
  value: string;
  label: string;
  sub?: string | null;
  accent?: boolean;
  hasBorder?: boolean;
}) {
  return (
    <div
      style={{
        padding: "20px 22px",
        borderRight: hasBorder ? "1px solid var(--line)" : undefined,
      }}
    >
      <div
        className="serif"
        style={{
          fontSize: 44,
          lineHeight: 1,
          letterSpacing: "-.02em",
          color: accent ? "var(--accent)" : "var(--ink)",
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{label}</div>
      {sub && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11.5,
            color: sub.startsWith("+") ? "var(--good)" : "var(--ink-3)",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function WordsChart({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const n = values.length;
  // We always highlight the most recent slice — 7 days when the range is
  // wider, the whole window when it's already short.
  const highlightFrom = Math.max(0, n - 7);
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          height: 180,
          gap: n > 30 ? 2 : 4,
        }}
      >
        {values.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              height: `${Math.max(4, (d / max) * 180)}px`,
              background:
                i >= highlightFrom ? "var(--accent)" : "var(--sidebar-2)",
              borderRadius: 3,
              opacity: d === 0 ? 0.4 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function HoursHeatmap({ matrix }: { matrix: number[][] }) {
  const dows = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const hourLabels = [0, 4, 8, 12, 16, 20];
  const max = Math.max(1, ...matrix.flat());
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {dows.map((d) => (
            <div
              key={d}
              style={{
                height: 18,
                fontSize: 11,
                color: "var(--ink-3)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {matrix.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(24, 1fr)",
                gap: 3,
              }}
            >
              {row.map((v, j) => {
                const intensity = v / max;
                return (
                  <div
                    key={j}
                    style={{
                      height: 18,
                      borderRadius: 3,
                      background:
                        intensity < 0.05
                          ? "var(--sidebar-2)"
                          : `color-mix(in oklch, var(--accent) ${Math.round(intensity * 90)}%, var(--sidebar-2))`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 8,
          marginTop: 8,
        }}
      >
        <div style={{ width: 32 }} />
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)" }}
        >
          {hourLabels.map((h) => (
            <span key={h} style={{ fontSize: 11, color: "var(--ink-3)" }}>
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function peakHourWindow(matrix: number[][]): [number, number] | null {
  const hours = new Array(24).fill(0);
  for (const row of matrix) {
    for (let h = 0; h < 24; h++) hours[h] += row[h];
  }
  if (hours.every((v) => v === 0)) return null;
  let best = -1;
  let bestStart = 0;
  for (let h = 0; h <= 21; h++) {
    const sum = hours[h] + hours[h + 1] + hours[h + 2];
    if (sum > best) {
      best = sum;
      bestStart = h;
    }
  }
  return [bestStart, bestStart + 3];
}

export function InsightsScreen({ refreshKey = 0 }: { refreshKey?: number }) {
  const [range, setRange] = useState<Range>("30d");
  const [allRows, setAllRows] = useState<StatsRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    listAllForStats()
      .then((rows) => {
        if (!cancelled) setAllRows(rows);
      })
      .catch((e) => console.error("listAllForStats failed", e));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const rangeRows = useMemo(
    () => filterRange(allRows, range),
    [allRows, range],
  );
  const prevRows = useMemo(
    () => previousRangeRows(allRows, range),
    [allRows, range],
  );

  const stats = useMemo(() => {
    const words = totalWords(rangeRows);
    const wpm = averageWpm(rangeRows);
    const savedMs = timeSavedMs(rangeRows);
    const streak = currentStreakDays(allRows);
    const longest = longestStreakDays(allRows);
    return { words, wpm, savedMs, streak, longest };
  }, [rangeRows, allRows]);

  const prevStats = useMemo(() => {
    return {
      words: totalWords(prevRows),
      wpm: averageWpm(prevRows),
    };
  }, [prevRows]);

  // Chart days: "all" defaults to 30 — most users want a recent-trend view
  // even when "Total" is selected.
  const chartDays = useMemo(() => {
    if (range === "all") return 30;
    return rangeDays(range);
  }, [range]);
  const chartValues = useMemo(
    () => wordsPerDay(rangeRows, chartDays),
    [rangeRows, chartDays],
  );

  const heatmap = useMemo(() => hourHeatmap(rangeRows), [rangeRows]);
  const peak = useMemo(() => peakHourWindow(heatmap), [heatmap]);
  const apps = useMemo(() => appUsage(rangeRows), [rangeRows]);

  const hasData = rangeRows.length > 0;

  const chartSub = useMemo(() => {
    if (range === "7d") return "Últimos 7 días";
    if (range === "30d") return "Últimos 30 días · destacados los últimos 7";
    if (range === "90d") return "Últimos 90 días · destacados los últimos 7";
    return "Últimos 30 días · destacados los últimos 7";
  }, [range]);

  const peakLabel = peak
    ? `Mayor concentración entre ${String(peak[0]).padStart(2, "0")}:00 y ${String(peak[1]).padStart(2, "0")}:00`
    : "Aún no hay actividad suficiente";

  return (
    <div
      style={{
        padding: "24px 28px 40px",
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-.015em",
              color: "var(--ink)",
            }}
          >
            Estadísticas
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "var(--ink-2)",
            }}
          >
            Tu actividad de dictado y escritura. Todo se calcula localmente.
          </p>
        </div>
        <div
          style={{
            display: "inline-flex",
            padding: 2,
            background: "var(--sidebar-2)",
            borderRadius: 8,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {RANGE_BUTTONS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 500,
                border: 0,
                borderRadius: 6,
                background: range === k ? "var(--surface)" : "transparent",
                color: range === k ? "var(--ink)" : "var(--ink-2)",
                boxShadow:
                  range === k ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <Card padding={0}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <BigStat
            value={formatCompactWords(stats.words)}
            label="palabras totales"
            sub={deltaPct(stats.words, prevStats.words)}
          />
          <BigStat
            value={stats.wpm > 0 ? String(stats.wpm) : "—"}
            label="palabras / minuto"
            sub={deltaWpm(stats.wpm, prevStats.wpm)}
            accent
          />
          <BigStat
            value={
              stats.savedMs > 0 ? formatDurationHm(stats.savedMs) : "—"
            }
            label="tiempo ahorrado"
            sub="vs teclear"
          />
          <BigStat
            value={String(stats.streak)}
            label={stats.streak === 1 ? "día seguido" : "días seguidos"}
            sub={
              stats.longest > 1 ? `récord: ${stats.longest} días` : null
            }
            hasBorder={false}
          />
        </div>
      </Card>

      <Card padding={22}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
            >
              Palabras por día
            </div>
            <div
              style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}
            >
              {chartSub}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 11.5,
              color: "var(--ink-2)",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  background: "var(--accent)",
                }}
              />{" "}
              Últimos 7 días
            </span>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  background: "var(--sidebar-2)",
                }}
              />{" "}
              Anterior
            </span>
          </div>
        </div>
        {hasData ? (
          <WordsChart values={chartValues} />
        ) : (
          <EmptyState message="Aún no hay transcripciones en este rango." />
        )}
      </Card>

      <Card padding={22}>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
          >
            Cuando dictas
          </div>
          <div
            style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}
          >
            {peakLabel}
          </div>
        </div>
        <HoursHeatmap matrix={heatmap} />
      </Card>

      <Card padding={22}>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
          >
            Dónde dictas más
          </div>
          <div
            style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}
          >
            Aplicaciones por número de palabras
          </div>
        </div>
        {apps.length === 0 ? (
          <EmptyState message="Aún no hemos podido detectar en qué aplicaciones dictas." />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
            }}
          >
            {apps.slice(0, 6).map((a) => (
              <div
                key={a.app}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid var(--line-2)",
                  background: "var(--bg)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={a.app}
                  >
                    {a.app}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                    {a.pct}%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    marginBottom: 10,
                  }}
                >
                  {formatThousands(a.words)} palabras
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "var(--ink-2)",
                  }}
                >
                  <span>
                    {a.sessions === 1
                      ? "1 sesión"
                      : `${formatThousands(a.sessions)} sesiones`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "40px 0",
        textAlign: "center",
        fontSize: 13,
        color: "var(--ink-3)",
      }}
    >
      {message}
    </div>
  );
}
