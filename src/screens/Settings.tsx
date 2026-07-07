import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  IconAa,
  IconArrowDn,
  IconCheck,
  IconCog,
  IconDownload,
  IconGlobe,
  IconHeadset,
  IconKey,
  IconLock,
  IconShield,
} from "../components/Icons";
import { Btn, Card, NavItem, Pill, ProTag, Waveform, inputStyle } from "../components/Ui";
import { ShortcutSelect, useShortcutsConfig } from "../components/ShortcutSelect";
import {
  listAllTranscriptions,
  listDictionaryEntries,
} from "../lib/db";
import { addInstalledTier, getInstalledTiers, resetOnboarding } from "../state/onboarding";
import { downloadWhisperModel, type ProgressEvent } from "../lib/tauri";
import {
  getAutopaste,
  getSounds,
  getStoreLocal,
  getTranscriptFont,
  setAutopaste,
  setSounds,
  setStoreLocal,
  setTranscriptFont,
  TEXT_SCALES,
  type TranscriptFont,
} from "../state/preferences";
import {
  THEMES,
  isPremiumTheme,
  type ThemeId,
  type ThemeMode,
} from "../state/theme";
import { TIERS, findTier, tierForFile } from "../state/tiers";
import {
  PURCHASE_URL,
  hasPremium,
  maskKey,
  trialDaysLeft,
  type LicenseState,
} from "../state/license";
import { openUrl } from "../lib/tauri";

import { LANGUAGES } from "../state/languages";

const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string; icon: ReactNode }> = [
  { id: "general", label: "General", icon: <IconCog size={15} /> },
  { id: "personalizacion", label: "Personalización", icon: <IconAa size={15} /> },
  { id: "audio", label: "Audio y micrófono", icon: <IconHeadset size={15} /> },
  { id: "model", label: "Modelo local", icon: <IconShield size={15} /> },
  { id: "languages", label: "Idiomas", icon: <IconGlobe size={15} /> },
  { id: "shortcuts", label: "Atajos", icon: <IconKey size={15} /> },
  { id: "license", label: "Licencia", icon: <IconShield size={15} /> },
  { id: "privacy", label: "Privacidad", icon: <IconLock size={15} /> },
];

export type SettingsSection =
  | "general"
  | "personalizacion"
  | "audio"
  | "model"
  | "languages"
  | "shortcuts"
  | "license"
  | "privacy";

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        position: "relative",
        width: 38,
        height: 22,
        borderRadius: 999,
        border: 0,
        background: on ? "var(--good)" : "rgba(0,0,0,.15)",
        transition: "background .15s",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.2)",
          transition: "left .15s",
        }}
      />
    </button>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 24,
        padding: "16px 22px",
        borderBottom: "1px solid var(--line-2)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-3)",
              marginTop: 3,
              lineHeight: 1.5,
              maxWidth: 480,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div
        style={{ flexShrink: 0, display: "flex", alignItems: "center" }}
      >
        {children}
      </div>
    </div>
  );
}

// Used for features we haven't built yet but want to keep visible in the UI.
// The control is rendered greyed-out and non-interactive, and the label
// carries a "Próximamente" Pill so it's immediately clear nothing happens.
function ComingSoonRow({
  label,
  hint,
  preview,
}: {
  label: ReactNode;
  hint?: ReactNode;
  preview: ReactNode;
}) {
  return (
    <Row
      label={
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {label}
          <Pill>Próximamente</Pill>
        </span>
      }
      hint={hint}
    >
      <div style={{ opacity: 0.4, pointerEvents: "none" }}>{preview}</div>
    </Row>
  );
}

function SectionHead({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        padding: "18px 22px 14px",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--ink-3)",
            marginTop: 4,
            lineHeight: 1.5,
            maxWidth: 580,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function SettingsScreen({
  activeModelFile,
  onModelChange,
  onClearHistory,
  language = "auto",
  onLanguageChange,
  micDeviceId = null,
  onMicChange,
  theme = "arena",
  onThemeChange,
  mode = "light",
  onModeChange,
  textScale = 1.0,
  onTextScaleChange,
  initialSection = "general",
  licenseState,
  onActivateLicense,
  onDeactivateLicense,
}: {
  activeModelFile?: string;
  onModelChange?: (file: string) => void;
  onClearHistory?: () => void | Promise<void>;
  language?: string;
  onLanguageChange?: (code: string) => void;
  micDeviceId?: string | null;
  onMicChange?: (id: string | null) => void;
  theme?: ThemeId;
  onThemeChange?: (id: ThemeId) => void;
  mode?: ThemeMode;
  onModeChange?: (m: ThemeMode) => void;
  textScale?: number;
  onTextScaleChange?: (n: number) => void;
  initialSection?: SettingsSection;
  licenseState?: LicenseState | null;
  onActivateLicense?: () => void;
  onDeactivateLicense?: () => Promise<void> | void;
} = {}) {
  const activeTierId = activeModelFile ? tierForFile(activeModelFile) : null;
  const activeTier = activeTierId ? findTier(activeTierId) : null;
  // Premium (trial or active key) unlocks the arena/bosque themes. Pizarra is
  // always free. Non-premium clicks on a locked theme open the license modal.
  const premium = licenseState ? hasPremium(licenseState) : false;
  const [section, setSection] = useState<SettingsSection>(initialSection);
  // Persisted prefs are read once on mount; the setters below update local
  // state (for the UI) and write to localStorage (for the recorder to read
  // on the next dictation).
  const [autopaste, setAutopasteState] = useState(() => getAutopaste());
  const [storeLocal, setStoreLocalState] = useState(() => getStoreLocal());
  const [sounds, setSoundsState] = useState(() => getSounds());
  const [font, setFontState] = useState<TranscriptFont>(() => getTranscriptFont());
  const shortcuts = useShortcutsConfig();

  const persistAutopaste = (v: boolean) => {
    setAutopasteState(v);
    setAutopaste(v);
  };
  const persistStoreLocal = (v: boolean) => {
    setStoreLocalState(v);
    setStoreLocal(v);
  };
  const persistSounds = (v: boolean) => {
    setSoundsState(v);
    setSounds(v);
  };
  const persistFont = (v: TranscriptFont) => {
    setFontState(v);
    setTranscriptFont(v);
    document.body.setAttribute("data-font", v);
  };

  const [installedTiers, setInstalledTiers] = useState<string[]>(() =>
    getInstalledTiers(),
  );

  type DownloadState = { pct: number; status: "downloading" | "error"; errMsg?: string };
  const [downloading, setDownloading] = useState<Map<string, DownloadState>>(
    new Map(),
  );

  const startDownload = (tierId: string) => {
    const tier = TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    setDownloading((prev) => {
      const next = new Map(prev);
      next.set(tierId, { pct: 0, status: "downloading" });
      return next;
    });
    const catalogBytes = Math.round(tier.sizeGb * 1_073_741_824);
    let total = catalogBytes;
    downloadWhisperModel(tier.fileName, tier.url, (event: ProgressEvent) => {
      if (event.kind === "started" && event.total_bytes) total = event.total_bytes;
      if (event.kind === "progress") {
        if (event.total_bytes) total = event.total_bytes;
        const pct = Math.min(99, Math.round((event.downloaded / total) * 100));
        setDownloading((prev) => {
          const next = new Map(prev);
          next.set(tierId, { pct, status: "downloading" });
          return next;
        });
      }
      if (event.kind === "error") {
        setDownloading((prev) => {
          const next = new Map(prev);
          next.set(tierId, { pct: 0, status: "error", errMsg: event.message });
          return next;
        });
      }
    }).then(() => {
      addInstalledTier(tierId);
      setInstalledTiers(getInstalledTiers());
      setDownloading((prev) => {
        const next = new Map(prev);
        next.delete(tierId);
        return next;
      });
    }).catch((e: unknown) => {
      setDownloading((prev) => {
        const next = new Map(prev);
        next.set(tierId, { pct: 0, status: "error", errMsg: e instanceof Error ? e.message : String(e) });
        return next;
      });
    });
  };

  const handleClearHistory = async () => {
    if (!onClearHistory) return;
    const ok = window.confirm(
      "¿Borrar todo el historial de transcripciones? Esta acción no se puede deshacer.",
    );
    if (!ok) return;
    await onClearHistory();
  };

  // Audio input devices. Empty until the browser yields labels — those only
  // arrive once we've had at least one getUserMedia call (the recorder
  // pre-warms on app start, so by the time the user opens Settings labels
  // are usually populated).
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      navigator.mediaDevices
        ?.enumerateDevices()
        .then((devices) => {
          if (cancelled) return;
          setMics(devices.filter((d) => d.kind === "audioinput"));
        })
        .catch(() => {
          /* no permission yet — leave list empty */
        });
    };
    refresh();
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener("devicechange", refresh);
    };
  }, []);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const [transcriptions, dictionary] = await Promise.all([
        listAllTranscriptions(),
        listDictionaryEntries(),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        version: 1,
        transcriptions,
        dictionary,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `local-whisper-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("export failed", err);
      window.alert("No se pudo exportar. Mira la consola para más detalles.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      style={{
        padding: "24px 28px 40px",
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        height: "100%",
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
          Ajustes
        </h2>
        <p
          style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)" }}
        >
          Personaliza Local Whisper. Los cambios se guardan automáticamente.
        </p>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: 18,
        }}
      >
        <Card padding={8}>
          <nav
            style={{ display: "flex", flexDirection: "column", gap: 1 }}
          >
            {SETTINGS_SECTIONS.map((s) => (
              <NavItem
                key={s.id}
                icon={s.icon}
                label={s.label}
                active={section === s.id}
                onClick={() => setSection(s.id)}
              />
            ))}
          </nav>
        </Card>

        <div className="scroll" style={{ overflowY: "auto", minWidth: 0 }}>
          {section === "general" && (
            <Card padding={0}>
              <SectionHead title="General" />
              <ComingSoonRow
                label="Abrir al iniciar sesión"
                hint="Local Whisper estará disponible nada más arrancar tu Mac."
                preview={<Toggle on={false} onChange={() => {}} />}
              />
              <Row
                label="Sonidos"
                hint="Reproduce un ‘pop’ al empezar y terminar la grabación."
              >
                <Toggle on={sounds} onChange={persistSounds} />
              </Row>
              <Row
                label="Pegar automáticamente"
                hint="Inserta el texto en la app activa al terminar de transcribir."
              >
                <Toggle on={autopaste} onChange={persistAutopaste} />
              </Row>
              <Row
                label="Ver la introducción otra vez"
                hint="Repite la bienvenida completa: nombre, atajo, diccionario, tema y modelo. No pierdes tu historial ni tu licencia."
              >
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetOnboarding();
                    window.dispatchEvent(new CustomEvent("replay-onboarding"));
                  }}
                >
                  Reiniciar
                </Btn>
              </Row>
            </Card>
          )}

          {section === "personalizacion" && (
            <Card padding={0}>
              <SectionHead title="Personalización" />
              <Row
                label="Modo"
                hint="Alterna entre paleta clara y oscura."
              >
                <div
                  style={{
                    display: "inline-flex",
                    gap: 4,
                    padding: 4,
                    background: "var(--sidebar-2)",
                    borderRadius: 8,
                  }}
                >
                  {(["light", "dark"] as ThemeMode[]).map((m) => {
                    const active = mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => onModeChange?.(m)}
                        style={{
                          height: 30,
                          padding: "0 16px",
                          border: 0,
                          background: active ? "var(--surface)" : "transparent",
                          color: active ? "var(--ink)" : "var(--ink-3)",
                          fontSize: 12.5,
                          fontWeight: 500,
                          borderRadius: 6,
                          cursor: "pointer",
                          boxShadow: active ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                        }}
                      >
                        {m === "light" ? "Claro" : "Oscuro"}
                      </button>
                    );
                  })}
                </div>
              </Row>
              <Row
                label="Tamaño del texto"
                hint="Aumenta o reduce el tamaño de toda la interfaz."
              >
                <div style={{ display: "flex", gap: 6 }}>
                  {TEXT_SCALES.map((s) => {
                    const active = Math.abs(textScale - s.value) < 0.01;
                    return (
                      <button
                        key={s.value}
                        onClick={() => onTextScaleChange?.(s.value)}
                        title={s.label}
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                          padding: "0 14px",
                          height: 52,
                          borderRadius: 7,
                          border: `1px solid ${
                            active ? "var(--accent)" : "var(--line)"
                          }`,
                          background: active
                            ? "var(--accent)"
                            : "var(--surface)",
                          color: active
                            ? "var(--accent-ink)"
                            : "var(--ink-2)",
                          fontWeight: 500,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: Math.round(11 + (s.value - 0.9) * 14),
                            lineHeight: 1,
                          }}
                        >
                          Aa
                        </span>
                        <span style={{ fontSize: 10.5, opacity: 0.8 }}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Row>
              <Row
                label="Tipografía del historial"
                hint="Cómo se lee el texto de tus transcripciones."
              >
                <div
                  style={{
                    display: "inline-flex",
                    gap: 4,
                    padding: 4,
                    background: "var(--sidebar-2)",
                    borderRadius: 8,
                  }}
                >
                  {(["sans", "mono"] as TranscriptFont[]).map((f) => {
                    const active = font === f;
                    return (
                      <button
                        key={f}
                        onClick={() => persistFont(f)}
                        style={{
                          height: 30,
                          padding: "0 16px",
                          border: 0,
                          background: active ? "var(--surface)" : "transparent",
                          color: active ? "var(--ink)" : "var(--ink-3)",
                          fontSize: 12.5,
                          fontWeight: 500,
                          borderRadius: 6,
                          cursor: "pointer",
                          fontFamily:
                            f === "mono" ? "'JetBrains Mono', monospace" : "inherit",
                          boxShadow: active ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                        }}
                      >
                        {f === "sans" ? "Sans" : "Mono"}
                      </button>
                    );
                  })}
                </div>
              </Row>
              <div
                style={{
                  padding: "16px 22px",
                  borderBottom: "1px solid var(--line-2)",
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>
                  Tema
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-3)",
                    marginTop: 3,
                    lineHeight: 1.5,
                    maxWidth: 480,
                  }}
                >
                  Cambia la paleta de colores de la aplicación. El cambio se
                  aplica al instante.
                </div>
                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {THEMES.map((t) => {
                    const active = theme === t.id;
                    const bg = t.preview[mode].bg;
                    const locked = isPremiumTheme(t.id) && !premium;
                    return (
                      <button
                        key={t.id}
                        onClick={() =>
                          locked ? onActivateLicense?.() : onThemeChange?.(t.id)
                        }
                        title={locked ? `${t.label} · función premium` : t.label}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "stretch",
                          gap: 8,
                          padding: 0,
                          borderRadius: 10,
                          border: `2px solid ${
                            active ? "var(--accent)" : "var(--line)"
                          }`,
                          background: "var(--surface)",
                          cursor: "pointer",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: 44,
                            background: bg,
                            position: "relative",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              right: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: t.accent,
                              boxShadow: "0 0 0 2px rgba(0,0,0,.04)",
                            }}
                          />
                          {isPremiumTheme(t.id) && (
                            <ProTag
                              style={{ position: "absolute", top: 6, left: 6 }}
                            />
                          )}
                          {locked && (
                            <span
                              style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(0,0,0,.28)",
                                color: "#fff",
                              }}
                            >
                              <IconLock size={15} />
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 500,
                            color: mode === "dark" ? "#ffffff" : active ? "var(--accent)" : "var(--ink-2)",
                            textAlign: "center",
                            padding: "4px 6px 8px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {t.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {section === "audio" && (
            <Card padding={0}>
              <SectionHead title="Audio y micrófono" />
              <Row
                label="Micrófono"
                hint={
                  mics.length === 0
                    ? "Aún no hay dispositivos detectados. Otorga permiso al micrófono para listarlos."
                    : "Local Whisper escucha desde este dispositivo."
                }
              >
                <select
                  value={micDeviceId ?? ""}
                  onChange={(e) =>
                    onMicChange?.(e.target.value === "" ? null : e.target.value)
                  }
                  style={{ ...inputStyle(), width: 280 }}
                >
                  <option value="">Predeterminado del sistema</option>
                  {mics.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Micrófono ${i + 1}`}
                    </option>
                  ))}
                </select>
              </Row>
              <Row
                label="Nivel de entrada"
                hint="Calibrado automáticamente. Habla ahora para probar."
              >
                <div style={{ width: 220 }}>
                  <Waveform
                    active
                    count={28}
                    height={20}
                    color="var(--accent)"
                  />
                </div>
              </Row>
              <ComingSoonRow
                label="Eliminar silencios largos"
                hint="Recorta pausas de más de 1,5 segundos antes de transcribir."
                preview={<Toggle on={false} onChange={() => {}} />}
              />
            </Card>
          )}

          {section === "model" && (
            <>
              <Card padding={0}>
                <SectionHead title="Modelo activo" />
                <div style={{ padding: 22 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 24,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 10,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span className="live-dot" />
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            letterSpacing: ".05em",
                            textTransform: "uppercase",
                            color: "var(--good)",
                          }}
                        >
                          En ejecución
                        </span>
                      </div>
                      <div
                        className="serif"
                        style={{
                          fontSize: 28,
                          color: "var(--ink)",
                          letterSpacing: "-.01em",
                          marginBottom: 4,
                        }}
                      >
                        {activeTier?.label ?? "Modelo local"}
                      </div>
                      <div
                        style={{ fontSize: 13, color: "var(--ink-2)" }}
                      >
                        {activeTier
                          ? `${activeTier.sizeGb.toFixed(1).replace(".", ",")} GB en disco · 99 idiomas · optimizado para Apple Silicon`
                          : "Sin modelo seleccionado"}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div style={{ height: 18 }} />

              <Card padding={0}>
                <SectionHead
                  title="Modelos disponibles"
                  subtitle="Cambia entre modelos al vuelo según necesites velocidad o precisión."
                />
                {/* Header row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px 80px 90px 1fr 120px",
                    gap: 12,
                    padding: "6px 22px 8px",
                    borderBottom: "1px solid var(--line-2)",
                  }}
                >
                  {["Modelo", "Tamaño", "Velocidad", "Precisión", ""].map((h) => (
                    <div
                      key={h}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        color: "var(--ink-3)",
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
                {TIERS.map((tier, idx) => {
                  const sizeMb = Math.round(tier.sizeGb * 1024);
                  const size =
                    sizeMb >= 1024
                      ? `${tier.sizeGb.toFixed(1).replace(".", ",")} GB`
                      : `${sizeMb} MB`;
                  const speed =
                    tier.id === "small"
                      ? "Rápido"
                      : tier.id === "medium"
                        ? "Medio"
                        : "Lento";
                  const acc =
                    tier.id === "small"
                      ? "Buena"
                      : tier.id === "medium"
                        ? "Muy buena"
                        : "Excelente";
                  const active = activeTier?.id === tier.id;
                  const installed = installedTiers.includes(tier.id);
                  const dl = downloading.get(tier.id);
                  const isLast = idx === TIERS.length - 1;
                  return (
                    <div key={tier.id}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "160px 80px 90px 1fr 120px",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 22px",
                          borderBottom: isLast ? "none" : "1px solid var(--line-2)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 500,
                              color: "var(--ink)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tier.label}
                          </span>
                          {active && <Pill tone="accent">Activo</Pill>}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-2)", whiteSpace: "nowrap" }}>
                          {size}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-2)", whiteSpace: "nowrap" }}>
                          {speed}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                          {acc}
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          {active ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--good)" }}>
                              <IconCheck size={12} /> En uso
                            </span>
                          ) : dl ? (
                            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                              {dl.status === "error" ? (
                                <Btn variant="ghost" size="sm" onClick={() => startDownload(tier.id)}>
                                  Reintentar
                                </Btn>
                              ) : (
                                `${dl.pct} %`
                              )}
                            </span>
                          ) : installed ? (
                            <Btn
                              variant="ghost"
                              size="sm"
                              onClick={() => onModelChange?.(tier.fileName)}
                            >
                              Activar
                            </Btn>
                          ) : (
                            <Btn
                              variant="ghost"
                              size="sm"
                              onClick={() => startDownload(tier.id)}
                            >
                              <IconDownload size={12} /> Descargar
                            </Btn>
                          )}
                        </div>
                      </div>
                      {dl?.status === "downloading" && (
                        <div style={{ padding: "0 22px 10px", marginTop: -6 }}>
                          <div
                            style={{
                              height: 3,
                              borderRadius: 2,
                              background: "var(--line-2)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${dl.pct}%`,
                                background: "var(--accent)",
                                borderRadius: 2,
                                transition: "width .3s ease",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Card>

              <div style={{ height: 18 }} />

              <Card padding={0}>
                <SectionHead title="Procesado" />
                <ComingSoonRow
                  label="Diarización (separar hablantes)"
                  hint="Identifica quién habla en grabaciones con varias voces."
                  preview={<Toggle on={false} onChange={() => {}} />}
                />
              </Card>
            </>
          )}

          {section === "languages" && (
            <Card padding={0}>
              <SectionHead
                title="Idioma de dictado"
                subtitle="Indica al modelo qué idioma vas a hablar. La opción automática deja que whisper lo detecte, lo cual cuesta un poco más en cada transcripción."
              />
              <Row
                label="Idioma"
                hint="Aplica al próximo dictado. No es necesario reiniciar."
              >
                <select
                  value={language}
                  onChange={(e) => onLanguageChange?.(e.target.value)}
                  style={{ ...inputStyle(), width: 240 }}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Row>
            </Card>
          )}

          {section === "shortcuts" && (
            <Card padding={0}>
              <SectionHead
                title="Atajos de teclado"
                subtitle="Los dos funcionan a la vez y se aplican al instante. Si una combinación ya está en uso por otra app, te avisamos."
              />
              <Row
                label="Pulsar para dictar"
                hint="Un toque para empezar a grabar y otro para terminar, desde cualquier app."
              >
                <ShortcutSelect
                  value={shortcuts.toggleAccel}
                  onChange={shortcuts.setToggle}
                  exclude={shortcuts.holdAccel}
                />
              </Row>
              <Row
                label="Mantener pulsado para dictar"
                hint="Dictas mientras lo sostienes; al soltarlo se transcribe. Elige «Ninguno» si no lo quieres."
              >
                <ShortcutSelect
                  value={shortcuts.holdAccel}
                  onChange={shortcuts.setHold}
                  exclude={shortcuts.toggleAccel}
                  allowNone
                />
              </Row>
              {shortcuts.error && (
                <div style={{ padding: "10px 20px 16px" }}>
                  <span style={{ fontSize: 12.5, color: "var(--danger)" }}>
                    {shortcuts.error}
                  </span>
                </div>
              )}
            </Card>
          )}

          {section === "license" && (
            <Card padding={0}>
              <SectionHead title="Licencia" />
              {!licenseState ? (
                <Row label="Estado" hint="Cargando información de licencia…">
                  <Pill>—</Pill>
                </Row>
              ) : licenseState.status === "active" ? (
                <>
                  <Row
                    label="Estado"
                    hint="Tu licencia está activa en este equipo."
                  >
                    <Pill tone="good">Activa</Pill>
                  </Row>
                  <Row label="Clave" hint="Por seguridad solo mostramos parte.">
                    <span
                      className="mono"
                      style={{ fontSize: 13, color: "var(--ink-2)" }}
                    >
                      {licenseState.key ? maskKey(licenseState.key) : "—"}
                    </span>
                  </Row>
                  {licenseState.activation_limit != null && (
                    <Row
                      label="Equipos activados"
                      hint="Puedes liberar este equipo si quieres usar la licencia en otro."
                    >
                      <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                        {licenseState.activation_usage ?? "?"} /{" "}
                        {licenseState.activation_limit}
                      </span>
                    </Row>
                  )}
                  <Row
                    label="Desactivar este equipo"
                    hint="Libera una activación para usarla en otro Mac."
                  >
                    <button
                      onClick={() => void onDeactivateLicense?.()}
                      style={{
                        height: 32,
                        padding: "0 14px",
                        borderRadius: 7,
                        border:
                          "1px solid color-mix(in oklch, var(--danger) 35%, transparent)",
                        background: "transparent",
                        color: "var(--danger)",
                        fontSize: 12.5,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Desactivar
                    </button>
                  </Row>
                </>
              ) : (
                <>
                  <Row
                    label="Estado"
                    hint={
                      licenseState.status === "trial"
                        ? `Estás en el periodo de prueba. Te quedan ${Math.max(
                            0,
                            trialDaysLeft(licenseState),
                          )} días.`
                        : licenseState.status === "invalid"
                          ? "Tu clave ya no es válida. Introduce otra o adquiere una nueva."
                          : "El periodo de prueba ha terminado."
                    }
                  >
                    <Pill
                      tone={
                        licenseState.status === "trial" ? "accent" : "danger"
                      }
                    >
                      {licenseState.status === "trial"
                        ? "Prueba"
                        : licenseState.status === "invalid"
                          ? "Inválida"
                          : "Expirada"}
                    </Pill>
                  </Row>
                  <Row
                    label="Activar licencia"
                    hint="Si ya compraste, introduce aquí la clave que recibiste por email."
                  >
                    <Btn
                      variant="primary"
                      size="sm"
                      onClick={() => onActivateLicense?.()}
                    >
                      Introducir clave
                    </Btn>
                  </Row>
                  <Row
                    label="Comprar licencia"
                    hint="Pago único desde 29 €. Elige 1, 2 o 3 equipos en la web."
                  >
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => void openUrl(PURCHASE_URL)}
                    >
                      Comprar
                    </Btn>
                  </Row>
                </>
              )}
            </Card>
          )}

          {section === "privacy" && (
            <>
              <Card
                padding={22}
                style={{
                  background:
                    "color-mix(in oklch, var(--good) 8%, var(--surface))",
                  border:
                    "1px solid color-mix(in oklch, var(--good) 25%, var(--line))",
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(79,125,80,.15)",
                      color: "var(--good)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconShield size={18} />
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink)",
                        marginBottom: 4,
                      }}
                    >
                      Todo se procesa en tu Mac
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--ink-2)",
                        lineHeight: 1.55,
                        maxWidth: 520,
                      }}
                    >
                      Local Whisper nunca envía tus grabaciones ni transcripciones
                      a un servidor. Todo el historial vive en una base
                      SQLite local en tu carpeta de Aplicación.
                    </div>
                  </div>
                </div>
              </Card>

              <Card padding={0}>
                <SectionHead title="Datos" />
                <Row
                  label="Guardar transcripciones en este Mac"
                  hint="Si está activado, podrás consultar tu historial en la pestaña Inicio."
                >
                  <Toggle on={storeLocal} onChange={persistStoreLocal} />
                </Row>
                <Row
                  label="Eliminar grabaciones después de transcribir"
                  hint="Local Whisper nunca almacena el audio crudo — sólo el texto resultante."
                >
                  <Pill tone="good">Siempre activo</Pill>
                </Row>
                <Row
                  label="Borrar todo el historial"
                  hint="No se puede deshacer."
                >
                  <button
                    onClick={handleClearHistory}
                    style={{
                      height: 32,
                      padding: "0 14px",
                      borderRadius: 7,
                      border:
                        "1px solid color-mix(in oklch, var(--danger) 35%, transparent)",
                      background: "transparent",
                      color: "var(--danger)",
                      fontSize: 12.5,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Borrar historial
                  </button>
                </Row>
                <Row
                  label="Exportar todos mis datos"
                  hint="Descarga un archivo JSON con tu diccionario y todas las transcripciones."
                >
                  <Btn
                    variant="ghost"
                    size="sm"
                    icon={<IconArrowDn size={12} />}
                    onClick={handleExport}
                    disabled={exporting}
                  >
                    {exporting ? "Exportando…" : "Exportar"}
                  </Btn>
                </Row>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
