import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

type Phase = "preparing" | "recording" | "transcribing" | "idle";

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RecordingOverlay() {
  const [phase, setPhase] = useState<Phase>("preparing");
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTimer = () => {
    setElapsed(0);
    stopTimer();
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  useEffect(() => {
    invoke("raise_overlay").catch(() => {});

    const unlisten = listen<{ phase: Phase }>("overlay-state", (event) => {
      const next = event.payload.phase;
      setPhase(next);
      if (next === "recording") startTimer();
      else stopTimer();
    });

    return () => {
      stopTimer();
      unlisten.then((fn) => fn());
    };
  }, []);

  // Pill colors swap depending on the phase. While preparing the pill is
  // neutral (cream + dark text) to make it clear the mic isn't capturing yet;
  // once recording starts the pill flips to the accent color.
  const isRecording = phase === "recording";
  const isTranscribing = phase === "transcribing";
  const isAccentPhase = isRecording || isTranscribing;

  const pillStyle: React.CSSProperties = isAccentPhase
    ? {
        background: "var(--accent)",
        color: "var(--accent-ink)",
        border: "none",
      }
    : {
        background: "#fbf8f3",
        color: "var(--ink)",
        border: "1px solid rgba(42, 38, 32, 0.08)",
      };

  // Timer/sub-text: derive from --accent-ink so it stays legible whatever the
  // accent is. A hardcoded white vanished on light accents (mono/océano).
  const subTextColor = isAccentPhase
    ? "var(--accent-ink)"
    : "rgba(42, 38, 32, 0.55)";

  const label = isRecording
    ? "Grabando"
    : isTranscribing
      ? "Transcribiendo"
      : "Preparando";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
          height: 56,
          borderRadius: 999,
          userSelect: "none",
          cursor: "default",
          ...pillStyle,
        }}
      >
        {isRecording ? (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent-ink)",
              boxShadow: "0 0 0 3px rgba(255, 255, 255, 0.22)",
              animation: "pulse-rec 1.4s ease-in-out infinite",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
        ) : (
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              border: `2px solid ${
                isAccentPhase
                  ? "rgba(255, 255, 255, 0.3)"
                  : "rgba(42, 38, 32, 0.18)"
              }`,
              borderTopColor: isAccentPhase
                ? "var(--accent-ink)"
                : "var(--ink-2)",
              animation: "spin-rec 0.8s linear infinite",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            fontFamily: '"DM Sans", system-ui, sans-serif',
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </span>
        {isRecording && (
          <span
            style={{
              color: subTextColor,
              opacity: isAccentPhase ? 0.72 : 1,
              fontSize: 13,
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmt(elapsed)}
          </span>
        )}
      </div>
      <style>{`
        @keyframes pulse-rec {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.25); }
        }
        @keyframes spin-rec {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
