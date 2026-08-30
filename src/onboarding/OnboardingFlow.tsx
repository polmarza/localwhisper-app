import { useEffect, useState } from "react";
import { Welcome } from "./Welcome";
import { AboutYou } from "./AboutYou";
import { ChooseShortcut } from "./ChooseShortcut";
import { DictionaryStarter } from "./DictionaryStarter";
import { ChooseTheme } from "./ChooseTheme";
import { InstallProgress } from "./InstallProgress";
import { HowToDictate } from "./HowToDictate";
import { StatsTeaser } from "./StatsTeaser";
import { Ready } from "./Ready";
import { detectHardware, type Hardware } from "../state/hardware";
import {
  findTier,
  recommendTier,
  tierForFile,
  type TierId,
} from "../state/tiers";
import { listLocalModels } from "../lib/tauri";
import {
  addInstalledTier,
  markOnboardingCompleted,
  setSelectedModelFile,
} from "../state/onboarding";
import {
  applyTheme,
  getMode,
  getTheme,
  setMode,
  setTheme,
  type ThemeId,
  type ThemeMode,
} from "../state/theme";

type Step =
  | "welcome"
  | "about"
  | "shortcut"
  | "dictionary"
  | "theme"
  | "install"
  | "dictate"
  | "stats"
  | "ready";

type Props = {
  onComplete: (modelFile: string) => void;
};

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [hardware, setHardware] = useState<Hardware | null>(null);
  const [tier, setTier] = useState<TierId>("medium");
  const [themeId, setThemeId] = useState<ThemeId>(() => getTheme());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getMode());
  const [installAttempt, setInstallAttempt] = useState(0);

  const onThemeSelect = (id: ThemeId) => {
    setTheme(id);
    setThemeId(id);
    applyTheme(id, themeMode);
  };

  const onModeSelect = (m: ThemeMode) => {
    setMode(m);
    setThemeMode(m);
    applyTheme(themeId, m);
  };

  useEffect(() => {
    detectHardware()
      .then((hw) => {
        setHardware(hw);
        setTier(recommendTier(hw));
      })
      .catch((e) => {
        // If detection fails (e.g. on a platform we haven't covered yet),
        // fall back to a conservative profile so the onboarding still
        // progresses. "medium" is the safe default for ~8 GB non-Apple
        // Silicon machines.
        console.error("detect_hardware failed", e);
        const fallback: Hardware = {
          total_ram_gb: 8,
          arch: "unknown",
          is_apple_silicon: false,
          cpu_brand: "",
        };
        setHardware(fallback);
        setTier(recommendTier(fallback));
      });
  }, []);

  const startInstall = async () => {
    // If the chosen tier's file is already on disk, skip the download step.
    try {
      const models = await listLocalModels();
      const target = findTier(tier).fileName;
      if (models.some((m) => m.file_name === target)) {
        setStep("dictate");
        return;
      }
    } catch {
      // Fall through to the install step — listLocalModels failing is not fatal.
    }
    setInstallAttempt((n) => n + 1);
    setStep("install");
  };

  const finishOnboarding = () => {
    const modelFile = findTier(tier).fileName;
    setSelectedModelFile(modelFile);
    addInstalledTier(tier);
    markOnboardingCompleted();
    onComplete(modelFile);
  };

  const stepIndex: Record<Step, number> = {
    welcome: 0,
    about: 1,
    shortcut: 2,
    dictionary: 3,
    theme: 4,
    install: 5,
    dictate: 6,
    stats: 7,
    ready: 8,
  };
  const currentIdx = stepIndex[step];
  const stepCount = 9;

  return (
    <div className="onb-shell">
      <div className="onb-titlebar" data-tauri-drag-region />

      <div className="onb-dots">
        {Array.from({ length: stepCount }, (_, i) => (
          <span
            key={i}
            className="onb-dot"
            data-active={i === currentIdx}
            data-done={i < currentIdx}
          />
        ))}
      </div>

      <div className="onb-body">
        {step === "welcome" && (
          <Welcome onContinue={() => setStep("about")} />
        )}

        {step === "about" && (
          <AboutYou onContinue={() => setStep("shortcut")} />
        )}

        {step === "shortcut" && (
          <ChooseShortcut onContinue={() => setStep("dictionary")} />
        )}

        {step === "dictionary" && (
          <DictionaryStarter onContinue={() => setStep("theme")} />
        )}

        {step === "theme" && (
          <ChooseTheme
            theme={themeId}
            mode={themeMode}
            onThemeChange={onThemeSelect}
            onModeChange={onModeSelect}
            onContinue={() => void startInstall()}
          />
        )}

        {step === "install" && (
          <InstallProgress
            key={installAttempt}
            tierId={tier}
            onDone={() => setStep("dictate")}
            onRetry={() => setInstallAttempt((n) => n + 1)}
          />
        )}

        {step === "dictate" && (
          <HowToDictate onContinue={() => setStep("stats")} />
        )}

        {step === "stats" && (
          <StatsTeaser onContinue={() => setStep("ready")} />
        )}

        {step === "ready" && <Ready onFinish={finishOnboarding} />}
      </div>
    </div>
  );
}

/** Generates a tier id from a previously-selected model filename, falling back
 *  to the hardware recommendation. Useful when the user re-runs onboarding. */
export function inferTierFromState(
  storedFile: string | null,
  hardware: Hardware | null,
): TierId {
  if (storedFile) {
    const id = tierForFile(storedFile);
    if (id) return id;
  }
  return hardware ? recommendTier(hardware) : "medium";
}
