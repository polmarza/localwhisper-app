import { useEffect, useMemo, useRef, useState } from "react";
import { IconCheck, IconCopy } from "../components/Icons";
import { HeroBanner } from "../components/HeroBanner";
import { Card, Pill, inputStyle } from "../components/Ui";
import {
  addDictionaryEntry,
  listAllForStats,
  listTranscriptions,
  type StatsRow,
  type TranscriptionRow,
} from "../lib/db";
import { pickBanner, type BannerContext } from "../lib/banners";
import {
  averageWpm,
  currentStreakDays,
  filterCurrentWeek,
  formatDurationHm,
  formatThousands,
  formatTodayEs,
  timeSavedMs,
  totalWords,
} from "../lib/stats";
import type { Screen } from "../App";
import type { SettingsSection } from "./Settings";

type Transcript = {
  id: string;
  when: string;
  time: string;
  app: string;
  duration: string;
  words: number;
  text: string;
};

function groupLabel(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const target = startOfDay(date);
  const today = startOfDay(now);
  if (target === today) return "Hoy";
  if (target === today - 86_400_000) return "Ayer";
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationLabel(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function rowToTranscript(row: TranscriptionRow): Transcript {
  return {
    id: String(row.id),
    when: groupLabel(row.created_at),
    time: timeLabel(row.created_at),
    app: row.app ?? "",
    duration: durationLabel(row.duration_ms),
    words: row.word_count,
    text: row.text,
  };
}

type SelectionInfo = {
  term: string;
  // viewport coordinates of the bottom-center of the selection rect
  x: number;
  y: number;
};

function DictionaryPopover({
  initialTerm,
  anchor,
  onSave,
  onClose,
}: {
  initialTerm: string;
  anchor: { x: number; y: number };
  onSave: (term: string, replacement: string) => Promise<void>;
  onClose: () => void;
}) {
  const [term, setTerm] = useState(initialTerm);
  const [replacement, setReplacement] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const replacementRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the replacement input on open — the term comes pre-filled from
    // the selection so the user always types the correction.
    replacementRef.current?.focus();
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const submit = async () => {
    const t = term.trim();
    const r = replacement.trim();
    if (!t || !r || busy) return;
    setBusy(true);
    try {
      await onSave(t, r);
    } finally {
      setBusy(false);
    }
  };

  const POPOVER_WIDTH = 440;
  const left = Math.max(
    12,
    Math.min(anchor.x - POPOVER_WIDTH / 2, window.innerWidth - POPOVER_WIDTH - 12),
  );
  const top = Math.min(anchor.y + 8, window.innerHeight - 80);

  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top,
        left,
        width: POPOVER_WIDTH,
        zIndex: 1000,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        boxShadow: "0 10px 30px rgba(0,0,0,.14)",
        padding: 12,
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Cuando oigas"
        className="mono"
        style={{ ...inputStyle(), flex: 1, height: 32 }}
      />
      <span style={{ color: "var(--ink-3)", fontSize: 14 }}>→</span>
      <input
        ref={replacementRef}
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder="Escribe"
        style={{ ...inputStyle(), flex: 1, height: 32 }}
      />
      <button
        onClick={submit}
        disabled={busy || !term.trim() || !replacement.trim()}
        style={{
          height: 32,
          padding: "0 14px",
          borderRadius: 6,
          border: 0,
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontSize: 13,
          fontWeight: 500,
          opacity: busy || !term.trim() || !replacement.trim() ? 0.55 : 1,
          whiteSpace: "nowrap",
        }}
      >
        Guardar
      </button>
    </div>
  );
}

function TranscriptItem({
  t,
  onAddToDictionary,
}: {
  t: Transcript;
  onAddToDictionary: (term: string, replacement: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(t.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  // We listen on mouseup *and* selectionchange so a selection that finishes
  // outside the text node (drag past the end of the line) still registers.
  const captureSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelection(null);
      return;
    }
    const txt = sel.toString().trim();
    if (!txt) {
      setSelection(null);
      return;
    }
    const node = sel.anchorNode;
    if (!node || !textRef.current?.contains(node)) {
      // Selection started elsewhere — don't pop up over another transcript.
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setSelection({
      term: txt,
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    });
  };

  const onTextMouseUp = () => {
    // Defer to next tick so the browser has committed the selection.
    setTimeout(captureSelection, 0);
  };

  const handleAdd = async (term: string, replacement: string) => {
    await onAddToDictionary(term, replacement);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "14px 18px",
        display: "grid",
        gridTemplateColumns: "78px 1fr auto",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div style={{ paddingTop: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
          {t.time}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
          {t.duration}
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 7,
          }}
        >
          {t.app && <Pill>{t.app}</Pill>}
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            {t.app ? "· " : ""}
            {t.words} palabras
          </span>
        </div>
        <div
          ref={textRef}
          onMouseUp={onTextMouseUp}
          style={{
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "var(--ink)",
            fontFamily: "var(--transcript-font)",
            textWrap: "pretty",
            whiteSpace: "pre-wrap",
            userSelect: "text",
            cursor: "text",
          }}
        >
          {t.text}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "flex-end",
        }}
      >
        <button
          onClick={onCopy}
          title="Copiar"
          style={{
            width: 28,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 7,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: copied ? "var(--good)" : "var(--ink-2)",
            cursor: "pointer",
          }}
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </button>
      </div>

      {selection && (
        <DictionaryPopover
          initialTerm={selection.term}
          anchor={{ x: selection.x, y: selection.y }}
          onSave={handleAdd}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}

function StatTile({
  value,
  label,
  accent = false,
  hasBorder = true,
}: {
  value: string;
  label: string;
  accent?: boolean;
  hasBorder?: boolean;
}) {
  return (
    <div
      style={{
        padding: "18px 22px",
        borderRight: hasBorder ? "1px solid var(--line-2)" : undefined,
        minWidth: 0,
      }}
    >
      <div
        className="serif"
        style={{
          fontSize: 32,
          lineHeight: 1,
          letterSpacing: "-.02em",
          color: accent ? "var(--accent)" : "var(--ink)",
          marginBottom: 8,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: "var(--ink-2)",
          lineHeight: 1.3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function HomeScreen({
  userName,
  refreshKey = 0,
  modelName = "Modelo local",
  onNavigate,
  onAddToDictionary,
}: {
  userName: string;
  refreshKey?: number;
  modelName?: string;
  onNavigate?: (screen: Screen, settingsSection?: SettingsSection) => void;
  // Provided by App so it writes through the shared dictionary hook (keeps the
  // Dictionary screen + live corrections in sync). Falls back to a direct DB
  // insert if omitted.
  onAddToDictionary?: (term: string, replacement: string) => Promise<void>;
}) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [statsRows, setStatsRows] = useState<StatsRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    listTranscriptions(200)
      .then((rows) => {
        if (cancelled) return;
        setTranscripts(rows.map(rowToTranscript));
      })
      .catch((e) => console.error("listTranscriptions failed", e));
    listAllForStats()
      .then((rows) => {
        if (cancelled) return;
        setStatsRows(rows);
      })
      .catch((e) => console.error("listAllForStats failed", e));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const addToDictionary = async (term: string, replacement: string) => {
    try {
      if (onAddToDictionary) await onAddToDictionary(term, replacement);
      else await addDictionaryEntry({ term, replacement });
    } catch (e) {
      console.error("addDictionaryEntry failed", e);
    }
  };

  const weekRows = useMemo(() => filterCurrentWeek(statsRows), [statsRows]);
  const weekStats = useMemo(
    () => ({
      words: totalWords(weekRows),
      wpm: averageWpm(weekRows),
      savedMs: timeSavedMs(weekRows),
    }),
    [weekRows],
  );
  const streak = useMemo(() => currentStreakDays(statsRows), [statsRows]);
  const todayLabel = useMemo(() => formatTodayEs(), []);

  // Pick a banner based on the user's current stats. `pickBanner` caches the
  // choice across re-mounts within a session, so navigating away and back
  // doesn't shuffle the banner under the user's feet.
  const bannerCtx: BannerContext = useMemo(
    () => ({
      modelTierLabel: modelName,
      weekWords: weekStats.words,
      weekTimeSavedMs: weekStats.savedMs,
      totalTranscriptions: statsRows.length,
    }),
    [modelName, weekStats.words, weekStats.savedMs, statsRows.length],
  );
  const banner = useMemo(() => pickBanner(bannerCtx), [bannerCtx]);

  const groups = useMemo(() => {
    const m = new Map<string, Transcript[]>();
    transcripts.forEach((t) => {
      if (!m.has(t.when)) m.set(t.when, []);
      m.get(t.when)!.push(t);
    });
    return [...m.entries()];
  }, [transcripts]);

  return (
    <div
      style={{
        padding: "24px 28px 40px",
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "-.015em",
            color: "var(--ink)",
            whiteSpace: "nowrap",
          }}
        >
          Bienvenido{userName ? "," : ""}{" "}
          {userName && (
            <span className="serif" style={{ fontSize: 26, fontStyle: "italic" }}>
              {userName}
            </span>
          )}
        </h2>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          {todayLabel}
        </span>
      </div>

      <Card padding={0} style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <StatTile
            value={formatThousands(weekStats.words)}
            label="palabras dictadas esta semana"
          />
          <StatTile
            value={weekStats.wpm > 0 ? String(weekStats.wpm) : "—"}
            label="palabras por minuto"
            accent
          />
          <StatTile
            value={
              weekStats.savedMs > 0
                ? formatDurationHm(weekStats.savedMs)
                : "—"
            }
            label="tiempo ahorrado"
          />
          <StatTile
            value={String(streak)}
            label={streak === 1 ? "día seguido 🔥" : "días seguidos 🔥"}
            hasBorder={false}
          />
        </div>
      </Card>

      <HeroBanner
        badge={banner.badge}
        title={banner.title}
        subtitle={banner.subtitle(bannerCtx)}
        ctaLabel={banner.ctaLabel}
        onCta={() =>
          onNavigate?.(banner.target.screen, banner.target.settingsSection)
        }
        Illustration={banner.Illustration}
      />

      <div style={{ marginTop: 28 }}>
        {groups.map(([label, items]) => (
          <div key={label} style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".10em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                padding: "8px 4px 12px",
              }}
            >
              {label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((t) => (
                <TranscriptItem
                  key={t.id}
                  t={t}
                  onAddToDictionary={addToDictionary}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
