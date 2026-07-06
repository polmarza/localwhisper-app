import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalPosition } from "@tauri-apps/api/window";
import { MacWindowFrame } from "./components/MacWindow";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { LicenseBanner } from "./components/LicenseBanner";
import { LicenseModal } from "./components/LicenseModal";
import { TutorialModal } from "./components/TutorialModal";
import { HomeScreen } from "./screens/Home";
import { InsightsScreen } from "./screens/Insights";
import { DictionaryScreen } from "./screens/Dictionary";
import { HelpScreen } from "./screens/Help";
import { SettingsScreen } from "./screens/Settings";
import { OnboardingFlow } from "./onboarding/OnboardingFlow";
import { formatDuration, useRecorder, type RecorderResult } from "./hooks/useRecorder";
import { pasteText } from "./lib/tauri";
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
  setLanguage,
  setMicDeviceId,
  setSidebarWidth,
  setTextScale,
} from "./state/preferences";
import {
  applyTheme,
  getMode,
  getTheme,
  isPremiumTheme,
  setMode,
  setTheme,
  FREE_THEME,
  type ThemeId,
  type ThemeMode,
} from "./state/theme";
import { findTier, tierForFile } from "./state/tiers";
import { hasPremium, shouldShowLicenseBanner } from "./state/license";
import { countWords, wordsRemaining } from "./state/usage";
import { PremiumLocked } from "./components/PremiumLocked";
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
    if (isOnboardingCompleted()) {
      const stored = getSelectedModelFile() ?? FALLBACK_MODEL_FILE;
      setAppState({ kind: "ready", modelFile: stored });
    } else {
      setAppState({ kind: "onboarding" });
    }
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

  // onResult and guardedToggle are created before license + usage are known.
  // These refs let them read the latest values at call time without being
  // recreated (which would leak stale global-shortcut listeners).
  const premiumRef = useRef(false);
  const addWordsRef = useRef<(n: number) => void>(() => {});
  const statusRef = useRef<string>("idle");
  const overQuotaRef = useRef(false);
  const dictionaryRef = useRef<DictionaryEntry[]>([]);

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

    // Count words against the free-tier weekly quota. Premium (trial/licensed)
    // is unlimited and never counted.
    if (!premiumRef.current) {
      const words = countWords(text);
      if (words > 0) void addWordsRef.current(words);
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

  // License model: recording is ALWAYS free and never gated. The license only
  // unlocks premium extras — the Estadísticas screen, the arena/bosque themes,
  // and live (VAD) transcription. Everyone gets premium during the 14-day
  // trial; after that it needs an active key. A persistent banner keeps the
  // trial/upsell visible.
  const license = useLicense();
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  // Until the license state has loaded we treat the user as non-premium so we
  // never briefly flash premium-only surfaces to a lapsed user.
  const premium = license.state ? hasPremium(license.state) : false;

  // Free-tier weekly word quota. Premium (trial/licensed) is unlimited; a free
  // user who's used up the week's words is blocked from starting a new
  // dictation until it resets or they buy a license.
  const usage = useUsage();
  const dictionary = useDictionary();
  const overQuota = !premium && !!usage.state && wordsRemaining(usage.state) <= 0;

  premiumRef.current = premium;
  addWordsRef.current = usage.addWords;
  overQuotaRef.current = overQuota;
  dictionaryRef.current = dictionary.entries;

  const { status, elapsedSec, toggle } = useRecorder({
    modelFile,
    language,
    deviceId: micDeviceId,
    // Live (VAD) transcription is a premium extra — a lapsed user falls back to
    // the classic transcribe-on-stop path even if the pref is still on.
    streamingAllowed: premium,
    onResult,
    onError: setLastError,
  });
  statusRef.current = status;

  // If premium lapses while a premium theme is selected, fall the user back to
  // the free theme. Gated on `license.state` being loaded so we never clobber a
  // paying user's saved theme during the initial async load.
  useEffect(() => {
    if (license.state && !hasPremium(license.state) && isPremiumTheme(theme)) {
      onThemeChange(FREE_THEME);
    }
  }, [license.state, theme, onThemeChange]);

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

  // Starting a dictation is blocked only when a free user has exhausted their
  // weekly word quota — then we surface the upsell modal. Stopping an in-flight
  // recording is always allowed.
  const guardedToggle = useCallback(() => {
    if (statusRef.current !== "recording" && overQuotaRef.current) {
      setLicenseModalOpen(true);
      return;
    }
    toggle();
  }, [toggle]);

  // Global shortcut (⌥ Space) fires a "toggle-recording" event from Rust.
  // We pin the latest `toggle` in a ref so the listener (subscribed exactly
  // once on mount) always calls the current closure — otherwise React would
  // re-subscribe on every status change and leak stale listeners that fire
  // start() and stop() concurrently.
  const toggleRef = useRef(guardedToggle);
  toggleRef.current = guardedToggle;
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
            insightsLocked={!premium}
            onLockedInsights={() => setLicenseModalOpen(true)}
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
          <TopBar
            title={TITLES[screen]}
            recording={status === "recording"}
            transcribing={status === "transcribing"}
            recordingDuration={formatDuration(elapsedSec)}
            status={topStatus}
            onToggleRecord={guardedToggle}
          />
          {license.state && shouldShowLicenseBanner(license.state) && (
            <LicenseBanner
              state={license.state}
              remaining={
                !premium && usage.state
                  ? wordsRemaining(usage.state)
                  : undefined
              }
              onActivate={() => setLicenseModalOpen(true)}
            />
          )}
          <div className="scroll" style={{ flex: 1, overflowY: "auto" }}>
            {screen === "home" && (
              <HomeScreen
                userName="Pol"
                refreshKey={historyVersion}
                modelName={modelDisplayName}
                onNavigate={onNavigate}
                onAddToDictionary={dictionary.add}
              />
            )}
            {screen === "insights" &&
              (premium ? (
                <InsightsScreen refreshKey={historyVersion} />
              ) : (
                <PremiumLocked
                  title="Estadísticas es una función premium"
                  blurb="Consulta tus palabras dictadas, rachas y tiempo ahorrado con una licencia de Local Whisper. La transcripción sigue siendo gratis e ilimitada."
                  onActivate={() => setLicenseModalOpen(true)}
                />
              ))}
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
                onActivateLicense={() => setLicenseModalOpen(true)}
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
      {license.state && licenseModalOpen && (
        <LicenseModal
          state={license.state}
          onActivate={async (key) => {
            await license.activate(key);
            setLicenseModalOpen(false);
          }}
          onClose={() => setLicenseModalOpen(false)}
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
