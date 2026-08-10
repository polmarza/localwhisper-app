import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalPosition } from "@tauri-apps/api/window";
import { MacWindowFrame } from "./components/MacWindow";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { UpdateBanner } from "./components/UpdateBanner";
import { useUpdater } from "./hooks/useUpdater";
import { SupportModal } from "./components/SupportModal";
import { TutorialModal } from "./components/TutorialModal";
import { HomeScreen } from "./screens/Home";
import { InsightsScreen } from "./screens/Insights";
import { DictionaryScreen } from "./screens/Dictionary";
import { HelpScreen } from "./screens/Help";
import { SettingsScreen } from "./screens/Settings";
import { OnboardingFlow } from "./onboarding/OnboardingFlow";
import { formatDuration, useRecorder, type RecorderResult } from "./hooks/useRecorder";
import { pasteText, setShortcut } from "./lib/tauri";
import { getAccelerator } from "./state/shortcuts";
import {
  clearTranscriptions,
  insertTranscription,
  type DictionaryEntry,
} from "./lib/db";
import {
  getSelectedModelFile,
  isOnboardingCompleted,
  isTutorialCompleted,
  markTutorialCompleted,
  setSelectedModelFile,
} from "./state/onboarding";
import {
  getAutopaste,
  getLanguage,
  getMicDeviceId,
  getSidebarWidth,
  getStoreLocal,
  getTextScale,
  getTranscriptFont,
  getUserName,
  bumpDictationCount,
  getSupportDismissed,
  setSupportDismissed,
  SUPPORT_PROMPT_AFTER_DICTATIONS,
  setLanguage,
  setMicDeviceId,
  setSidebarWidth,
  setTextScale,
} from "./state/preferences";
import {
  applyTheme,
  getMode,
  getTheme,
  setMode,
  setTheme,
  type ThemeId,
  type ThemeMode,
} from "./state/theme";
import { findTier, tierForFile } from "./state/tiers";
import { countWords } from "./state/usage";
import { isSupporter } from "./state/license";
import { useLicense } from "./hooks/useLicense";
import { useUsage } from "./hooks/useUsage";
import { useDictionary } from "./hooks/useDictionary";
import { applyDictionary } from "./lib/dictionary";
import type { SettingsSection } from "./screens/Settings";

export type Screen = "home" | "insights" | "dictionary" | "settings" | "help";

const TITLES: Record<Screen, string> = {
  home: "Inicio",
  insights: "Estadísticas",
  dictionary: "Diccionario",
  settings: "Ajustes",
  help: "Ayuda",
};

const FALLBACK_MODEL_FILE = "ggml-large-v3-q5_0.bin";

type AppState =
  | { kind: "checking" }
  | { kind: "onboarding" }
  | { kind: "ready"; modelFile: string };

export function App() {
  const [appState, setAppState] = useState<AppState>({ kind: "checking" });
  const [theme, setThemeState] = useState<ThemeId>(() => getTheme());
  const [mode, setModeState] = useState<ThemeMode>(() => getMode());

  useEffect(() => {
    // Apply the persisted palette before anything renders fully — keeps
    // the splash and onboarding consistent with the user's choice.
    applyTheme(theme, mode);
  }, [theme, mode]);

  useEffect(() => {
    // Persisted transcript-text font (sans/mono) → body[data-font], read by the
    // --transcript-font CSS variable. Applied once on load; Settings updates the
    // attribute directly when the user changes it.
    document.body.setAttribute("data-font", getTranscriptFont());
  }, []);

  useEffect(() => {
    // Rust registra el atajo por defecto al arrancar; aplicamos por encima el
    // guardado del usuario (idempotente si coincide con el default).
    void setShortcut(getAccelerator()).catch(() => {});
  }, []);

  useEffect(() => {
    if (isOnboardingCompleted()) {
      const stored = getSelectedModelFile() ?? FALLBACK_MODEL_FILE;
      setAppState({ kind: "ready", modelFile: stored });
    } else {
      setAppState({ kind: "onboarding" });
    }
  }, []);

  // Fired by "Ver la introducción otra vez" en Ajustes → General. Esa acción
  // ya limpió los flags de onboarding en localStorage (resetOnboarding); aquí
  // solo conmutamos el árbol de React sin recargar la ventana.
  useEffect(() => {
    const handler = () => setAppState({ kind: "onboarding" });
    window.addEventListener("replay-onboarding", handler);
    return () => window.removeEventListener("replay-onboarding", handler);
  }, []);

  const onThemeChange = (id: ThemeId) => {
    setTheme(id);
    setThemeState(id);
  };

  const onModeChange = (m: ThemeMode) => {
    setMode(m);
    setModeState(m);
  };

  // Push the current palette to the overlay window whenever it changes —
  // and on first mount. The overlay's localStorage can be isolated from the
  // main window's on macOS WKWebView, so we don't rely on it reading the
  // value directly; this useEffect is the authoritative source.
  useEffect(() => {
    void WebviewWindow.getByLabel("overlay").then((overlay) => {
      void overlay?.emit("theme-changed", { id: theme, mode });
    });
  }, [theme, mode]);

  if (appState.kind === "checking") {
    return <SplashScreen />;
  }

  if (appState.kind === "onboarding") {
    return (
      <OnboardingFlow
        onComplete={(modelFile) => setAppState({ kind: "ready", modelFile })}
      />
    );
  }

  const onModelChange = (file: string) => {
    setSelectedModelFile(file);
    setAppState({ kind: "ready", modelFile: file });
  };

  return (
    <Dashboard
      modelFile={appState.modelFile}
      onModelChange={onModelChange}
      theme={theme}
      onThemeChange={onThemeChange}
      mode={mode}
      onModeChange={onModeChange}
    />
  );
}

function SplashScreen() {
  return (
    <div className="onb-shell">
      <div className="onb-titlebar" data-tauri-drag-region />
      <div className="onb-body">
        <h1 className="onb-wordmark serif" style={{ opacity: 0.7 }}>
          Local Whisper
          <span className="wordmark-dot" />
        </h1>
      </div>
    </div>
  );
}

function Dashboard({
  modelFile,
  onModelChange,
  theme,
  onThemeChange,
  mode,
  onModeChange,
}: {
  modelFile: string;
  onModelChange: (file: string) => void;
  theme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  mode: ThemeMode;
  onModeChange: (m: ThemeMode) => void;
}) {
  const [screen, setScreen] = useState<Screen>("home");
  // When a banner CTA deep-links into Settings, we capture which section it
  // wants to land on. Settings reads this on mount as its initial section.
  const [pendingSettingsSection, setPendingSettingsSection] =
    useState<SettingsSection | undefined>(undefined);
  const [sidebar, setSidebar] = useState(true);
  const [sidebarWidth, setSidebarWidthState] = useState<number>(() =>
    getSidebarWidth(),
  );
  const [textScale, setTextScaleState] = useState<number>(() => getTextScale());
  const [lastResult, setLastResult] = useState<RecorderResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Apply the persisted text scale via CSS `zoom` on the body. Affects the
  // whole app uniformly — no per-component refactor needed.
  useEffect(() => {
    // The `zoom` property is non-standard but well-supported in WKWebView
    // (Tauri on macOS) and Chromium-based webviews.
    document.body.style.zoom = String(textScale);
  }, [textScale]);

  const onTextScaleChange = useCallback((n: number) => {
    setTextScale(n);
    setTextScaleState(n);
  }, []);

  const onSidebarWidthChange = useCallback((w: number) => {
    setSidebarWidth(w);
    setSidebarWidthState(w);
  }, []);

  const onNavigate = useCallback(
    (next: Screen, settingsSection?: SettingsSection) => {
      setScreen(next);
      setPendingSettingsSection(settingsSection);
    },
    [],
  );
  // Language + mic are held in state so the recorder re-primes when they
  // change. The setters below persist + update state together.
  const [language, setLanguageState] = useState<string>(() => getLanguage());
  const [userName, setUserNameState] = useState<string>(() => getUserName());
  const [micDeviceId, setMicDeviceIdState] = useState<string | null>(() =>
    getMicDeviceId(),
  );

  const onLanguageChange = useCallback((code: string) => {
    setLanguage(code);
    setLanguageState(code);
  }, []);

  const onMicChange = useCallback((id: string | null) => {
    setMicDeviceId(id);
    setMicDeviceIdState(id);
  }, []);

  // onResult is created before usage is known. These refs let it read the
  // latest values at call time without being recreated (which would leak stale
  // global-shortcut listeners).
  const addWordsRef = useRef<(n: number) => void>(() => {});
  const statusRef = useRef<string>("idle");
  const dictionaryRef = useRef<DictionaryEntry[]>([]);
  // Abre el aviso de apoyo cuando se cruza el umbral de dictados. Es un ref
  // porque onResult no debe recrearse al cambiar el estado del modal.
  const openSupportPromptRef = useRef<() => void>(() => {});

  const onResult = useCallback((r: RecorderResult) => {
    setLastError(null);
    // Apply dictionary corrections first so paste, history and the word count
    // all use the corrected text.
    const text = r.text ? applyDictionary(r.text, dictionaryRef.current) : r.text;
    setLastResult({ ...r, text });
    if (!text) return;

    // Tutorial intercept: during the practice step we route the transcription
    // into the modal's "captured text" state instead of doing the normal
    // autopaste/storage. The user expects the text to land in the tutorial,
    // not in whatever app happens to have focus behind it.
    if (tutorialInterceptRef.current) {
      setTutorialCaptured(text);
      tutorialInterceptRef.current = false;
      return;
    }

    // Contador de palabras: ya no hay tope (la app es gratis e ilimitada),
    // pero alimenta las Estadísticas.
    const words = countWords(text);
    if (words > 0) void addWordsRef.current(words);

    // Un dictado completado más. Al cruzar el umbral pedimos apoyo UNA vez —
    // ya con la app demostrada, nunca antes.
    if (bumpDictationCount() === SUPPORT_PROMPT_AFTER_DICTATIONS) {
      openSupportPromptRef.current();
    }

    // Both side-effects are gated by preferences read at the moment of the
    // result — toggling them in Settings takes effect on the next dictation
    // without needing any subscription wiring. Clipboard write + ⌘V is
    // handled entirely in Rust (browser-side navigator.clipboard requires
    // window focus which we don't have while dictating into another app).
    const autopaste = getAutopaste();
    const storeLocal = getStoreLocal();

    (async () => {
      let pasted = false;
      let appName: string | null = null;
      if (autopaste) {
        try {
          const outcome = await pasteText(text);
          pasted = outcome.pasted;
          appName = outcome.app;
        } catch (err) {
          console.error("paste failed", err);
        }
      }
      if (storeLocal) {
        try {
          await insertTranscription({
            text,
            app: appName,
            durationMs: Math.round(r.durationSec * 1000),
            pasted,
          });
          setHistoryVersion((v) => v + 1);
        } catch (err) {
          console.error("insert transcription failed", err);
        }
      }
    })();
  }, []);

  const onClearHistory = async () => {
    try {
      await clearTranscriptions();
      setHistoryVersion((v) => v + 1);
    } catch (err) {
      console.error("clearTranscriptions failed", err);
    }
  };

  // Local Whisper es GRATIS: nada está bloqueado, ni la grabación, ni las
  // Estadísticas, ni los temas. La licencia solo existe como apoyo voluntario
  // — quien activa una clave recibe las gracias y deja de ver el aviso.
  const license = useLicense();
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  // true cuando el modal lo ha abierto el aviso automático (tras N dictados) y
  // no un clic explícito: solo entonces "cerrar" significa "no preguntar más".
  const [supportAuto, setSupportAuto] = useState(false);

  const usage = useUsage();
  const dictionary = useDictionary();
  const updater = useUpdater();

  addWordsRef.current = usage.addWords;
  dictionaryRef.current = dictionary.entries;
  openSupportPromptRef.current = () => {
    if (getSupportDismissed()) return;
    if (license.state && isSupporter(license.state)) return;
    setSupportAuto(true);
    setSupportModalOpen(true);
  };

  const { status, elapsedSec, toggle } = useRecorder({
    modelFile,
    language,
    deviceId: micDeviceId,
    streamingAllowed: true,
    onResult,
    onError: setLastError,
  });
  statusRef.current = status;

  // In-app interactive tutorial. Shown automatically the first time the
  // Dashboard mounts (right after onboarding completes). The "intercept" ref
  // tells onResult below to route the next transcription into the tutorial
  // instead of pasting / saving it normally.
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialCaptured, setTutorialCaptured] = useState<string | null>(null);
  const tutorialInterceptRef = useRef(false);

  useEffect(() => {
    if (!isTutorialCompleted()) {
      setTutorialOpen(true);
    }
  }, []);

  // Fired by the "Volver a ver el tutorial" link in the Help screen. We use a
  // window event instead of lifting state up to Help → avoids prop drilling
  // through MacWindowFrame / Sidebar / screen router.
  useEffect(() => {
    const handler = () => {
      setTutorialCaptured(null);
      tutorialInterceptRef.current = false;
      setTutorialOpen(true);
    };
    window.addEventListener("replay-tutorial", handler);
    return () => window.removeEventListener("replay-tutorial", handler);
  }, []);

  // Global shortcut (⌥ Space) fires a "toggle-recording" event from Rust. We
  // pin the latest `toggle` in a ref so the listener (subscribed exactly once
  // on mount) always calls the current closure — otherwise React would
  // re-subscribe on every status change and leak stale listeners that fire
  // start() and stop() concurrently.
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  useEffect(() => {
    const promise = listen<void>("toggle-recording", () => toggleRef.current());
    return () => {
      promise.then((fn) => fn());
    };
  }, []);

  // Show / hide the floating overlay window whenever recording state changes.
  // We keep the pill visible during the "transcribing" phase too (the user
  // wants the visual feedback to persist until the text is actually pasted).
  useEffect(() => {
    void WebviewWindow.getByLabel("overlay").then((overlay) => {
      if (!overlay) return;
      if (
        status === "recording" ||
        status === "transcribing" ||
        status === "preparing"
      ) {
        // Position the pill well above the Dock — the Dock can be 60–100 px
        // tall depending on magnification, so we keep ~200 px of clearance.
        const x = Math.round(window.screen.width / 2 - 120);
        const y = Math.round(window.screen.height - 200);
        void overlay
          .setPosition(new LogicalPosition(x, y))
          .then(() => overlay.show())
          .then(() => overlay.emit("overlay-state", { phase: status }));
      } else {
        void overlay
          .emit("overlay-state", { phase: "idle" })
          .then(() => overlay.hide());
      }
    });
  }, [status]);

  const topStatus = lastError ? `⚠ ${lastError}` : undefined;

  const tierId = tierForFile(modelFile);
  const tier = tierId ? findTier(tierId) : null;
  const sizeLabel = tier
    ? `${tier.sizeGb.toFixed(1).replace(".", ",")} GB`
    : "—";
  const modelDisplayName = tier?.label ?? "Modelo local";

  return (
    <MacWindowFrame
      sidebarOn={sidebar}
      onSidebar={() => setSidebar((s) => !s)}
    >
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {sidebar && (
          <Sidebar
            active={screen}
            onNavigate={onNavigate}
            width={sidebarWidth}
            onWidthChange={onSidebarWidthChange}
          />
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg)",
            minWidth: 0,
          }}
        >
          <UpdateBanner
            state={updater.state}
            onInstall={updater.install}
            onRestart={updater.restart}
            onDismiss={updater.dismiss}
          />
          <TopBar
            title={TITLES[screen]}
            recording={status === "recording"}
            transcribing={status === "transcribing"}
            recordingDuration={formatDuration(elapsedSec)}
            status={topStatus}
            onToggleRecord={toggle}
          />
          <div className="scroll" style={{ flex: 1, overflowY: "auto" }}>
            {screen === "home" && (
              <HomeScreen
                userName={userName}
                refreshKey={historyVersion}
                modelName={modelDisplayName}
                onNavigate={onNavigate}
                onAddToDictionary={dictionary.add}
              />
            )}
            {screen === "insights" && (
              <InsightsScreen refreshKey={historyVersion} />
            )}
            {screen === "dictionary" && (
              <DictionaryScreen
                entries={dictionary.entries}
                onAdd={dictionary.add}
                onUpdate={dictionary.update}
                onDelete={dictionary.remove}
              />
            )}
            {screen === "help" && <HelpScreen />}
            {screen === "settings" && (
              <SettingsScreen
                activeModelFile={modelFile}
                onModelChange={onModelChange}
                onClearHistory={onClearHistory}
                language={language}
                onLanguageChange={onLanguageChange}
                micDeviceId={micDeviceId}
                onMicChange={onMicChange}
                theme={theme}
                onThemeChange={onThemeChange}
                mode={mode}
                onModeChange={onModeChange}
                textScale={textScale}
                onTextScaleChange={onTextScaleChange}
                initialSection={pendingSettingsSection}
                licenseState={license.state}
                updateState={updater.state}
                onCheckUpdate={() => void updater.check(false)}
                onInstallUpdate={updater.install}
                onRestartApp={updater.restart}
                onOpenSupport={() => {
                  setSupportAuto(false);
                  setSupportModalOpen(true);
                }}
                onDeactivateLicense={async () => {
                  try {
                    await license.deactivate();
                  } catch (err) {
                    console.error("license deactivate failed", err);
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
      {supportModalOpen && (
        <SupportModal
          auto={supportAuto}
          onActivate={async (key) => {
            await license.activate(key);
            setSupportModalOpen(false);
          }}
          onClose={() => {
            // Solo el aviso automático se silencia para siempre; si lo abrió la
            // persona desde Ajustes, cerrarlo no cambia nada.
            if (supportAuto) setSupportDismissed(true);
            setSupportModalOpen(false);
          }}
        />
      )}

      {tutorialOpen && (
        <TutorialModal
          capturedText={tutorialCaptured}
          onArmCapture={() => {
            tutorialInterceptRef.current = true;
            setTutorialCaptured(null);
          }}
          onDisarmCapture={() => {
            tutorialInterceptRef.current = false;
          }}
          onClose={() => {
            markTutorialCompleted();
            setTutorialOpen(false);
            setTutorialCaptured(null);
            tutorialInterceptRef.current = false;
          }}
        />
      )}
    </MacWindowFrame>
  );
}
