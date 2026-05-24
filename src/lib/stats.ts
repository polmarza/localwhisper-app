// Stats helpers — pure functions that take rows fetched from SQLite and
// produce the numbers shown in Home / Insights. Kept in its own module so
// both screens share the same definitions of "words per minute", "time
// saved", "streak", etc.

export type StatsRow = {
  app: string | null;
  duration_ms: number;
  word_count: number;
  created_at: number;
};

// Average human typing speed in words per minute. Used as the baseline
// for the "tiempo ahorrado" calculation — i.e. how long the same words
// would have taken to type instead of dictate.
export const TYPING_WPM = 40;

const DAY_MS = 86_400_000;

export type Range = "7d" | "30d" | "90d" | "all";

export function rangeDays(range: Range): number {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "all":
      return 0;
  }
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function rangeStartMs(range: Range, nowMs = Date.now()): number {
  if (range === "all") return 0;
  const days = rangeDays(range);
  return startOfDay(new Date(nowMs)) - (days - 1) * DAY_MS;
}

export function filterRange(rows: StatsRow[], range: Range): StatsRow[] {
  if (range === "all") return rows;
  const start = rangeStartMs(range);
  return rows.filter((r) => r.created_at >= start);
}

// Monday-aligned start of the current ISO week.
export function startOfWeekMs(nowMs = Date.now()): number {
  const d = new Date(nowMs);
  const dow = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
  return startOfDay(d) - dow * DAY_MS;
}

export function filterCurrentWeek(rows: StatsRow[]): StatsRow[] {
  const start = startOfWeekMs();
  return rows.filter((r) => r.created_at >= start);
}

export function totalWords(rows: StatsRow[]): number {
  return rows.reduce((n, r) => n + r.word_count, 0);
}

export function totalDurationMs(rows: StatsRow[]): number {
  return rows.reduce((n, r) => n + r.duration_ms, 0);
}

export function averageWpm(rows: StatsRow[]): number {
  const w = totalWords(rows);
  const dMs = totalDurationMs(rows);
  if (dMs < 500 || w === 0) return 0;
  return Math.round(w / (dMs / 60_000));
}

// How long the same number of words would have taken to type at TYPING_WPM,
// minus the actual time spent dictating. Clamped at 0.
export function timeSavedMs(rows: StatsRow[], typingWpm = TYPING_WPM): number {
  const w = totalWords(rows);
  if (w === 0) return 0;
  const typedMs = (w / typingWpm) * 60_000;
  const dictatedMs = totalDurationMs(rows);
  return Math.max(0, typedMs - dictatedMs);
}

function daySetFromRows(rows: StatsRow[]): Set<number> {
  const s = new Set<number>();
  for (const r of rows) {
    s.add(startOfDay(new Date(r.created_at)));
  }
  return s;
}

// Consecutive days with at least one transcription, ending today (or
// yesterday if today has none — the streak hasn't been broken yet).
export function currentStreakDays(
  rows: StatsRow[],
  nowMs = Date.now(),
): number {
  if (rows.length === 0) return 0;
  const days = daySetFromRows(rows);
  let cursor = startOfDay(new Date(nowMs));
  if (!days.has(cursor)) {
    cursor -= DAY_MS;
    if (!days.has(cursor)) return 0;
  }
  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor -= DAY_MS;
  }
  return count;
}

export function longestStreakDays(rows: StatsRow[]): number {
  if (rows.length === 0) return 0;
  const sorted = [...daySetFromRows(rows)].sort((a, b) => a - b);
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === DAY_MS) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

export type AppUsage = {
  app: string;
  words: number;
  sessions: number;
  pct: number;
};

export function appUsage(rows: StatsRow[]): AppUsage[] {
  const map = new Map<string, { words: number; sessions: number }>();
  let total = 0;
  for (const r of rows) {
    const name = r.app && r.app.trim() ? r.app : "Sin app";
    const e = map.get(name) ?? { words: 0, sessions: 0 };
    e.words += r.word_count;
    e.sessions += 1;
    map.set(name, e);
    total += r.word_count;
  }
  const out: AppUsage[] = [];
  for (const [app, v] of map) {
    out.push({
      app,
      words: v.words,
      sessions: v.sessions,
      pct: total > 0 ? Math.round((v.words / total) * 100) : 0,
    });
  }
  out.sort((a, b) => b.words - a.words);
  return out;
}

// Bucket word counts into `days` daily buckets ending today (rightmost).
export function wordsPerDay(
  rows: StatsRow[],
  days: number,
  nowMs = Date.now(),
): number[] {
  const todayStart = startOfDay(new Date(nowMs));
  const buckets = new Array<number>(days).fill(0);
  for (const r of rows) {
    const dayStart = startOfDay(new Date(r.created_at));
    const offset = Math.round((todayStart - dayStart) / DAY_MS);
    const idx = days - 1 - offset;
    if (idx >= 0 && idx < days) buckets[idx] += r.word_count;
  }
  return buckets;
}

// 7 rows (Mon..Sun) × 24 cols (hours). Each cell is total words dictated
// in that day/hour bucket across the full set passed in.
export function hourHeatmap(rows: StatsRow[]): number[][] {
  const out: number[][] = Array.from({ length: 7 }, () =>
    new Array(24).fill(0),
  );
  for (const r of rows) {
    const d = new Date(r.created_at);
    const dow = (d.getDay() + 6) % 7;
    out[dow][d.getHours()] += r.word_count;
  }
  return out;
}

const ES_INT_FMT = new Intl.NumberFormat("es-ES");

export function formatThousands(n: number): string {
  return ES_INT_FMT.format(Math.round(n));
}

export function formatCompactWords(n: number): string {
  const rounded = Math.round(n);
  if (rounded < 1000) return formatThousands(rounded);
  const k = rounded / 1000;
  if (k < 10) return `${k.toFixed(1).replace(".", ",")}K`;
  if (k < 1000) return `${Math.round(k)}K`;
  return `${(k / 1000).toFixed(1).replace(".", ",")}M`;
}

export function formatDurationHm(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatTodayEs(now = new Date()): string {
  const weekday = now.toLocaleDateString("es-ES", { weekday: "long" });
  const day = now.getDate();
  const month = now.toLocaleDateString("es-ES", { month: "long" });
  return `${weekday} ${day} de ${month}`;
}
