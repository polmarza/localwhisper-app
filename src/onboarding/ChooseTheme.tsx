import { useRef } from "react";
import { IconCheck } from "../components/Icons";
import { THEMES, type ThemeId, type ThemeMode } from "../state/theme";

type Props = {
  theme: ThemeId;
  mode: ThemeMode;
  onThemeChange: (id: ThemeId) => void;
  onModeChange: (m: ThemeMode) => void;
  onContinue: () => void;
};

export function ChooseTheme({
  theme,
  mode,
  onThemeChange,
  onModeChange,
  onContinue,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div
      className="onb-step"
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <h1 className="onb-heading serif">Elige tu tema.</h1>
      <p className="onb-sub">
        Podrás cambiarlo desde Ajustes cuando quieras.
      </p>

      <div className="theme-slider">
        <button
          type="button"
          className="theme-slider-arrow"
          aria-label="Anterior"
          onClick={() => scrollBy(-1)}
        >
          ‹
        </button>
        <div className="theme-slider-track" ref={trackRef}>
        {THEMES.map((t) => {
          const active = theme === t.id;
          const bg = t.preview[mode].bg;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onThemeChange(t.id)}
              title={t.label}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 8,
                padding: 0,
                width: 140,
                borderRadius: 12,
                border: `2px solid ${active ? "var(--accent)" : "var(--line)"}`,
                background: "var(--surface)",
                cursor: "pointer",
                overflow: "hidden",
                transition: "border-color .15s",
              }}
            >
              <div
                style={{
                  height: 84,
                  background: bg,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    right: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: t.accent,
                    boxShadow: "0 0 0 2px rgba(0,0,0,.05)",
                  }}
                />
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      left: 8,
                      top: 8,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconCheck size={12} />
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: mode === "dark" ? "#ffffff" : active ? "var(--accent)" : "var(--ink-2)",
                  textAlign: "center",
                  padding: "8px 8px 14px",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </div>
            </button>
          );
        })}
        </div>
        <button
          type="button"
          className="theme-slider-arrow"
          aria-label="Siguiente"
          onClick={() => scrollBy(1)}
        >
          ›
        </button>
      </div>

      <ModeToggle mode={mode} onChange={onModeChange} />

      <button
        type="button"
        className="onb-btn primary"
        onClick={onContinue}
        style={{ marginTop: 18 }}
      >
        Continuar
      </button>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ThemeMode;
  onChange: (m: ThemeMode) => void;
}) {
  const tab = (m: ThemeMode, label: string) => {
    const active = mode === m;
    return (
      <button
        type="button"
        onClick={() => onChange(m)}
        style={{
          height: 34,
          padding: "0 18px",
          border: 0,
          background: active ? "var(--surface)" : "transparent",
          color: active ? "var(--ink)" : "var(--ink-3)",
          fontSize: 13,
          fontWeight: 500,
          borderRadius: 7,
          cursor: "pointer",
          boxShadow: active ? "0 1px 3px rgba(0,0,0,.08)" : "none",
          transition: "background .15s, color .15s",
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        marginTop: 20,
        background: "var(--sidebar-2)",
        borderRadius: 9,
      }}
    >
      {tab("light", "Claro")}
      {tab("dark", "Oscuro")}
    </div>
  );
}
