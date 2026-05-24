import { IconMic, IconX } from "./Icons";
import { Kbd, Waveform } from "./Ui";

export function TopBar({
  title,
  recording,
  transcribing,
  recordingDuration,
  status,
  onToggleRecord,
}: {
  title: string;
  recording: boolean;
  transcribing: boolean;
  recordingDuration: string;
  status?: string;
  onToggleRecord: () => void;
}) {
  const accentLook = recording || transcribing;
  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        borderBottom: "1px solid var(--line-2)",
        background: "var(--bg)",
      }}
    >
      {/* Inner wrapper mirrors the content max-width so the title and
          recording pill align with the column below ("Bienvenido, Pol" and
          the date). Without this the header items would sit flush against
          the window edges while the content centers inside 1280px. */}
      <div
        style={{
          height: "100%",
          maxWidth: "var(--content-max)",
          margin: "0 auto",
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-.01em",
            }}
          >
            {title}
          </h1>
          {status && (
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {status}
            </span>
          )}
        </div>

        <button
          onClick={onToggleRecord}
          disabled={transcribing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "0 12px 0 10px",
            height: 32,
            background: accentLook ? "var(--accent)" : "var(--surface)",
            color: accentLook ? "var(--accent-ink)" : "var(--ink)",
            border: `1px solid ${accentLook ? "var(--accent)" : "var(--line)"}`,
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
            cursor: transcribing ? "default" : "pointer",
            transition: "background .15s, color .15s, border-color .15s",
          }}
        >
          {transcribing ? (
            <>
              <TopBarSpinner />
              <span>Transcribiendo…</span>
            </>
          ) : recording ? (
            <>
              <Waveform active count={5} height={14} color="currentColor" />
              <span>Grabando · {recordingDuration}</span>
              <IconX size={13} />
            </>
          ) : (
            <>
              <IconMic size={14} />
              <span>Dictar</span>
              <span style={{ display: "inline-flex", gap: 3, marginLeft: 4 }}>
                <Kbd>⌥</Kbd>
                <Kbd>Espacio</Kbd>
              </span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}

function TopBarSpinner() {
  return (
    <>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "1.5px solid rgba(255,255,255,.35)",
          borderTopColor: "var(--accent-ink)",
          animation: "spin-topbar 0.8s linear infinite",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <style>{`@keyframes spin-topbar { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
